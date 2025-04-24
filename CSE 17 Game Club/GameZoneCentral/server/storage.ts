import { users, User, InsertUser, scores, games, Game, GameType, Score, InsertScore } from "@shared/schema";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { db } from "./db";
import { eq, asc, desc } from "drizzle-orm";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User Management
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  
  // Admin Stats
  getAdminStats(): Promise<any>;
  
  // Leaderboard
  getLeaderboard(gameType?: string): Promise<any[]>;
  
  // Guessing Game
  startGuessingGame(userId: number): Promise<any>;
  makeGuess(userId: number, guess: number): Promise<any>;
  getGuessingGameStats(userId: number): Promise<any>;
  
  // Spin Wheel Game
  spinWheel(userId: number): Promise<any>;
  
  // Red Light Green Light Game
  startRedLightGame(userId: number): Promise<any>;
  submitRedLightScore(userId: number, time: number): Promise<any>;
  getRedLightGameStats(userId: number): Promise<any>;
  
  // Type Racer Game
  startTypeRacerGame(userId: number): Promise<any>;
  submitTypeRacerScore(userId: number, wpm: number, accuracy: number): Promise<any>;
  getTypeRacerLeaderboard(): Promise<any[]>;
  
  // Bread Game
  startBreadGame(userId: number): Promise<any>;
  submitBreadGameScore(userId: number, score: number): Promise<any>;
  getBreadGameStats(userId: number): Promise<any>;
  
  // Session store
  sessionStore: session.SessionStore;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private userGames: Map<number, any>;
  private scores: Map<number, Score[]>;
  private games: Map<number, Game>;
  public currentId: number;
  public sessionStore: session.SessionStore;

  constructor() {
    this.users = new Map();
    this.userGames = new Map();
    this.scores = new Map();
    this.games = new Map();
    this.currentId = 1;
    
    // Initialize session store
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
    
    // Add some initial admin user
    this.createUser({
      username: "admin",
      password: "$2b$10$8NpPpFHWPlECCYDc5YFoceQjcqW95xcYZ5rPrj08s0VQSUGPXvpRy", // "admin123"
      role: "admin"
    });
  }

  // User Management
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username.toLowerCase() === username.toLowerCase(),
    );
  }

  async getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined> {
    if (!firebaseUid) return undefined;
    return Array.from(this.users.values()).find(
      (user) => user.firebaseUid === firebaseUid
    );
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const now = new Date().toISOString();
    const user: User = { 
      ...insertUser, 
      id,
      createdAt: now,
      updatedAt: now,
      role: insertUser.role || "user",
      gamesPlayed: 0,
      email: insertUser.email || ""
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { 
      ...user, 
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async deleteUser(id: number): Promise<boolean> {
    return this.users.delete(id);
  }

  // Admin Stats
  async getAdminStats(): Promise<any> {
    const totalUsers = this.users.size;
    
    // In a real application, this would calculate growth over time
    const userGrowth = 12; // Sample value
    
    // Count active games (in a real app, would filter by active status)
    const activeGames = this.games.size;
    const gameGrowth = 8; // Sample value
    
    // Determine top game
    const gameTypeCounts: Record<string, number> = {};
    for (const game of this.games.values()) {
      gameTypeCounts[game.type] = (gameTypeCounts[game.type] || 0) + 1;
    }
    
    let topGame = "Type Racer";
    let topGameCount = 0;
    let totalGames = 0;
    
    for (const [type, count] of Object.entries(gameTypeCounts)) {
      totalGames += count;
      if (count > topGameCount) {
        topGameCount = count;
        topGame = type;
      }
    }
    
    const topGamePercentage = totalGames > 0 ? Math.round((topGameCount / totalGames) * 100) : 0;
    
    return {
      totalUsers,
      userGrowth,
      activeGames,
      gameGrowth,
      topGame,
      topGamePercentage
    };
  }

  // Leaderboard
  async getLeaderboard(gameType: string = "all"): Promise<any[]> {
    const allScores: any[] = [];
    
    for (const [userId, userScores] of this.scores.entries()) {
      const user = this.users.get(userId);
      if (!user) continue;
      
      for (const score of userScores) {
        const game = this.games.get(score.gameId);
        if (!game) continue;
        
        if (gameType === "all" || game.type === gameType) {
          allScores.push({
            rank: 0, // Will be calculated
            player: user.username,
            game: game.name,
            gameType: game.type,
            score: this.formatScore(game.type, score.value),
            date: new Date(score.createdAt).toISOString().split('T')[0]
          });
        }
      }
    }
    
    // Sort scores (higher values first)
    allScores.sort((a, b) => {
      // Extract the numeric portion for comparison
      const aValue = parseFloat(a.score.replace(/[^\d.]/g, ''));
      const bValue = parseFloat(b.score.replace(/[^\d.]/g, ''));
      
      // Handle special cases like "2 attempts" where lower is better
      if (a.gameType === "guessing") {
        return aValue - bValue;
      }
      
      // For redlight game, lower times are better
      if (a.gameType === "redlight") {
        return aValue - bValue;
      }
      
      // For all other games, higher scores are better
      return bValue - aValue;
    });
    
    // Assign ranks
    let currentRank = 1;
    for (const entry of allScores) {
      entry.rank = currentRank++;
    }
    
    return allScores;
  }
  
  // Helper to format scores based on game type
  private formatScore(gameType: string, value: number): string {
    switch (gameType) {
      case "guessing":
        return `${value} attempts`;
      case "redlight":
        return `${value.toFixed(1)}s`;
      case "typeracer":
        return `${value} WPM`;
      default:
        return `${value} pts`;
    }
  }

  // Guessing Game
  async startGuessingGame(userId: number): Promise<any> {
    // Generate random number between 1 and 100
    const targetNumber = Math.floor(Math.random() * 100) + 1;
    
    const gameState = {
      targetNumber,
      attempts: 0,
      maxAttempts: 10,
      previousGuesses: [],
      gameOver: false,
      userId
    };
    
    this.userGames.set(userId, {
      ...this.userGames.get(userId) || {},
      guessing: gameState
    });
    
    // Update user's games played count
    const user = this.users.get(userId);
    if (user) {
      this.users.set(userId, {
        ...user,
        gamesPlayed: user.gamesPlayed + 1
      });
    }
    
    return { success: true };
  }

  async makeGuess(userId: number, guess: number): Promise<any> {
    const userGames = this.userGames.get(userId);
    if (!userGames || !userGames.guessing) {
      return { error: "No active guessing game found" };
    }
    
    const game = userGames.guessing;
    
    if (game.gameOver) {
      return { error: "Game is already over" };
    }
    
    // Check if guess is in previous guesses
    if (game.previousGuesses.includes(guess)) {
      return { error: "You already tried this number" };
    }
    
    // Record the guess
    game.attempts++;
    game.previousGuesses.push(guess);
    
    // Check result
    let message;
    const targetNumber = game.targetNumber;
    let isCorrect = false;
    
    if (guess === targetNumber) {
      message = "correct";
      isCorrect = true;
      game.gameOver = true;
      
      // Record score (number of attempts taken)
      this.recordScore(userId, "guessing", game.attempts);
    } else if (guess < targetNumber) {
      message = "too low";
    } else {
      message = "too high";
    }
    
    // Check if out of attempts
    const attemptsLeft = game.maxAttempts - game.attempts;
    if (attemptsLeft <= 0 && !isCorrect) {
      game.gameOver = true;
    }
    
    // Update game state
    this.userGames.set(userId, {
      ...userGames,
      guessing: game
    });
    
    return {
      message,
      isCorrect,
      attemptsLeft,
      previousGuesses: game.previousGuesses,
      correctNumber: game.gameOver ? targetNumber : undefined
    };
  }

  async getGuessingGameStats(userId: number): Promise<any> {
    // Get all guessing game scores for this user
    const allScores = this.scores.get(userId) || [];
    const guessingGameScores = allScores.filter(score => {
      const game = this.games.get(score.gameId);
      return game && game.type === "guessing";
    });
    
    const gamesPlayed = guessingGameScores.length;
    
    // Calculate win rate (in a real app this would be more complex)
    const winRate = gamesPlayed > 0 ? Math.round((gamesPlayed / (gamesPlayed + 2)) * 100) : 0;
    
    // Find best score (lowest attempts)
    let bestScore = Infinity;
    for (const score of guessingGameScores) {
      if (score.value < bestScore) {
        bestScore = score.value;
      }
    }
    
    return {
      gamesPlayed,
      winRate,
      bestScore: bestScore === Infinity ? 0 : bestScore
    };
  }

  // Spin Wheel Game
  async spinWheel(userId: number): Promise<any> {
    // Define prizes with their probabilities
    const prizes = [
      { value: 100, label: "100 Points", probability: 0.2 },
      { value: 250, label: "250 Points", probability: 0.15 },
      { value: 500, label: "500 Points", probability: 0.1 },
      { value: 1000, label: "1000 Points", probability: 0.05 },
      { value: 0, label: "Try Again", probability: 0.25 },
      { value: 150, label: "150 Points", probability: 0.15 },
      { value: 750, label: "750 Points", probability: 0.05 },
      { value: 300, label: "300 Points", probability: 0.05 }
    ];
    
    // Select a prize based on probabilities
    const random = Math.random();
    let cumulativeProbability = 0;
    let selectedPrize = prizes[0];
    
    for (const prize of prizes) {
      cumulativeProbability += prize.probability;
      if (random <= cumulativeProbability) {
        selectedPrize = prize;
        break;
      }
    }
    
    // Calculate rotation degrees (multiple of 360 + random offset)
    const baseDegrees = 1800; // 5 full rotations
    const prizeIndex = prizes.indexOf(selectedPrize);
    const degreesPerPrize = 360 / prizes.length;
    const offset = degreesPerPrize * prizeIndex;
    const randomOffset = Math.random() * (degreesPerPrize * 0.8); // Random offset within the prize segment
    
    const degrees = baseDegrees + offset + randomOffset;
    
    // Record score if prize has value
    if (selectedPrize.value > 0) {
      this.recordScore(userId, "spinwheel", selectedPrize.value);
    }
    
    // Update user's games played count
    const user = this.users.get(userId);
    if (user) {
      this.users.set(userId, {
        ...user,
        gamesPlayed: user.gamesPlayed + 1
      });
    }
    
    return {
      prize: selectedPrize.label,
      value: selectedPrize.value,
      degrees
    };
  }

  // Red Light Green Light Game
  async startRedLightGame(userId: number): Promise<any> {
    // Update user's games played count
    const user = this.users.get(userId);
    if (user) {
      this.users.set(userId, {
        ...user,
        gamesPlayed: user.gamesPlayed + 1
      });
    }
    
    return { success: true };
  }

  async submitRedLightScore(userId: number, time: number): Promise<any> {
    // Record score
    this.recordScore(userId, "redlight", time);
    
    // Get user stats
    const stats = await this.getRedLightGameStats(userId);
    
    return { success: true, stats };
  }

  async getRedLightGameStats(userId: number): Promise<any> {
    // Get all red light game scores for this user
    const allScores = this.scores.get(userId) || [];
    const redLightScores = allScores.filter(score => {
      const game = this.games.get(score.gameId);
      return game && game.type === "redlight";
    });
    
    const attempts = redLightScores.length;
    
    // Find best time (lowest time)
    let bestTime = Infinity;
    for (const score of redLightScores) {
      if (score.value < bestTime) {
        bestTime = score.value;
      }
    }
    
    // Calculate success rate (in a real app this would be more complex)
    const successRate = attempts > 0 ? Math.round((attempts / (attempts + 5)) * 100) : 0;
    
    return {
      attempts,
      bestTime: bestTime === Infinity ? 0.0 : bestTime.toFixed(1),
      successRate
    };
  }

  // Type Racer Game
  async startTypeRacerGame(userId: number): Promise<any> {
    // Array of typing prompts
    const prompts = [
      "The quick brown fox jumps over the lazy dog.",
      "Programming is the art of telling a computer what to do.",
      "Video games are an exciting form of entertainment for people of all ages.",
      "The best way to predict the future is to invent it.",
      "You miss 100% of the shots you don't take."
    ];
    
    // Select a random prompt
    const text = prompts[Math.floor(Math.random() * prompts.length)];
    
    // Update user's games played count
    const user = this.users.get(userId);
    if (user) {
      this.users.set(userId, {
        ...user,
        gamesPlayed: user.gamesPlayed + 1
      });
    }
    
    return { text };
  }

  async submitTypeRacerScore(userId: number, wpm: number, accuracy: number): Promise<any> {
    // Record score (WPM)
    this.recordScore(userId, "typeracer", wpm);
    
    // Get leaderboard
    const leaderboard = await this.getTypeRacerLeaderboard();
    
    return { success: true, leaderboard };
  }

  async getTypeRacerLeaderboard(): Promise<any[]> {
    const allScores: any[] = [];
    
    for (const [userId, userScores] of this.scores.entries()) {
      const user = this.users.get(userId);
      if (!user) continue;
      
      // Find type racer scores
      const typeRacerScores = userScores.filter(score => {
        const game = this.games.get(score.gameId);
        return game && game.type === "typeracer";
      });
      
      if (typeRacerScores.length > 0) {
        // Use the highest WPM score
        const bestScore = typeRacerScores.reduce((best, current) => 
          current.value > best.value ? current : best, typeRacerScores[0]);
        
        allScores.push({
          rank: 0, // Will be calculated
          player: user.username,
          wpm: Math.round(bestScore.value),
          accuracy: 95 // In a real app, this would be stored with the score
        });
      }
    }
    
    // Sort by WPM (highest first)
    allScores.sort((a, b) => b.wpm - a.wpm);
    
    // Assign ranks
    let currentRank = 1;
    for (const entry of allScores) {
      entry.rank = currentRank++;
    }
    
    // Add some sample data if leaderboard is empty
    if (allScores.length === 0) {
      allScores.push(
        { rank: 1, player: "SpeedTyper", wpm: 124, accuracy: 98 },
        { rank: 2, player: "TypeMaster", wpm: 116, accuracy: 96 },
        { rank: 3, player: "KeyboardNinja", wpm: 105, accuracy: 94 }
      );
    }
    
    return allScores;
  }

  // Bread Game
  async startBreadGame(userId: number): Promise<any> {
    // Update user's games played count
    const user = this.users.get(userId);
    if (user) {
      this.users.set(userId, {
        ...user,
        gamesPlayed: user.gamesPlayed + 1
      });
    }
    
    // Generate obstacles (would be more complex in a real game)
    const obstacles = [];
    for (let i = 0; i < 5; i++) {
      obstacles.push({
        id: i,
        x: 100 + Math.random() * 400,
        y: Math.random() * 300,
        width: 30,
        height: 30
      });
    }
    
    // Get high scores
    const stats = await this.getBreadGameStats(userId);
    
    return { obstacles, highScores: stats.highScores };
  }

  async submitBreadGameScore(userId: number, score: number): Promise<any> {
    // Record score
    this.recordScore(userId, "cse17", score);
    
    // Get updated stats
    const stats = await this.getBreadGameStats(userId);
    
    return { success: true, highScores: stats.highScores };
  }

  async getBreadGameStats(userId: number): Promise<any> {
    // Get all bread game scores
    const allScores: any[] = [];
    
    for (const [userId, userScores] of this.scores.entries()) {
      const user = this.users.get(userId);
      if (!user) continue;
      
      // Find bread game scores
      const breadGameScores = userScores.filter(score => {
        const game = this.games.get(score.gameId);
        return game && game.type === "cse17";
      });
      
      if (breadGameScores.length > 0) {
        // Use the highest score
        const bestScore = breadGameScores.reduce((best, current) => 
          current.value > best.value ? current : best, breadGameScores[0]);
        
        allScores.push({
          player: user.username,
          score: bestScore.value
        });
      }
    }
    
    // Sort by score (highest first)
    allScores.sort((a, b) => b.score - a.score);
    
    // Add some sample data if scores are empty
    if (allScores.length === 0) {
      allScores.push(
        { player: "FastBread", score: 1250 },
        { player: "BreadMaster", score: 980 },
        { player: "CarefulLoaf", score: 825 }
      );
    }
    
    return {
      level: 3, // In a real app this would be stored per-user
      lives: 2,
      score: 750,
      highScores: allScores.slice(0, 5) // Top 5 scores
    };
  }

  // Helper method to record a score
  private recordScore(userId: number, gameType: string, value: number): void {
    // Get or create game entry
    let gameId: number;
    let game = Array.from(this.games.values()).find(g => g.type === gameType);
    
    if (!game) {
      gameId = this.games.size + 1;
      
      // Create the game entry
      game = {
        id: gameId,
        type: gameType as GameType,
        name: this.getGameName(gameType),
        createdAt: new Date().toISOString()
      };
      
      this.games.set(gameId, game);
    } else {
      gameId = game.id;
    }
    
    // Create score entry
    const scoreId = Date.now(); // Use timestamp as ID
    const score: Score = {
      id: scoreId,
      userId,
      gameId,
      value,
      createdAt: new Date().toISOString()
    };
    
    // Add to user's scores
    const userScores = this.scores.get(userId) || [];
    userScores.push(score);
    this.scores.set(userId, userScores);
  }

  // Helper to get the game name from type
  private getGameName(type: string): string {
    switch (type) {
      case "guessing":
        return "Guessing Game";
      case "spinwheel":
        return "Spin Wheel";
      case "redlight":
        return "Red Light, Green Light";
      case "typeracer":
        return "Type Racer";
      case "cse17":
        return "CSE-17 Bread Game";
      default:
        return "Unknown Game";
    }
  }
}

export class DatabaseStorage implements IStorage {
  public sessionStore: session.SessionStore;
  private userGames: Map<number, any>;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool,
      createTableIfMissing: true 
    });
    this.userGames = new Map();
    
    // Initialize with some initial game data
    this.initializeGameData();
  }

  private async initializeGameData() {
    // Check if we need to set up initial games
    const existingGames = await db.select().from(games);
    
    if (existingGames.length === 0) {
      // Add game types
      await db.insert(games).values([
        { type: "guessing", name: "Guessing Game" },
        { type: "spinwheel", name: "Spin Wheel" },
        { type: "redlight", name: "Red Light, Green Light" },
        { type: "typeracer", name: "Type Racer" },
        { type: "cse17", name: "CSE-17 Bread Game" }
      ]);
    }
    
    // Check if we need to create an admin
    const adminUser = await this.getUserByUsername("admin");
    
    if (!adminUser) {
      await this.createUser({
        username: "admin",
        password: "$2b$10$8NpPpFHWPlECCYDc5YFoceQjcqW95xcYZ5rPrj08s0VQSUGPXvpRy", // "admin123"
        role: "admin"
      });
    }
  }

  // User Management
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username.toLowerCase()));
    return user;
  }
  
  async getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined> {
    if (!firebaseUid) return undefined;
    
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.firebaseUid, firebaseUid));
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        username: insertUser.username.toLowerCase(),
        role: insertUser.role || "user",
        email: insertUser.email || "",
        gamesPlayed: 0
      })
      .returning();
    
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(users.id, id))
      .returning();
    
    return updatedUser;
  }

  async deleteUser(id: number): Promise<boolean> {
    const result = await db
      .delete(users)
      .where(eq(users.id, id));
    
    return true; // In PostgreSQL, we don't get a direct boolean, but we can assume success if no error was thrown
  }

  // Admin Stats
  async getAdminStats(): Promise<any> {
    const userCount = await db.select().from(users);
    const totalUsers = userCount.length;
    
    // In a real application, this would calculate growth over time
    const userGrowth = 12; // Sample value
    
    // Count games
    const gameCount = await db.select().from(games);
    const activeGames = gameCount.length;
    const gameGrowth = 8; // Sample value
    
    // Get score counts by game type to determine most popular
    const gameScores = await db
      .select({
        gameId: scores.gameId,
        count: db.count(scores.id)
      })
      .from(scores)
      .groupBy(scores.gameId);
    
    let topGameId = 0;
    let topGameCount = 0;
    let totalGameCount = 0;
    
    for (const gs of gameScores) {
      totalGameCount += Number(gs.count);
      if (Number(gs.count) > topGameCount) {
        topGameCount = Number(gs.count);
        topGameId = gs.gameId;
      }
    }
    
    // Get top game name
    let topGame = "Type Racer"; // Default
    if (topGameId > 0) {
      const [gameInfo] = await db
        .select()
        .from(games)
        .where(eq(games.id, topGameId));
      
      if (gameInfo) {
        topGame = gameInfo.name;
      }
    }
    
    const topGamePercentage = totalGameCount > 0 ? Math.round((topGameCount / totalGameCount) * 100) : 0;
    
    return {
      totalUsers,
      userGrowth,
      activeGames,
      gameGrowth,
      topGame,
      topGamePercentage
    };
  }

  // Leaderboard
  async getLeaderboard(gameType: string = "all"): Promise<any[]> {
    // First, get all game info for reference
    const gameMap = new Map<number, Game>();
    const allGames = await db.select().from(games);
    
    for (const game of allGames) {
      gameMap.set(game.id, game);
    }
    
    // Build the query
    let query = db
      .select({
        scoreId: scores.id,
        userId: scores.userId,
        gameId: scores.gameId,
        value: scores.value,
        createdAt: scores.createdAt,
        username: users.username
      })
      .from(scores)
      .innerJoin(users, eq(scores.userId, users.id));
    
    // Filter by game type if specified
    if (gameType !== "all") {
      query = query.innerJoin(games, eq(scores.gameId, games.id))
        .where(eq(games.type, gameType));
    }
    
    const scoreResults = await query;
    
    // Format the results
    const allScores: any[] = [];
    
    for (const score of scoreResults) {
      const game = gameMap.get(score.gameId);
      if (!game) continue;
      
      allScores.push({
        rank: 0, // Will be calculated
        player: score.username,
        game: game.name,
        gameType: game.type,
        score: this.formatScore(game.type, score.value),
        date: new Date(score.createdAt).toISOString().split('T')[0]
      });
    }
    
    // Sort scores based on game type
    allScores.sort((a, b) => {
      // Extract the numeric portion for comparison
      const aValue = parseFloat(a.score.replace(/[^\d.]/g, ''));
      const bValue = parseFloat(b.score.replace(/[^\d.]/g, ''));
      
      // Handle special cases like "2 attempts" where lower is better
      if (a.gameType === "guessing") {
        return aValue - bValue;
      }
      
      // For redlight game, lower times are better
      if (a.gameType === "redlight") {
        return aValue - bValue;
      }
      
      // For all other games, higher scores are better
      return bValue - aValue;
    });
    
    // Assign ranks
    let currentRank = 1;
    for (const entry of allScores) {
      entry.rank = currentRank++;
    }
    
    return allScores;
  }
  
  // Helper to format scores based on game type
  private formatScore(gameType: string, value: number): string {
    switch (gameType) {
      case "guessing":
        return `${value} attempts`;
      case "redlight":
        return `${value.toFixed(1)}s`;
      case "typeracer":
        return `${value} WPM`;
      default:
        return `${value} pts`;
    }
  }

  // Helper to get game ID by type
  private async getGameIdByType(gameType: string): Promise<number> {
    const [game] = await db
      .select()
      .from(games)
      .where(eq(games.type, gameType));
    
    if (!game) {
      throw new Error(`Game type ${gameType} not found`);
    }
    
    return game.id;
  }
  
  // Helper to record a score
  private async recordScore(userId: number, gameType: string, value: number): Promise<void> {
    const gameId = await this.getGameIdByType(gameType);
    
    await db.insert(scores).values({
      userId,
      gameId,
      value
    });
    
    // Update user's games played count
    await db
      .update(users)
      .set({
        gamesPlayed: db.sql`${users.gamesPlayed} + 1`,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }

  // Guessing Game
  async startGuessingGame(userId: number): Promise<any> {
    // Generate random number between 1 and 100
    const targetNumber = Math.floor(Math.random() * 100) + 1;
    
    const gameState = {
      targetNumber,
      attempts: 0,
      maxAttempts: 10,
      previousGuesses: [],
      gameOver: false,
      userId
    };
    
    this.userGames.set(userId, {
      ...this.userGames.get(userId) || {},
      guessing: gameState
    });
    
    // Update user's games played count
    await this.updateUser(userId, {
      gamesPlayed: (await this.getUser(userId))!.gamesPlayed + 1
    });
    
    return { success: true };
  }

  async makeGuess(userId: number, guess: number): Promise<any> {
    const userGames = this.userGames.get(userId);
    if (!userGames || !userGames.guessing) {
      return { error: "No active guessing game found" };
    }
    
    const game = userGames.guessing;
    
    if (game.gameOver) {
      return { error: "Game is already over" };
    }
    
    // Check if guess is in previous guesses
    if (game.previousGuesses.includes(guess)) {
      return { error: "You already tried this number" };
    }
    
    // Record the guess
    game.attempts++;
    game.previousGuesses.push(guess);
    
    // Check result
    let message;
    const targetNumber = game.targetNumber;
    let isCorrect = false;
    
    if (guess === targetNumber) {
      message = "correct";
      isCorrect = true;
      game.gameOver = true;
      
      // Record score (number of attempts taken)
      await this.recordScore(userId, "guessing", game.attempts);
    } else if (guess < targetNumber) {
      message = "too low";
    } else {
      message = "too high";
    }
    
    // Check if out of attempts
    const attemptsLeft = game.maxAttempts - game.attempts;
    if (attemptsLeft <= 0 && !isCorrect) {
      game.gameOver = true;
    }
    
    // Update game state
    this.userGames.set(userId, {
      ...userGames,
      guessing: game
    });
    
    return {
      message,
      isCorrect,
      attemptsLeft,
      previousGuesses: game.previousGuesses,
      correctNumber: game.gameOver ? targetNumber : undefined
    };
  }

  async getGuessingGameStats(userId: number): Promise<any> {
    // Get all guessing game scores for this user
    const gameId = await this.getGameIdByType("guessing");
    
    const userScores = await db
      .select()
      .from(scores)
      .where(eq(scores.userId, userId))
      .where(eq(scores.gameId, gameId));
    
    const gamesPlayed = userScores.length;
    
    // Calculate win rate (in a real app this would be more complex)
    const winRate = gamesPlayed > 0 ? Math.round((gamesPlayed / (gamesPlayed + 2)) * 100) : 0;
    
    // Find best score (lowest attempts)
    let bestScore = Infinity;
    for (const score of userScores) {
      if (score.value < bestScore) {
        bestScore = score.value;
      }
    }
    
    return {
      gamesPlayed,
      winRate,
      bestScore: bestScore === Infinity ? 0 : bestScore
    };
  }

  // Spin Wheel Game
  async spinWheel(userId: number): Promise<any> {
    // Define prizes with their probabilities
    const prizes = [
      { value: 100, label: "100 Points", probability: 0.2 },
      { value: 250, label: "250 Points", probability: 0.15 },
      { value: 500, label: "500 Points", probability: 0.1 },
      { value: 1000, label: "1000 Points", probability: 0.05 },
      { value: 0, label: "Try Again", probability: 0.25 },
      { value: 150, label: "150 Points", probability: 0.15 },
      { value: 750, label: "750 Points", probability: 0.05 },
      { value: 300, label: "300 Points", probability: 0.05 }
    ];
    
    // Select a prize based on probabilities
    const random = Math.random();
    let cumulativeProbability = 0;
    let selectedPrize = prizes[0];
    
    for (const prize of prizes) {
      cumulativeProbability += prize.probability;
      if (random <= cumulativeProbability) {
        selectedPrize = prize;
        break;
      }
    }
    
    // Calculate rotation degrees (multiple of 360 + random offset)
    const baseDegrees = 1800; // 5 full rotations
    const prizeIndex = prizes.indexOf(selectedPrize);
    const degreesPerPrize = 360 / prizes.length;
    const offset = degreesPerPrize * prizeIndex;
    const randomOffset = Math.random() * (degreesPerPrize * 0.8); // Random offset within the prize segment
    
    const degrees = baseDegrees + offset + randomOffset;
    
    // Record score if prize has value
    if (selectedPrize.value > 0) {
      await this.recordScore(userId, "spinwheel", selectedPrize.value);
    }
    
    return {
      prize: selectedPrize.label,
      value: selectedPrize.value,
      degrees
    };
  }

  // Red Light Green Light Game
  async startRedLightGame(userId: number): Promise<any> {
    // Update user's games played count
    await this.updateUser(userId, {
      gamesPlayed: (await this.getUser(userId))!.gamesPlayed + 1
    });
    
    return { success: true };
  }

  async submitRedLightScore(userId: number, time: number): Promise<any> {
    // Record score
    await this.recordScore(userId, "redlight", time);
    
    // Get user stats
    const stats = await this.getRedLightGameStats(userId);
    
    return { success: true, stats };
  }

  async getRedLightGameStats(userId: number): Promise<any> {
    // Get all red light game scores for this user
    const gameId = await this.getGameIdByType("redlight");
    
    const userScores = await db
      .select()
      .from(scores)
      .where(eq(scores.userId, userId))
      .where(eq(scores.gameId, gameId));
    
    const attempts = userScores.length;
    
    // Find best time (lowest time)
    let bestTime = Infinity;
    for (const score of userScores) {
      if (score.value < bestTime) {
        bestTime = score.value;
      }
    }
    
    // Calculate success rate (in a real app this would be more complex)
    const successRate = attempts > 0 ? Math.round((attempts / (attempts + 5)) * 100) : 0;
    
    return {
      attempts,
      bestTime: bestTime === Infinity ? 0.0 : bestTime.toFixed(1),
      successRate
    };
  }

  // Type Racer Game
  async startTypeRacerGame(userId: number): Promise<any> {
    // Array of typing prompts
    const prompts = [
      "The quick brown fox jumps over the lazy dog.",
      "Programming is the art of telling a computer what to do.",
      "Video games are an exciting form of entertainment for people of all ages.",
      "The best way to predict the future is to invent it.",
      "You miss 100% of the shots you don't take."
    ];
    
    // Select a random prompt
    const text = prompts[Math.floor(Math.random() * prompts.length)];
    
    // Update user's games played count
    await this.updateUser(userId, {
      gamesPlayed: (await this.getUser(userId))!.gamesPlayed + 1
    });
    
    return { text };
  }

  async submitTypeRacerScore(userId: number, wpm: number, accuracy: number): Promise<any> {
    // Record score (WPM)
    await this.recordScore(userId, "typeracer", wpm);
    
    // Get leaderboard
    const leaderboard = await this.getTypeRacerLeaderboard();
    
    return { success: true, leaderboard };
  }

  async getTypeRacerLeaderboard(): Promise<any[]> {
    const gameId = await this.getGameIdByType("typeracer");
    
    const typeRacerScores = await db
      .select({
        userId: scores.userId,
        value: scores.value,
        username: users.username
      })
      .from(scores)
      .innerJoin(users, eq(scores.userId, users.id))
      .where(eq(scores.gameId, gameId))
      .orderBy(desc(scores.value));
    
    const result: any[] = [];
    let rank = 1;
    
    // Group by user and take best score
    const userBestScores = new Map<number, number>();
    
    for (const score of typeRacerScores) {
      if (!userBestScores.has(score.userId) || userBestScores.get(score.userId)! < score.value) {
        userBestScores.set(score.userId, score.value);
      }
    }
    
    // Create leaderboard entries
    for (const [userId, value] of [...userBestScores.entries()].sort((a, b) => b[1] - a[1])) {
      const user = typeRacerScores.find(s => s.userId === userId);
      
      if (user) {
        result.push({
          rank: rank++,
          player: user.username,
          wpm: Math.round(value),
          accuracy: 95 // In a real app, this would be stored with the score
        });
      }
    }
    
    // Add some sample data if leaderboard is empty
    if (result.length === 0) {
      result.push(
        { rank: 1, player: "SpeedTyper", wpm: 124, accuracy: 98 },
        { rank: 2, player: "TypeMaster", wpm: 116, accuracy: 96 },
        { rank: 3, player: "KeyboardNinja", wpm: 105, accuracy: 94 }
      );
    }
    
    return result;
  }

  // Bread Game
  async startBreadGame(userId: number): Promise<any> {
    // Update user's games played count
    await this.updateUser(userId, {
      gamesPlayed: (await this.getUser(userId))!.gamesPlayed + 1
    });
    
    return { success: true };
  }

  async submitBreadGameScore(userId: number, score: number): Promise<any> {
    // Record score
    await this.recordScore(userId, "cse17", score);
    
    // Get user's high score
    const stats = await this.getBreadGameStats(userId);
    
    return { success: true, highScore: stats.highScore };
  }

  async getBreadGameStats(userId: number): Promise<any> {
    // Get all bread game scores for this user
    const gameId = await this.getGameIdByType("cse17");
    
    const userScores = await db
      .select()
      .from(scores)
      .where(eq(scores.userId, userId))
      .where(eq(scores.gameId, gameId));
    
    const gamesPlayed = userScores.length;
    
    // Find high score
    let highScore = 0;
    for (const score of userScores) {
      if (score.value > highScore) {
        highScore = score.value;
      }
    }
    
    // Calculate average score
    let totalScore = 0;
    for (const score of userScores) {
      totalScore += score.value;
    }
    const averageScore = gamesPlayed > 0 ? Math.round(totalScore / gamesPlayed) : 0;
    
    return {
      gamesPlayed,
      highScore,
      averageScore
    };
  }
}

// Switch to using the database storage
export const storage = new DatabaseStorage();

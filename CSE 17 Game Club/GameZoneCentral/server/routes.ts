import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { z } from "zod";
import { verifyFirebaseToken } from "./firebase-admin";
import { auth as firebaseAuth } from "./firebase-admin";
import { WebSocketServer } from 'ws';
import WebSocket from 'ws';

// Middleware to ensure authentication (supports both traditional and Firebase auth)
function ensureAuthenticated(req: Request, res: Response, next: Function) {
  // Check for traditional session-based authentication
  if (req.isAuthenticated()) {
    return next();
  }
  
  // Check for Firebase authentication via token
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split('Bearer ')[1];
    firebaseAuth.verifyIdToken(token)
      .then(async (decodedToken) => {
        // Find user by Firebase UID
        const user = await storage.getUserByFirebaseUid(decodedToken.uid);
        if (user) {
          // Set user for this request
          req.user = user;
          return next();
        } else {
          res.status(401).json({ message: "User not found in database" });
        }
      })
      .catch(error => {
        console.error("Firebase auth error:", error);
        res.status(401).json({ message: "Invalid Firebase token" });
      });
  } else {
    res.status(401).json({ message: "Authentication required" });
  }
}

// Middleware to ensure admin role
function ensureAdmin(req: Request, res: Response, next: Function) {
  // First ensure user is authenticated with either method
  ensureAuthenticated(req, res, () => {
    // Then check for admin role
    if (req.user?.role === "admin") {
      return next();
    }
    res.status(403).json({ message: "Admin access required" });
  });
}

// Firebase Authentication middleware
function ensureFirebaseAuth(req: Request, res: Response, next: Function) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: "Firebase authentication required" });
  }

  const token = authHeader.split('Bearer ')[1];
  firebaseAuth.verifyIdToken(token)
    .then(decodedToken => {
      req.firebaseUser = decodedToken;
      next();
    })
    .catch(error => {
      console.error("Firebase auth error:", error);
      res.status(401).json({ message: "Invalid Firebase token" });
    });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup traditional authentication routes
  setupAuth(app);

  // Add Firebase authentication routes
  app.post("/api/user/firebase", verifyFirebaseToken, async (req, res) => {
    try {
      if (!req.firebaseUser || !req.firebaseUser.uid) {
        return res.status(401).json({ message: "Invalid Firebase user data" });
      }
      
      // Find if user already exists by Firebase UID
      let user = await storage.getUserByFirebaseUid(req.firebaseUser.uid);
      
      if (!user) {
        // Generate a username based on email or random string
        const username = req.firebaseUser.email ? 
                        req.firebaseUser.email.split('@')[0] : 
                        `user_${Math.random().toString(36).substring(2, 10)}`;
                        
        // Create new user if doesn't exist
        user = await storage.createUser({
          username: username,
          password: Math.random().toString(36), // Random password (not used with Firebase)
          email: req.firebaseUser.email || '',
          role: "user",
          firebaseUid: req.firebaseUser.uid,
          photoUrl: req.firebaseUser.picture || null
        });
      }
      
      res.json(user);
    } catch (error) {
      console.error("Error handling Firebase user:", error);
      res.status(500).json({ message: "Failed to process Firebase user" });
    }
  });
  
  // Create HTTP server
  const httpServer = createServer(app);
  
  // Create WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Store connected clients
  const connectedClients: Set<WebSocket> = new Set();
  
  // WebSocket connection handler
  wss.on('connection', (ws) => {
    console.log('Client connected to WebSocket');
    connectedClients.add(ws);
    
    // Send initial leaderboard data
    storage.getLeaderboard("all").then(leaderboard => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ 
          type: 'leaderboard', 
          data: leaderboard 
        }));
      }
    });
    
    // Handle messages from clients
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log('Received message:', data);
        
        // Handle different message types if needed
        if (data.type === 'requestLeaderboard') {
          const gameType = data.gameType || 'all';
          storage.getLeaderboard(gameType).then(leaderboard => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ 
                type: 'leaderboard', 
                data: leaderboard 
              }));
            }
          });
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });
    
    // Handle client disconnection
    ws.on('close', () => {
      console.log('Client disconnected from WebSocket');
      connectedClients.delete(ws);
    });
  });
  
  // Function to broadcast winner announcements and leaderboard updates to all clients
  const broadcastLeaderboard = async (gameType = 'all', winnerData: any = null) => {
    const leaderboard = await storage.getLeaderboard(gameType);
    
    // Prepare message with leaderboard data and optional winner announcement
    const message = JSON.stringify({
      type: winnerData ? 'winner' : 'leaderboard',
      data: leaderboard,
      winner: winnerData
    });
    
    // Send to all connected clients
    connectedClients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  };

  // User-related routes
  app.get("/api/admin/users", ensureAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.delete("/api/admin/users/:id", ensureAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      await storage.deleteUser(id);
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  app.get("/api/admin/stats", ensureAdmin, async (req, res) => {
    try {
      const stats = await storage.getAdminStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch admin stats" });
    }
  });

  // Leaderboard routes
  app.get("/api/leaderboard", async (req, res) => {
    try {
      const gameType = req.query.gameType as string || "all";
      const leaderboard = await storage.getLeaderboard(gameType);
      res.json(leaderboard);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch leaderboard" });
    }
  });

  // Games routes
  
  // Guessing Game
  app.post("/api/games/guessing/start", ensureAuthenticated, async (req, res) => {
    try {
      const game = await storage.startGuessingGame(req.user!.id);
      res.json(game);
    } catch (error) {
      res.status(500).json({ message: "Failed to start game" });
    }
  });

  app.post("/api/games/guessing/guess", ensureAuthenticated, async (req, res) => {
    try {
      const schema = z.object({
        guess: z.number().min(1).max(100)
      });
      const { guess } = schema.parse(req.body);
      
      const result = await storage.makeGuess(req.user!.id, guess);
      res.json(result);
    } catch (error) {
      res.status(400).json({ message: "Invalid guess" });
    }
  });

  app.post("/api/games/guessing/new", ensureAuthenticated, async (req, res) => {
    try {
      const game = await storage.startGuessingGame(req.user!.id);
      res.json(game);
    } catch (error) {
      res.status(500).json({ message: "Failed to start new game" });
    }
  });

  app.get("/api/games/guessing/stats", ensureAuthenticated, async (req, res) => {
    try {
      const stats = await storage.getGuessingGameStats(req.user!.id);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch game stats" });
    }
  });

  // Spin Wheel Game
  app.post("/api/games/spinwheel/spin", ensureAuthenticated, async (req, res) => {
    try {
      const result = await storage.spinWheel(req.user!.id);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to spin wheel" });
    }
  });

  // Red Light Green Light Game
  app.post("/api/games/redlight/start", ensureAuthenticated, async (req, res) => {
    try {
      const game = await storage.startRedLightGame(req.user!.id);
      res.json(game);
    } catch (error) {
      res.status(500).json({ message: "Failed to start game" });
    }
  });

  app.post("/api/games/redlight/score", ensureAuthenticated, async (req, res) => {
    try {
      const schema = z.object({
        time: z.string()
      });
      const { time } = schema.parse(req.body);
      
      const result = await storage.submitRedLightScore(req.user!.id, parseFloat(time));
      res.json(result);
    } catch (error) {
      res.status(400).json({ message: "Invalid score submission" });
    }
  });

  app.get("/api/games/redlight/stats", ensureAuthenticated, async (req, res) => {
    try {
      const stats = await storage.getRedLightGameStats(req.user!.id);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch game stats" });
    }
  });

  // Type Racer Game
  app.post("/api/games/typeracer/start", ensureAuthenticated, async (req, res) => {
    try {
      const game = await storage.startTypeRacerGame(req.user!.id);
      res.json(game);
    } catch (error) {
      res.status(500).json({ message: "Failed to start game" });
    }
  });

  app.post("/api/games/typeracer/score", ensureAuthenticated, async (req, res) => {
    try {
      const schema = z.object({
        wpm: z.number().min(0),
        accuracy: z.number().min(0).max(100)
      });
      const { wpm, accuracy } = schema.parse(req.body);
      
      const result = await storage.submitTypeRacerScore(req.user!.id, wpm, accuracy);
      
      // Broadcast winner announcement if high score is achieved
      if (result.isHighScore) {
        const winnerData = {
          player: req.user!.username,
          game: "Type Racer",
          gameType: "typeracer",
          score: `${wpm} WPM`,
          message: `${req.user!.username} just achieved a new high score of ${wpm} WPM with ${accuracy}% accuracy in Type Racer!`
        };
        
        // Broadcast to all connected clients
        await broadcastLeaderboard("typeracer", winnerData);
      }
      
      res.json(result);
    } catch (error) {
      res.status(400).json({ message: "Invalid score submission" });
    }
  });

  app.get("/api/games/typeracer/leaderboard", async (req, res) => {
    try {
      const leaderboard = await storage.getTypeRacerLeaderboard();
      res.json(leaderboard);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch leaderboard" });
    }
  });

  // Bread Game
  app.post("/api/games/bread/start", ensureAuthenticated, async (req, res) => {
    try {
      const game = await storage.startBreadGame(req.user!.id);
      res.json(game);
    } catch (error) {
      res.status(500).json({ message: "Failed to start game" });
    }
  });

  app.post("/api/games/bread/score", ensureAuthenticated, async (req, res) => {
    try {
      const schema = z.object({
        score: z.number().min(0)
      });
      const { score } = schema.parse(req.body);
      
      const result = await storage.submitBreadGameScore(req.user!.id, score);
      
      // Broadcast winner announcement if high score is achieved
      if (result.isHighScore) {
        const winnerData = {
          player: req.user!.username,
          game: "CSE-17 Bread Game",
          gameType: "cse17",
          score: result.score,
          message: `${req.user!.username} just achieved a new high score of ${result.score} in the Bread Game!`
        };
        
        // Broadcast to all connected clients
        await broadcastLeaderboard("cse17", winnerData);
      }
      
      res.json(result);
    } catch (error) {
      res.status(400).json({ message: "Invalid score submission" });
    }
  });

  app.get("/api/games/bread/stats", ensureAuthenticated, async (req, res) => {
    try {
      const stats = await storage.getBreadGameStats(req.user!.id);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch game stats" });
    }
  });

  return httpServer;
}

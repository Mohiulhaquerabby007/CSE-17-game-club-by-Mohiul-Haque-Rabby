import { pgTable, text, serial, integer, boolean, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User roles
export type UserRole = "user" | "mediator" | "admin";

// Game types
export type GameType = "guessing" | "spinwheel" | "redlight" | "typeracer" | "cse17";

// Users Table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(), 
  password: text("password").notNull(), // Kept for backward compatibility
  email: text("email"),
  role: text("role").notNull().default("user"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  gamesPlayed: integer("games_played").notNull().default(0),
  firebaseUid: text("firebase_uid"), // No unique constraint for migration
  photoUrl: text("photo_url"),
});

// Games Table
export const games = pgTable("games", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Scores Table
export const scores = pgTable("scores", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  gameId: integer("game_id")
    .notNull()
    .references(() => games.id),
  value: real("value").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Insert Schemas
export const insertUserSchema = createInsertSchema(users).extend({
  role: z.enum(["user", "mediator", "admin"]).optional(),
  confirmPassword: z.string().optional(),
});

export const insertGameSchema = createInsertSchema(games);

export const insertScoreSchema = createInsertSchema(scores);

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Game = typeof games.$inferSelect;
export type InsertGame = z.infer<typeof insertGameSchema>;

export type Score = typeof scores.$inferSelect;
export type InsertScore = z.infer<typeof insertScoreSchema>;

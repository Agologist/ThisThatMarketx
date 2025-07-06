import { pgTable, text, serial, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User model
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  displayName: text("display_name"),
  provider: text("provider").default("local"),
  profileImageUrl: text("profile_image_url"),
  firebaseUid: text("firebase_uid").unique(),
  photoURL: text("photo_url"),
  replitId: text("replit_id").unique(),
  solanaWallet: text("solana_wallet"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  displayName: true,
  provider: true,
  profileImageUrl: true,
  firebaseUid: true,
  photoURL: true,
  replitId: true,
  solanaWallet: true,
});

// Poll model
export const polls = pgTable("polls", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  question: text("question").notNull(),
  optionAText: text("option_a_text").notNull(),
  optionAImage: text("option_a_image"),
  optionBText: text("option_b_text").notNull(),
  optionBImage: text("option_b_image"),
  optionAVotes: integer("option_a_votes").default(0),
  optionBVotes: integer("option_b_votes").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  endTime: timestamp("end_time").notNull(),
  isPublic: boolean("is_public").default(true),

  memeCoinMode: boolean("meme_coin_mode").default(false),
  creatorWallet: text("creator_wallet"),
});

export const insertPollSchema = createInsertSchema(polls)
  .pick({
    userId: true,
    question: true,
    optionAText: true,
    optionAImage: true,
    optionBText: true,
    optionBImage: true,
    endTime: true,
    isPublic: true,

    memeCoinMode: true,
    creatorWallet: true,
  })
  .extend({
    // Allow endTime to be a string (ISO format) or Date object
    endTime: z.union([z.string(), z.date()]),
  });

// Vote model
export const votes = pgTable("votes", {
  id: serial("id").primaryKey(),
  pollId: integer("poll_id").notNull(),
  userId: integer("user_id").notNull(),
  option: text("option").notNull(), // "A" or "B"
  votedAt: timestamp("voted_at").defaultNow(),
});

export const insertVoteSchema = createInsertSchema(votes).pick({
  pollId: true,
  userId: true,
  option: true,
});

// Achievement model
export const achievements = pgTable("achievements", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  iconName: text("icon_name").notNull(),
  criteria: text("criteria").notNull(), // e.g., "create_poll_5", "win_race_10"
});

// User Achievement model
export const userAchievements = pgTable("user_achievements", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  achievementId: integer("achievement_id").notNull(),
  unlockedAt: timestamp("unlocked_at").defaultNow(),
  progress: integer("progress").default(0),
  completed: boolean("completed").default(false),
});

export const insertUserAchievementSchema = createInsertSchema(userAchievements).pick({
  userId: true,
  achievementId: true,
  progress: true,
  completed: true,
});

// Race record model
export const raceRecords = pgTable("race_records", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  time: integer("time").notNull(), // time in milliseconds
  won: boolean("won").default(false),
  racedAt: timestamp("raced_at").defaultNow(),
  pollId: integer("poll_id"),
  option: text("option"),
});

export const insertRaceRecordSchema = createInsertSchema(raceRecords).pick({
  userId: true,
  time: true,
  won: true,
  pollId: true,
  option: true,
});

// Type definitions
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertPoll = z.infer<typeof insertPollSchema>;
export type Poll = typeof polls.$inferSelect;

export type InsertVote = z.infer<typeof insertVoteSchema>;
export type Vote = typeof votes.$inferSelect;

export type Achievement = typeof achievements.$inferSelect;

export type InsertUserAchievement = z.infer<typeof insertUserAchievementSchema>;
export type UserAchievement = typeof userAchievements.$inferSelect;

export type InsertRaceRecord = z.infer<typeof insertRaceRecordSchema>;
export type RaceRecord = typeof raceRecords.$inferSelect;

// Generated Coins model - tracks coins created for user votes
export const generatedCoins = pgTable("generated_coins", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  pollId: integer("poll_id").notNull(),
  option: text("option").notNull(), // 'A' or 'B'
  coinName: text("coin_name").notNull(),
  coinSymbol: text("coin_symbol").notNull(),
  coinAddress: text("coin_address").notNull(),
  userWallet: text("user_wallet").notNull(),
  transactionHash: text("transaction_hash"),
  createdAt: timestamp("created_at").defaultNow(),
  status: text("status").default("pending"), // pending, created, failed
});

export const insertGeneratedCoinSchema = createInsertSchema(generatedCoins).pick({
  userId: true,
  pollId: true,
  option: true,
  coinName: true,
  coinSymbol: true,
  coinAddress: true,
  userWallet: true,
  transactionHash: true,
  status: true,
});

export type InsertGeneratedCoin = z.infer<typeof insertGeneratedCoinSchema>;
export type GeneratedCoin = typeof generatedCoins.$inferSelect;

// MemeCoin Package model for USDT payments
export const memeCoinPackages = pgTable("meme_coin_packages", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  packageType: text("package_type").notNull().default("3_polls"), // "3_polls", "10_polls", etc.
  totalPolls: integer("total_polls").notNull().default(3),
  usedPolls: integer("used_polls").notNull().default(0),
  remainingPolls: integer("remaining_polls").notNull().default(3),
  paymentTxHash: text("payment_tx_hash").notNull(), // USDT transaction hash on Polygon
  paymentAmount: text("payment_amount").notNull(), // Amount in USDT
  paymentToken: text("payment_token").notNull().default("USDT"), // Payment token used
  paymentChain: text("payment_chain").notNull().default("polygon"), // blockchain used for payment
  status: text("status").notNull().default("active"), // active, expired, used_up
  purchasedAt: timestamp("purchased_at").defaultNow(),
  expiresAt: timestamp("expires_at"), // optional expiration
});

export const insertMemeCoinPackageSchema = createInsertSchema(memeCoinPackages).pick({
  userId: true,
  packageType: true,
  totalPolls: true,
  usedPolls: true,
  remainingPolls: true,
  paymentTxHash: true,
  paymentAmount: true,
  paymentToken: true,
  paymentChain: true,
  status: true,
  expiresAt: true,
});

export type InsertMemeCoinPackage = z.infer<typeof insertMemeCoinPackageSchema>;
export type MemeCoinPackage = typeof memeCoinPackages.$inferSelect;

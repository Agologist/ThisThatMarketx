import { 
  User, InsertUser, Poll, InsertPoll, Vote, InsertVote, 
  Achievement, UserAchievement, InsertUserAchievement, RaceRecord, InsertRaceRecord,
  GeneratedCoin, InsertGeneratedCoin, MemeCoinPackage, InsertMemeCoinPackage,
  users, polls, votes, achievements, userAchievements, raceRecords, generatedCoins, memeCoinPackages
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
import connectPg from "connect-pg-simple";
import { db, pool } from "./db";
import { desc, eq, and } from "drizzle-orm";

const MemoryStore = createMemoryStore(session);
const PostgresSessionStore = connectPg(session);

// modify the interface with any CRUD methods
// you might need
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined>;
  getUserByReplitId(replitId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Poll methods
  getPolls(): Promise<Poll[]>;
  getPoll(id: number): Promise<Poll | undefined>;
  getUserPolls(userId: number): Promise<Poll[]>;
  createPoll(poll: InsertPoll): Promise<Poll>;
  incrementPollVote(pollId: number, option: string): Promise<void>;
  decrementPollVote(pollId: number, option: string): Promise<void>;
  
  // Vote methods
  createVote(vote: InsertVote): Promise<Vote>;
  getUserVoteForPoll(userId: number, pollId: number): Promise<Vote | undefined>;
  getUserVotes(userId: number): Promise<Vote[]>;
  deleteVote(id: number): Promise<void>;
  
  // Race methods
  createRaceRecord(record: InsertRaceRecord): Promise<RaceRecord>;
  getUserRaces(userId: number): Promise<RaceRecord[]>;
  
  // Achievement methods
  getAchievements(): Promise<Achievement[]>;
  getAchievementsByCriteria(criteria: string[]): Promise<Achievement[]>;
  getUserAchievements(userId: number): Promise<(UserAchievement & Achievement)[]>;
  getUserAchievement(userId: number, achievementId: number): Promise<UserAchievement | undefined>;
  createUserAchievement(userAchievement: InsertUserAchievement): Promise<UserAchievement>;
  updateUserAchievement(id: number, data: Partial<UserAchievement>): Promise<UserAchievement>;
  
  // Generated Coin methods
  createGeneratedCoin(coin: InsertGeneratedCoin): Promise<GeneratedCoin>;
  getUserGeneratedCoins(userId: number): Promise<GeneratedCoin[]>;
  getPollGeneratedCoins(pollId: number): Promise<GeneratedCoin[]>;
  getUserCoinForPoll(userId: number, pollId: number, option: string): Promise<GeneratedCoin | undefined>;
  getGeneratedCoinsByName(name: string): Promise<GeneratedCoin[]>;
  
  // MemeCoin Package methods
  createMemeCoinPackage(packageData: InsertMemeCoinPackage): Promise<MemeCoinPackage>;
  getUserActivePackage(userId: number): Promise<MemeCoinPackage | undefined>;
  getUserPackages(userId: number): Promise<MemeCoinPackage[]>;
  consumePackageUsage(packageId: number): Promise<void>;
  getPackageByTxHash(txHash: string): Promise<MemeCoinPackage | undefined>;
  updatePackageStatus(packageId: number, status: string): Promise<void>;
  
  // Session store
  sessionStore: any; // Using any to avoid type conflicts with session store
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private polls: Map<number, Poll>;
  private votes: Map<number, Vote>;
  private raceRecords: Map<number, RaceRecord>;
  private achievements: Map<number, Achievement>;
  private userAchievements: Map<number, UserAchievement>;
  private generatedCoins: Map<number, GeneratedCoin>;
  private memeCoinPackages: Map<number, MemeCoinPackage>;
  
  sessionStore: any; // Using any to avoid type conflicts with session store
  currentId: { [key: string]: number };

  constructor() {
    this.users = new Map();
    this.polls = new Map();
    this.votes = new Map();
    this.raceRecords = new Map();
    this.achievements = new Map();
    this.userAchievements = new Map();
    this.generatedCoins = new Map();
    this.memeCoinPackages = new Map();
    
    this.currentId = {
      users: 1,
      polls: 1,
      votes: 1,
      raceRecords: 1,
      achievements: 1,
      userAchievements: 1,
      generatedCoins: 1,
      memeCoinPackages: 1
    };
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // Prune expired entries every 24h
    });
    
    // Seed achievements
    this.seedAchievements();
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username.toLowerCase() === username.toLowerCase(),
    );
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email.toLowerCase() === email.toLowerCase(),
    );
  }
  
  async getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.firebaseUid === firebaseUid
    );
  }
  
  async getUserByReplitId(replitId: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.replitId === replitId
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId.users++;
    const now = new Date();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  // Poll methods
  async getPolls(): Promise<Poll[]> {
    return Array.from(this.polls.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  
  async getPoll(id: number): Promise<Poll | undefined> {
    return this.polls.get(id);
  }
  
  async getUserPolls(userId: number): Promise<Poll[]> {
    return Array.from(this.polls.values())
      .filter(poll => poll.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  
  async createPoll(insertPoll: InsertPoll): Promise<Poll> {
    try {
      console.log("Creating poll in memory storage with data:", insertPoll);
      
      const id = this.currentId.polls++;
      const now = new Date();
      
      // Ensure all optional fields are explicitly null if undefined
      const sanitizedData = {
        ...insertPoll,
        optionAImage: insertPoll.optionAImage || null,
        optionBImage: insertPoll.optionBImage || null,
        isPublic: insertPoll.isPublic ?? true,
        isWar: insertPoll.isWar ?? false,
      };
      
      // Parse the endTime string to a Date object if it's not already
      let endTime: Date;
      if (typeof sanitizedData.endTime === 'string') {
        endTime = new Date(sanitizedData.endTime);
      } else if (sanitizedData.endTime instanceof Date) {
        endTime = sanitizedData.endTime;
      } else {
        throw new Error("Invalid endTime format");
      }
      
      // Log time debug information to trace the issue
      console.log("Poll time debug:", {
        method: "createPoll",
        nowRaw: now,
        nowIso: now.toISOString(),
        endTimeRaw: endTime,
        endTimeIso: endTime.toISOString(),
        diffMs: endTime.getTime() - now.getTime(),
        diffMinutes: (endTime.getTime() - now.getTime()) / (1000 * 60)
      });
      
      const poll: Poll = { 
        ...sanitizedData,
        endTime, // Use the parsed Date object 
        id, 
        createdAt: now, 
        optionAVotes: 0, 
        optionBVotes: 0 
      };
      
      this.polls.set(id, poll);
      console.log("Poll created successfully with id:", id);
      return poll;
    } catch (error) {
      console.error("Error creating poll in memory storage:", error);
      throw error;
    }
  }
  
  async incrementPollVote(pollId: number, option: string): Promise<void> {
    const poll = this.polls.get(pollId);
    if (!poll) return;
    
    if (option === "A") {
      poll.optionAVotes += 1;
    } else if (option === "B") {
      poll.optionBVotes += 1;
    }
    
    this.polls.set(pollId, poll);
  }
  
  async decrementPollVote(pollId: number, option: string): Promise<void> {
    const poll = this.polls.get(pollId);
    if (!poll) return;
    
    if (option === "A" && poll.optionAVotes > 0) {
      poll.optionAVotes -= 1;
    } else if (option === "B" && poll.optionBVotes > 0) {
      poll.optionBVotes -= 1;
    }
    
    this.polls.set(pollId, poll);
    console.log(`Decremented vote for poll ${pollId}, option ${option}. New counts: A=${poll.optionAVotes}, B=${poll.optionBVotes}`);
  }
  
  // Vote methods
  async createVote(insertVote: InsertVote): Promise<Vote> {
    const id = this.currentId.votes++;
    const now = new Date();
    const vote: Vote = { ...insertVote, id, votedAt: now };
    this.votes.set(id, vote);
    return vote;
  }
  
  async getUserVoteForPoll(userId: number, pollId: number): Promise<Vote | undefined> {
    console.log(`Checking for vote: userId=${userId}, pollId=${pollId}`);
    console.log(`Total votes in storage: ${this.votes.size}`);
    
    // List all votes for debugging
    if (this.votes.size > 0) {
      console.log("Current votes in storage:");
      Array.from(this.votes.values()).forEach(vote => {
        console.log(`Vote ID: ${vote.id}, UserID: ${vote.userId}, PollID: ${vote.pollId}, Option: ${vote.option}`);
      });
    }
    
    // Check for votes for this poll
    const votesForPoll = Array.from(this.votes.values()).filter(
      vote => vote.pollId === pollId
    );
    console.log(`Votes for this poll: ${votesForPoll.length}`);
    
    // Find the user's vote
    const userVote = Array.from(this.votes.values()).find(
      vote => vote.userId === userId && vote.pollId === pollId
    );
    
    console.log(`Found vote for user ${userId} on poll ${pollId}: ${userVote ? 'Yes' : 'No'}`);
    
    return userVote;
  }
  
  async getUserVotes(userId: number): Promise<Vote[]> {
    return Array.from(this.votes.values())
      .filter(vote => vote.userId === userId)
      .sort((a, b) => new Date(b.votedAt).getTime() - new Date(a.votedAt).getTime());
  }
  
  async deleteVote(id: number): Promise<void> {
    console.log(`Deleting vote with id ${id}`);
    if (this.votes.has(id)) {
      this.votes.delete(id);
      console.log(`Vote ${id} deleted successfully`);
    } else {
      console.log(`Vote ${id} not found for deletion`);
    }
  }
  
  // Race methods
  async createRaceRecord(insertRecord: InsertRaceRecord): Promise<RaceRecord> {
    const id = this.currentId.raceRecords++;
    const now = new Date();
    
    // Ensure all fields are provided with proper defaults
    const record: RaceRecord = { 
      id, 
      userId: insertRecord.userId,
      time: insertRecord.time,
      won: insertRecord.won ?? false,
      racedAt: now,
      pollId: insertRecord.pollId ?? null,
      option: insertRecord.option ?? null
    };
    
    console.log("Creating race record:", record);
    
    this.raceRecords.set(id, record);
    return record;
  }
  
  async getUserRaces(userId: number): Promise<RaceRecord[]> {
    return Array.from(this.raceRecords.values())
      .filter(record => record.userId === userId)
      .sort((a, b) => new Date(b.racedAt).getTime() - new Date(a.racedAt).getTime());
  }
  
  // Achievement methods
  async getAchievements(): Promise<Achievement[]> {
    return Array.from(this.achievements.values());
  }
  
  async getAchievementsByCriteria(criteria: string[]): Promise<Achievement[]> {
    return Array.from(this.achievements.values())
      .filter(achievement => criteria.some(c => achievement.criteria.includes(c)));
  }
  
  async getUserAchievements(userId: number): Promise<(UserAchievement & Achievement)[]> {
    const userAchievementsList = Array.from(this.userAchievements.values())
      .filter(ua => ua.userId === userId);
    
    return userAchievementsList.map(ua => {
      const achievement = this.achievements.get(ua.achievementId);
      if (!achievement) throw new Error(`Achievement ${ua.achievementId} not found`);
      return { ...ua, ...achievement };
    });
  }
  
  async getUserAchievement(userId: number, achievementId: number): Promise<UserAchievement | undefined> {
    return Array.from(this.userAchievements.values()).find(
      ua => ua.userId === userId && ua.achievementId === achievementId
    );
  }
  
  async createUserAchievement(insertUA: InsertUserAchievement): Promise<UserAchievement> {
    const id = this.currentId.userAchievements++;
    const now = new Date();
    const userAchievement: UserAchievement = { ...insertUA, id, unlockedAt: now };
    this.userAchievements.set(id, userAchievement);
    return userAchievement;
  }
  
  async updateUserAchievement(id: number, data: Partial<UserAchievement>): Promise<UserAchievement> {
    const ua = this.userAchievements.get(id);
    if (!ua) throw new Error(`User achievement ${id} not found`);
    
    const updated = { ...ua, ...data };
    this.userAchievements.set(id, updated);
    return updated;
  }

  // Generated Coin methods
  async createGeneratedCoin(insertCoin: InsertGeneratedCoin): Promise<GeneratedCoin> {
    const id = this.currentId.generatedCoins++;
    const now = new Date();
    const coin: GeneratedCoin = { 
      ...insertCoin, 
      id, 
      createdAt: now,
      status: insertCoin.status || 'created'
    };
    this.generatedCoins.set(id, coin);
    return coin;
  }

  async getUserGeneratedCoins(userId: number): Promise<GeneratedCoin[]> {
    return Array.from(this.generatedCoins.values())
      .filter(coin => coin.userId === userId);
  }

  async getPollGeneratedCoins(pollId: number): Promise<GeneratedCoin[]> {
    return Array.from(this.generatedCoins.values())
      .filter(coin => coin.pollId === pollId);
  }

  async getUserCoinForPoll(userId: number, pollId: number, option: string): Promise<GeneratedCoin | undefined> {
    return Array.from(this.generatedCoins.values())
      .find(coin => coin.userId === userId && coin.pollId === pollId && coin.option === option);
  }

  async getGeneratedCoinsByName(name: string): Promise<GeneratedCoin[]> {
    return Array.from(this.generatedCoins.values())
      .filter(coin => coin.coinName === name);
  }

  // MemeCoin Package methods
  async createMemeCoinPackage(packageData: InsertMemeCoinPackage): Promise<MemeCoinPackage> {
    const id = this.currentId.memeCoinPackages++;
    const packageRecord: MemeCoinPackage = {
      ...packageData,
      id,
      purchasedAt: new Date()
    };
    this.memeCoinPackages.set(id, packageRecord);
    return packageRecord;
  }

  async getUserActivePackage(userId: number): Promise<MemeCoinPackage | undefined> {
    const userPackages = Array.from(this.memeCoinPackages.values())
      .filter(pkg => pkg.userId === userId && pkg.status === 'active')
      .sort((a, b) => b.purchasedAt.getTime() - a.purchasedAt.getTime());
    
    // Find package with remaining polls
    const activePackage = userPackages.find(pkg => pkg.remainingPolls > 0);
    return activePackage;
  }

  async getUserPackages(userId: number): Promise<MemeCoinPackage[]> {
    return Array.from(this.memeCoinPackages.values())
      .filter(pkg => pkg.userId === userId)
      .sort((a, b) => b.purchasedAt.getTime() - a.purchasedAt.getTime());
  }

  async consumePackageUsage(packageId: number): Promise<void> {
    const packageRecord = this.memeCoinPackages.get(packageId);
    if (packageRecord) {
      const newUsedPolls = packageRecord.usedPolls + 1;
      const newRemainingPolls = packageRecord.remainingPolls - 1;
      const newStatus = newRemainingPolls <= 0 ? 'used_up' : 'active';

      this.memeCoinPackages.set(packageId, {
        ...packageRecord,
        usedPolls: newUsedPolls,
        remainingPolls: newRemainingPolls,
        status: newStatus
      });
    }
  }

  async getPackageByTxHash(txHash: string): Promise<MemeCoinPackage | undefined> {
    return Array.from(this.memeCoinPackages.values())
      .find(pkg => pkg.paymentTxHash === txHash);
  }

  async updatePackageStatus(packageId: number, status: string): Promise<void> {
    const packageRecord = this.memeCoinPackages.get(packageId);
    if (packageRecord) {
      this.memeCoinPackages.set(packageId, { ...packageRecord, status });
    }
  }
  
  // Seed initial achievements
  private seedAchievements() {
    const achievementsData: Omit<Achievement, 'id'>[] = [
      {
        name: 'Poll Creator',
        description: 'Create your first poll',
        iconName: 'poll',
        criteria: 'create_poll_1',
      },
      {
        name: 'Poll Star',
        description: 'Create 5 polls',
        iconName: 'star',
        criteria: 'create_poll_5',
      },
      {
        name: 'Voting Machine',
        description: 'Vote in 10 polls',
        iconName: 'vote-yea',
        criteria: 'vote_10',
      },
      {
        name: 'First Race',
        description: 'Complete your first race',
        iconName: 'flag-checkered',
        criteria: 'race_complete',
      },
      {
        name: 'Speedy',
        description: 'Complete a race in under 10 seconds',
        iconName: 'tachometer-alt',
        criteria: 'race_time_10',
      },
      {
        name: 'Champion',
        description: 'Win 5 races',
        iconName: 'trophy',
        criteria: 'race_win',
      },
    ];
    
    achievementsData.forEach((achievement, index) => {
      const id = index + 1;
      this.achievements.set(id, { ...achievement, id });
      this.currentId.achievements = id + 1;
    });
  }
}

export class DatabaseStorage implements IStorage {
  sessionStore: any; // Using any to avoid type conflicts with session store

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
    
    // Seed achievements if needed
    this.seedAchievementsIfEmpty();
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }
  
  async getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.firebaseUid, firebaseUid));
    return user;
  }
  
  async getUserByReplitId(replitId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.replitId, replitId));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }
  
  // Poll methods
  async getPolls(): Promise<Poll[]> {
    return db.select().from(polls).orderBy(desc(polls.createdAt));
  }
  
  async getPoll(id: number): Promise<Poll | undefined> {
    const [poll] = await db.select().from(polls).where(eq(polls.id, id));
    return poll;
  }
  
  async getUserPolls(userId: number): Promise<Poll[]> {
    return db.select().from(polls)
      .where(eq(polls.userId, userId))
      .orderBy(desc(polls.createdAt));
  }
  
  async createPoll(insertPoll: InsertPoll): Promise<Poll> {
    try {
      console.log("Creating poll in storage with data:", insertPoll);
      
      // Ensure all optional fields are explicitly null if undefined
      const sanitizedData = {
        ...insertPoll,
        optionAImage: insertPoll.optionAImage || null,
        optionBImage: insertPoll.optionBImage || null,
        isPublic: insertPoll.isPublic ?? true,
        isWar: insertPoll.isWar ?? false,
      };
      
      // Parse the endTime string to a Date object if it's not already
      let endTime: Date;
      if (typeof sanitizedData.endTime === 'string') {
        endTime = new Date(sanitizedData.endTime);
      } else if (sanitizedData.endTime instanceof Date) {
        endTime = sanitizedData.endTime;
      } else {
        throw new Error("Invalid endTime format");
      }
      
      const now = new Date();
      
      // Log time debug information to trace the issue
      console.log("Poll time debug (database):", {
        method: "createPoll",
        nowRaw: now,
        nowIso: now.toISOString(),
        endTimeRaw: endTime,
        endTimeIso: endTime.toISOString(),
        diffMs: endTime.getTime() - now.getTime(),
        diffMinutes: (endTime.getTime() - now.getTime()) / (1000 * 60)
      });
      
      const [poll] = await db.insert(polls).values({
        ...sanitizedData,
        endTime, // Use the proper Date object
        optionAVotes: 0,
        optionBVotes: 0,
        createdAt: now
      }).returning();
      
      console.log("Poll created successfully with id:", poll.id);
      return poll;
    } catch (error) {
      console.error("Error creating poll in storage:", error);
      throw error;
    }
  }
  
  async incrementPollVote(pollId: number, option: string): Promise<void> {
    const [poll] = await db.select().from(polls).where(eq(polls.id, pollId));
    if (!poll) {
      console.log(`DB: Poll ${pollId} not found for vote increment`);
      return;
    }
    
    console.log(`DB: Incrementing vote for poll ${pollId}, option ${option}. Current counts - A:${poll.optionAVotes}, B:${poll.optionBVotes}`);
    
    if (option === "A") {
      const newCount = (poll.optionAVotes || 0) + 1;
      await db.update(polls)
        .set({ optionAVotes: newCount })
        .where(eq(polls.id, pollId));
      console.log(`DB: Updated option A count to ${newCount}`);
    } else if (option === "B") {
      const newCount = (poll.optionBVotes || 0) + 1;
      await db.update(polls)
        .set({ optionBVotes: newCount })
        .where(eq(polls.id, pollId));
      console.log(`DB: Updated option B count to ${newCount}`);
    }
  }
  
  async decrementPollVote(pollId: number, option: string): Promise<void> {
    const [poll] = await db.select().from(polls).where(eq(polls.id, pollId));
    if (!poll) return;
    
    if (option === "A" && (poll.optionAVotes || 0) > 0) {
      await db.update(polls)
        .set({ optionAVotes: (poll.optionAVotes || 0) - 1 })
        .where(eq(polls.id, pollId));
      console.log(`DB: Decremented vote for poll ${pollId}, option A. New count: ${(poll.optionAVotes || 0) - 1}`);
    } else if (option === "B" && (poll.optionBVotes || 0) > 0) {
      await db.update(polls)
        .set({ optionBVotes: (poll.optionBVotes || 0) - 1 })
        .where(eq(polls.id, pollId));
      console.log(`DB: Decremented vote for poll ${pollId}, option B. New count: ${(poll.optionBVotes || 0) - 1}`);
    }
  }
  
  // Vote methods
  async createVote(insertVote: InsertVote): Promise<Vote> {
    console.log(`DB: Creating vote with data:`, insertVote);
    try {
      const voteToInsert = {
        ...insertVote,
        votedAt: new Date()
      };
      console.log(`DB: Vote data to insert:`, voteToInsert);
      
      const [vote] = await db.insert(votes).values(voteToInsert).returning();
      console.log(`DB: Vote successfully inserted:`, vote);
      return vote;
    } catch (error) {
      console.error("DB: Error creating vote:", error);
      throw error;
    }
  }
  
  async getUserVoteForPoll(userId: number, pollId: number): Promise<Vote | undefined> {
    console.log(`DB: Checking for vote: userId=${userId}, pollId=${pollId}`);
    
    try {
      // Get all votes for debugging
      const allVotes = await db.select().from(votes);
      console.log(`DB: Total votes in database: ${allVotes.length}`);
      
      if (allVotes.length > 0) {
        console.log("DB: Current votes in database:");
        allVotes.forEach(vote => {
          console.log(`Vote ID: ${vote.id}, UserID: ${vote.userId}, PollID: ${vote.pollId}, Option: ${vote.option}`);
        });
      }
      
      // Get all votes for this poll
      const pollVotes = await db.select().from(votes).where(eq(votes.pollId, pollId));
      console.log(`DB: Votes for this poll: ${pollVotes.length}`);
      if (pollVotes.length > 0) {
        console.log("DB: Found poll votes:", pollVotes.map(v => `ID:${v.id}, UserID:${v.userId}, PollID:${v.pollId}, Option:${v.option}`));
      }
      
      // Find the specific vote
      const [vote] = await db.select().from(votes)
        .where(and(eq(votes.userId, userId), eq(votes.pollId, pollId)));
      
      console.log(`DB: Found vote for user ${userId} on poll ${pollId}: ${vote ? 'Yes' : 'No'}`);
      return vote;
    } catch (error) {
      console.error("DB: Error checking for vote:", error);
      return undefined;
    }
  }
  
  async getUserVotes(userId: number): Promise<Vote[]> {
    try {
      const userVotes = await db.select().from(votes)
        .where(eq(votes.userId, userId))
        .orderBy(desc(votes.votedAt));
      return userVotes;
    } catch (error) {
      console.error("DB: Error getting user votes:", error);
      return [];
    }
  }
  
  async deleteVote(id: number): Promise<void> {
    console.log(`DB: Deleting vote with id ${id}`);
    try {
      const result = await db.delete(votes).where(eq(votes.id, id)).returning();
      console.log(`DB: Vote deletion result:`, result);
    } catch (error) {
      console.error(`DB: Error deleting vote ${id}:`, error);
    }
  }
  
  // Race methods
  async createRaceRecord(insertRecord: InsertRaceRecord): Promise<RaceRecord> {
    console.log("Creating race record in database:", insertRecord);
    
    // Ensure all required fields are provided with proper defaults
    const recordToInsert = {
      userId: insertRecord.userId,
      time: insertRecord.time,
      won: insertRecord.won ?? false,
      pollId: insertRecord.pollId || null,
      option: insertRecord.option || null,
      racedAt: new Date()
    };
    
    const [record] = await db.insert(raceRecords)
      .values(recordToInsert)
      .returning();
      
    console.log("Race record created in database:", record);
    return record;
  }
  
  async getUserRaces(userId: number): Promise<RaceRecord[]> {
    return db.select().from(raceRecords)
      .where(eq(raceRecords.userId, userId))
      .orderBy(desc(raceRecords.racedAt));
  }
  
  // Achievement methods
  async getAchievements(): Promise<Achievement[]> {
    return db.select().from(achievements);
  }
  
  async getAchievementsByCriteria(criteria: string[]): Promise<Achievement[]> {
    // Note: This is a simplified implementation that won't work exactly like the memory one
    // In a real DB, you'd need a more complex query or a different schema design
    const allAchievements = await db.select().from(achievements);
    return allAchievements.filter(achievement => 
      criteria.some(c => achievement.criteria.includes(c))
    );
  }
  
  async getUserAchievements(userId: number): Promise<(UserAchievement & Achievement)[]> {
    // Join userAchievements with achievements to get full data
    const result = await db.select({
      ...userAchievements,
      name: achievements.name,
      description: achievements.description,
      iconName: achievements.iconName,
      criteria: achievements.criteria
    })
    .from(userAchievements)
    .innerJoin(achievements, eq(userAchievements.achievementId, achievements.id))
    .where(eq(userAchievements.userId, userId));
    
    return result;
  }
  
  async getUserAchievement(userId: number, achievementId: number): Promise<UserAchievement | undefined> {
    const [userAchievement] = await db.select().from(userAchievements)
      .where(
        and(
          eq(userAchievements.userId, userId),
          eq(userAchievements.achievementId, achievementId)
        )
      );
    return userAchievement;
  }
  
  async createUserAchievement(insertUA: InsertUserAchievement): Promise<UserAchievement> {
    const [userAchievement] = await db.insert(userAchievements).values({
      ...insertUA,
      unlockedAt: new Date()
    }).returning();
    return userAchievement;
  }
  
  async updateUserAchievement(id: number, data: Partial<UserAchievement>): Promise<UserAchievement> {
    const [updated] = await db.update(userAchievements)
      .set(data)
      .where(eq(userAchievements.id, id))
      .returning();
    
    if (!updated) {
      throw new Error(`User achievement ${id} not found`);
    }
    
    return updated;
  }

  // Generated Coin methods
  async createGeneratedCoin(insertCoin: InsertGeneratedCoin): Promise<GeneratedCoin> {
    const [coin] = await db.insert(generatedCoins).values({
      ...insertCoin,
      createdAt: new Date(),
      status: insertCoin.status || 'created'
    }).returning();
    return coin;
  }

  async getUserGeneratedCoins(userId: number): Promise<GeneratedCoin[]> {
    return await db.select()
      .from(generatedCoins)
      .where(eq(generatedCoins.userId, userId));
  }

  async getPollGeneratedCoins(pollId: number): Promise<GeneratedCoin[]> {
    return await db.select()
      .from(generatedCoins)
      .where(eq(generatedCoins.pollId, pollId));
  }

  async getUserCoinForPoll(userId: number, pollId: number, option: string): Promise<GeneratedCoin | undefined> {
    const [coin] = await db.select()
      .from(generatedCoins)
      .where(and(
        eq(generatedCoins.userId, userId),
        eq(generatedCoins.pollId, pollId),
        eq(generatedCoins.option, option)
      ));
    return coin;
  }

  async getGeneratedCoinsByName(name: string): Promise<GeneratedCoin[]> {
    return await db.select()
      .from(generatedCoins)
      .where(eq(generatedCoins.coinName, name));
  }

  // MemeCoin Package methods
  async createMemeCoinPackage(packageData: InsertMemeCoinPackage): Promise<MemeCoinPackage> {
    const [packageRecord] = await db.insert(memeCoinPackages).values({
      ...packageData,
      purchasedAt: new Date()
    }).returning();
    return packageRecord;
  }

  async getUserActivePackage(userId: number): Promise<MemeCoinPackage | undefined> {
    const [packageRecord] = await db.select()
      .from(memeCoinPackages)
      .where(and(
        eq(memeCoinPackages.userId, userId),
        eq(memeCoinPackages.status, 'active')
      ))
      .orderBy(desc(memeCoinPackages.purchasedAt))
      .limit(1);
    
    // Check if package still has remaining polls
    if (packageRecord && packageRecord.remainingPolls > 0) {
      return packageRecord;
    }
    
    return undefined;
  }

  async getUserPackages(userId: number): Promise<MemeCoinPackage[]> {
    return await db.select()
      .from(memeCoinPackages)
      .where(eq(memeCoinPackages.userId, userId))
      .orderBy(desc(memeCoinPackages.purchasedAt));
  }

  async consumePackageUsage(packageId: number): Promise<void> {
    const [packageRecord] = await db.select()
      .from(memeCoinPackages)
      .where(eq(memeCoinPackages.id, packageId));

    if (packageRecord) {
      const newUsedPolls = packageRecord.usedPolls + 1;
      const newRemainingPolls = packageRecord.remainingPolls - 1;
      const newStatus = newRemainingPolls <= 0 ? 'used_up' : 'active';

      await db.update(memeCoinPackages)
        .set({
          usedPolls: newUsedPolls,
          remainingPolls: newRemainingPolls,
          status: newStatus
        })
        .where(eq(memeCoinPackages.id, packageId));
    }
  }

  async getPackageByTxHash(txHash: string): Promise<MemeCoinPackage | undefined> {
    const [packageRecord] = await db.select()
      .from(memeCoinPackages)
      .where(eq(memeCoinPackages.paymentTxHash, txHash));
    return packageRecord;
  }

  async updatePackageStatus(packageId: number, status: string): Promise<void> {
    await db.update(memeCoinPackages)
      .set({ status })
      .where(eq(memeCoinPackages.id, packageId));
  }
  
  // Seed achievements if the table is empty
  private async seedAchievementsIfEmpty() {
    const existingAchievements = await db.select().from(achievements);
    
    if (existingAchievements.length === 0) {
      const achievementsData = [
        {
          name: 'Poll Creator',
          description: 'Create your first poll',
          iconName: 'poll',
          criteria: 'create_poll_1',
        },
        {
          name: 'Poll Star',
          description: 'Create 5 polls',
          iconName: 'star',
          criteria: 'create_poll_5',
        },
        {
          name: 'Voting Machine',
          description: 'Vote in 10 polls',
          iconName: 'vote-yea',
          criteria: 'vote_10',
        },
        {
          name: 'First Race',
          description: 'Complete your first race',
          iconName: 'flag-checkered',
          criteria: 'race_complete',
        },
        {
          name: 'Speedy',
          description: 'Complete a race in under 10 seconds',
          iconName: 'tachometer-alt',
          criteria: 'race_time_10',
        },
        {
          name: 'Champion',
          description: 'Win 5 races',
          iconName: 'trophy',
          criteria: 'race_win',
        },
      ];
      
      await db.insert(achievements).values(achievementsData);
    }
  }
}

// Use DatabaseStorage instead of MemStorage
export const storage = new DatabaseStorage();

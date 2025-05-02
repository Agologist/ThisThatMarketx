import { 
  User, InsertUser, Poll, InsertPoll, Vote, InsertVote, 
  Achievement, UserAchievement, InsertUserAchievement, RaceRecord, InsertRaceRecord 
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

// modify the interface with any CRUD methods
// you might need
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Poll methods
  getPolls(): Promise<Poll[]>;
  getPoll(id: number): Promise<Poll | undefined>;
  getUserPolls(userId: number): Promise<Poll[]>;
  createPoll(poll: InsertPoll): Promise<Poll>;
  incrementPollVote(pollId: number, option: string): Promise<void>;
  
  // Vote methods
  createVote(vote: InsertVote): Promise<Vote>;
  getUserVoteForPoll(userId: number, pollId: number): Promise<Vote | undefined>;
  
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
  
  // Session store
  sessionStore: session.SessionStore;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private polls: Map<number, Poll>;
  private votes: Map<number, Vote>;
  private raceRecords: Map<number, RaceRecord>;
  private achievements: Map<number, Achievement>;
  private userAchievements: Map<number, UserAchievement>;
  
  sessionStore: session.SessionStore;
  currentId: { [key: string]: number };

  constructor() {
    this.users = new Map();
    this.polls = new Map();
    this.votes = new Map();
    this.raceRecords = new Map();
    this.achievements = new Map();
    this.userAchievements = new Map();
    
    this.currentId = {
      users: 1,
      polls: 1,
      votes: 1,
      raceRecords: 1,
      achievements: 1,
      userAchievements: 1
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
    const id = this.currentId.polls++;
    const now = new Date();
    const poll: Poll = { 
      ...insertPoll, 
      id, 
      createdAt: now, 
      optionAVotes: 0, 
      optionBVotes: 0 
    };
    this.polls.set(id, poll);
    return poll;
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
  
  // Vote methods
  async createVote(insertVote: InsertVote): Promise<Vote> {
    const id = this.currentId.votes++;
    const now = new Date();
    const vote: Vote = { ...insertVote, id, votedAt: now };
    this.votes.set(id, vote);
    return vote;
  }
  
  async getUserVoteForPoll(userId: number, pollId: number): Promise<Vote | undefined> {
    return Array.from(this.votes.values()).find(
      vote => vote.userId === userId && vote.pollId === pollId
    );
  }
  
  // Race methods
  async createRaceRecord(insertRecord: InsertRaceRecord): Promise<RaceRecord> {
    const id = this.currentId.raceRecords++;
    const now = new Date();
    const record: RaceRecord = { ...insertRecord, id, racedAt: now };
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

export const storage = new MemStorage();

import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { z } from "zod";
import { insertPollSchema, insertVoteSchema, insertRaceRecordSchema, insertUserAchievementSchema } from "@shared/schema";
import axios from "axios";

// Schema for Firebase user data
const firebaseUserSchema = z.object({
  uid: z.string(),
  email: z.string().email().optional().nullable(),
  displayName: z.string().optional(),
  photoURL: z.string().optional(),
  provider: z.enum(['google', 'twitter']).default('google'),
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);
  
  // Firebase authentication endpoint
  app.post("/api/auth/firebase", async (req, res) => {
    try {
      // Validate the Firebase user data
      const firebaseData = firebaseUserSchema.parse(req.body);
      
      // Check if a user with this Firebase UID already exists
      let existingUser = null;
      
      // First try to find by Firebase UID (most accurate)
      existingUser = await storage.getUserByFirebaseUid(firebaseData.uid);
      
      // If not found by Firebase UID, try by email if available
      if (!existingUser && firebaseData.email) {
        existingUser = await storage.getUserByEmail(firebaseData.email);
      }
      
      if (existingUser) {
        // Log the user in
        req.login(existingUser, (err) => {
          if (err) {
            console.error('Error logging in existing user:', err);
            return res.status(500).json({ message: "Authentication failed" });
          }
          return res.status(200).json(existingUser);
        });
      } else {
        // Create a new user
        let username;
        if (firebaseData.email) {
          username = `${firebaseData.email.split('@')[0]}_${Math.floor(Math.random() * 1000)}`;
        } else {
          // If no email, use provider and random number for username
          username = `${firebaseData.provider}_user_${Math.floor(Math.random() * 10000)}`;
        }
        const displayName = firebaseData.displayName || username;
        
        // If no email is provided (Twitter may not provide it), generate a placeholder
        const email = firebaseData.email || `${username}@placeholder.com`;
        
        const newUser = await storage.createUser({
          username,
          email, // Use the email or generated placeholder
          displayName,
          password: `firebase_${firebaseData.uid}`, // Not used for login, just a placeholder
          firebaseUid: firebaseData.uid,
          photoURL: firebaseData.photoURL || null,
          provider: firebaseData.provider
        });
        
        // Log the new user in
        req.login(newUser, (err) => {
          if (err) {
            console.error('Error logging in new user:', err);
            return res.status(500).json({ message: "Authentication failed" });
          }
          return res.status(201).json(newUser);
        });
      }
    } catch (error) {
      console.error('Firebase auth error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid user data", errors: error.errors });
      }
      res.status(500).json({ message: "Authentication failed" });
    }
  });

  // Poll routes
  app.get("/api/polls", async (req, res) => {
    try {
      const filter = req.query.filter as string;
      
      if (filter === 'active-wars' && req.isAuthenticated()) {
        // Get active war polls that the user has voted in
        const allPolls = await storage.getPolls();
        const userVotes = [];
        const now = new Date();
        
        // For each active war poll, check if user has voted
        for (const poll of allPolls) {
          // Only include polls that are:
          // 1. War polls
          // 2. Still active (end time is in the future)
          if (poll.isWar && new Date(poll.endTime) > now) {
            const vote = await storage.getUserVoteForPoll(req.user.id, poll.id);
            if (vote) {
              userVotes.push({
                ...poll,
                userVote: vote
              });
            }
          }
        }
        
        console.log(`Found ${userVotes.length} active war polls for user ${req.user.id}`);
        return res.json(userVotes);
      }
      
      // Default behavior - return all polls
      const polls = await storage.getPolls();
      res.json(polls);
    } catch (error) {
      console.error('Error fetching polls:', error);
      res.status(500).json({ message: "Failed to fetch polls" });
    }
  });

  app.get("/api/polls/:id", async (req, res) => {
    try {
      const pollId = parseInt(req.params.id);
      const poll = await storage.getPoll(pollId);
      
      if (!poll) {
        return res.status(404).json({ message: "Poll not found" });
      }
      
      // Log poll time info for debugging
      const now = new Date();
      const endTime = new Date(poll.endTime);
      const diffMs = endTime.getTime() - now.getTime();
      const diffMinutes = diffMs / (1000 * 60);
      
      console.log("Poll time info:", {
        pollId: poll.id,
        question: poll.question,
        now: now.toISOString(),
        nowTime: now.getTime(),
        endTime: endTime.toISOString(),
        endTimeMs: endTime.getTime(),
        diffMs: diffMs,
        diffMinutes: diffMinutes,
        isActive: diffMs > 0,
        created: poll.createdAt.toISOString()
      });
      
      res.json(poll);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch poll" });
    }
  });
  
  // Debug route for checking poll time
  app.get("/api/polls/:id/debug", async (req, res) => {
    try {
      const pollId = parseInt(req.params.id);
      const poll = await storage.getPoll(pollId);
      
      if (!poll) {
        return res.status(404).json({ message: "Poll not found" });
      }
      
      // Calculate time info
      const now = new Date();
      const serverTime = now.toISOString();
      const endTime = new Date(poll.endTime);
      const diffMs = endTime.getTime() - now.getTime();
      const diffMinutes = diffMs / (1000 * 60);
      
      // Return debug info
      res.json({
        serverTime,
        pollInfo: {
          id: poll.id,
          question: poll.question,
          created: poll.createdAt.toISOString(),
          endTime: poll.endTime,
          parsedEndTime: endTime.toISOString(),
          timeDiffMs: diffMs,
          timeDiffMinutes: diffMinutes,
          isActive: diffMs > 0
        }
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to get poll debug info" });
    }
  });

  app.post("/api/polls", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      console.log("Received poll data:", req.body);
      
      // Validate and sanitize input data first
      const sanitizedInput = {
        ...req.body,
        userId: req.user.id,
        // Ensure boolean fields are properly typed
        isPublic: req.body.isPublic === true || req.body.isPublic === "true",
        // Ensure we have all required fields
        optionAImage: req.body.optionAImage || null,
        optionBImage: req.body.optionBImage || null
      };
      
      // Now pass the sanitized data to the schema validator
      const pollData = insertPollSchema.parse(sanitizedInput);
      
      console.log("Validated poll data:", pollData);
      
      const poll = await storage.createPoll(pollData);
      res.status(201).json(poll);
    } catch (error) {
      console.error("Poll creation error:", error);
      
      if (error instanceof z.ZodError) {
        console.error("Poll validation error:", JSON.stringify(error.errors, null, 2));
        return res.status(400).json({ message: "Invalid poll data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create poll" });
    }
  });

  // Route to check vote status before voting
  app.get("/api/polls/:id/vote", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const pollId = parseInt(req.params.id);
      const userId = req.user.id;
      
      // Check if the poll exists
      const poll = await storage.getPoll(pollId);
      if (!poll) {
        return res.status(404).json({ message: "Challenge not found" });
      }
      
      // Check if the user has already voted
      const existingVote = await storage.getUserVoteForPoll(userId, pollId);
      
      // Debug log for checking vote status
      console.log(`Checking vote status for user ${userId} on poll ${pollId}: ${existingVote ? 'Already voted' : 'Not voted yet'}`);
      if (existingVote) {
        console.log("Existing vote details:", existingVote);
      }
      
      res.status(200).json({
        hasVoted: !!existingVote,
        poll,
        userId,
        pollId,
        option: existingVote ? existingVote.option : null
      });
    } catch (error) {
      console.error("Error checking vote status:", error);
      res.status(500).json({ message: "Failed to check vote status" });
    }
  });

  app.post("/api/polls/:id/vote", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const pollId = parseInt(req.params.id);
      const { option } = req.body;
      const userId = req.user.id;
      
      console.log(`Processing vote for user ${userId} on poll ${pollId}, option ${option}`);
      
      // Validate option
      if (option !== "A" && option !== "B") {
        return res.status(400).json({ message: "Invalid option. Must be 'A' or 'B'" });
      }
      
      // Check if user already voted
      const existingVote = await storage.getUserVoteForPoll(userId, pollId);
      console.log(`Found existing vote: ${!!existingVote}`);
      
      if (existingVote) {
        // Prevent changing votes
        return res.status(400).json({ 
          message: "You have already voted on this challenge", 
          existingVote
        });
      }
      
      // Create the vote
      const voteData = insertVoteSchema.parse({
        pollId,
        userId,
        option,
      });
      
      // Debug log to see how vote data is being created
      console.log("Creating new vote with data:", JSON.stringify(voteData));
      
      const vote = await storage.createVote(voteData);
      console.log("Vote created:", vote);
      
      // Update poll vote count
      await storage.incrementPollVote(pollId, option);
      
      // Get updated poll - make sure to wait for the latest data
      const updatedPoll = await storage.getPoll(pollId);
      console.log("Updated poll after vote:", {
        id: updatedPoll?.id,
        optionAVotes: updatedPoll?.optionAVotes,
        optionBVotes: updatedPoll?.optionBVotes
      });
      
      res.status(201).json({ vote, poll: updatedPoll });
    } catch (error) {
      console.error("Vote creation error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid vote data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to record vote" });
    }
  });

  app.get("/api/user/polls", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const polls = await storage.getUserPolls(req.user.id);
      res.json(polls);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user polls" });
    }
  });

  // Image search API
  app.get("/api/search/images", async (req, res) => {
    try {
      const query = req.query.q as string;
      
      if (!query) {
        return res.status(400).json({ message: "Search query is required" });
      }

      // We'll use Unsplash API for image search
      const response = await axios.get('https://api.unsplash.com/search/photos', {
        headers: {
          Authorization: `Client-ID ${process.env.UNSPLASH_API_KEY || ''}`
        },
        params: {
          query,
          per_page: 10
        }
      });
      
      const images = response.data.results.map((img: any) => ({
        id: img.id,
        url: img.urls.regular,
        thumb: img.urls.thumb,
        description: img.description || img.alt_description || query
      }));
      
      res.json(images);
    } catch (error) {
      console.error('Image search error:', error);
      res.status(500).json({ message: "Failed to search for images" });
    }
  });

  // Battle game and achievements routes
  app.post("/api/battles", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      console.log("Battle data received:", req.body);
      const { time, won, pollId, option } = req.body;
      const userId = req.user!.id;
      
      // Make sure to validate that time is a number before proceeding
      if (typeof time !== 'number') {
        return res.status(400).json({ message: "Invalid time value" });
      }
      
      const record = await storage.createRaceRecord({
        userId,
        time,
        won: !!won, // Ensure it's a boolean
        pollId: pollId || null,
        option: option || null
      });
      
      console.log("Battle record created:", record);
      
      await checkAndUpdateRaceAchievements(userId);
      
      res.status(201).json(record);
    } catch (error) {
      console.error("Error saving battle record:", error);
      res.status(500).json({ message: "Failed to save battle record" });
    }
  });
  
  // Keep original races endpoint for backward compatibility
  app.post("/api/races", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const raceData = insertRaceRecordSchema.parse({
        ...req.body,
        userId: req.user.id,
      });
      
      const race = await storage.createRaceRecord(raceData);
      
      // Check for achievements
      if (raceData.won) {
        await checkAndUpdateRaceAchievements(req.user.id);
      }
      
      res.status(201).json(race);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid race data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to record race" });
    }
  });

  // Battle game endpoint aliases - support both terminology sets 
  app.get("/api/user/battles", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      // Get all votes for the user
      const votes = await storage.getUserVotes(req.user.id);
      const polls = await storage.getPolls();
      
      // Combine poll data with votes to create a comprehensive list
      const votedPolls = votes.map(vote => {
        const poll = polls.find(p => p.id === vote.pollId);
        if (poll) {
          return {
            id: vote.id,
            userId: vote.userId,
            pollId: vote.pollId,
            option: vote.option,
            votedAt: vote.votedAt,
            pollQuestion: poll.question,
            pollOptionAText: poll.optionAText,
            pollOptionBText: poll.optionBText,
            pollEndTime: poll.endTime,
            isActive: new Date(poll.endTime) > new Date(),
            createdAt: poll.createdAt || new Date(0)
          };
        }
        return vote;
      });
      
      res.json(votedPolls);
    } catch (error) {
      console.error('Error fetching user battles:', error);
      res.status(500).json({ message: "Failed to fetch user battles" });
    }
  });
  
  // Keep original races endpoint for backward compatibility
  app.get("/api/user/races", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      // Get all votes for the user
      const votes = await storage.getUserVotes(req.user.id);
      const polls = await storage.getPolls();
      
      // Combine poll data with votes to create a comprehensive list
      const votedPolls = votes.map(vote => {
        const poll = polls.find(p => p.id === vote.pollId);
        if (poll) {
          return {
            id: vote.id,
            userId: vote.userId,
            pollId: vote.pollId,
            option: vote.option,
            votedAt: vote.votedAt,
            pollQuestion: poll.question,
            pollOptionAText: poll.optionAText,
            pollOptionBText: poll.optionBText,
            pollEndTime: poll.endTime,
            isActive: new Date(poll.endTime) > new Date(),
            createdAt: poll.createdAt || new Date(0)
          };
        }
        return vote;
      });
      
      res.json(votedPolls);
    } catch (error) {
      console.error('Error fetching user races:', error);
      res.status(500).json({ message: "Failed to fetch user races" });
    }
  });

  app.get("/api/achievements", async (req, res) => {
    try {
      const achievements = await storage.getAchievements();
      res.json(achievements);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch achievements" });
    }
  });

  app.get("/api/user/achievements", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const achievements = await storage.getUserAchievements(req.user.id);
      res.json(achievements);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user achievements" });
    }
  });

  // Helper for checking and updating race-related achievements
  async function checkAndUpdateRaceAchievements(userId: number) {
    try {
      // Get user's race stats
      const races = await storage.getUserRaces(userId);
      const totalRaces = races.length;
      const wins = races.filter(race => race.won).length;
      
      // Get race-related achievements
      const raceAchievements = await storage.getAchievementsByCriteria(['race_complete', 'race_win']);
      
      for (const achievement of raceAchievements) {
        const userAchievement = await storage.getUserAchievement(userId, achievement.id);
        
        let shouldUpdate = false;
        let progress = 0;
        let completed = false;
        
        if (achievement.criteria === 'race_complete') {
          progress = totalRaces;
          completed = totalRaces >= 10; // Example: complete 10 races
          shouldUpdate = true;
        } else if (achievement.criteria === 'race_win') {
          progress = wins;
          completed = wins >= 5; // Example: win 5 races
          shouldUpdate = true;
        }
        
        if (shouldUpdate) {
          if (userAchievement) {
            await storage.updateUserAchievement(userAchievement.id, { progress, completed });
          } else {
            await storage.createUserAchievement({
              userId,
              achievementId: achievement.id,
              progress,
              completed
            });
          }
        }
      }
    } catch (error) {
      console.error("Error updating achievements:", error);
    }
  }

  // Add alias for GET /api/races - maps to battles
  app.get("/api/battles", async (req, res) => {
    try {
      // For standalone mode, just return an empty array
      res.json([]);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch battles" });
    }
  });

  // Keep original GET /api/races for backward compatibility
  app.get("/api/races", async (req, res) => {
    try {
      // For standalone mode, just return an empty array
      res.json([]);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch races" });
    }
  });
  
  // Route for getting all votes that the user has cast
  app.get("/api/user/votes", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      // Get all votes for the user
      const votes = await storage.getUserVotes(req.user.id);
      const polls = await storage.getPolls();
      
      // Combine poll data with votes to create a comprehensive list
      const votedPolls = votes.map(vote => {
        const poll = polls.find(p => p.id === vote.pollId);
        if (poll) {
          return {
            id: vote.id,
            userId: vote.userId,
            pollId: vote.pollId,
            option: vote.option,
            votedAt: vote.votedAt,
            pollQuestion: poll.question,
            pollOptionAText: poll.optionAText,
            pollOptionBText: poll.optionBText,
            pollEndTime: poll.endTime,
            isActive: new Date(poll.endTime) > new Date(),
            createdAt: poll.createdAt || new Date(0)
          };
        }
        return vote;
      });
      
      res.json(votedPolls);
    } catch (error) {
      console.error('Error fetching user votes:', error);
      res.status(500).json({ message: "Failed to fetch user votes" });
    }
  });
  
  // Route for getting active war passes for the user
  app.get("/api/user/warpasses", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      // Get active war polls that the user has voted in
      const allPolls = await storage.getPolls();
      const userVotes = [];
      const now = new Date();
      
      // For each active war poll, check if user has voted
      for (const poll of allPolls) {
        // Only include polls that are:
        // 1. War polls
        // 2. Still active (end time is in the future)
        if (poll.isWar && new Date(poll.endTime) > now) {
          const vote = await storage.getUserVoteForPoll(req.user.id, poll.id);
          if (vote) {
            userVotes.push({
              ...poll,
              userVote: vote
            });
          }
        }
      }
      
      res.json(userVotes);
    } catch (error) {
      console.error('Error fetching war passes:', error);
      res.status(500).json({ message: "Failed to fetch war passes" });
    }
  });
  
  // Route for getting battles the user has won
  app.get("/api/user/battles/won", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      // Get all race records for the user
      const userRaces = await storage.getUserRaces(req.user.id);
      
      console.log("All user races:", JSON.stringify(userRaces, null, 2));
      
      // For now, count all battles the user has won regardless of pollId
      const wonBattles = userRaces.filter(race => race.won === true);
      
      console.log("Filtered won battles:", JSON.stringify(wonBattles, null, 2));
      
      res.json(wonBattles);
    } catch (error) {
      console.error('Error fetching won battles:', error);
      res.status(500).json({ message: "Failed to fetch won battles" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

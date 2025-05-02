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
      if (firebaseData.email) {
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
      const polls = await storage.getPolls();
      res.json(polls);
    } catch (error) {
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
      
      res.json(poll);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch poll" });
    }
  });

  app.post("/api/polls", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const pollData = insertPollSchema.parse({
        ...req.body,
        userId: req.user.id,
      });
      
      const poll = await storage.createPoll(pollData);
      res.status(201).json(poll);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid poll data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create poll" });
    }
  });

  app.post("/api/polls/:id/vote", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const pollId = parseInt(req.params.id);
      const { option } = req.body;
      
      // Validate option
      if (option !== "A" && option !== "B") {
        return res.status(400).json({ message: "Invalid option. Must be 'A' or 'B'" });
      }
      
      // Check if user already voted
      const existingVote = await storage.getUserVoteForPoll(req.user.id, pollId);
      if (existingVote) {
        return res.status(400).json({ message: "You have already voted on this poll" });
      }
      
      const voteData = insertVoteSchema.parse({
        pollId,
        userId: req.user.id,
        option,
      });
      
      const vote = await storage.createVote(voteData);
      
      // Update poll vote count
      await storage.incrementPollVote(pollId, option);
      
      // Get updated poll
      const updatedPoll = await storage.getPoll(pollId);
      
      res.status(201).json({ vote, poll: updatedPoll });
    } catch (error) {
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

  // Race game and achievements routes
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

  app.get("/api/user/races", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const races = await storage.getUserRaces(req.user.id);
      res.json(races);
    } catch (error) {
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

  const httpServer = createServer(app);
  return httpServer;
}

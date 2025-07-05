import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { setupReplitAuth } from "./replitAuth";
import { coinService } from "./coinService";
import { z } from "zod";
import { insertPollSchema, insertVoteSchema, insertRaceRecordSchema, insertUserAchievementSchema, insertGeneratedCoinSchema, insertMemeCoinPackageSchema } from "@shared/schema";
import axios from "axios";

// Schema for Firebase user data
const firebaseUserSchema = z.object({
  uid: z.string(),
  email: z.string().email().optional().nullable(),
  displayName: z.string().optional(),
  photoURL: z.string().optional(),
  // Updated to support all provider values (twitter.com is the legacy Firebase ID for X)
  provider: z.enum(['google', 'twitter', 'x', 'twitter.com']).default('google'),
});

// Platform wallet configuration for receiving payments
const PLATFORM_CONFIG = {
  // Polygon network wallet for receiving USDT payments
  polygonWallet: process.env.PLATFORM_POLYGON_WALLET || '0x742d35Cc6636C0532925a3b6F45bb678E9E9cD81', // Demo wallet
  // Solana wallet for gas fee coverage (devnet for testing)
  solanaWallet: process.env.PLATFORM_SOLANA_WALLET || 'A1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2W3X4Y5Z6', // Demo wallet
  // Package pricing
  packagePrice: '1.00', // $1 USDT
  packagePolls: 3, // 3 polls per package
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);
  
  // Set up Replit Auth
  await setupReplitAuth(app);
  
  // Get current user endpoint for Replit Auth
  app.get("/api/auth/user", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    try {
      res.json(req.user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
  
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
        
        // If no email is provided (X may not provide it), generate a placeholder
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
        created: poll.createdAt ? poll.createdAt.toISOString() : 'null'
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
          created: poll.createdAt ? poll.createdAt.toISOString() : 'null',
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
    console.log("🔍 VOTE REQUEST DEBUG:");
    console.log("  - isAuthenticated():", req.isAuthenticated());
    console.log("  - req.user:", req.user);
    console.log("  - session:", req.session);
    console.log("  - headers:", req.headers);
    
    if (!req.isAuthenticated()) {
      console.log("❌ Authentication failed - returning 401");
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const pollId = parseInt(req.params.id);
      const { option, walletAddress } = req.body;
      const userId = req.user.id;
      
      console.log(`Processing vote for user ${userId} on poll ${pollId}, option ${option}, wallet: ${walletAddress || 'not provided'}`);
      console.log(`User object:`, req.user);
      console.log(`User ID type:`, typeof userId, `Poll ID type:`, typeof pollId);
      
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
      
      // NEW MODAL FLOW: If no wallet address provided, return special response asking for wallet preference
      console.log(`🔍 Wallet address check: walletAddress=${walletAddress}, type=${typeof walletAddress}, undefined=${walletAddress === undefined}, null=${walletAddress === null}, empty=${walletAddress === ''}`);
      
      if (walletAddress === undefined || walletAddress === null || walletAddress === '') {
        console.log("🚀 NEW MODAL FLOW: Vote received without wallet preference - returning wallet request");
        
        const poll = await storage.getPoll(pollId);
        if (!poll) {
          return res.status(404).json({ message: "Poll not found" });
        }
        
        const optionText = option === 'A' ? poll.optionAText : poll.optionBText;
        const coinName = optionText;
        const coinSymbol = optionText.slice(0, 6).toUpperCase().replace(/[^A-Z]/g, '');
        
        return res.status(200).json({
          requiresWalletChoice: true,
          coinPreview: {
            option,
            optionText,
            coinName,
            coinSymbol,
            pollId
          },
          message: "Please provide wallet address or choose demo mode"
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
      
      let vote;
      try {
        vote = await storage.createVote(voteData);
        console.log("Vote created successfully:", vote);
      } catch (voteError) {
        console.error("🚨 CRITICAL ERROR: Vote creation failed:", voteError);
        
        // Check if this is a duplicate vote constraint violation
        if (voteError instanceof Error && voteError.message.includes('unique_user_poll_vote')) {
          return res.status(400).json({ 
            message: "You have already voted on this challenge"
          });
        }
        
        return res.status(500).json({ 
          message: "Failed to create vote", 
          error: voteError instanceof Error ? voteError.message : 'Unknown error'
        });
      }
      
      // Immediately verify the vote was saved by trying to retrieve it
      const verifyVote = await storage.getUserVoteForPoll(userId, pollId);
      console.log("🔍 VERIFICATION: Vote immediately after creation:", verifyVote ? "FOUND" : "NOT FOUND");
      if (verifyVote) {
        console.log("🔍 VERIFICATION: Vote details:", verifyVote);
      } else {
        console.error("🚨 CRITICAL ERROR: Vote was created but cannot be retrieved immediately!");
      }
      
      // Update poll vote count
      await storage.incrementPollVote(pollId, option);
      
      // Generate meme coin for the user's vote (only if MemeCoin Mode is enabled)
      try {
        const poll = await storage.getPoll(pollId);
        if (poll && poll.memeCoinMode) {
          console.log(`🪙 MemeCoin Mode enabled for poll ${pollId}, generating coin...`);
          
          const optionText = option === 'A' ? poll.optionAText : poll.optionBText;
          
          // Check if user has an active package
          const activePackage = await storage.getUserActivePackage(userId);
          let isDemoMode = true;
          let userWallet = `demo_wallet_${userId}`;
          
          if (activePackage && activePackage.remainingPolls > 0) {
            // User has an active package - use provided wallet or demo
            isDemoMode = walletAddress === 'demo';
            userWallet = isDemoMode ? `demo_wallet_${userId}` : walletAddress;
            
            // Consume one credit from the package
            await storage.consumePackageUsage(activePackage.id);
            console.log(`📦 Consumed 1 credit from package ${activePackage.id}. Remaining: ${activePackage.remainingPolls - 1}`);
          } else {
            // No active package - force demo mode
            console.log(`📦 No active package found for user ${userId}, using demo mode`);
            isDemoMode = true;
            userWallet = `demo_wallet_${userId}`;
          }
          
          const coinResult = await coinService.createMemeCoin({
            userId,
            pollId,
            option,
            optionText,
            userWallet
          });
          
          console.log(`🪙 Meme coin generated (${isDemoMode ? 'DEMO' : 'REAL'} mode):`, coinResult);
        } else if (poll) {
          console.log(`🚫 MemeCoin Mode disabled for poll ${pollId}, skipping coin generation`);
        }
      } catch (coinError) {
        console.error('Failed to generate coin, but vote still recorded:', coinError);
        // Don't fail the vote if coin generation fails
      }
      
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
      // Get all the user's votes
      const userVotes = await storage.getUserVotes(req.user.id);
      const warPasses = [];
      const now = new Date();
      
      // For each vote, check if it's for an ACTIVE war poll
      for (const vote of userVotes) {
        const poll = await storage.getPoll(vote.pollId);
        // Only include polls that:
        // 1. Exist
        // 2. Are War mode enabled
        // 3. Are still active (end time is in the future)
        if (poll && poll.isWar && new Date(poll.endTime) > now) {
          warPasses.push({
            ...poll,
            userVote: vote,
            isActive: true
          });
        }
      }
      
      // Log for debugging
      console.log(`Found ${warPasses.length} active war passes for user ${req.user.id}`);
      
      res.json(warPasses);
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
      
      // Get only the battles the user has won AND that are challenge-based (have pollId)
      const wonBattles = userRaces.filter(race => race.won === true && race.pollId !== null);
      
      console.log("Won challenge-based battles:", JSON.stringify(wonBattles, null, 2));
      
      // Modify the display data with formats matching Challenges and Votes
      const enhancedBattles = await Promise.all(wonBattles.map(async (battle) => {
        // Since we're only dealing with challenge-based battles now, every battle has a pollId
        const poll = await storage.getPoll(battle.pollId!);
        if (poll) {
          // Return challenge-based battle with poll title
          return {
            ...battle,
            title: poll.question
          };
        }
        
        // This should never happen since we filtered for battles with pollId,
        // but providing a fallback just in case
        return {
          ...battle,
          title: "Challenge"
        };
      }));
      
      console.log("Filtered won battles:", JSON.stringify(enhancedBattles, null, 2));
      
      res.json(enhancedBattles);
    } catch (error) {
      console.error('Error fetching won battles:', error);
      res.status(500).json({ message: "Failed to fetch won battles" });
    }
  });

  // Coin-related API endpoints
  app.get("/api/user/coins", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const coins = await storage.getUserGeneratedCoins(req.user.id);
      res.json(coins);
    } catch (error) {
      console.error('Error fetching user coins:', error);
      res.status(500).json({ message: "Failed to fetch user coins" });
    }
  });

  app.get("/api/polls/:id/coins", async (req, res) => {
    try {
      const pollId = parseInt(req.params.id);
      const coins = await storage.getPollGeneratedCoins(pollId);
      res.json(coins);
    } catch (error) {
      console.error('Error fetching poll coins:', error);
      res.status(500).json({ message: "Failed to fetch poll coins" });
    }
  });

  // Get payment information endpoint
  app.get("/api/packages/payment-info", async (req, res) => {
    res.json({
      polygonWallet: PLATFORM_CONFIG.polygonWallet,
      packagePrice: PLATFORM_CONFIG.packagePrice,
      packagePolls: PLATFORM_CONFIG.packagePolls,
      paymentToken: 'USDT',
      paymentChain: 'polygon',
      instructions: [
        `Send exactly ${PLATFORM_CONFIG.packagePrice} USDT on Polygon network to:`,
        PLATFORM_CONFIG.polygonWallet,
        'After payment, use the transaction hash to purchase your package.',
        'You will receive 3 poll credits for creating real meme coins.'
      ]
    });
  });

  // Package Management API endpoints
  app.post("/api/packages/purchase", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      // Validate required payment information
      const { paymentTxHash, paymentAmount } = req.body;
      
      if (!paymentTxHash || !paymentAmount) {
        return res.status(400).json({ 
          message: "Payment transaction hash and amount are required" 
        });
      }

      // Check if this transaction hash has already been used
      const existingPackage = await storage.getPackageByTxHash(paymentTxHash);
      if (existingPackage) {
        return res.status(400).json({ 
          message: "This transaction has already been used for a package purchase" 
        });
      }

      const packageData = insertMemeCoinPackageSchema.parse({
        userId: req.user.id,
        status: 'pending',
        packageType: 'basic',
        totalPolls: PLATFORM_CONFIG.packagePolls,
        usedPolls: 0,
        remainingPolls: PLATFORM_CONFIG.packagePolls,
        paymentTxHash,
        paymentAmount,
        paymentToken: 'USDT',
        paymentChain: 'polygon'
      });

      const newPackage = await storage.createMemeCoinPackage(packageData);
      
      // In production, verify the transaction on Polygon blockchain:
      // 1. Check transaction exists and is confirmed
      // 2. Verify amount matches expected price
      // 3. Verify recipient address matches platform wallet
      // 4. Verify sender has sufficient balance
      
      // For demo/development, automatically activate packages
      console.log(`Package created for user ${req.user.id} with tx: ${paymentTxHash}`);
      await storage.updatePackageStatus(newPackage.id, 'active');
      
      res.json({ 
        ...newPackage, 
        status: 'active',
        message: 'Package activated successfully! You now have 3 poll credits for real meme coins.'
      });
    } catch (error) {
      console.error('Error creating package:', error);
      res.status(500).json({ message: "Failed to create package" });
    }
  });

  app.get("/api/user/packages", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const packages = await storage.getUserPackages(req.user.id);
      res.json(packages);
    } catch (error) {
      console.error('Error fetching user packages:', error);
      res.status(500).json({ message: "Failed to fetch user packages" });
    }
  });

  app.get("/api/user/packages/active", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const activePackage = await storage.getUserActivePackage(req.user.id);
      if (activePackage) {
        res.json(activePackage);
      } else {
        res.status(404).json({ message: "No active package found" });
      }
    } catch (error) {
      console.error('Error fetching active package:', error);
      res.status(500).json({ message: "Failed to fetch active package" });
    }
  });

  app.post("/api/packages/:id/consume", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const packageId = parseInt(req.params.id);
      
      // Verify the package belongs to the user
      const userPackages = await storage.getUserPackages(req.user.id);
      const packageExists = userPackages.find(pkg => pkg.id === packageId);
      
      if (!packageExists) {
        return res.status(404).json({ message: "Package not found" });
      }

      await storage.consumePackageUsage(packageId);
      res.json({ message: "Package usage consumed successfully" });
    } catch (error) {
      console.error('Error consuming package usage:', error);
      res.status(500).json({ message: "Failed to consume package usage" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

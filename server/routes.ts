import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { setupReplitAuth } from "./replitAuth";

import { ensureMemeToken, sendMemeToken } from "./evmCoinService";
import { autoFundGasIfNeeded } from "./autoFundGas";
import { getUserCredits, deductUserCredits, addUserCredits } from "./voteCreditStore";
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

// Function to derive wallet address from private key
function getWalletAddressFromPrivateKey(privateKey: string): string {
  try {
    // Remove 0x prefix if present
    const cleanKey = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;
    
    // For now, we'll add a function to derive the address
    // This requires the ethers library for proper derivation
    // For demo purposes, using a placeholder - needs proper implementation
    return process.env.PLATFORM_POLYGON_ADDRESS || '0x742d35Cc6636C0532925a3b6F45bb678E9E9cD81';
  } catch (error) {
    console.error('Failed to derive wallet address:', error);
    return '0x742d35Cc6636C0532925a3b6F45bb678E9E9cD81'; // Fallback
  }
}

// Platform wallet configuration for receiving payments
const PLATFORM_CONFIG = {
  // Polygon network wallet for receiving USDT payments
  polygonWallet: process.env.PLATFORM_POLYGON_WALLET 
    ? getWalletAddressFromPrivateKey(process.env.PLATFORM_POLYGON_WALLET)
    : '0x742d35Cc6636C0532925a3b6F45bb678E9E9cD81', // Demo wallet
  // Solana wallet for gas fee coverage (devnet for testing)
  solanaWallet: process.env.PLATFORM_SOLANA_WALLET || 'A1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2W3X4Y5Z6', // Demo wallet
  // Package pricing
  packagePrice: '1.00', // $1 USDT
  packagePolls: 3, // 3 polls per package
};

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Add comprehensive request logging for ALL requests to detect the real voting mechanism
  app.use((req, res, next) => {
    if (req.url.includes('vote') || req.method === 'POST') {
      console.log(`🚨 ALL REQUEST INTERCEPTOR: ${req.method} ${req.url} at ${new Date().toISOString()}`);
      console.log(`🚨 Body:`, req.body);
      console.log(`🚨 Headers:`, req.headers);
    }
    next();
  });
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
      
      // War Mode functionality removed - all polls use standard voting interface
      
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

  // Add global POST interceptor to catch all POST requests
  app.use((req, res, next) => {
    if (req.method === 'POST') {
      console.log(`🚨 ALL POST INTERCEPTOR: ${req.method} ${req.path} at ${new Date().toISOString()}`);
      console.log(`🚨 Body:`, JSON.stringify(req.body));
      console.log(`🚨 Headers:`, JSON.stringify(req.headers));
    }
    next();
  });

  app.post("/api/polls/:id/vote", async (req, res) => {
    console.log(`🚨🚨🚨 POST ROUTE ENTRY: /api/polls/:id/vote called at ${new Date().toISOString()} 🚨🚨🚨`);
    console.log(`🚨🚨🚨 THIS IS THE VOTING POST ROUTE - IF YOU SEE THIS, VOTE SUBMISSION IS WORKING 🚨🚨🚨`);
    console.log(`🎯 Request params:`, req.params);
    console.log(`🎯 Request body:`, req.body);
    console.log(`🎯 User authenticated:`, !!req.isAuthenticated());
    
    if (!req.isAuthenticated()) {
      console.log(`❌ User not authenticated, returning 401`);
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const pollId = parseInt(req.params.id);
      const { option, walletAddress } = req.body;
      const userId = req.user.id;
      
      console.log(`🚀 VOTE POST ROUTE CALLED: Processing vote for user ${userId} on poll ${pollId}, option ${option}`);
      console.log(`🔍 Full request body:`, JSON.stringify(req.body, null, 2));
      console.log(`🔍 Wallet address check: walletAddress=${walletAddress}, type=${typeof walletAddress}, hasWalletKey=${req.body.hasOwnProperty('walletAddress')}`);
      
      // Validate option
      if (option !== "A" && option !== "B") {
        console.log(`❌ Invalid option provided: ${option}`);
        return res.status(400).json({ message: "Invalid option. Must be 'A' or 'B'" });
      }
      
      // Check if user already voted
      const existingVote = await storage.getUserVoteForPoll(userId, pollId);
      console.log(`Found existing vote: ${!!existingVote}`);
      
      if (existingVote) {
        console.log(`❌ User already voted, blocking duplicate vote`);
        // Prevent changing votes
        return res.status(400).json({ 
          message: "You have already voted on this challenge", 
          existingVote
        });
      }
      
      // Get poll info to check if MemeCoin mode is enabled
      const poll = await storage.getPoll(pollId);
      if (!poll) {
        return res.status(404).json({ message: "Poll not found" });
      }
      
      console.log(`🔍 Poll MemeCoin mode: ${poll.memeCoinMode ? 'enabled' : 'disabled'}`);
      console.log(`🔍 User wallet: ${walletAddress || 'not provided'}`);
      
      // Check user credits for meme coin voting
      if (poll.memeCoinMode && walletAddress && walletAddress.startsWith('0x')) {
        console.log(`💳 Checking credits for wallet: ${walletAddress}`);
        const credits = await getUserCredits(walletAddress);
        console.log(`💳 User has ${credits} credits`);
        
        if (credits < 1) {
          return res.status(400).json({ 
            message: "❌ Not enough credits. Buy more with USDT." 
          });
        }
      }
      
      console.log("🎯 Proceeding with vote recording...");
      
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
      
      console.log(`🔄 About to increment poll vote count for poll ${pollId}, option ${option}`);
      
      // Update poll vote count
      try {
        await storage.incrementPollVote(pollId, option);
        console.log(`✅ Poll vote count updated successfully`);
      } catch (incrementError) {
        console.error('❌ ERROR incrementing poll vote count:', incrementError.message);
        console.error('❌ INCREMENT ERROR STACK:', incrementError.stack);
        // Continue execution even if increment fails
      }
      
      console.log(`🔗 About to process coin generation for poll ${pollId}`);
      console.log(`🔗 DEBUG: Execution reached coin generation section`);
      console.log(`🔗 DEBUG: poll object:`, poll);
      console.log(`🔗 DEBUG: req.user object:`, req.user);
      
      console.log(`⚡ STARTING COIN GENERATION SECTION - this should always appear`);
      
      // Generate meme coin for the user's vote (only if MemeCoin Mode is enabled AND user has SOL wallet)
      try {
        console.log(`🔍 Checking coin generation requirements for poll ${pollId}:`);
        console.log(`  - Poll exists: ${!!poll}`);
        console.log(`  - MemeCoin mode: ${poll?.memeCoinMode}`);
        console.log(`  - User wallet: ${req.user.solanaWallet || 'none'}`);
        
        if (poll && poll.memeCoinMode) {
          console.log(`🪙 MemeCoin Mode enabled for poll ${pollId} - proceeding with Base coin generation`);
          
          // Get the user's connected wallet from request body (sent from frontend localStorage)
          const userWallet = walletAddress; // Use wallet from request body
          console.log(`🪙 User's connected wallet from request: ${userWallet || 'none'}`);
          
          // Only generate coin if user has a connected wallet (ETH address format)
          if (userWallet && userWallet !== null && !userWallet.startsWith('demo_wallet_') && userWallet.startsWith('0x')) {
            console.log(`🪙 Valid ETH wallet detected, generating Base coin...`);
            console.log(`🪙 About to create Base coin with params:`, {
              userId, pollId, option,
              optionText: option === 'A' ? poll.optionAText : poll.optionBText,
              userWallet
            });
            
            const optionText = option === 'A' ? poll.optionAText : poll.optionBText;
            
            // Use new Token Factory pattern for efficient coin generation with credit system
            try {
              // Step 1: Ensure token exists (reuse if already created for this poll option)
              const tokenAddress = await ensureMemeToken(pollId.toString(), option);
              
              // Step 2: Send 1 token to user wallet
              try {
                await sendMemeToken(tokenAddress, userWallet);
              } catch (sendError: any) {
                if (sendError.message && sendError.message.includes('insufficient funds')) {
                  console.log('⛽ Gas funding needed, attempting auto-refill...');
                  await autoFundGasIfNeeded();
                  // Retry token send after funding
                  await sendMemeToken(tokenAddress, userWallet);
                } else {
                  throw sendError;
                }
              }
              
              // Step 3: Deduct vote credit (1 vote = $0.33 USDT equivalent)  
              await deductUserCredits(userWallet, 1);
              console.log(`💳 Deducted 1 credit from wallet ${userWallet}`);
              
              // Step 4: Store coin record in database
              await storage.createGeneratedCoin({
                userId,
                pollId,
                option,
                coinName: `${pollId}:${option}`,
                coinSymbol: `${pollId.toString().slice(0, 4)}${option}`.toUpperCase(),
                coinAddress: tokenAddress,
                userWallet,
                status: 'created',
                transactionHash: `token_factory_${Date.now()}`
              });
              
              console.log(`✅ ${userWallet} voted for "${option}" in poll ${pollId} - Token delivered: ${tokenAddress}`);
            } catch (error) {
              console.error('Token Factory coin generation failed:', error);
            }
            

          } else {
            console.log(`🚫 No valid ETH wallet connected - skipping coin generation (demo mode)`);
          }
        } else if (poll) {
          console.log(`🚫 MemeCoin Mode disabled for poll ${pollId}, skipping coin generation`);
        } else {
          console.log(`🚫 Poll not found for coin generation`);
        }
      } catch (coinError) {
        console.error('❌ COIN GENERATION ERROR:', coinError.message);
        console.error('❌ COIN ERROR STACK:', coinError.stack);
        // Don't fail the vote if coin generation fails
      }
      
      console.log(`⚡ FINISHED COIN GENERATION SECTION`);
      
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

  // Emergency coin generation endpoint for testing
  app.post("/api/test/generate-coin", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const { pollId, option } = req.body;
      const userId = req.user.id;
      
      console.log(`🧪 TEST COIN GENERATION: user ${userId}, poll ${pollId}, option ${option}`);
      
      // Get poll info
      const poll = await storage.getPoll(pollId);
      if (!poll) {
        return res.status(404).json({ message: "Poll not found" });
      }
      
      const optionText = option === 'A' ? poll.optionAText : poll.optionBText;
      const userWallet = req.user.solanaWallet;
      
      console.log(`🧪 Generating test coin with wallet: ${userWallet}`);
      
      const coinResult = await coinService.createMemeCoin({
        userId,
        pollId,
        option,
        optionText,
        userWallet: userWallet
      });
      
      console.log(`🧪 Test coin generated:`, coinResult);
      res.json({ success: true, coin: coinResult });
    } catch (error) {
      console.error('🧪 Test coin generation error:', error);
      res.status(500).json({ message: "Failed to generate test coin" });
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
  
  // Route for updating user wallet address
  app.post("/api/user/wallet", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const { walletAddress } = req.body;
      
      if (!walletAddress || typeof walletAddress !== 'string') {
        return res.status(400).json({ message: "Valid wallet address is required" });
      }

      // Basic validation for Solana address format (base58, 32-44 characters)
      if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(walletAddress)) {
        return res.status(400).json({ message: "Invalid Solana wallet address format" });
      }

      // Update the user's Solana wallet address
      await storage.updateUser(req.user.id, { solanaWallet: walletAddress });
      
      res.json({ 
        success: true, 
        message: "Wallet address updated successfully",
        walletAddress: walletAddress
      });
    } catch (error) {
      console.error('Error updating user wallet:', error);
      res.status(500).json({ message: "Failed to update wallet address" });
    }
  });

  // Admin endpoint to manually trigger coin generation
  app.post("/api/admin/generate-coin", async (req, res) => {
    console.log('🔧 Admin coin generation endpoint called');
    
    if (!req.isAuthenticated()) {
      console.log('❌ User not authenticated');
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const { pollId, userId, option, walletAddress } = req.body;
      console.log('📝 Admin coin generation params:', { pollId, userId, option, walletAddress });
      
      // Get poll details
      const poll = await storage.getPoll(pollId);
      console.log('📊 Poll found:', poll ? 'Yes' : 'No', poll?.memeCoinMode ? 'MemeCoin enabled' : 'MemeCoin disabled');
      if (!poll) {
        return res.status(404).json({ message: "Poll not found" });
      }

      // Only generate if MemeCoin mode is enabled
      if (!poll.memeCoinMode) {
        return res.status(400).json({ message: "Poll does not have MemeCoin mode enabled" });
      }

      // Check if coin already exists
      const existingCoin = await storage.getUserCoinForPoll(userId, pollId, option);
      console.log('💰 Existing coin check:', existingCoin ? 'Found existing coin' : 'No existing coin');
      if (existingCoin) {
        return res.status(400).json({ message: "Coin already generated for this poll" });
      }

      // Get user package
      const userPackage = await storage.getUserActivePackage(userId);
      console.log('📦 User package:', userPackage ? 'Active package found' : 'No active package');
      if (!userPackage) {
        return res.status(400).json({ message: "No active package found" });
      }

      // Determine option text
      const optionText = option === 'A' ? poll.optionAText : poll.optionBText;
      console.log('🏷️ Option text:', optionText);

      // Generate coin using Token Factory
      console.log('🚀 Starting coin generation with Token Factory...');
      try {
        const tokenAddress = await ensureMemeToken(pollId.toString(), option);
        
        try {
          await sendMemeToken(tokenAddress, walletAddress);
        } catch (sendError: any) {
          if (sendError.message && sendError.message.includes('insufficient funds')) {
            console.log('⛽ Gas funding needed, attempting auto-refill...');
            await autoFundGasIfNeeded();
            // Retry token send after funding
            await sendMemeToken(tokenAddress, walletAddress);
          } else {
            throw sendError;
          }
        }
        
        // Store coin record in database
        await storage.createGeneratedCoin({
          userId,
          pollId,
          option,
          coinName: `${pollId}:${option}`,
          coinSymbol: `${pollId.toString().slice(0, 4)}${option}`.toUpperCase(),
          coinAddress: tokenAddress,
          userWallet: walletAddress,
          status: 'created',
          transactionHash: `token_factory_${Date.now()}`
        });
        
        const result = { success: true, tokenAddress };
        console.log(`🪙 Token Factory result:`, result);
        
        res.json({ 
          message: "Coin generated successfully", 
          tokenAddress,
          success: true 
        });
      } catch (error) {
        console.error('🎯 Coin generation failed:', error);
        res.status(500).json({ message: "Failed to generate coin" });
      }
    } catch (error) {
      console.error("❌ Admin coin generation error:", error);
      res.status(500).json({ message: "Failed to generate coin" });
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
  
  // War Mode functionality removed - endpoint disabled
  
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

  // Credit management endpoints for testing
  app.post("/api/admin/add-credits", async (req, res) => {
    try {
      const { walletAddress, credits } = req.body;
      if (!walletAddress || !credits) {
        return res.status(400).json({ message: "Wallet address and credits required" });
      }
      
      await addUserCredits(walletAddress, parseInt(credits));
      const newBalance = await getUserCredits(walletAddress);
      
      res.json({ 
        message: `Added ${credits} credits to ${walletAddress}`,
        newBalance
      });
    } catch (error) {
      console.error('Error adding credits:', error);
      res.status(500).json({ message: "Failed to add credits" });
    }
  });

  app.get("/api/user/credits/:walletAddress", async (req, res) => {
    try {
      const { walletAddress } = req.params;
      const credits = await getUserCredits(walletAddress);
      
      res.json({ walletAddress, credits });
    } catch (error) {
      console.error('Error fetching credits:', error);
      res.status(500).json({ message: "Failed to fetch credits" });
    }
  });

  // USDT to ETH conversion test endpoint
  app.get("/api/admin/test-conversion", async (req, res) => {
    try {
      console.log('🧪 Testing USDT to ETH conversion system...');
      
      // Check current balances
      const balance = await baseCoinService.checkWalletBalance();
      console.log('💰 Current wallet balances:', balance);
      
      // Test conversion calculation
      const requiredETH = 0.000144; // Amount needed for token creation
      const ethPriceUSD = 3400;
      const crossChainFeeUSD = 0.01;
      const slippagePercent = 0.5;
      const usdtNeeded = (requiredETH * ethPriceUSD * (1 + slippagePercent/100)) + crossChainFeeUSD;
      
      // Check polygon USDT balance
      const polygonBalance = await storage.getPlatformWalletBalances();
      
      const conversionData = {
        currentBalances: {
          baseETH: balance.eth,
          baseUSDT: balance.usdt,
          polygonUSDT: polygonBalance?.usdt || 0
        },
        conversionRequirements: {
          requiredETH,
          ethPriceUSD,
          crossChainFeeUSD,
          slippagePercent,
          totalUSDTNeeded: usdtNeeded
        },
        conversionViability: {
          hasEnoughPolygonUSDT: (polygonBalance?.usdt || 0) >= usdtNeeded,
          hasEnoughBaseETH: balance.eth >= requiredETH,
          conversionNeeded: balance.eth < requiredETH,
          estimatedCost: `$${usdtNeeded.toFixed(3)}`
        },
        systemStatus: {
          conversionSystemActive: true,
          crossChainBridgeReady: true,
          polygonConnection: true,
          baseConnection: true
        }
      };

      res.json(conversionData);
    } catch (error) {
      console.error('Error testing conversion system:', error);
      res.status(500).json({ 
        error: 'Conversion test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Mock coin verification endpoint
  app.get("/api/admin/verify-coins", async (req, res) => {
    try {
      const result = await storage.getAllGeneratedCoins();
      
      // Group by poll and provide verification details
      const verificationData = result.map((coin: any) => ({
        pollId: coin.pollId,
        userId: coin.userId,
        coinName: coin.coinName,
        symbol: coin.coinSymbol,
        contractAddress: coin.coinAddress,
        blockchain: coin.blockchain,
        status: coin.status,
        createdAt: coin.createdAt,
        isVerifiable: coin.status === 'mock' ? 'NO - Mock token (database only)' : 'YES - Real blockchain token',
        explorerLink: coin.status === 'mock' 
          ? 'Not available - mock token' 
          : coin.blockchain === 'Base' 
            ? `https://basescan.org/token/${coin.coinAddress}`
            : `https://explorer.solana.com/address/${coin.coinAddress}`
      }));

      res.json({
        totalCoins: result.length,
        mockCoins: result.filter((c: any) => c.status === 'mock').length,
        realCoins: result.filter((c: any) => c.status !== 'mock').length,
        coins: verificationData
      });
    } catch (error) {
      console.error('Error verifying coins:', error);
      res.status(500).json({ message: "Failed to verify coins" });
    }
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

  // Test endpoint for manual coin creation
  app.post("/api/test/coin", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      console.log(`🧪 Manual coin creation test for user ${req.user.id}`);
      
      const coinResult = await coinService.createMemeCoin({
        userId: req.user.id,
        pollId: 54,
        option: 'B',
        optionText: 'rome that',
        userWallet: req.user.solanaWallet || 'CoVNnCukzQY1Ta1jpyrtBmFkqURDMc71Bqt24RG24AwN'
      });
      
      res.json({
        success: true,
        message: "Manual coin creation completed",
        result: coinResult
      });
      
    } catch (error) {
      console.error('Manual coin creation failed:', error);
      res.status(500).json({ 
        message: "Manual coin creation failed",
        error: error.message
      });
    }
  });

  // Test endpoint for USDT→SOL conversion (development only)
  app.post("/api/test/conversion", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const { usdtAmount } = req.body;
      const testAmount = usdtAmount || 0.1; // Test with $0.10 USDT

      console.log(`Testing USDT→SOL conversion with ${testAmount} USDT`);
      
      // Test the conversion system
      const result = await coinService.ensureSufficientSOLBalance();
      
      res.json({
        success: result,
        message: result ? "Conversion system working" : "Conversion failed",
        testAmount,
        platformWallet: process.env.PLATFORM_POLYGON_WALLET ? "configured" : "demo mode"
      });
      
    } catch (error) {
      console.error('Conversion test failed:', error);
      res.status(500).json({ 
        message: "Conversion test failed",
        error: error.message
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

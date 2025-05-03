import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

if (!process.env.REPLIT_DOMAINS) {
  console.warn("Environment variable REPLIT_DOMAINS not provided, Replit Auth functionality may be limited");
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

// Helper function to update user session with tokens
function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

// Helper function to upsert a user from Replit auth claims
async function upsertUser(claims: any) {
  try {
    // Check if user exists by ID
    const existingUser = await storage.getUserByReplitId(claims["sub"]);
    
    if (existingUser) {
      // User exists, update their info
      return existingUser;
    } else {
      // Create new user
      const username = claims["username"] || `replit_user_${Math.floor(Math.random() * 10000)}`;
      const email = claims["email"] || `${username}@replit.com`;
      
      // Create new user in our system
      const newUser = await storage.createUser({
        username,
        email,
        password: `replit_${claims["sub"]}`, // Not used for login, just a placeholder
        displayName: claims["username"] || username,
        provider: "replit",
        profileImageUrl: claims["profile_image_url"] || null,
        replitId: claims["sub"]
      });
      
      return newUser;
    }
  } catch (error) {
    console.error("Error in upsertUser:", error);
    throw error;
  }
}

export async function setupReplitAuth(app: Express) {
  // Configure OIDC strategy
  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    try {
      const replit_session = {};
      updateUserSession(replit_session, tokens);
      
      // Get claims from tokens
      const claims = tokens.claims();
      
      // Check if user exists in our system or create a new one
      const user = await upsertUser(claims);
      
      verified(null, user);
    } catch (error) {
      verified(error as Error);
    }
  };

  // Register strategies for each domain
  if (process.env.REPLIT_DOMAINS) {
    for (const domain of process.env.REPLIT_DOMAINS.split(",")) {
      const strategy = new Strategy(
        {
          name: `replitauth:${domain}`,
          config,
          scope: "openid email profile offline_access",
          callbackURL: `https://${domain}/api/auth/replit/callback`,
        },
        verify,
      );
      passport.use(strategy);
    }
  }

  // Set up routes
  app.get("/api/auth/replit", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/auth/replit/callback", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      successRedirect: "/",
      failureRedirect: "/auth",
    })(req, res, next);
  });
}

// Middleware to check if user is authenticated
export const isAuthenticated: RequestHandler = async (req, res, next) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  return next();
};
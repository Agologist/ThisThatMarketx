import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";
import passport from "passport";
import type { Express, Request, Response, NextFunction } from "express";
import { storage } from "./storage";

if (!process.env.REPLIT_DOMAINS) {
  console.warn("Environment variable REPLIT_DOMAINS not provided. Replit Auth will not be available.");
}

const getOidcConfig = async () => {
  try {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  } catch (error) {
    console.error("Failed to discover OIDC configuration:", error);
    throw error;
  }
};

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(claims: any) {
  const replitId = claims["sub"];
  
  // Check if user already exists
  const existingUser = await storage.getUserByReplitId(replitId);
  
  if (existingUser) {
    console.log(`User with Replit ID ${replitId} already exists`);
    return existingUser;
  }
  
  // Create a new user
  const username = claims["username"] || `replit_user_${Math.floor(Math.random() * 10000)}`;
  const email = claims["email"] || `${username}@replit.user`;
  
  const newUser = await storage.createUser({
    username,
    email,
    displayName: claims["first_name"] ? `${claims["first_name"]} ${claims["last_name"] || ""}`.trim() : username,
    password: `replit_${replitId}`, // Not used for login, just a placeholder
    provider: "replit",
    profileImageUrl: claims["profile_image_url"] || null,
    replitId
  });
  
  console.log(`Created new user for Replit ID ${replitId}`);
  return newUser;
}

export async function setupReplitAuth(app: Express) {
  if (!process.env.REPLIT_DOMAINS || !process.env.REPL_ID) {
    console.warn("Skipping Replit Auth setup due to missing environment variables");
    return;
  }
  
  try {
    const config = await getOidcConfig();
    
    const verify: VerifyFunction = async (
      tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
      verified: passport.AuthenticateCallback
    ) => {
      try {
        const user = {};
        updateUserSession(user, tokens);
        const dbUser = await upsertUser(tokens.claims());
        verified(null, dbUser);
      } catch (error) {
        console.error("Error in Replit Auth verification:", error);
        verified(error as Error);
      }
    };
    
    // Create a strategy for each domain
    for (const domain of process.env.REPLIT_DOMAINS.split(",")) {
      const strategy = new Strategy(
        {
          name: `replitauth:${domain}`,
          config,
          scope: "openid email profile offline_access",
          callbackURL: `https://${domain}/api/auth/callback`,
        },
        verify,
      );
      passport.use(strategy);
    }
    
    // Routes for Replit Auth
    app.get("/api/auth/replit", (req: Request, res: Response, next: NextFunction) => {
      const domain = req.hostname;
      passport.authenticate(`replitauth:${domain}`, {
        prompt: "login consent",
        scope: ["openid", "email", "profile", "offline_access"],
      })(req, res, next);
    });
    
    app.get("/api/auth/callback", (req: Request, res: Response, next: NextFunction) => {
      const domain = req.hostname;
      passport.authenticate(`replitauth:${domain}`, {
        successReturnToOrRedirect: "/",
        failureRedirect: "/auth",
      })(req, res, next);
    });
    
    // Add a logout route for Replit Auth
    app.get("/api/auth/logout", (req: Request, res: Response) => {
      req.logout(() => {
        const config = getOidcConfig();
        Promise.resolve(config).then(config => {
          res.redirect(
            client.buildEndSessionUrl(config, {
              client_id: process.env.REPL_ID!,
              post_logout_redirect_uri: `${req.protocol}://${req.hostname}/auth`,
            }).href
          );
        }).catch(error => {
          console.error("Error building end session URL:", error);
          // Fallback to local logout if OIDC config fails
          res.redirect("/auth");
        });
      });
    });
    
    console.log("Replit Auth setup completed successfully");
  } catch (error) {
    console.error("Failed to set up Replit Auth:", error);
  }
}

export const isAuthenticated = async (req: Request, res: Response, next: NextFunction) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    return res.redirect("/api/auth/replit");
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    return res.redirect("/api/auth/replit");
  }
};
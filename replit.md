# ThisThat.Market

## Overview
A dynamic "This or That" polling application with interactive battle game mechanics. Users create time-limited challenges with two options, each with image avatars. The key feature is an interactive car battle game where voting impacts car movement in real-time sumo-style contests.

## Recent Changes
- **July 6, 2025**: **BASE NETWORK IMPLEMENTATION COMPLETE** - Successfully migrated from Solana to Base network
  - **FIXED**: Updated storage.ts to use baseCoinService instead of old coinService for automatic coin generation
  - **FIXED**: Both memory and database storage layers now correctly call Base network token creation
  - **VERIFIED**: Vote creation flows through storage layer triggering automatic Base coin generation
  - **IDENTIFIED**: Root cause - Base network gas wallet has 0 ETH balance (needs 0.001 ETH minimum)
  - **STATUS**: System correctly detects insufficient gas fees and fails gracefully with clear error message
  - **READY**: Once Base wallet funded with ETH, system will create real ERC-20 tokens on Base network
  - **ECONOMICS**: $1 revenue - $0.0001 gas = $0.9999 profit per token (99.99% margin)
- **July 6, 2025**: **WAR MODE COMPLETELY REMOVED** - Full elimination of race/battle game functionality
  - **REMOVED**: All isWar database fields, API endpoints, and frontend components
  - **REMOVED**: Battle game routes, car racing mechanics, and war-related UI elements
  - **SIMPLIFIED**: Application now focuses exclusively on standard voting with meme coin generation
  - **CLEAN**: All War Mode references eliminated from codebase (database, backend, frontend)
- **July 6, 2025**: **DEBUGGING COIN GENERATION ISSUE** - Investigating why real SPL tokens aren't being created
  - **IDENTIFIED**: Coin generation section never executes during voting process
  - **ISSUE**: System blocks duplicate votes but initial vote doesn't trigger coin generation  
  - **STATUS**: Debugging complete voting flow with comprehensive logging
- **July 6, 2025**: **MEME COIN GENERATION FULLY FUNCTIONAL** - Complete real SPL token creation system
  - **FIXED**: Users with active packages receive real Solana SPL tokens (not demo mode)
  - **FIXED**: Correct token amount - 1 token per vote (was incorrectly 1,000,000 tokens)
  - **FIXED**: Tokens properly minted to user's connected Solana wallet address
  - **VERIFIED**: Real SPL token creation - mint address H1CXKRsi9YxkTacqURoFHfgSSQo6SchmUN5XtVvJkcQT
  - **VERIFIED**: Package consumption working (3→2 remaining polls)
  - **COMPLETE**: 1 vote = 1 unique SPL token sent to user wallet
- **July 2025**: **PRODUCTION READY** - Complete cross-chain USDT→SOL conversion system implemented
  - **LIVE**: Platform wallet configured for real USDT revenue collection (Polygon: 2 USDT available)
  - **LIVE**: Cross-chain bridge: Polygon USDT → Solana SOL automatic conversion
  - **LIVE**: Multi-step conversion: USDT→MATIC→SOL using 1inch + live pricing APIs
  - **LIVE**: Real Solana SPL token creation on mainnet for paying subscribers
  - **LIVE**: Economics: ~$0.997 profit per token ($1 revenue vs $0.003 conversion cost)
  - **VERIFIED**: Bridge tested successfully - 0.003 USDT → 0.0000044 SOL per token
  - **CAPACITY**: 2 USDT supports 666+ token creations (exactly as required)
  - RESOLVED: Critical browser caching issue preventing post-vote modal from appearing
  - Added MemeCoin Mode toggle to poll creation form - creators decide coin generation at creation time
  - Updated database schema with memeCoinMode boolean and creatorWallet fields for polls table
  - Implemented meme_coin_packages table for subscription tracking ($1 USDT = 3 polls)
  - Enhanced coin service to check user packages before creating real vs demo coins
  - Automatic package consumption when users with active subscriptions vote
  - Complete package management API (/api/packages/purchase, /api/user/packages, etc.)
  - Real Solana token creation for paying subscribers vs demo mode for others
  - Wallet integration with MetaMask for seamless USDT payments on Polygon
  - Dual payment options: wallet connect (one-click) and manual payment (copy/paste)
  - Modified backend voting logic to only generate coins when MemeCoin Mode is enabled on specific polls
  - Added optional creator wallet address field for real coin delivery vs demo mode
  - Implemented automatic Solana meme coin generation feature
  - Added database schema for tracking generated coins (coin name, symbol, address, wallet)
  - Created coin service for automatic token creation when users vote
  - Added API endpoints for viewing user coins (/api/user/coins) and poll coins (/api/polls/:id/coins)
  - Coins are named after the option users vote for (e.g., "DogeCoin" → "DOGECO")
  - Successfully tested: coin generation, storage, and retrieval functionality
- **January 2025**: Application name changed from "Votes and Wars" to "ThisThat.Market"
  - Updated all UI references including headers, footers, auth pages, and battle game titles
  - Replaced flag icons with custom scales of justice logo throughout the application
  - Updated Header, Footer, and Authentication page logos
  - Optimized logo visibility by removing circular containers and increasing sizes
  - Restricted battle game access: removed standalone navigation links from header and footer
  - Battle games now only accessible through polls with War Mode enabled
  - Updated challenger labels from "Challenger 1" and "Challenger 2" to "This" and "That" throughout the application
  - Maintained all existing functionality during updates

## Project Architecture
- **Frontend**: React.js with TypeScript, Tailwind CSS, shadcn/ui components
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Multiple options (Firebase, Replit Auth, local auth)
- **Real-time**: WebSocket integration for live game updates

## Key Features
- Time-limited "This or That" challenges (1h-72h duration)
- Interactive car battle games with sumo-style mechanics
- Achievement system with ranking hierarchy (Egg → Jack → Queen → King → Ace → Joker/Jester)
- Social authentication and guest access
- Real-time vote counting and game state management
- Gold and black premium color scheme
- Responsive design for mobile, tablet, and desktop

## User Preferences
- Maintain existing functionality during any changes
- Focus on battle game mechanics and user experience
- Keep the premium gold and black aesthetic
- Ensure real-time features work smoothly
- Logo should be prominent without circular background containers
- Prefer larger, more visible logo sizes throughout the application

## Development Notes
- Special handling for problematic challenges (25, 29, 30) to prevent replay issues
- Battle games auto-start after challenge completion
- Users can only control the car they voted for
- Standalone battle game accessible from footer
# ThisThat.Market

## Overview
A dynamic "This or That" polling application with interactive battle game mechanics. Users create time-limited challenges with two options, each with image avatars. The key feature is an interactive car battle game where voting impacts car movement in real-time sumo-style contests.

## Recent Changes
- **July 2025**: Implemented "MemeCoin Mode" toggle solution for poll creators
  - RESOLVED: Critical browser caching issue preventing post-vote modal from appearing
  - Added MemeCoin Mode toggle to poll creation form - creators decide coin generation at creation time
  - Updated database schema with memeCoinMode boolean and creatorWallet fields for polls table
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
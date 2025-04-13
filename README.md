# Game Hub Server

Backend server for the Game Hub application. This server provides APIs for managing games and player interactions.

## Features

- RESTful API endpoints for games
- MongoDB integration with fallback to mock data
- Express.js server with CORS support
- TypeScript for type safety

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Configure environment variables:
   Create a `.env` file in the root directory with the following variables:
   ```
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017/gamehub
   ```

3. Run the development server:
   ```
   npm run dev
   ```

## API Endpoints

- `GET /api/games` - Get all games
- `POST /api/games/:id/join` - Join a game

## Development

- Build: `npm run build`
- Start production: `npm start`

## Requirements

- Node.js 16+
- MongoDB (optional, will fallback to mock data)

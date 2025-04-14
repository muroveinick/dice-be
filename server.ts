import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
import { Game } from "./models/Game.js";
import { v4 as uuidv4 } from "uuid";
import { IGame } from "./models/Game.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

const corsOptions = {
  origin: "*", // In production, you'd specify your client's domain
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.use(express.json());

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

let dbConnected = false;

let mongoUri = `mongodb://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@${process.env.MONGODB_HOST}:${process.env.MONGODB_PORT}/${process.env.MONGO_INITDB_DATABASE}`;

console.log(mongoUri);

await mongoose
  .connect(mongoUri)
  .then(() => {
    console.log("Connected to MongoDB");
    dbConnected = true;
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    console.log("Running with mock data instead of MongoDB");
    dbConnected = false;
  });

const mockGames: IGame[] = [
  {
    id: "game-1",
    name: "Game 1",
    players: [],
    currentPlayerIndex: 0,
    gamePhase: "SETUP",
    turnCount: 0,
    grid: {
      cells: [],
      width: 10,
      height: 10,
    },
    figures: [],
    createdAt: new Date(),
    lastActivity: new Date(),
  },
  {
    id: "game-2",
    name: "Game 2",
    players: [],
    currentPlayerIndex: 0,
    gamePhase: "SETUP",
    turnCount: 0,
    grid: {
      cells: [],
      width: 8,
      height: 8,
    },
    figures: [],
    createdAt: new Date(),
    lastActivity: new Date(),
  },
  {
    id: "game-3",
    name: "Game 3",
    players: [],
    currentPlayerIndex: 0,
    gamePhase: "SETUP",
    turnCount: 0,
    grid: {
      cells: [],
      width: 12,
      height: 12,
    },
    figures: [],
    createdAt: new Date(),
    lastActivity: new Date(),
  },
];

app.get("/api/games", async (_req, res) => {
  if (!dbConnected) {
    console.error("Database not connected, running with mock data");
    return res.json(mockGames);
  }

  try {
    const games = await Game.find();
    // Format games for API response if needed
    const formattedGames = games.map((game) => ({
      _id: game._id,
      id: game.id,
      name: game.id, // Using id as name for now
      description: `Game with ${game.players.length} players`,
      players: game.players.length,
      maxPlayers: 10, // Setting a default max
      currentPhase: game.gamePhase,
    }));
    res.json(formattedGames);
  } catch (error) {
    console.error("Error fetching games:", error);
  }
});

app.post("/api/games/:id/join", async (req, res) => {
  console.log(`POST /api/games/${req.params.id}/join called`);
  const playerId = req.body.playerId || `player-${uuidv4()}`;
  const playerName =
    req.body.playerName || `Player ${Math.floor(Math.random() * 1000)}`;
  const playerColor =
    req.body.color || `#${Math.floor(Math.random() * 16777215).toString(16)}`;

  try {
    if (!dbConnected) {
      return res.json({ message: "Joined game successfully (mock)" });
    }

    const game = await Game.findById(req.params.id);

    if (!game) {
      return res.status(404).json({ message: "Game not found" });
    }

    // Check if game is full (assuming max 10 players)
    if (game.players.length >= 10) {
      return res.status(400).json({ message: "Game is full" });
    }

    // Add player to the game
    game.players.push({
      id: playerId,
      name: playerName,
      color: playerColor,
      score: 0,
      isOnline: true,
      lastActivity: new Date(),
    });

    game.lastActivity = new Date();
    await game.save();

    res.json({ message: "Joined game successfully", game });
  } catch (error) {
    console.error("Error joining game:", error);
    res.status(500).json({ message: "Error joining game" });
  }
});

const seedData = async () => {
  if (!dbConnected) {
    console.log("Database not connected, skipping seed data");
    return;
  }

  try {
    const count = await Game.countDocuments();
    console.log(count);
    
    if (count === 0) {
      // Create sample games with the new structure
      const games = mockGames.map((game) => {
        return {
          id: game.id,
          name: game.name,
          players: [],
          currentPlayerIndex: 0,
          gamePhase: "SETUP",
          turnCount: 0,
          grid: {
            cells: [],
            width: 10,
            height: 10,
          },
          figures: [],
          createdAt: new Date(),
          lastActivity: new Date(),
        };
      });

      await Game.insertMany(games);
      console.log("Database seeded with sample games");
    }
  } catch (error) {
    console.error("Error seeding data:", error);
  }
};

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  seedData();
});

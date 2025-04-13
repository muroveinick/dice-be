import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
import { Game } from "./models/Game.js";

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

const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/gamehub";

mongoose
  .connect(mongoUri, {
    user: process.env.MONGO_USERNAME,
    pass: process.env.MONGO_PASSWORD,
    authSource: "admin",
  })
  .then(() => {
    console.log("Connected to MongoDB");
    dbConnected = true;
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    console.log("Running with mock data instead of MongoDB");
    dbConnected = false;
  });

const mockGames = [
  {
    _id: "1",
    name: "Space Explorers",
    description:
      "Explore the vast universe and discover new planets in this multiplayer space adventure.",
    players: 2,
    maxPlayers: 10,
    imageUrl:
      "https://images.unsplash.com/photo-1581822261290-991b38693d1b?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60",
  },
  {
    _id: "2",
    name: "Dragon Hunters",
    description:
      "Team up with friends to hunt legendary dragons and collect epic loot.",
    players: 0,
    maxPlayers: 5,
    imageUrl:
      "https://images.unsplash.com/photo-1642416379528-61365bd96773?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60",
  },
  {
    _id: "3",
    name: "Cyber Wars",
    description:
      "Enter the digital battlefield and compete in this futuristic FPS game.",
    players: 18,
    maxPlayers: 20,
    imageUrl:
      "https://images.unsplash.com/photo-1542751371-adc38448a05e?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60",
  },
  {
    _id: "4",
    name: "Medieval Kingdom",
    description:
      "Build your own medieval kingdom and form alliances with other players.",
    players: 5,
    maxPlayers: 50,
    imageUrl:
      "https://images.unsplash.com/photo-1630266866532-f94c1a72e5b9?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60",
  },
  {
    _id: "5",
    name: "Racing Champions",
    description:
      "Compete in high-speed races across exotic locations around the world.",
    players: 0,
    maxPlayers: 8,
    imageUrl:
      "https://images.unsplash.com/photo-1547949003-9792a18a2601?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60",
  },
  {
    _id: "6",
    name: "Zombie Apocalypse",
    description:
      "Survive the zombie apocalypse with your friends in this cooperative survival game.",
    players: 3,
    maxPlayers: 4,
    imageUrl:
      "https://images.unsplash.com/photo-1603208235206-8a3a6afb5179?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60",
  },
];

app.get("/api/games", async (_req, res) => {
  console.log("GET /api/games called");

  try {
    if (dbConnected) {
      const games = await Game.find();
      res.json(games);
    } else {
      res.json(mockGames);
    }
  } catch (error) {
    console.error("Error fetching games:", error);
    res.json(mockGames);
  }
});

app.post("/api/games/:id/join", async (req, res) => {
  console.log(`POST /api/games/${req.params.id}/join called`);

  try {
    if (!dbConnected) {
      return res.json({ message: "Joined game successfully (mock)" });
    }

    const game = await Game.findById(req.params.id);

    if (!game) {
      return res.status(404).json({ message: "Game not found" });
    }

    if (game.players >= game.maxPlayers) {
      return res.status(400).json({ message: "Game is full" });
    }

    game.players += 1;
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
    if (count === 0) {
      const games = mockGames.map((game) => {
        const { _id, ...gameData } = game;
        return gameData;
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

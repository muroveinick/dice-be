import { IGame } from "@shared/interfaces.js";
import mongoose, { Schema } from "mongoose";

// Game schema definition
const gameSchema = new Schema<IGame>({
  id: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  players: [{}],
  currentPlayerIndex: {
    type: Number,
    required: true,
  },
  gamePhase: {
    type: String,
    enum: ["SETUP", "PLAYING", "FINISHED"],
    required: true,
  },
  turnCount: {
    type: Number,
    required: true,
  },
  figures: {},
  grid: {},

  createdAt: {
    type: Date,
    required: true,
    default: Date.now,
  },
  lastActivity: {
    type: Date,
    required: true,
    default: Date.now,
  },
});

// Create and export the Game model
export const Game = mongoose.model<IGame>("Game", gameSchema);

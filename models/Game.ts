import { IGame } from "@shared/interfaces.js";
import { COLOR_KEYS } from "@shared/data.js";
import mongoose, { Schema } from "mongoose";

// Coordinate sub-schema (shared by hex and figure center fields)
const coordinateSchema = new Schema(
  {
    col: { type: Number, required: true },
    row: { type: Number, required: true },
  },
  { _id: false }
);

// Sub-schema for hex objects (used by figures)
const hexSchema = new Schema(
  {
    coordinates: { type: coordinateSchema, required: true },
    parent: { type: Number, required: true },
  },
  { _id: false }
);

// Sub-schema for figures array
const figureSchema = new Schema(
  {
    config: {
      color: {
        type: String,
        enum: COLOR_KEYS,
        required: true,
      },
      initialHex: {
        type: hexSchema,
        required: true,
      },
      index: {
        type: Number,
        required: true,
      },
    },
    linked_hexes: [hexSchema],
    dice: { type: Number, required: true },
    center: { type: coordinateSchema, required: true },
  },
  { _id: false }
);

// Sub-schema for the players array
const playerSchema = new Schema(
  {
    config: {
      color: {
        type: String,
        enum: COLOR_KEYS,
        required: true,
      },
      isAuto: {
        type: Boolean,
        required: true,
      },
      isDefeated: {
        type: Boolean,
        default: false,
      },
    },
    figures: [
      {
        type: Number,
        required: true,
      },
    ],
    user: {
      type: new Schema(
        {
          id: { type: Schema.Types.ObjectId, ref: "User" },
          username: { type: String },
        },
        { _id: false }
      ),
      required: false,
    },
  },
  { _id: false }
);

// Game schema definition
const gameSchema = new Schema<IGame>({
  name: {
    type: String,
    required: true,
  },
  players: [playerSchema],
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
  figures: [figureSchema],
  grid: {
    cols: {
      type: Number,
      required: true,
    },
    rows: {
      type: Number,
      required: true,
    },
  },

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
  autoPlayControllerId: {
    type: String,
    default: null,
  },
});

// Create and export the Game model
export const Game = mongoose.model<IGame>("Game", gameSchema);

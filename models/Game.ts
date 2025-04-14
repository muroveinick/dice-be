import mongoose, { Document, Schema } from 'mongoose';

// Define player interface
interface IPlayer {
  id: string;
  name: string;
  color: string;
  score?: number;
  isOnline?: boolean;
  lastActivity?: Date;
}

// Define cell interface
interface ICell {
  x: number;
  y: number;
  type: 'EMPTY' | 'WALL' | 'SPAWN' | 'SPECIAL';
  occupiedBy?: string | null;
}

// Define grid interface
interface IGrid {
  cells: ICell[][];
  width: number;
  height: number;
}

// Define position interface
interface IPosition {
  x: number;
  y: number;
}

// Define figure interface
interface IFigure {
  id: string;
  playerId: string;
  type: 'PAWN' | 'KNIGHT' | 'BISHOP' | 'ROOK' | 'QUEEN' | 'KING';
  position: IPosition;
}

// Game interface 
export interface IGame {
  id: string;
  name: string;
  players: IPlayer[];
  currentPlayerIndex: number;
  gamePhase: 'SETUP' | 'PLAYING' | 'FINISHED';
  turnCount: number;
  grid: IGrid;
  figures: IFigure[];
  createdAt: Date;
  lastActivity: Date;
}

// Game schema definition
const gameSchema = new Schema<IGame>({
  id: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  players: [{
    id: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    color: {
      type: String,
      required: true
    },
    score: {
      type: Number,
    },
    isOnline: {
      type: Boolean,
    },
    lastActivity: {
      type: Date,
    }
  }],
  currentPlayerIndex: {
    type: Number,
    required: true
  },
  gamePhase: {
    type: String,
    enum: ['SETUP', 'PLAYING', 'FINISHED'],
    required: true
  },
  turnCount: {
    type: Number,
    required: true
  },
  grid: {
    cells: [[{
      x: {
        type: Number,
        required: true
      },
      y: {
        type: Number,
        required: true
      },
      type: {
        type: String,
        enum: ['EMPTY', 'WALL', 'SPAWN', 'SPECIAL'],
        required: true
      },
      occupiedBy: {
        type: String,
        default: null
      }
    }]],
    width: {
      type: Number,
      required: true
    },
    height: {
      type: Number,
      required: true
    }
  },
  figures: [{
    id: {
      type: String,
      required: true
    },
    playerId: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['PAWN', 'KNIGHT', 'BISHOP', 'ROOK', 'QUEEN', 'KING'],
      required: true
    },
    position: {
      x: {
        type: Number,
        required: true
      },
      y: {
        type: Number,
        required: true
      }
    },
    moveCount: {
      type: Number
    },
    isActive: {
      type: Boolean
    }
  }],
  createdAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  lastActivity: {
    type: Date,
    required: true,
    default: Date.now
  }
});

// Create and export the Game model
export const Game = mongoose.model<IGame>('Game', gameSchema);

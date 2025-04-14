// Player Schema Validation
const playerValidation = {
  bsonType: "object",
  required: ["id", "name", "color"],
  properties: {
    id: {
      bsonType: "string",
      description: "Player identifier",
    },
    name: {
      bsonType: "string",
      description: "Player name",
    },
    color: {
      bsonType: "string",
      description: "Player color",
    },
    score: {
      bsonType: "int",
      description: "Player score",
    },
    isOnline: {
      bsonType: "bool",
      description: "Whether the player is currently online",
    },
    lastActivity: {
      bsonType: "date",
      description: "When the player was last active",
    },
  },
};

// Cell Schema Validation
const cellValidation = {
  bsonType: "object",
  required: ["x", "y", "type"],
  properties: {
    x: {
      bsonType: "int",
      description: "X-coordinate",
    },
    y: {
      bsonType: "int",
      description: "Y-coordinate",
    },
    type: {
      bsonType: "string",
      enum: ["EMPTY", "WALL", "SPAWN", "SPECIAL"],
      description: "Type of cell",
    },
    occupiedBy: {
      bsonType: ["string", "null"],
      description: "ID of figure occupying this cell, if any",
    },
  },
};

// Grid Schema Validation
const gridValidation = {
  bsonType: "object",
  required: ["cells", "width", "height"],
  properties: {
    cells: {
      bsonType: "array",
      items: {
        bsonType: "array",
        items: cellValidation,
      },
      description: "2D array of cells",
    },
    width: {
      bsonType: "int",
      description: "Width of the grid",
    },
    height: {
      bsonType: "int",
      description: "Height of the grid",
    },
  },
};

// Figure Schema Validation
const figureValidation = {
  bsonType: "object",
  required: ["id", "playerId", "type", "position"],
  properties: {
    id: {
      bsonType: "string",
      description: "Figure identifier",
    },
    playerId: {
      bsonType: "string",
      description: "ID of the player who owns this figure",
    },
    type: {
      bsonType: "string",
      enum: ["PAWN", "KNIGHT", "BISHOP", "ROOK", "QUEEN", "KING"],
      description: "Type of figure",
    },
    position: {
      bsonType: "object",
      required: ["x", "y"],
      properties: {
        x: {
          bsonType: "int",
          description: "X-coordinate",
        },
        y: {
          bsonType: "int",
          description: "Y-coordinate",
        },
      },
      description: "Figure position",
    },
    moveCount: {
      bsonType: "int",
      description: "Number of moves this figure has made",
    },
    isActive: {
      bsonType: "bool",
      description: "Whether this figure is still active in the game",
    },
  },
};

// Game Schema Validation (Complete)
const gameValidation = {
  bsonType: "object",
  required: [
    "id",
    "players",
    "currentPlayerIndex",
    "gamePhase",
    "turnCount",
    "grid",
    "figures",
    "createdAt",
    "lastActivity",
  ],
  properties: {
    id: {
      bsonType: "string",
      description: "Game identifier",
    },
    players: {
      bsonType: "array",
      items: playerValidation,
      description: "Array of players",
    },
    currentPlayerIndex: {
      bsonType: "int",
      description: "Index of the current player",
    },
    gamePhase: {
      bsonType: "string",
      enum: ["SETUP", "PLAYING", "FINISHED"],
      description: "Current phase of the game",
    },
    turnCount: {
      bsonType: "int",
      description: "Number of turns completed",
    },
    grid: gridValidation,
    figures: {
      bsonType: "array",
      items: figureValidation,
      description: "Array of figures on the board",
    },
    createdAt: {
      bsonType: "date",
      description: "When the game was created",
    },
    lastActivity: {
      bsonType: "date",
      description: "When the game was last active",
    },
  },
};

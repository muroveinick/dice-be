// ------------------------------------------------------
// Validation blocks kept in sync with Mongoose schemas
// ------------------------------------------------------

// Colour enum from dice-shared/data.ts
const COLOR_KEYS = ["RED", "BLUE", "GREEN", "YELLOW", "PURPLE", "ORANGE", "PINK"];

// Re-usable coordinate pair  { col, row }
const coordinateValidation = {
  bsonType: "object",
  required: ["col", "row"],
  properties: {
    col: { bsonType: "int" },
    row: { bsonType: "int" },
  },
};

// Hex = { coordinates, parent }
const hexValidation = {
  bsonType: "object",
  required: ["coordinates", "parent"],
  properties: {
    coordinates: coordinateValidation,
    parent: { bsonType: "int" },
  },
};

// ------------------------------------
// Figures, Players, Grid, Game
// ------------------------------------

const figureValidation = {
  bsonType: "object",
  required: ["config", "linked_hexes", "dice", "center"],
  properties: {
    config: {
      bsonType: "object",
      required: ["color", "initialHex", "index"],
      properties: {
        color: { bsonType: "string", enum: COLOR_KEYS },
        initialHex: hexValidation,
        index: { bsonType: "int" },
      },
    },
    linked_hexes: { bsonType: "array", items: hexValidation },
    dice: { bsonType: "int" },
    center: coordinateValidation,
  },
};

const playerValidation = {
  bsonType: "object",
  required: ["config", "figures"],
  properties: {
    config: {
      bsonType: "object",
      required: ["color", "isAuto"],
      properties: {
        color: { bsonType: "string", enum: COLOR_KEYS },
        isAuto: { bsonType: "bool" },
        isDefeated: { bsonType: "bool" },
      },
    },
    figures: { bsonType: "array", items: { bsonType: "int" } }, 
    user: {
      bsonType: "object",
      properties: {
        id: { bsonType: "objectId" },
        username: { bsonType: "string" },
      },
    },
  },
};

// Grid in the current model is a simple coordinate pair
const gridValidation = {
  bsonType: "object",
  required: ["cols", "rows"],
  properties: {
    cols: { bsonType: "int" },
    rows: { bsonType: "int" },
  },
};

// ------------------------------------
// Tokens & Game
// ------------------------------------

const tokenValidation = {
  bsonType: "object",
  required: ["userId", "token", "type", "expiresAt", "createdAt"],
  properties: {
    userId: { bsonType: "objectId" },
    token: { bsonType: "string" },
    type: { bsonType: "string", enum: ["auth", "blacklisted"] },
    expiresAt: { bsonType: "date" },
    createdAt: { bsonType: "date" },
  },
};

const gameValidation = {
  bsonType: "object",
  required: ["name", "players", "currentPlayerIndex", "gamePhase", "turnCount", "grid", "figures", "createdAt", "lastActivity"],
  properties: {
    name: { bsonType: "string" },
    players: { bsonType: "array", items: playerValidation },
    currentPlayerIndex: { bsonType: "int" },
    gamePhase: { bsonType: "string", enum: ["SETUP", "PLAYING", "FINISHED"] },
    turnCount: { bsonType: "int" },
    grid: gridValidation,
    figures: { bsonType: "array", items: figureValidation },
    createdAt: { bsonType: "date" },
    lastActivity: { bsonType: "date" },
    autoPlayControllerId: { bsonType: ["string", "null"] },
  },
};

// ------------------------------------------------------
// Keep exports exactly as init.js expects
// ------------------------------------------------------
/* eslint-disable no-unused-vars, @typescript-eslint/no-unused-vars */
module.exports = {
  playerValidation,
  figureValidation,
  gridValidation,
  tokenValidation,
  gameValidation,
};

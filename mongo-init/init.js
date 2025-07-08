load("/docker-entrypoint-initdb.d/scheme.js");

console.log("MongoDB initialization script started");
console.log(process.env);

db = db.getSiblingDB(process.env.MONGO_INITDB_DATABASE);

// Create collections with schemas and validation
db.createCollection("games", {
  validator: {
    $jsonSchema: gameValidation,
  },
  validationLevel: "strict",
  validationAction: "error",
});

// Explicitly define the schema for documentation purposes
db.runCommand({
  collMod: "games",
  validator: {
    $jsonSchema: gameValidation,
  },
  validationLevel: "strict",
  validationAction: "error",
});

// Create indexes if needed for games collection
db.games.createIndex({ name: 1 }, { unique: true });

// ======================
// Tokens collection
// ======================

db.createCollection("tokens", {
  validator: {
    $jsonSchema: tokenValidation,
  },
  validationLevel: "strict",
  validationAction: "error",
});

// Ensure validator persists (esp. if collection exists)
db.runCommand({
  collMod: "tokens",
  validator: {
    $jsonSchema: tokenValidation,
  },
  validationLevel: "strict",
  validationAction: "error",
});

// Indexes for faster token lookups and TTL
const THIRTY_DAYS_IN_SECONDS = 30 * 24 * 60 * 60;
db.tokens.createIndex({ token: 1, type: 1 });
db.tokens.createIndex({ userId: 1, type: 1 });
db.tokens.createIndex({ createdAt: 1 }, { expireAfterSeconds: THIRTY_DAYS_IN_SECONDS });

db.createUser({
  user: `${process.env.MONGO_USER}`,
  pwd: `${process.env.MONGO_PASSWORD}`,
  roles: [{ role: "readWrite", db: process.env.MONGO_INITDB_DATABASE }],
});

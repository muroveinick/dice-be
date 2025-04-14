load("/docker-entrypoint-initdb.d/scheme.js");

console.log("MongoDB initialization script started");
console.log(process.env);

db = db.getSiblingDB("gamehub");

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
    $jsonSchema: gameValidation
  },
  validationLevel: "strict",
  validationAction: "error"
});

// Create indexes if needed
db.games.createIndex({ name: 1 }, { unique: true });

db.createUser({
  user: `${process.env.MONGO_USER}`,
  pwd: `${process.env.MONGO_PASSWORD}`,
  roles: [{ role: "readWrite", db: "gamehub" }],
});

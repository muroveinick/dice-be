import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

let dbConnected = false;

const connectDB = async (): Promise<boolean> => {
  try {
    const protocol = "mongodb";
    const host = process.env.MONGODB_HOST || "localhost";
    const port = process.env.MONGODB_PORT || "27017";
    const username = process.env.MONGO_USER;
    const password = process.env.MONGO_PASSWORD;
    const database = process.env.MONGO_INITDB_DATABASE;

    // Construct the URI with embedded credentials
    const mongoUri = process.env.MONGODB_URI || `${protocol}://${username}:${password}@${host}:${port}/${database}`;
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB");
    dbConnected = true;
    return true;
  } catch (err) {
    console.error("MongoDB connection error:", err);
    console.log("Running with mock data instead of MongoDB");
    dbConnected = false;
    return false;
  }
};

export { connectDB, dbConnected };

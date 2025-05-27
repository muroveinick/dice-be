import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { connectDB } from "./config/db.js";
import apiRoutes from "./routes/index.js";
import { requestLogger } from "./middleware/logger.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { initSocketService } from "./services/socketService.js";
import { NextFunction, Request, Response } from "express";

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*", // In production, change to specific origin
    methods: ["GET", "POST"],
  },
});

const PORT = process.env.PORT || 3001;

// CORS configuration
const corsOptions = {
  "access-control-allow-origin": "*",
  origin: "*", // In production change
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(requestLogger);

await connectDB();

const socketService = initSocketService(io);

app.use("/api", apiRoutes);

// Error handling middleware
app.use(errorHandler);

// socket
app.set("io", io);
app.set("socketService", socketService);

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

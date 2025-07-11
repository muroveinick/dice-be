import { SocketEvents } from "@shared/socket.js";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { createServer } from "http";
import { Server, Socket } from "socket.io";
import { connectDB } from "./config/db.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { requestLogger } from "./middleware/logger.js";
import { rateLimiter, socketLimiter } from "./middleware/rateLimiter.js";
import apiRoutes from "./routes/index.js";
import { defaultConfig, SocketService } from "./services/socketService.js";

dotenv.config();

const app = express();
const httpServer = createServer(app);
export const io = new Server(httpServer, defaultConfig);

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
app.use(rateLimiter);
app.use(express.json());
app.use(requestLogger);

await connectDB();

SocketService.getInstance();

io.use(async (socket: Socket, next) => {
  try {
    await socketLimiter.consume(socket.id);
    next();
  } catch {
    socket.emit(SocketEvents.ERROR, { message: "Rate limit exceeded" });
  }
});

app.use("/api", apiRoutes);

// Error handling middleware
app.use(errorHandler);

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

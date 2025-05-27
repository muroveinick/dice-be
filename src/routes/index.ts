import express from "express";
import gameRoutes from "./gameRoutes.js";
import authRoutes from "./authRoutes.js";

const router = express.Router();

// Define API routes
router.use("/games", gameRoutes);
router.use("/auth", authRoutes);

export default router;

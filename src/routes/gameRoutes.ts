import express from "express";
import * as gameController from "../controllers/gameController.js";
import * as authMiddleware from "../middleware/auth.js";

const router = express.Router();

// Route definitions
router.get("/", gameController.getGames);
router.get("/:id", gameController.getGameById);
router.post("/:id/join", authMiddleware.protect, gameController.joinGame);
router.post("/", authMiddleware.protect, gameController.postGame);

export default router;

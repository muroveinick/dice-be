import express from "express";
import * as gameController from "../controllers/gameController.js";

const router = express.Router();

// Route definitions
router.get("/", gameController.getGames);
router.get("/:id", gameController.getGameById);
router.post("/:id/join", gameController.joinGame);
router.post("/", gameController.postGame);

export default router;

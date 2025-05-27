import { Request, Response } from "express";
import * as gameService from "../services/gameService.js";
import { IGame } from "@shared/interfaces.js";

/**
 * Get all games
 * @route GET /api/games
 */
export const getGames = async (_req: Request, res: Response) => {
  try {
    console.log("Fetching all games");
    
    const games = await gameService.getAllGames();
    res.json(games);
  } catch (error) {
    console.error("Error in getGames controller:", error);
    res.status(500).json({ message: "Error fetching games" });
  }
};

export const getGameById = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    console.log(`Fetching game by ID: ${id}`);
    const game = await gameService.getGameById(id);
    res.json(game);
  } catch (error) {
    console.error("Error in getGameById controller:", error);
    res.status(500).json({ message: "Error fetching game" });
  }
};

/**
 * Join a game
 * @route POST /api/games/:id/join
 */
export const joinGame = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const result = await gameService.joinGame(id, req.body);
    res.json(result);
  } catch (error: any) {
    console.error("Error in joinGame controller:", error);

    // Handle specific errors with appropriate status codes
    if (error.message === "Game not found") {
      return res.status(404).json({ message: error.message });
    } else if (error.message === "Game is full") {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({ message: "Error joining game" });
  }
};

export const postGame = async (req: Request, res: Response) => {
  try {
    const game = req.body as IGame;

    const if_existing = await gameService.getGameById(game.id);
    console.log("Game already exists:", !!if_existing);
    let result;
    if (!if_existing) {
      result = await gameService.saveGame(req.body);
    } else {
      result = await gameService.updateGame(game.id, req.body);
    }
    console.log("Result:", !!result);

    res.json(result);
  } catch (error) {
    console.error("Error in createGame controller:", error);
    res.status(500).json({ message: "Error creating game" });
  }
};

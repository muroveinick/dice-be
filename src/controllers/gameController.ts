import { Request, Response } from "express";
import * as gameService from "../services/gameService.js";
import { IGame } from "@shared/interfaces.js";
import { ApiError } from "src/utils/errorUtils.js";
import { HydratedDocument } from "mongoose";


export const getGames = async (_req: Request, res: Response) => {
  try {

    const games = await gameService.getAllGames();
    res.json(games);
  } catch (error) {
    console.error("Error in getGames controller:", error);
    throw ApiError.internal("Error fetching games");
  }
};

export const getGameById = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    console.log(`Fetching game by ID: ${id}`);
    const game = await gameService.getGameById(id);
    if (!game) {
      throw ApiError.notFound(`Game with ID ${id} not found`);
    }
    res.json(game);
  } catch (error) {
    console.error("Error in getGameById controller:", error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw ApiError.internal("Error fetching game");
  }
};

/**
 * Join a game
 * @route POST /api/games/:id/join
 */
export const joinGame = async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = req.user

  console.log("User:", user);


  if (!user) {
    throw ApiError.unauthorized("User not found");
  }

  try {
    const result = await gameService.joinGame(id, user);
    res.json(result);
  } catch (error: any) {
    console.error("Error in joinGame controller:", error);

    throw ApiError.internal("Error joining game");
  }
};

export const postGame = async (req: Request, res: Response) => {
  try {
    const game = req.body as IGame;
    const user = req.user;

    if (!user) {
      throw ApiError.unauthorized("User not found");
    }

    const if_existing = await gameService.getGameById(game._id);
    let result;
    if (!if_existing) {
      result = await gameService.saveGame(req.body);
    } else {
      result = await gameService.updateGame(game._id, req.body);
    }

    await gameService.patchPlayerInsideGame(result as HydratedDocument<IGame>, user);

    res.json(result);
  } catch (error) {
    console.error("Error in createGame controller:", error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw ApiError.internal("Error creating or updating game");
  }
};

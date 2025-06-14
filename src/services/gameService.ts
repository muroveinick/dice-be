import { IGame, IJoinGameResponse, IPlayer, IUserScheme } from "@shared/interfaces.js";
import { SocketEvents } from "@shared/socket.js";
import { Game } from "models/Game.js";
import mongoose from "mongoose";
import { ApiError } from "src/utils/errorUtils.js";
import "../utils/proto.implementation.js";
import { SocketService } from "./socketService.js";

/**
 * Get all games
 */
export const getAllGames = async (): Promise<IGame[]> => {
  const games = await Game.find().limit(10);
  return games;
};

/**
 * Get a single game by ID
 */
export const getGameById = async (gameId: string): Promise<IGame | null> => {
  const game = await Game.findOne<IGame>({ id: gameId });
  console.log("Game found:", game?.id);

  if (!game) return null;

  return game;
};

/**
 * Create a new game
 */
export const saveGame = async (gameData: Partial<IGame>): Promise<IGame> => {
  const gameToSave = new Game(gameData);
  await gameToSave.save();
  return gameToSave;
};

export const updateGame = async (gameId: string, gameData: Partial<IGame>): Promise<IGame> => {
  const game = await Game.findOneAndUpdate<IGame>({ id: gameId }, gameData, { new: true });
  return game!;
};

/**
 * Join a game
 */


const patchPlayerInsideGame = async (game: mongoose.Document<any>, player: IPlayer, playerId: string) => {
  console.log("Patching player:", player);

  player.id = playerId;
  player.config.isAuto = false;
  game.markModified('players');
  await game.save();
}

export const joinGame = async (gameId: string, user: IUserScheme): Promise<IJoinGameResponse> => {

  const userId = user._id.toString();

  try {
    const game = await Game.findOne({ id: gameId });

    if (!game) {
      throw ApiError.notFound("Game not found");
    }

    // Check if the game is full (assuming max 4 players for now)
    // if (game.players.length >= 4) {
    //   throw new Error("Game is full");
    // }

    // check if any available player slot is empty
    const gameIsFull = game.players.every((player) => player.id);
    if (gameIsFull) {
      throw ApiError.badRequest("Game is full");
    }

    let player: IPlayer;
    const is_player_already_in_game = game.players.find(player => player.id === userId);

    if (is_player_already_in_game) {
      player = is_player_already_in_game;
    } else {
      // bind random slot to player
      const player_sorted = game.players.filter((player) => !player.id);
      player = player_sorted.random();
    }

    const response: IJoinGameResponse = {
      gameId,
      user: {
        id: userId,
        username: user.username
      },
      player
    };


    // For WebSocket, we need to track some player identity
    await patchPlayerInsideGame(game, response.player, userId);
    SocketService.getInstance().processJoinGame(response);
    return response;

  } catch (error) {
    throw ApiError.internal("Error joining game");
  }
};
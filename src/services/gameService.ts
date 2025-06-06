import { IGame, IJoinGameResponse, IPlayer } from "@shared/interfaces.js";
import mongoose from "mongoose";
import { Game } from "models/Game.js";
import { ApiError } from "src/utils/errorUtils.js";
import { dbConnected } from "../config/db.js";
import "../utils/proto.implementation.js";
import { getSocketService } from "./socketService.js";

const mockGames: IGame[] = [
  {
    id: "game-1",
    name: "Game 1",
    players: [],
    currentPlayerIndex: 0,
    gamePhase: "SETUP",
    turnCount: 0,
    grid: {
      cols: 10,
      rows: 10,
    },
    figures: [],
    createdAt: new Date(),
    lastActivity: new Date(),
  },
];

/**
 * Get all games
 */
export const getAllGames = async (): Promise<IGame[]> => {
  if (!dbConnected) {
    console.error("Database not connected, running with mock data");
    return mockGames;
  }

  const games = await Game.find();
  return games.map((game) => ({
    id: game.id,
    name: game.name,
    players: game.players,
    currentPlayerIndex: game.currentPlayerIndex,
    gamePhase: game.gamePhase,
    turnCount: game.turnCount,
    grid: {
      cols: game.grid.cols,
      rows: game.grid.rows,
    },
    figures: game.figures,
    createdAt: game.createdAt,
    lastActivity: game.lastActivity,
  }));
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
  player.id = playerId;
  player.config.isAuto = false;

  console.log("Patching player:", player);

  game.markModified('players');
  await game.save();
}

export const joinGame = async (gameId: string, playerId: string): Promise<IJoinGameResponse> => {

  console.log("Joining game:", gameId);
  console.log("Player id:", playerId);

  try {
    const game = await Game.findOne({ id: gameId });

    if (!game) {
      throw ApiError.notFound("Game not found");
    }

    const is_player_already_in_game = game.players.find(player => player.id === playerId);

    if (is_player_already_in_game) {
      await patchPlayerInsideGame(game, is_player_already_in_game, playerId);
      return { message: "Player already in game", game, player: is_player_already_in_game };
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

    // bind random slot to player
    const player_sorted = game.players.filter((player) => !player.id);
    const player = player_sorted.random();
    await patchPlayerInsideGame(game, player, playerId);



    // For WebSocket, we need to track some player identity
    // Notify all clients in the game room about the new player
    // const socketService = getSocketService();
    // if (socketService) {
    //   socketService.emitToGame(gameId, "player_joined", {
    //     gameId,
    //     player: playerInfo,
    //   });
    // }

    return {
      message: "Joined game successfully",
      game,
      player,
    };
  } catch (error) {
    throw ApiError.internal("Error joining game");
  }
};

/**
 * Leave a game
 */
export const leaveGame = async (gameId: string, clientId: string): Promise<{ message: string }> => {
  if (!dbConnected) {
    return { message: "Left game successfully (mock)" };
  }

  try {
    const game = await Game.findOne({ id: gameId });

    if (!game) {
      throw new Error("Game not found");
    }

    // In a real implementation, you would need to map clientId to the actual
    // player in the database. For simplicity, we'll just remove the first player
    // as an example.
    if (game.players.length > 0) {
      game.players.shift();
      game.lastActivity = new Date();

      await game.save();
    }

    // Notify all clients in the game room
    const socketService = getSocketService();
    if (socketService) {
      socketService.emitToGame(gameId, "player_left", {
        gameId,
        clientId,
      });
    }

    return { message: "Left game successfully" };
  } catch (error) {
    console.error("Error leaving game:", error);
    throw error;
  }
};

// Helper function to generate a random color
function getRandomColor(): string {
  const colors = ["red", "blue", "green", "yellow", "purple", "orange"];
  return colors[Math.floor(Math.random() * colors.length)];
}

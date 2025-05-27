import { IGame, IPlayer } from "@shared/interfaces.js";
import { Game } from "models/Game.js";
import { v4 as uuidv4 } from "uuid";
import { connectDB, dbConnected } from "../config/db.js";
import { getSocketService } from "./socketService.js";
import { SaveOptions } from "mongoose";

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
export const joinGame = async (gameId: string, playerData: any): Promise<{ message: string; game: IGame; player: IPlayer }> => {
  if (!dbConnected) {
    const mockGame = mockGames[0]; // Use the first mock game for simplicity
    const mockPlayer: IPlayer = {
      config: {
        color: getRandomColor(),
        isAuto: false,
      },
      figures: [],
    };

    return {
      message: "Joined game successfully (mock)",
      game: mockGame,
      player: mockPlayer,
    };
  }

  try {
    const game = await Game.findOne({ id: gameId });

    if (!game) {
      throw new Error("Game not found");
    }

    // Check if the game is full (assuming max 4 players for now)
    if (game.players.length >= 4) {
      throw new Error("Game is full");
    }

    // Create a new player object
    const newPlayer: IPlayer = {
      config: {
        color: playerData.color || getRandomColor(),
        isAuto: playerData.isAuto || false,
      },
      figures: [],
    };

    // Add player to the game
    game.players.push(newPlayer);
    game.lastActivity = new Date();

    await game.save();

    // For WebSocket, we need to track some player identity
    // We'll use an extended version of the player info with a client-side id
    const playerInfo: IPlayer = {
      config: newPlayer.config,
      figures: newPlayer.figures,
    };

    // Notify all clients in the game room about the new player
    const socketService = getSocketService();
    if (socketService) {
      socketService.emitToGame(gameId, "player_joined", {
        gameId,
        player: playerInfo,
      });
    }

    // Convert to IGame interface for return
    const gameInfo: IGame = {
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
    };

    return {
      message: "Joined game successfully",
      game: gameInfo,
      player: playerInfo,
    };
  } catch (error) {
    console.error("Error joining game:", error);
    throw error;
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

import { GamePhase, IGame, IPlayer, IUserScheme, ObjectId } from "@shared/interfaces.js";
import { Game } from "models/Game.js";
import { HydratedDocument } from "mongoose";
import { ApiError } from "src/utils/errorUtils.js";
import "../utils/proto.implementation.js";

/**
 * Get all games
 */
export const getAllGames = async (params?: { sortBy?: "createdAt" | "name" | "lastActivity"; sortDir?: "asc" | "desc"; gamePhase?: GamePhase }): Promise<IGame[]> => {
  const query: Record<string, unknown> = {};

  // filter by game phase if provided
  if (params?.gamePhase) {
    query.gamePhase = params.gamePhase;
  }

  // start building mongoose query
  let mongooseQuery = Game.find(query);

  // apply sorting if requested
  const field = params?.sortBy || "lastActivity";
  const direction = params?.sortDir || "desc";
  mongooseQuery = mongooseQuery.sort({ [field]: direction });
  mongooseQuery = mongooseQuery.limit(10);

  const games = await mongooseQuery.exec();
  return games;
};

/**
 * Get a single game by ID
 */
export const getGameById = async (gameId: ObjectId | string): Promise<IGame | null> => {
  const game = await Game.findById(gameId);

  if (!game) {
    return null;
  }

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
  const game = await Game.findByIdAndUpdate(gameId, gameData, { new: true });
  return game!;
};

export const patchPlayerInsideGame = async (game: HydratedDocument<IGame>, user: IUserScheme): Promise<IPlayer> => {
  const players = game.players;

  const is_player_already_in_game = players.find((player) => player.user && player.user.id.equals(user._id));
  if (is_player_already_in_game) {
    return is_player_already_in_game;
  }

  const player = players.filter((p) => !p.user && p.config.isDefeated !== true).random();

  player.user = {
    id: user._id,
    username: user.username,
  };
  player.config.isAuto = false;
  game.markModified("players");
  await game.save();
  return player;
};

export const joinGame = async (gameId: string, user: IUserScheme): Promise<IGame> => {
  try {
    const game = await Game.findById<HydratedDocument<IGame>>(gameId);

    if (!game) {
      throw ApiError.notFound("Game not found");
    }

    // check if any available player slot is empty
    const gameIsFull = game.players.every((player) => player.user);
    if (gameIsFull) {
      throw ApiError.badRequest("Game is full");
    }

    await patchPlayerInsideGame(game, user);

    return game;
  } catch (error) {
    throw ApiError.internal("Error joining game");
  }
};

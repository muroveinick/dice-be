import { Server, Socket } from "socket.io";
import { IAutoPlayClaimPayload, IJoinGamePayload, IJoinGameResponse, ITurnUpdatePayload, SocketEvents } from "../../dice-shared/socket.js";
import { io } from "../server.js";
import { SocketGameUtils } from "./SocketGameUtils.js";

export const defaultConfig = {
  cors: {
    origin: "*", // In production, change to specific origin
    methods: ["GET", "POST"],
  },
  path: "/api/ws",
};

// Define game action types
export interface GameActionData {
  gameId: string;
  action: {
    type: string;
    payload: any;
  };
  playerId?: string;
}

export class SocketService {
  private io: Server;

  // Track which user (by userId) is connected via which socket to which game
  private socketUserMap: Map<string, { gameId: string; userId: string }> = new Map();

  constructor(io: Server) {
    this.io = io;
    this.init();
  }

  private init(): void {
    console.log("Socket service initialized");
    this.io.on(SocketEvents.CONNECT, (socket: Socket) => {
      console.log(`User connected: ${socket.id}`);
      this.setupListeners(socket);
    });
  }

  private setupListeners(socket: Socket): void {
    try {
      // Disconnect event
      socket.on(SocketEvents.DISCONNECT, () => this.handleDisconnect(socket));

      // Join game room
      socket.on(SocketEvents.JOIN_GAME, (payload: IJoinGamePayload) => this.handleJoinGame(socket, payload));

      // Claim / release auto play controller
      socket.on(SocketEvents.CLAIM_AUTO_PLAY, (payload: IAutoPlayClaimPayload) => this.handleClaimAutoPlay(socket, payload));

      // Turn update event
      socket.on(SocketEvents.TURN_UPDATE, (data: ITurnUpdatePayload) => this.handleTurnUpdate(socket, data));
    } catch (error) {
      console.error("Error in setupListeners:", error);
      this.emitToAll(SocketEvents.ERROR, error);
    }
  }

  // =========================
  // = Event handler helpers =
  // =========================

  private async handleDisconnect(socket: Socket): Promise<void> {
    try {
      console.log(`User disconnected: ${socket.id}`);
      const mapping = this.socketUserMap.get(socket.id);
      if (mapping) {
        const { gameId, userId } = mapping;
        this.emitToGame(gameId, SocketEvents.OFFLINE, { userId });

        const { changed } = await SocketGameUtils.updateAutoPlayController(gameId, socket.id, false);
        if (changed) {
          this.emitToGame(gameId, SocketEvents.AUTO_PLAY_STATUS, {
            controllerId: null,
            enabled: false,
          });
        }

        this.socketUserMap.delete(socket.id);
      }
    } catch (error) {
      console.error("Error handling DISCONNECT:", error);
    }
  }

  private async handleJoinGame(socket: Socket, payload: IJoinGamePayload): Promise<void> {
    try {
      console.log(`User joined game: ${payload.gameId}`);
      const { gameId, userId } = payload;
      socket.join(gameId);
      this.socketUserMap.set(socket.id, { gameId, userId });

      const response = await SocketGameUtils.enrichJoinGamePayload(gameId, userId);
      await this.processJoinGame(response);
    } catch (error) {
      console.error("Error handling JOIN_GAME:", error);
      socket.emit(SocketEvents.ERROR, {
        message: "Failed to join game",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async handleClaimAutoPlay(socket: Socket, payload: IAutoPlayClaimPayload): Promise<void> {
    try {
      const { gameId, enable } = payload;
      const { changed, controllerId } = await SocketGameUtils.updateAutoPlayController(gameId, socket.id, enable);

      console.log(gameId, enable, changed, controllerId)

      if (enable) {
        if (changed) {
          // Successfully claimed – notify everyone
          this.emitToGame(gameId, SocketEvents.AUTO_PLAY_STATUS, {
            controllerId: socket.id,
            enabled: true,
          });
        } else {
          // Already claimed – inform requester only
          socket.emit(SocketEvents.AUTO_PLAY_STATUS, {
            controllerId,
            enabled: true,
          });
        }
      } else if (changed) {
        // Released – notify everyone
        this.emitToGame(gameId, SocketEvents.AUTO_PLAY_STATUS, {
          controllerId: null,
          enabled: false,
        });
      }
    } catch (error) {
      console.error("Error handling CLAIM_AUTO_PLAY:", error);
    }
  }

  private async handleTurnUpdate(socket: Socket, data: ITurnUpdatePayload): Promise<void> {
    try {
      const response = await SocketGameUtils.processTurnUpdate(data);
      this.emitToGame(response.gameId, SocketEvents.TURN_UPDATE, response);
    } catch (error) {
      console.error("Error handling TURN_UPDATE:", error);
      socket.emit(SocketEvents.ERROR, {
        message: "Failed to process turn update",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }

  emitToGame<T>(gameId: string, event: SocketEvents, data: T): void {
    console.log(`Emitting ${event} to game ${gameId}:`, data);
    this.io.to(gameId).emit(event, data);
  }

  async processJoinGame(payload: IJoinGameResponse): Promise<void> {
    const { player, gameId, onlinePlayers } = payload;
    const user = player.user;

    // Gather other online users in this game
    const onlineUserIds = new Set(
      Array.from(this.socketUserMap.values())
        .filter((m) => m.gameId === gameId && m.userId !== user?.id?.toString())
        .map((m) => m.userId)
    );

    const fullPayload: IJoinGameResponse = {
      gameId,
      player,
      onlinePlayers: onlinePlayers.concat(...onlineUserIds),
    };

    this.emitToGame(gameId, SocketEvents.JOIN_GAME, fullPayload);
  }

  /**
   * Emit an event to all connected clients
   */
  public emitToAll(event: string, data: any): void {
    this.io.emit(event, data);
  }

  /**
   * Get a list of connected socket IDs in a room
   */
  public async getPlayersInGame(gameId: string): Promise<string[]> {
    const sockets = await this.io.in(gameId).fetchSockets();
    return sockets.map((socket) => socket.id);
  }

  private static _instance: SocketService | null = null;

  static getInstance(): SocketService {
    if (!this._instance) {
      this._instance = new SocketService(io);
    }
    return this._instance;
  }
}

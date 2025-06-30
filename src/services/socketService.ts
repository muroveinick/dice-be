import { Server, Socket } from "socket.io";
import { IJoinGamePayload, IJoinGameResponse, ITurnUpdatePayload, SocketEvents } from "../../dice-shared/socket.js";
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
      socket.on(SocketEvents.DISCONNECT, () => {
        console.log(`User disconnected: ${socket.id}`);
        const mapping = this.socketUserMap.get(socket.id);
        if (mapping) {
          const { gameId, userId } = mapping;
          // Optionally notify others that player went offline
          this.emitToGame(gameId, SocketEvents.OFFLINE, { userId });
          this.socketUserMap.delete(socket.id);
        }
      });

      // Join game room
      socket.on(SocketEvents.JOIN_GAME, async (payload: IJoinGamePayload) => {
        console.log(`User joined game: ${payload.gameId}`);
        const { gameId, userId } = payload;
        socket.join(gameId);
        // Remember mapping to clean up later on disconnect
        this.socketUserMap.set(socket.id, { gameId, userId });

        const response = await SocketGameUtils.enrichJoinGamePayload(gameId, userId); // Enrich payload with additional info
        await this.processJoinGame(response);
      });

      // Turn update event
      socket.on(SocketEvents.TURN_UPDATE, async (data: ITurnUpdatePayload) => {
        const response = await SocketGameUtils.processTurnUpdate(data);
        this.emitToGame(response.gameId, SocketEvents.TURN_UPDATE, response);
      });
    } catch (error) {
      console.error("Error in setupListeners:", error);
      this.emitToAll(SocketEvents.ERROR, error);
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
        .filter((m) => m.gameId === gameId && m.userId !== user?.id)
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

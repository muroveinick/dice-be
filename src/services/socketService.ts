import { IJoinGameResponse } from '@shared/interfaces.js';
import { Server, Socket } from 'socket.io';
import { IJoinGamePayload, ITurnUpdatePayload, SocketEvents } from '../../dice-shared/socket.js';
import { io } from '../server.js';
import { SocketGameUtils } from './SocketGameUtils.js';

export const defaultConfig = {
  cors: {
    origin: "*", // In production, change to specific origin
    methods: ["GET", "POST"],
  },
  path: "/ws"
}

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
  // Store join events per game to replay for late joiners
  private gameJoinEvents: Map<string, IJoinGameResponse[]> = new Map();

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

    // Disconnect event
    socket.on(SocketEvents.DISCONNECT, () => {
      console.log(`User disconnected: ${socket.id}`);
    });

    // Join game room
    socket.on(SocketEvents.JOIN_GAME, async (payload: IJoinGamePayload) => {
      const { gameId, userId } = payload;

      socket.join(gameId);
      console.log(`Received JOIN_GAME request with gameId: ${gameId}, userId: ${userId}`);
      const response = await SocketGameUtils.enrichJoinGamePayload(gameId, userId); // Enrich payload with additional info
      this.processJoinGame(response);

    });


    socket.on(SocketEvents.TURN_UPDATE, async (data: ITurnUpdatePayload) => {
      const response = await SocketGameUtils.processTurnUpdate(data);
      this.emitToGame(response.gameId, SocketEvents.TURN_UPDATE, response);
    });

  }


  emitToGame<T>(gameId: string, event: SocketEvents, data: T): void {
    // console.log(`Emitting ${event} to game ${gameId}:`, data);
    this.io.to(gameId).emit(event, data);
  }

  processJoinGame(payload: IJoinGameResponse): void {
    const { player, user, gameId } = payload;

    if (!this.gameJoinEvents.has(gameId)) {
      this.gameJoinEvents.set(gameId, []);
    }

    const gameJoins = this.gameJoinEvents.get(gameId)!;
    const existingJoin = gameJoins.find(join => join.player.id === player.id);
    if (!existingJoin) {
      gameJoins.push(payload);
    }


    // Send all previous join events to this socket so they know who's in the game
    const historicalJoins = gameJoins.filter(join => join.user.id !== user.id);
    if (historicalJoins.length > 0) {
      console.log(`Sending ${historicalJoins.length} historical join events to ${gameId}`);
      historicalJoins.forEach(joinEvent => {
        this.emitToGame(gameId, SocketEvents.JOIN_GAME, joinEvent);
      });
    }


    this.emitToGame(gameId, SocketEvents.JOIN_GAME, payload);
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
    return sockets.map(socket => socket.id);
  }

  /**
   * Clear join events for a game (call when game ends to prevent memory leaks)
   * 
   * TODO: Call this method when:
   * - Game status changes to "FINISHED"
   * - Game is deleted
   * - After a certain period of inactivity
   */
  public clearGameJoinHistory(gameId: string): void {
    this.gameJoinEvents.delete(gameId);
    console.log(`Cleared join history for game ${gameId}`);
  }

  private static _instance: SocketService | null = null;

  static getInstance(): SocketService {
    if (!this._instance) {
      this._instance = new SocketService(io);
    }
    return this._instance;
  }
}
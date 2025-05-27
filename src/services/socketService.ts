import { Server, Socket } from 'socket.io';

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

  constructor(io: Server) {
    this.io = io;
    this.init();
  }

  private init(): void {
    console.log("Socket service initialized");
    this.io.on('connection', (socket: Socket) => {
      console.log(`User connected: ${socket.id}`);
      this.setupListeners(socket);
    });
  }

  private setupListeners(socket: Socket): void {
    // Disconnect event
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.id}`);
    });
    
    // Join game room
    socket.on('join_game', (gameId: string) => {
      socket.join(gameId);
      console.log(`User ${socket.id} joined game: ${gameId}`);
      
      // Emit to all users in the room that a new player joined
      this.io.to(gameId).emit('player_joined', {
        playerId: socket.id,
        gameId: gameId
      });
    });
    
    // Leave game room
    socket.on('leave_game', (gameId: string) => {
      socket.leave(gameId);
      console.log(`User ${socket.id} left game: ${gameId}`);
      
      // Emit to all users in the room that a player left
      this.io.to(gameId).emit('player_left', {
        playerId: socket.id,
        gameId: gameId
      });
    });
    
    // Game action event
    socket.on('game_action', (data: GameActionData) => {
      // Add the socket ID as playerId if not provided
      if (!data.playerId) {
        data.playerId = socket.id;
      }
      
      // Broadcast to all clients in the game room including the sender
      this.io.to(data.gameId).emit('game_update', data);
      console.log(`Game action in ${data.gameId}: ${JSON.stringify(data.action)}`);
    });
  }

  // Methods to use from other parts of the application
  
  /**
   * Emit an event to all clients in a specific game room
   */
  public emitToGame(gameId: string, event: string, data: any): void {
    this.io.to(gameId).emit(event, data);
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
}

// Create a single instance
let socketService: SocketService | null = null;

export const initSocketService = (io: Server): SocketService => {
  if (!socketService) {
    socketService = new SocketService(io);
  }
  return socketService;
};

export const getSocketService = (): SocketService | null => {
  return socketService;
};

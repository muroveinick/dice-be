import { IGame, IJoinGameResponse } from '@shared/interfaces.js';
import { Game } from 'models/Game.js';
import { User } from 'models/User.js';
import { IGameBattlePayload, IGameBattleResponse, INextTurnPayload, INextTurnResponse, ITurnUpdatePayload, ITurnUpdateResponse, TurnMessageType } from '../../dice-shared/socket.js';
import { log } from 'console';

export class SocketGameUtils {
  
  static async processTurnUpdate(inputData: ITurnUpdatePayload): Promise<ITurnUpdateResponse> {
    const { data, type, gameId } = inputData;

    if (!gameId || !data) {
      throw new Error("Invalid turn update data");
    }

    const game = await Game.findById(gameId);
    if (!game) {
      throw new Error("Game not found");
    }

    let payload: INextTurnResponse | IGameBattleResponse;

    switch (type) {
      case TurnMessageType.MESSAGE_TYPE_TURN_UPDATE:
        payload = this.processBattle(data as IGameBattlePayload, game);
        game.markModified('figures');
        game.markModified('players');
        break;
      case TurnMessageType.MESSAGE_TYPE_NEXT_TURN:
        payload = this.processNextTurn(data as INextTurnPayload, game);
        game.markModified('currentPlayerIndex')
        game.markModified('turnCount')
        break;
      default:
        throw new Error("Invalid turn update type");
    }

    const response: ITurnUpdateResponse = {
      type,
      data: payload,
      gameId
    };

    game.lastActivity = new Date();
    await game.save();
    
    return response;
  }

  static processNextTurn(inputData: INextTurnPayload, game: IGame): INextTurnResponse {
    const { currentPlayerIndex } = inputData;
    const currentPlayer = game.players[currentPlayerIndex];

    if (!currentPlayer) {
      throw new Error("Invalid player index");
    }

    const nextPlayerIndex = (currentPlayerIndex + 1) % game.players.length;
    game.currentPlayerIndex = nextPlayerIndex;

    const response: INextTurnResponse = {
      newPlayerIndex: nextPlayerIndex,
      turnCount: ++game.turnCount,
      gamePhase: game.gamePhase,
    };

    return response;
  }

  static processBattle(inputData: IGameBattlePayload, game: IGame): IGameBattleResponse {
    const { attacker, defender } = inputData;
    const attackerFigure = game.figures.find(fig => fig.config.index === attacker);
    const defenderFigure = game.figures.find(fig => fig.config.index === defender);

    console.log(JSON.stringify(attackerFigure));
    console.log(JSON.stringify(defenderFigure));

    if (!attackerFigure || !defenderFigure) {
      throw new Error("Invalid figure indices");
    }

    const attackerPlayer = game.players.find(player => player.figures.includes(attacker) && player.config.color === attackerFigure.config.color);
    const defenderPlayer = game.players.find(player => player.figures.includes(defender) && player.config.color === defenderFigure.config.color);

    if (!attackerPlayer || !defenderPlayer) {
      throw new Error("Player and figure mismatch");
    }

    const attackerDice = attackerFigure.dice;
    const defenderDice = defenderFigure.dice;

    const attackerRoll = this.rollDice(attackerDice);
    const defenderRoll = this.rollDice(defenderDice);

    console.log("Attacker Roll:", attackerRoll);
    console.log("Defender Roll:", defenderRoll);

    let winner;
    if (attackerRoll > defenderRoll) {
      const currentAttackerDice = attackerFigure.dice;
      attackerFigure.dice = 1;
      defenderFigure.dice = currentAttackerDice - 1;
      defenderFigure.config.color = attackerFigure.config.color;

      attackerPlayer.figures.push(defender);
      defenderPlayer.figures.delete(defender);

      winner = attacker;
    } else {
      winner = defender;
      attackerFigure.dice = 1;
    }

    const response: IGameBattleResponse = {
      figures: [attackerFigure, defenderFigure],
      winner,
      attackerRoll,
      defenderRoll,
    };

    return response;
  }

  static rollDice(diceCount: number): number {
    let roll = 0;
    for (let i = 0; i < diceCount; i++) {
      roll += Math.floor(Math.random() * 6) + 1; // 1-6
    }
    return roll;
  }

  static async enrichJoinGamePayload(gameId: string, userId: string): Promise<IJoinGameResponse> {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }
    const game = await Game.findById(gameId);
    if (!game) {
      throw new Error("Game not found");
    }
    const player = game.players.find(p => p.id === userId);
    if (!player) {
      throw new Error("Player not found");
    }

    const response: IJoinGameResponse = {
      gameId,
      player,
      user: {
        id: userId,
        username: user.username,
      }
    };

    log(`Enriched join game payload for gameId: ${gameId}, ${response}`);
    return response;
  }
}
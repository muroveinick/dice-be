import { IFigure, IGame, IPlayer } from "@shared/interfaces.js";
import { Game } from "models/Game.js";
import { User } from "models/User.js";
import { IJoinGameResponse, IGameBattlePayload, IGameBattleResponse, INextTurnPayload, INextTurnResponse, ITurnUpdatePayload, ITurnUpdateResponse, TurnMessageType } from "../../dice-shared/socket.js";
import "../utils/proto.implementation.js";

export class SocketGameUtils {
  static async processTurnUpdate(inputData: ITurnUpdatePayload): Promise<ITurnUpdateResponse> {
    const { data, type, gameId } = inputData;
    console.log(`Received turn update: ${JSON.stringify(inputData)}`);

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
        break;
      case TurnMessageType.MESSAGE_TYPE_NEXT_TURN:
        payload = this.processNextTurn(data as INextTurnPayload, game);
        break;
      default:
        throw new Error("Invalid turn update type");
    }

    const response: ITurnUpdateResponse = {
      type,
      data: payload,
      gameId,
    };

    game.lastActivity = new Date();
    // await game.save();
    await Game.findOneAndUpdate(
      { _id: gameId }, // filter
      {
        $set: {
          currentPlayerIndex: game.currentPlayerIndex,
          figures: game.figures,
          players: game.players,
          lastActivity: new Date(),
          turnCount: game.turnCount,
          gamePhase: game.gamePhase,
        },
      },
      { new: true } // return updated doc if you need it
    );

    return response;
  }

  private static supplyPlayerFigures(game: IGame, playerIndex: number, supplyAmount: number): Array<Pick<IFigure, "config" | "dice">> {
    const player = game.players[playerIndex];
    const figures = player.figures.map((fig) => game.figures.find((f) => f.config.index === fig)!);

    const MAX_DICE = 8;

    if (figures.length === 0) {
      return [];
    }

    const copy = figures.filter((fig) => fig.dice < MAX_DICE);
    if (supplyAmount > 0) {
      for (let i = 0; i < supplyAmount; i++) {
        if (copy.length === 0) {
          break;
        }
        const random = copy.random();
        random.dice++;
        if (random.dice === MAX_DICE) {
          copy.delete(random);
        }
      }
    }

    return figures.map((fig) => ({ config: fig.config, dice: fig.dice }));
  }

  private static updateNextIndex(game: IGame, currentPlayerIndex: number): number {
    // Find next player that is not defeated
    let nextPlayerIndex = (currentPlayerIndex + 1) % game.players.length;
    let iterations = 0;

    while (game.players[nextPlayerIndex].config.isDefeated && iterations < game.players.length) {
      nextPlayerIndex = (nextPlayerIndex + 1) % game.players.length;
      iterations++;
    }
    if (iterations >= game.players.length - 1) {
      nextPlayerIndex = currentPlayerIndex;
      game.gamePhase = "FINISHED";
    }
    game.currentPlayerIndex = nextPlayerIndex;

    return nextPlayerIndex;
  }

  static processNextTurn(inputData: INextTurnPayload, game: IGame): INextTurnResponse {
    const { currentPlayerIndex, supplyAmount } = inputData;
    const currentPlayer = game.players[currentPlayerIndex];

    if (!currentPlayer) {
      throw new Error("Invalid player index");
    }

    const response: INextTurnResponse = {
      newPlayerIndex: this.updateNextIndex(game, currentPlayerIndex),
      turnCount: ++game.turnCount,
      gamePhase: game.gamePhase,
      playerFigures: SocketGameUtils.supplyPlayerFigures(game, currentPlayerIndex, supplyAmount),
    };

    return response;
  }

  static processBattle(inputData: IGameBattlePayload, game: IGame): IGameBattleResponse {
    const { attacker, defender, playerIndex } = inputData;
    const attackerFigure = game.figures.find((fig) => fig.config.index === attacker);
    const defenderFigure = game.figures.find((fig) => fig.config.index === defender);

    const player = game.players[playerIndex];
    if (!player) {
      throw new Error("Invalid player index");
    }
    // attacker figure must be belong to player
    if (!player.figures.includes(attacker)) {
      throw new Error("Invalid figure indices");
    }

    if (!attackerFigure || !defenderFigure) {
      throw new Error("Invalid figure indices");
    }

    if (attackerFigure.config.color === defenderFigure.config.color) {
      throw new Error("Cannot attack figure of the same color");
    }

    const attackerPlayer = game.players.find((player) => player.figures.includes(attacker) && player.config.color === attackerFigure.config.color);
    const defenderPlayer = game.players.find((player) => player.figures.includes(defender) && player.config.color === defenderFigure.config.color);

    if (!attackerPlayer || !defenderPlayer) {
      throw new Error("Player and figure mismatch");
    }

    const attackerDice = attackerFigure.dice;
    const defenderDice = defenderFigure.dice;

    const attackerRoll = this.rollDice(attackerDice);
    const defenderRoll = this.rollDice(defenderDice);

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

    // Check if defender player has any remaining figures; if not, mark as defeated
    if (!this.checkIfPlayerHasFigures(defenderPlayer)) {
      response.defeatedPlayerIndex = game.players.indexOf(defenderPlayer);
      defenderPlayer.config.isDefeated = true;
    }

    return response;
  }

  static checkIfPlayerHasFigures(player: IPlayer): boolean {
    return player.figures.length > 0;
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
    const player = game.players.find((p) => p.user?.id === userId);
    if (!player) {
      throw new Error("Player not found");
    }

    const response: IJoinGameResponse = {
      gameId,
      player,
      onlinePlayers: [player.user!.id],
    };

    console.log(`Enriched join game payload for gameId: ${gameId}, ${response}`);
    return response;
  }
}

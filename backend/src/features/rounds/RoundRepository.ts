import { deleteRoundById, getRoundById, insertRound, listRounds, updateRound } from '../../db/rounds.js';

export class RoundRepository {
  static listByUserId(userId: string) {
    return listRounds(userId);
  }

  static findById(roundId: string, userId: string) {
    return getRoundById(roundId, userId);
  }

  static create(round: Parameters<typeof insertRound>[0]) {
    return insertRound(round);
  }

  static update(roundId: string, updates: Parameters<typeof updateRound>[1]) {
    return updateRound(roundId, updates);
  }

  static deleteById(roundId: string, userId: string) {
    return deleteRoundById(roundId, userId);
  }
}

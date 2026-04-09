import {
  deleteClubActualEntry,
  insertClubActualDistance,
  listClubActualAverages,
  listClubActualEntries,
  listClubCarry,
  replaceVirtualCaddyClubActuals,
  saveClubCarry,
} from '../../db/club.js';

export class ClubRepository {
  static listCarry(userId: string) {
    return listClubCarry(userId);
  }

  static saveCarry(userId: string, carryByClub: unknown) {
    return saveClubCarry(userId, carryByClub);
  }

  static listActualEntries(userId: string) {
    return listClubActualEntries(userId);
  }

  static listActualAverages(userId: string) {
    return listClubActualAverages(userId);
  }

  static createActualEntry(input: { userId: string; club: string; actualMeters: unknown }) {
    return insertClubActualDistance(input);
  }

  static deleteActualEntry(entryId: number, userId: string) {
    return deleteClubActualEntry(entryId, userId);
  }

  static replaceVirtualCaddyActuals(input: {
    userId: string;
    roundId: string;
    hole: unknown;
    shots: Array<{ shotId: unknown; club: string; actualMeters: unknown }>;
  }) {
    return replaceVirtualCaddyClubActuals(input);
  }
}

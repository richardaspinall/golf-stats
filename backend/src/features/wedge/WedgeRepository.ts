import {
  deleteWedgeEntry,
  deleteWedgeMatrix,
  insertWedgeEntry,
  insertWedgeMatrix,
  listWedgeEntries,
  listWedgeMatrices,
  updateWedgeEntry,
  updateWedgeMatrix,
} from '../../db/wedge.js';

export class WedgeRepository {
  static listMatrices(userId: string) { return listWedgeMatrices(userId); }
  static createMatrix(input: Parameters<typeof insertWedgeMatrix>[0]) { return insertWedgeMatrix(input); }
  static updateMatrix(input: Parameters<typeof updateWedgeMatrix>[0]) { return updateWedgeMatrix(input); }
  static deleteMatrix(id: number, userId: string) { return deleteWedgeMatrix(id, userId); }
  static listEntries(userId: string, matrixId?: number | null) { return listWedgeEntries(userId, matrixId); }
  static createEntry(input: Parameters<typeof insertWedgeEntry>[0]) { return insertWedgeEntry(input); }
  static updateEntry(input: Parameters<typeof updateWedgeEntry>[0]) { return updateWedgeEntry(input); }
  static deleteEntry(id: number, userId: string) { return deleteWedgeEntry(id, userId); }
}

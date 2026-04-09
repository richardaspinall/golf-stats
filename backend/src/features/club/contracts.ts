import type { InferSchema } from '../../app/http/Schema.js';
import {
  arraySchema,
  clubActualEntrySchema,
  clubAveragesSchema,
  clubCarrySchema,
  literalSchema,
  noPayloadSchema,
  objectSchema,
  optionalUnknownSchema,
  unknownArraySchema,
} from '../../app/http/contracts.js';

export const listClubCarryPayloadSchema = noPayloadSchema;
export type ListClubCarryPayload = InferSchema<typeof listClubCarryPayloadSchema>;

export const listClubCarryResponseSchema = objectSchema({
  ok: literalSchema(true),
  carryByClub: clubCarrySchema,
});
export type ListClubCarryResponse = InferSchema<typeof listClubCarryResponseSchema>;

export const saveClubCarryPayloadSchema = objectSchema({
  carryByClub: optionalUnknownSchema,
});
export type SaveClubCarryPayload = InferSchema<typeof saveClubCarryPayloadSchema>;

export const saveClubCarryResponseSchema = listClubCarryResponseSchema;
export type SaveClubCarryResponse = InferSchema<typeof saveClubCarryResponseSchema>;

export const listClubActualEntriesPayloadSchema = noPayloadSchema;
export type ListClubActualEntriesPayload = InferSchema<typeof listClubActualEntriesPayloadSchema>;

export const listClubActualEntriesResponseSchema = objectSchema({
  ok: literalSchema(true),
  entries: arraySchema(clubActualEntrySchema),
});
export type ListClubActualEntriesResponse = InferSchema<typeof listClubActualEntriesResponseSchema>;

export const listClubActualAveragesPayloadSchema = noPayloadSchema;
export type ListClubActualAveragesPayload = InferSchema<typeof listClubActualAveragesPayloadSchema>;

export const listClubActualAveragesResponseSchema = objectSchema({
  ok: literalSchema(true),
  averagesByClub: clubAveragesSchema,
});
export type ListClubActualAveragesResponse = InferSchema<typeof listClubActualAveragesResponseSchema>;

export const createClubActualEntryPayloadSchema = objectSchema({
  club: optionalUnknownSchema,
  actualMeters: optionalUnknownSchema,
});
export type CreateClubActualEntryPayload = InferSchema<typeof createClubActualEntryPayloadSchema>;

export const createClubActualEntryResponseSchema = objectSchema({
  ok: literalSchema(true),
  entry: clubActualEntrySchema,
});
export type CreateClubActualEntryResponse = InferSchema<typeof createClubActualEntryResponseSchema>;

export const deleteClubActualEntryPayloadSchema = noPayloadSchema;
export type DeleteClubActualEntryPayload = InferSchema<typeof deleteClubActualEntryPayloadSchema>;

export const deleteClubActualEntryResponseSchema = objectSchema({
  ok: literalSchema(true),
});
export type DeleteClubActualEntryResponse = InferSchema<typeof deleteClubActualEntryResponseSchema>;

export const syncVirtualCaddyActualsPayloadSchema = objectSchema({
  roundId: optionalUnknownSchema,
  hole: optionalUnknownSchema,
  shots: optionalUnknownSchema,
});
export type SyncVirtualCaddyActualsPayload = InferSchema<typeof syncVirtualCaddyActualsPayloadSchema>;

export const syncVirtualCaddyActualsResponseSchema = objectSchema({
  ok: literalSchema(true),
  entries: unknownArraySchema,
});
export type SyncVirtualCaddyActualsResponse = InferSchema<typeof syncVirtualCaddyActualsResponseSchema>;

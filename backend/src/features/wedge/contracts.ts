import type { InferSchema } from '../../app/http/Schema.js';
import { arraySchema, literalSchema, noPayloadSchema, objectSchema, optionalUnknownSchema, wedgeEntrySchema, wedgeMatrixSchema } from '../../app/http/contracts.js';

export const listWedgeMatricesPayloadSchema = noPayloadSchema;
export type ListWedgeMatricesPayload = InferSchema<typeof listWedgeMatricesPayloadSchema>;

export const listWedgeMatricesResponseSchema = objectSchema({
  ok: literalSchema(true),
  matrices: arraySchema(wedgeMatrixSchema),
});
export type ListWedgeMatricesResponse = InferSchema<typeof listWedgeMatricesResponseSchema>;

export const createWedgeMatrixPayloadSchema = objectSchema({
  name: optionalUnknownSchema,
  stanceWidth: optionalUnknownSchema,
  grip: optionalUnknownSchema,
  ballPosition: optionalUnknownSchema,
  notes: optionalUnknownSchema,
  clubs: optionalUnknownSchema,
  swingClocks: optionalUnknownSchema,
});
export type CreateWedgeMatrixPayload = InferSchema<typeof createWedgeMatrixPayloadSchema>;

export const createWedgeMatrixResponseSchema = objectSchema({
  ok: literalSchema(true),
  matrix: wedgeMatrixSchema,
});
export type CreateWedgeMatrixResponse = InferSchema<typeof createWedgeMatrixResponseSchema>;

export const updateWedgeMatrixPayloadSchema = createWedgeMatrixPayloadSchema;
export type UpdateWedgeMatrixPayload = InferSchema<typeof updateWedgeMatrixPayloadSchema>;

export const updateWedgeMatrixResponseSchema = createWedgeMatrixResponseSchema;
export type UpdateWedgeMatrixResponse = InferSchema<typeof updateWedgeMatrixResponseSchema>;

export const deleteWedgeMatrixPayloadSchema = noPayloadSchema;
export type DeleteWedgeMatrixPayload = InferSchema<typeof deleteWedgeMatrixPayloadSchema>;

export const deleteWedgeMatrixResponseSchema = objectSchema({
  ok: literalSchema(true),
});
export type DeleteWedgeMatrixResponse = InferSchema<typeof deleteWedgeMatrixResponseSchema>;

export const listWedgeEntriesPayloadSchema = noPayloadSchema;
export type ListWedgeEntriesPayload = InferSchema<typeof listWedgeEntriesPayloadSchema>;

export const listWedgeEntriesResponseSchema = objectSchema({
  ok: literalSchema(true),
  entries: arraySchema(wedgeEntrySchema),
});
export type ListWedgeEntriesResponse = InferSchema<typeof listWedgeEntriesResponseSchema>;

export const createWedgeEntryPayloadSchema = objectSchema({
  matrixId: optionalUnknownSchema,
  club: optionalUnknownSchema,
  swingClock: optionalUnknownSchema,
  distanceMeters: optionalUnknownSchema,
});
export type CreateWedgeEntryPayload = InferSchema<typeof createWedgeEntryPayloadSchema>;

export const createWedgeEntryResponseSchema = objectSchema({
  ok: literalSchema(true),
  entry: wedgeEntrySchema,
});
export type CreateWedgeEntryResponse = InferSchema<typeof createWedgeEntryResponseSchema>;

export const updateWedgeEntryPayloadSchema = createWedgeEntryPayloadSchema;
export type UpdateWedgeEntryPayload = InferSchema<typeof updateWedgeEntryPayloadSchema>;

export const updateWedgeEntryResponseSchema = createWedgeEntryResponseSchema;
export type UpdateWedgeEntryResponse = InferSchema<typeof updateWedgeEntryResponseSchema>;

export const deleteWedgeEntryPayloadSchema = noPayloadSchema;
export type DeleteWedgeEntryPayload = InferSchema<typeof deleteWedgeEntryPayloadSchema>;

export const deleteWedgeEntryResponseSchema = objectSchema({
  ok: literalSchema(true),
});
export type DeleteWedgeEntryResponse = InferSchema<typeof deleteWedgeEntryResponseSchema>;

import type { InferSchema } from '../../app/http/Schema.js';
import {
  arraySchema,
  customSchema,
  literalSchema,
  noPayloadSchema,
  objectSchema,
  optionalUnknownSchema,
  nullableSchema,
  roundSchema,
  stringSchema,
} from '../../app/http/contracts.js';

const roundListItemSchema = customSchema<{
  id: string;
  name: string;
  courseId: string | null;
  createdAt: string;
  updatedAt: string;
  userId?: string;
  roundDate?: string;
  handicap?: number;
}>('round list item', (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const item = value as Record<string, unknown>;
  return (
    typeof item.id === 'string' &&
    typeof item.name === 'string' &&
    (typeof item.courseId === 'string' || item.courseId === null) &&
    typeof item.createdAt === 'string' &&
    typeof item.updatedAt === 'string'
  );
});

export const listRoundsPayloadSchema = noPayloadSchema;
export type ListRoundsPayload = InferSchema<typeof listRoundsPayloadSchema>;

export const listRoundsResponseSchema = objectSchema({
  ok: literalSchema(true),
  rounds: arraySchema(roundListItemSchema),
});
export type ListRoundsResponse = InferSchema<typeof listRoundsResponseSchema>;

export const getRoundPayloadSchema = noPayloadSchema;
export type GetRoundPayload = InferSchema<typeof getRoundPayloadSchema>;

export const getRoundResponseSchema = objectSchema({
  ok: literalSchema(true),
  round: roundSchema,
});
export type GetRoundResponse = InferSchema<typeof getRoundResponseSchema>;

export const createRoundPayloadSchema = objectSchema({
  name: optionalUnknownSchema,
  roundDate: optionalUnknownSchema,
  handicap: optionalUnknownSchema,
  courseId: optionalUnknownSchema,
  statsByHole: optionalUnknownSchema,
  notes: optionalUnknownSchema,
});
export type CreateRoundPayload = InferSchema<typeof createRoundPayloadSchema>;

export const createRoundResponseSchema = getRoundResponseSchema;
export type CreateRoundResponse = InferSchema<typeof createRoundResponseSchema>;

export const updateRoundPayloadSchema = createRoundPayloadSchema;
export type UpdateRoundPayload = InferSchema<typeof updateRoundPayloadSchema>;

export const updateRoundResponseSchema = getRoundResponseSchema;
export type UpdateRoundResponse = InferSchema<typeof updateRoundResponseSchema>;

export const deleteRoundPayloadSchema = noPayloadSchema;
export type DeleteRoundPayload = InferSchema<typeof deleteRoundPayloadSchema>;

export const deleteRoundResponseSchema = objectSchema({
  ok: literalSchema(true),
});
export type DeleteRoundResponse = InferSchema<typeof deleteRoundResponseSchema>;

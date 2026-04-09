import type {
  ClubActualEntry,
  ClubAveragesByClub,
  ClubCarryByClub,
  Course,
  CourseMarkersByHole,
  RoundListItem,
  Round,
  StatsByHole,
  User,
  WedgeEntry,
  WedgeMatrix,
} from '../../domain/types.js';
import {
  arraySchema,
  booleanSchema,
  customSchema,
  emptyObjectSchema,
  literalSchema,
  nullableSchema,
  numberSchema,
  objectSchema,
  optionalSchema,
  recordSchema,
  stringSchema,
  unknownSchema,
  type InferSchema,
} from './Schema.js';

const statsByHoleSchema = customSchema<StatsByHole>('statsByHole object', (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value));
const courseMarkersSchema = customSchema<CourseMarkersByHole>('course markers object', (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value));
const clubCarrySchema = customSchema<ClubCarryByClub>('club carry object', (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value));
const clubAveragesSchema = customSchema<ClubAveragesByClub>('club averages object', (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value));

export const userSchema = objectSchema({
  id: stringSchema(),
  username: stringSchema(),
  displayName: stringSchema(),
  email: stringSchema(),
  authMethod: stringSchema(),
  googleLinked: booleanSchema(),
  createdAt: stringSchema(),
  updatedAt: stringSchema(),
}) as any as { parse(value: unknown, path: string): User };

export const roundSchema = objectSchema({
  id: stringSchema(),
  userId: stringSchema(),
  name: stringSchema(),
  roundDate: stringSchema(),
  handicap: numberSchema(),
  courseId: nullableSchema(stringSchema()),
  statsByHole: statsByHoleSchema,
  notes: arraySchema(stringSchema()),
  createdAt: stringSchema(),
  updatedAt: stringSchema(),
}) as any as { parse(value: unknown, path: string): Round };

export const courseSchema = objectSchema({
  id: stringSchema(),
  name: stringSchema(),
  markers: courseMarkersSchema,
  createdAt: stringSchema(),
  updatedAt: stringSchema(),
}) as any as { parse(value: unknown, path: string): Course };

export type RoundSummary = Pick<Round, 'id' | 'userId' | 'name' | 'roundDate' | 'handicap' | 'courseId' | 'createdAt' | 'updatedAt'>;

export const roundSummarySchema = objectSchema({
  id: stringSchema(),
  userId: stringSchema(),
  name: stringSchema(),
  roundDate: stringSchema(),
  handicap: numberSchema(),
  courseId: nullableSchema(stringSchema()),
  createdAt: stringSchema(),
  updatedAt: stringSchema(),
}) as any as { parse(value: unknown, path: string): RoundSummary };

export const roundListItemSchema = customSchema<RoundListItem>('round list item', (value) => {
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

export const clubActualEntrySchema = objectSchema({
  id: numberSchema(),
  club: stringSchema(),
  actualMeters: numberSchema(),
  createdAt: stringSchema(),
}) as any as { parse(value: unknown, path: string): ClubActualEntry };

export const wedgeEntrySchema = objectSchema({
  id: numberSchema(),
  matrixId: numberSchema(),
  club: stringSchema(),
  swingClock: stringSchema(),
  distanceMeters: numberSchema(),
  createdAt: stringSchema(),
}) as any as { parse(value: unknown, path: string): WedgeEntry };

export const wedgeMatrixSchema = objectSchema({
  id: numberSchema(),
  name: stringSchema(),
  stanceWidth: stringSchema(),
  grip: stringSchema(),
  ballPosition: stringSchema(),
  notes: stringSchema(),
  clubs: arraySchema(stringSchema()),
  swingClocks: arraySchema(stringSchema()),
  createdAt: stringSchema(),
}) as any as { parse(value: unknown, path: string): WedgeMatrix };

export const noPayloadSchema = emptyObjectSchema();
export type NoPayload = InferSchema<typeof noPayloadSchema>;

export const okSchema = literalSchema(true);
export const unknownObjectSchema = customSchema<Record<string, unknown>>('object', (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value));

export const optionalUnknownSchema = optionalSchema(unknownSchema());
export const optionalStringSchema = optionalSchema(stringSchema());
export const optionalNumberSchema = optionalSchema(numberSchema());
export const nullableStringSchema = nullableSchema(stringSchema());
export const unknownArraySchema = arraySchema(unknownSchema());
export { objectSchema, stringSchema, numberSchema, booleanSchema, literalSchema, optionalSchema, nullableSchema, arraySchema, recordSchema, unknownSchema, customSchema };
export { clubCarrySchema, clubAveragesSchema, statsByHoleSchema, courseMarkersSchema };

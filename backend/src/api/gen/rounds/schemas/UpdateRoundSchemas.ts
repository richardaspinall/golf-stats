// AUTO-GENERATED FILE. DO NOT EDIT.
import { objectSchema, unknownSchema, optionalSchema, booleanSchema, roundSchema } from '../../../../app/http/contracts.js';

const UpdateRoundPayloadSchema = objectSchema({
  name: optionalSchema(unknownSchema()),
  roundDate: optionalSchema(unknownSchema()),
  handicap: optionalSchema(unknownSchema()),
  courseId: optionalSchema(unknownSchema()),
  statsByHole: optionalSchema(unknownSchema()),
  notes: optionalSchema(unknownSchema()),
});

const UpdateRoundOutputSchema = objectSchema({
  ok: booleanSchema(),
  round: roundSchema,
});

export { UpdateRoundPayloadSchema, UpdateRoundOutputSchema };

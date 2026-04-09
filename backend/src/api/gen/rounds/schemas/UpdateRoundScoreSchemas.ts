// AUTO-GENERATED FILE. DO NOT EDIT.
import { objectSchema, stringSchema, numberSchema, booleanSchema, roundSchema } from '../../../../app/http/contracts.js';

const UpdateRoundScorePayloadSchema = objectSchema({
  round: stringSchema(),
  hole: numberSchema(),
  score: numberSchema(),
});

const UpdateRoundScoreOutputSchema = objectSchema({
  ok: booleanSchema(),
  round: roundSchema,
});

export { UpdateRoundScorePayloadSchema, UpdateRoundScoreOutputSchema };

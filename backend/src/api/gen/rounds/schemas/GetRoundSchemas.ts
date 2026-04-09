// AUTO-GENERATED FILE. DO NOT EDIT.
import { objectSchema, booleanSchema, noPayloadSchema, roundSchema } from '../../../../app/http/contracts.js';

const GetRoundPayloadSchema = noPayloadSchema;

const GetRoundOutputSchema = objectSchema({
  ok: booleanSchema(),
  round: roundSchema,
});

export { GetRoundPayloadSchema, GetRoundOutputSchema };

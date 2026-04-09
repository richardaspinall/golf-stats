// AUTO-GENERATED FILE. DO NOT EDIT.
import { objectSchema, booleanSchema, arraySchema, noPayloadSchema, roundListItemSchema } from '../../../../app/http/contracts.js';

const ListRoundsPayloadSchema = noPayloadSchema;

const ListRoundsOutputSchema = objectSchema({
  ok: booleanSchema(),
  rounds: arraySchema(roundListItemSchema),
});

export { ListRoundsPayloadSchema, ListRoundsOutputSchema };

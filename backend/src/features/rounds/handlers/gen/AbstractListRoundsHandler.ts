// AUTO-GENERATED FILE. DO NOT EDIT.
import { BaseHandler } from '../../../../app/http/BaseHandler.js';
import { ListRoundsPayloadSchema, ListRoundsOutputSchema } from '../../../../api/gen/rounds/schemas/ListRoundsSchemas.js';
import type { ListRoundsOutput, ListRoundsPayload } from '../../../../api/gen/rounds/types/ListRounds.js';

export abstract class AbstractListRoundsHandler extends BaseHandler<ListRoundsPayload, ListRoundsOutput> {
  protected readonly payloadSchema = ListRoundsPayloadSchema;
  protected readonly outputSchema = ListRoundsOutputSchema;
}

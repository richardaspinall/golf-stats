// AUTO-GENERATED FILE. DO NOT EDIT.
import { BaseHandler } from '../../../../app/http/BaseHandler.js';
import { GetRoundPayloadSchema, GetRoundOutputSchema } from '../../../../api/gen/rounds/schemas/GetRoundSchemas.js';
import type { GetRoundOutput, GetRoundPayload } from '../../../../api/gen/rounds/types/GetRound.js';

export abstract class AbstractGetRoundHandler extends BaseHandler<GetRoundPayload, GetRoundOutput> {
  protected readonly payloadSchema = GetRoundPayloadSchema;
  protected readonly outputSchema = GetRoundOutputSchema;
}

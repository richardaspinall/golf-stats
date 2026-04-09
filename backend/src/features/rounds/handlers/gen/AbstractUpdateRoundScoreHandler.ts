// AUTO-GENERATED FILE. DO NOT EDIT.
import { BaseHandler } from '../../../../app/http/BaseHandler.js';
import { UpdateRoundScorePayloadSchema, UpdateRoundScoreOutputSchema } from '../../../../api/gen/rounds/schemas/UpdateRoundScoreSchemas.js';
import type { UpdateRoundScoreOutput, UpdateRoundScorePayload } from '../../../../api/gen/rounds/types/UpdateRoundScore.js';

export abstract class AbstractUpdateRoundScoreHandler extends BaseHandler<UpdateRoundScorePayload, UpdateRoundScoreOutput> {
  protected readonly payloadSchema = UpdateRoundScorePayloadSchema;
  protected readonly outputSchema = UpdateRoundScoreOutputSchema;
}

import { BaseHandler } from '../../../../app/http/BaseHandler.js';
import { saveClubCarryPayloadSchema, saveClubCarryResponseSchema, type SaveClubCarryPayload, type SaveClubCarryResponse } from '../../contracts.js';

export abstract class AbstractSaveClubCarryHandler extends BaseHandler<SaveClubCarryPayload, SaveClubCarryResponse> {
  protected readonly payloadSchema = saveClubCarryPayloadSchema;
  protected readonly outputSchema = saveClubCarryResponseSchema;
}

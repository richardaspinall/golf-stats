import { BaseHandler } from '../../../../app/http/BaseHandler.js';
import { syncVirtualCaddyActualsPayloadSchema, syncVirtualCaddyActualsResponseSchema, type SyncVirtualCaddyActualsPayload, type SyncVirtualCaddyActualsResponse } from '../../contracts.js';

export abstract class AbstractSyncVirtualCaddyActualsHandler extends BaseHandler<SyncVirtualCaddyActualsPayload, SyncVirtualCaddyActualsResponse> {
  protected readonly payloadSchema = syncVirtualCaddyActualsPayloadSchema;
  protected readonly outputSchema = syncVirtualCaddyActualsResponseSchema;
}

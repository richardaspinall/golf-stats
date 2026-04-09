import { BaseHandler } from '../../../../app/http/BaseHandler.js';
import { linkGooglePayloadSchema, linkGoogleResponseSchema, type LinkGooglePayload, type LinkGoogleResponse } from '../../contracts.js';

export abstract class AbstractLinkGoogleHandler extends BaseHandler<LinkGooglePayload, LinkGoogleResponse> {
  protected readonly payloadSchema = linkGooglePayloadSchema;
  protected readonly outputSchema = linkGoogleResponseSchema;
}

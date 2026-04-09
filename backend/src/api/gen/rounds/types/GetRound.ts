// AUTO-GENERATED FILE. DO NOT EDIT.
import type { Round } from '../../../../domain/types.js';

type GetRoundPayload = {

};

type GetRoundOutput = {
  ok: boolean;
  round: Round;
};

const GetRoundErrorCodes = {
  ROUND_NOT_FOUND: 'ROUND_NOT_FOUND',
} as const;

type GetRoundErrorCode = typeof GetRoundErrorCodes[keyof typeof GetRoundErrorCodes];

export type { GetRoundPayload, GetRoundOutput, GetRoundErrorCode };
export { GetRoundErrorCodes };

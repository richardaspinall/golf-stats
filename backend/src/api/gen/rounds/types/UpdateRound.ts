// AUTO-GENERATED FILE. DO NOT EDIT.
import type { Round } from '../../../../domain/types.js';

type UpdateRoundPayload = {
  name?: unknown | undefined;
  roundDate?: unknown | undefined;
  handicap?: unknown | undefined;
  courseId?: unknown | undefined;
  statsByHole?: unknown | undefined;
  notes?: unknown | undefined;
};

type UpdateRoundOutput = {
  ok: boolean;
  round: Round;
};

const UpdateRoundErrorCodes = {
  ROUND_NOT_FOUND: 'ROUND_NOT_FOUND',
  ROUND_UPDATE_ERROR: 'ROUND_UPDATE_ERROR',
} as const;

type UpdateRoundErrorCode = typeof UpdateRoundErrorCodes[keyof typeof UpdateRoundErrorCodes];

export type { UpdateRoundPayload, UpdateRoundOutput, UpdateRoundErrorCode };
export { UpdateRoundErrorCodes };

// AUTO-GENERATED FILE. DO NOT EDIT.
import type { Round } from '../../../../domain/types.js';

type CreateRoundPayload = {
  name?: unknown | undefined;
  roundDate?: unknown | undefined;
  handicap?: unknown | undefined;
  courseId?: unknown | undefined;
  statsByHole?: unknown | undefined;
  notes?: unknown | undefined;
};

type CreateRoundOutput = {
  ok: boolean;
  round: Round;
};

const CreateRoundErrorCodes = {
  ROUND_CREATE_ERROR: 'ROUND_CREATE_ERROR',
} as const;

type CreateRoundErrorCode = typeof CreateRoundErrorCodes[keyof typeof CreateRoundErrorCodes];

export type { CreateRoundPayload, CreateRoundOutput, CreateRoundErrorCode };
export { CreateRoundErrorCodes };

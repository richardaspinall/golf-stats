// AUTO-GENERATED FILE. DO NOT EDIT.
import type { Round } from '../../../../domain/types.js';

type UpdateRoundScorePayload = {
  round: string;
  hole: number;
  score: number;
};

type UpdateRoundScoreOutput = {
  ok: boolean;
  round: Round;
};

const UpdateRoundScoreErrorCodes = {
  ROUND_NOT_FOUND: 'ROUND_NOT_FOUND',
  ROUND_INVALID_HOLE: 'ROUND_INVALID_HOLE',
  ROUND_INVALID_SCORE: 'ROUND_INVALID_SCORE',
} as const;

type UpdateRoundScoreErrorCode = typeof UpdateRoundScoreErrorCodes[keyof typeof UpdateRoundScoreErrorCodes];

export type { UpdateRoundScorePayload, UpdateRoundScoreOutput, UpdateRoundScoreErrorCode };
export { UpdateRoundScoreErrorCodes };

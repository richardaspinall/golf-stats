// AUTO-GENERATED FILE. DO NOT EDIT.
import type { RoundListItem } from '../../../../domain/types.js';

type ListRoundsPayload = {

};

type ListRoundsOutput = {
  ok: boolean;
  rounds: RoundListItem[];
};

const ListRoundsErrorCodes = {

} as const;

type ListRoundsErrorCode = typeof ListRoundsErrorCodes[keyof typeof ListRoundsErrorCodes];

export type { ListRoundsPayload, ListRoundsOutput, ListRoundsErrorCode };
export { ListRoundsErrorCodes };

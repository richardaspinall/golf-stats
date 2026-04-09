// AUTO-GENERATED FILE. DO NOT EDIT.
type DeleteRoundPayload = {

};

type DeleteRoundOutput = {
  ok: boolean;
};

const DeleteRoundErrorCodes = {
  ROUND_NOT_FOUND: 'ROUND_NOT_FOUND',
} as const;

type DeleteRoundErrorCode = typeof DeleteRoundErrorCodes[keyof typeof DeleteRoundErrorCodes];

export type { DeleteRoundPayload, DeleteRoundOutput, DeleteRoundErrorCode };
export { DeleteRoundErrorCodes };

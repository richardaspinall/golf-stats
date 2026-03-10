import { CLUB_OPTION_SET, VALID_BUNKER_KEYS, VALID_FAIRWAY_KEYS, VALID_GIR_KEYS } from '../constants.js';
import type { BunkerSelection, ClubOption, FairwaySelection, GirSelection } from './types.js';

export const isClubOption = (value: string): value is ClubOption => CLUB_OPTION_SET.has(value as ClubOption);

export const isFairwaySelection = (value: unknown): value is FairwaySelection =>
  typeof value === 'string' && VALID_FAIRWAY_KEYS.has(value as FairwaySelection);

export const isGirSelection = (value: unknown): value is GirSelection =>
  typeof value === 'string' && VALID_GIR_KEYS.has(value as GirSelection);

export const isBunkerSelection = (value: unknown): value is BunkerSelection =>
  typeof value === 'string' && VALID_BUNKER_KEYS.has(value as BunkerSelection);

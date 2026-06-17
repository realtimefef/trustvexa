import type { SUPPORTED_COINS, SUPPORTED_NETWORKS } from './constants.js';

/** A coin supported by the platform. */
export type SupportedCoin = (typeof SUPPORTED_COINS)[number];

/** A network supported by the platform. */
export type SupportedNetwork = (typeof SUPPORTED_NETWORKS)[number];

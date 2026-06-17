// Practice deals on testnet (task 9.4, Requirements 48.1, 48.2). Pure rules
// keeping practice deals strictly off mainnet and off real money.

export type NetworkMode = 'mainnet' | 'testnet';

/** Practice deals always run on testnet. */
export function resolveNetworkMode(isPractice: boolean): NetworkMode {
  return isPractice ? 'testnet' : 'mainnet';
}

/** A deal handles real money only when it is not practice AND on mainnet. */
export function isRealMoney(isPractice: boolean, networkMode: NetworkMode): boolean {
  return !isPractice && networkMode === 'mainnet';
}

/** Mainnet operations are opt-in and remain disabled until the operator completes go-live. */
export function mainnetOperationAllowed(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.MAINNET_ENABLED === 'true';
}

export class PracticeModeError extends Error {}

/** Guard: practice deals must never be configured on mainnet. */
export function assertPracticeNetwork(isPractice: boolean, networkMode: NetworkMode): void {
  if (isPractice && networkMode !== 'testnet') {
    throw new PracticeModeError('practice deals must run on testnet');
  }
}

// Barrel for the wallets module. The router is the public entry point the
// parent mounts at `/api/v1/wallets`; the pure validator is re-exported for
// reuse. Repositories are intentionally not re-exported (module convention).
export { walletsRouter } from './wallets.routes.js';
export * from './address-validation.js';

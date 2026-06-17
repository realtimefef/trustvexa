import { jwtAuth } from '../middleware/auth.js';
import { idempotencyKey } from '../middleware/idempotency.js';
import { rateLimiter } from '../middleware/rate-limit.js';
import { roleGuard } from '../middleware/role-guard.js';
import { validate } from '../middleware/validation.js';
export function apiChain(options = {}) {
    return [
        validate(options.schemas ?? {}), // slot 5
        jwtAuth(), // slot 6
        roleGuard(options.roles ?? []), // slot 7
        rateLimiter(options.rateLimit), // slot 8
        idempotencyKey(options.enforceIdempotency ?? false), // slot 9
    ];
}
//# sourceMappingURL=api-chain.js.map
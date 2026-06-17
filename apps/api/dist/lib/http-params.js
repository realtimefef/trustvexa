import { AppError } from '../errors/app-error.js';
/** Return a required path parameter, or throw a 400 when it is absent. */
export function requireParam(req, name) {
    const value = req.params[name];
    if (value === undefined || value === '') {
        throw new AppError('missing_path_parameter', `Required path parameter '${name}' is missing.`, 400);
    }
    return value;
}
/** Return the authenticated user id set by the JWT auth middleware, or throw 401. */
export function requireUserId(req) {
    const userId = req.auth?.userId;
    if (!userId) {
        throw new AppError('unauthenticated', 'Authenticated user id missing after auth middleware.', 401);
    }
    return userId;
}
//# sourceMappingURL=http-params.js.map
import { AppError } from '../errors/app-error.js';
export function validate(schemas) {
    return (req, _res, next) => {
        try {
            if (schemas.params) {
                req.params = schemas.params.parse(req.params);
            }
            if (schemas.query) {
                // req.query is read-only in some express versions; assign defensively.
                Object.assign(req.query, schemas.query.parse(req.query));
            }
            if (schemas.body) {
                req.body = schemas.body.parse(req.body);
            }
            next();
        }
        catch (_err) {
            // Log internally for observability — never send schema details to the client.
            req.log?.debug({ err: _err }, 'request validation failed');
            next(new AppError('validation_error', 'Request validation failed.', 422));
        }
    };
}
//# sourceMappingURL=validation.js.map
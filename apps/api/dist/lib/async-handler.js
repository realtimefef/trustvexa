/**
 * Wraps an async route handler so rejected promises are forwarded to the
 * centralized error handler (Express 4 does not catch async errors itself).
 */
export function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
//# sourceMappingURL=async-handler.js.map
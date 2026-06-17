import { Router, type Request, type Response } from 'express';
import { asyncHandler } from '../../lib/async-handler.js';
import { apiChain } from '../../routes/api-chain.js';
import { query } from '@trustvexa/shared';

// SEC-HIGH-8 FIX: Replace the N+1 loop (one query per middleman for ratings)
// with a single aggregate JOIN. Also adds LIMIT 50 to prevent unbounded
// enumeration of all middleman UUIDs by any authenticated user.
export async function listMiddlemen(_req: Request, res: Response): Promise<void> {
  const result = await query<{
    id: string;
    username: string;
    avg_rating: string | null;
  }>(
    `SELECT u.id, u.username,
            AVG(r.rating)::numeric(3,2) AS avg_rating
       FROM users u
       LEFT JOIN reviews r ON r.reviewee_id = u.id
      WHERE u.account_type = 'middleman'
        AND u.account_status = 'active'
      GROUP BY u.id, u.username
      ORDER BY u.created_at ASC
      LIMIT 50`,
  );

  const middlemen = result.rows.map((m) => ({
    id: m.id,
    username: m.username,
    rating: m.avg_rating !== null ? Number.parseFloat(m.avg_rating) : undefined,
  }));

  res.status(200).json({ middlemen });
}

export function middlemenRouter(): Router {
  const router = Router();
  router.get('/', ...apiChain({ roles: ['user', 'middleman'] }), asyncHandler(listMiddlemen));
  return router;
}

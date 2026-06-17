import { getRedis, query } from '@trustvexa/shared';

/**
 * Check if failed login attempts exceed 10 within 5 minutes for a given IP.
 * If so, flag as abuse in the abuse_flags table.
 */
export async function checkFailedLoginAbuse(ip: string, _email: string): Promise<void> {
  try {
    const redis = getRedis();
    const loginKey = `abuse:login:${ip}`;

    const count = await redis.incr(loginKey);
    if (count === 1) {
      await redis.expire(loginKey, 300); // 5 minutes window
    }

    if (count > 10) {
      const flagKey = `abuse:flag:login:${ip}`;
      const alreadyFlagged = await redis.get(flagKey);
      if (!alreadyFlagged) {
        await redis.set(flagKey, 'true', 'EX', 300);

        await query(
          `INSERT INTO abuse_flags (subject, type, details)
           VALUES ($1, $2, $3)`,
          [
            `ip:${ip}`,
            'failed_login',
            // SEC-HIGH-5 FIX: Never store plaintext email in abuse_flags.details.
            // Anyone with DB read access could enumerate registered accounts.
            `More than 10 failed login attempts in 5 minutes from this IP.`,
          ],
        );
      }
    }
  } catch (err) {
    // Fail open if Redis or DB is unreachable
    console.error('Abuse detector login check failed:', err);
  }
}

/**
 * Check if attempts on the same invite token exceed 5 within 1 hour for a user.
 * If so, flag as abuse.
 */
export async function checkInviteCodeAbuse(userId: string, token: string): Promise<void> {
  try {
    const redis = getRedis();
    const inviteKey = `abuse:invite:${userId}:${token}`;

    const count = await redis.incr(inviteKey);
    if (count === 1) {
      await redis.expire(inviteKey, 3600); // 1 hour window
    }

    if (count > 5) {
      const flagKey = `abuse:flag:invite:${userId}:${token}`;
      const alreadyFlagged = await redis.get(flagKey);
      if (!alreadyFlagged) {
        await redis.set(flagKey, 'true', 'EX', 3600);

        await query(
          `INSERT INTO abuse_flags (subject, type, details)
           VALUES ($1, $2, $3)`,
          [`user:${userId}`, 'invalid_invite', `More than 5 attempts on invite token: ${token}`],
        );
      }
    }
  } catch (err) {
    console.error('Abuse detector invite check failed:', err);
  }
}

/**
 * Check if deal creations by a user exceed 20 within 24 hours.
 * If so, flag as abuse.
 */
export async function checkDealCreationVelocity(userId: string): Promise<void> {
  try {
    const redis = getRedis();
    const dealKey = `abuse:deals:${userId}`;

    const count = await redis.incr(dealKey);
    if (count === 1) {
      await redis.expire(dealKey, 86400); // 24 hours window
    }

    if (count > 20) {
      const flagKey = `abuse:flag:deals:${userId}`;
      const alreadyFlagged = await redis.get(flagKey);
      if (!alreadyFlagged) {
        await redis.set(flagKey, 'true', 'EX', 86400);

        await query(
          `INSERT INTO abuse_flags (subject, type, details)
           VALUES ($1, $2, $3)`,
          [`user:${userId}`, 'deal_velocity', `More than 20 deals created in 24 hours.`],
        );
      }
    }
  } catch (err) {
    console.error('Abuse detector deal velocity check failed:', err);
  }
}

import { query } from '@trustvexa/shared';
import * as service from './public.service.js';
import { getObjectStorage } from '../storage/object-storage.js';
export async function getPolicyVersions(_req, res) {
    const result = await service.getPolicyVersions();
    res.status(200).json(result);
}
export async function streamAvatar(req, res) {
    const { userId } = req.params;
    if (!userId) {
        res.status(400).json({ error_code: 'BAD_REQUEST', message: 'User ID is required' });
        return;
    }
    // 1. Fetch user from db
    const dbRes = await query(`SELECT username, avatar_file_key FROM users WHERE id = $1`, [userId]);
    const user = dbRes.rows[0];
    if (!user) {
        res.status(404).json({ error_code: 'NOT_FOUND', message: 'User not found' });
        return;
    }
    // 2. Try loading from object storage if key exists
    if (user.avatar_file_key) {
        const storage = getObjectStorage();
        try {
            const bytes = await storage.get(user.avatar_file_key);
            if (bytes) {
                let contentType = 'image/jpeg';
                if (user.avatar_file_key.endsWith('.png'))
                    contentType = 'image/png';
                else if (user.avatar_file_key.endsWith('.gif'))
                    contentType = 'image/gif';
                else if (user.avatar_file_key.endsWith('.webp'))
                    contentType = 'image/webp';
                else if (user.avatar_file_key.endsWith('.svg'))
                    contentType = 'image/svg+xml';
                res.setHeader('Content-Type', contentType);
                res.setHeader('Cache-Control', 'public, max-age=86400');
                res.status(200).send(bytes);
                return;
            }
        }
        catch (err) {
            console.error('Failed to retrieve avatar from storage:', err);
        }
    }
    // 3. Generate SVG Initials Fallback
    const username = user.username || 'U';
    const initials = username.slice(0, 2).toUpperCase();
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
  <defs>
    <linearGradient id="avatarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4F46E5" />
      <stop offset="100%" stop-color="#06B6D4" />
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#avatarGrad)"/>
  <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-family="'Inter', -apple-system, sans-serif" font-size="48" fill="#FFFFFF" font-weight="bold">${initials}</text>
</svg>`;
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.status(200).send(svg);
}
export async function getServiceHours(_req, res) {
    const dbRes = await query(`SELECT day_of_week, open_time, close_time, timezone FROM service_hours ORDER BY day_of_week`);
    let hours = dbRes.rows;
    if (hours.length === 0) {
        // Return default business hours if empty (e.g. Mon-Fri 09:00 - 18:00 UTC)
        hours = [1, 2, 3, 4, 5].map((day) => ({
            day_of_week: day,
            open_time: '09:00',
            close_time: '18:00',
            timezone: 'UTC',
        }));
    }
    const holidaysRes = await query(`SELECT holiday_date, label FROM service_holidays ORDER BY holiday_date`);
    res.status(200).json({ hours, holidays: holidaysRes.rows });
}
//# sourceMappingURL=public.controller.js.map
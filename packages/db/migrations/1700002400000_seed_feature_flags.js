/**
 * Seed the feature_flags table with the core platform feature toggles.
 * These flags let the middleman enable/disable platform capabilities
 * from the admin console without a code deploy.
 */

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.up = (pgm) => {
  const flags = [
    { key: 'new_deals',         description: 'Allow new deal creation',                                    is_enabled: true,  scope: 'platform' },
    { key: 'deposits',          description: 'Allow crypto deposits / escrow funding',                     is_enabled: true,  scope: 'platform' },
    { key: 'payouts',           description: 'Allow payout processing to sellers',                         is_enabled: true,  scope: 'platform' },
    { key: 'withdrawals',       description: 'Allow wallet withdrawals',                                   is_enabled: true,  scope: 'platform' },
    { key: 'signups',           description: 'Allow new user registration',                                is_enabled: true,  scope: 'platform' },
    { key: 'google_oauth',      description: 'Allow Google OAuth login',                                   is_enabled: true,  scope: 'auth' },
    { key: 'totp_enforcement',  description: 'Enforce 2-FA for high-value deal actions',                   is_enabled: false, scope: 'security' },
    { key: 'dispute_creation',  description: 'Allow buyers/sellers to open disputes',                      is_enabled: true,  scope: 'platform' },
    { key: 'public_reviews',    description: 'Allow public review posting after deals',                    is_enabled: true,  scope: 'platform' },
    { key: 'file_uploads',      description: 'Allow image/video uploads in chats',                        is_enabled: true,  scope: 'chat' },
    { key: 'connection_chat',   description: 'Allow pre-deal connection chats',                            is_enabled: true,  scope: 'chat' },
    { key: 'middleman_invite',  description: 'Allow users to invite a middleman to their connection',      is_enabled: true,  scope: 'platform' },
    { key: 'practice_deals',    description: 'Allow practice/testnet deals',                               is_enabled: true,  scope: 'platform' },
    { key: 'rate_limiting',     description: 'Enforce API rate limits (disable only for testing)',          is_enabled: true,  scope: 'security' },
    { key: 'notifications',     description: 'Enable push/email notifications',                            is_enabled: true,  scope: 'platform' },
  ];

  for (const flag of flags) {
    pgm.sql(
      `INSERT INTO feature_flags (flag_key, description, is_enabled, scope)
       VALUES ('${flag.key}', '${flag.description}', ${flag.is_enabled}, '${flag.scope}')
       ON CONFLICT (flag_key) DO NOTHING`
    );
  }
};

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.down = (pgm) => {
  const keys = [
    'new_deals', 'deposits', 'payouts', 'withdrawals', 'signups',
    'google_oauth', 'totp_enforcement', 'dispute_creation', 'public_reviews',
    'file_uploads', 'connection_chat', 'middleman_invite', 'practice_deals',
    'rate_limiting', 'notifications',
  ];
  pgm.sql(`DELETE FROM feature_flags WHERE flag_key = ANY(ARRAY[${keys.map(k => `'${k}'`).join(',')}])`);
};

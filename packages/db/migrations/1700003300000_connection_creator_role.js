/**
 * Add creator_role to connections so the person who CREATES a connection can
 * declare whether they are the buyer or the seller. Before a deal exists the
 * connection has no authoritative buyer/seller, so the creator's self-declared
 * role drives the chat labels (and the joiner takes the opposite side). Once a
 * deal is created from the connection, the deal's buyer_id/seller_id become
 * authoritative and override this column for display.
 *
 * Default 'buyer' preserves the previous implicit behaviour (creator == buyer).
 */

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.up = (pgm) => {
  pgm.addColumn('connections', {
    creator_role: {
      type: 'text',
      notNull: true,
      default: 'buyer',
      check: "creator_role IN ('buyer', 'seller')",
    },
  });
};

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.down = (pgm) => {
  pgm.dropColumn('connections', 'creator_role');
};

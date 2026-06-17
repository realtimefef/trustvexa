// Persistence for feature_flags (task 9.1). Unique on flag_key. Not barrel-exported.
import type { FeatureFlag, FlagScope } from './feature-flags.js';

export interface TxClient {
  query<R>(
    text: string,
    params?: ReadonlyArray<unknown>,
  ): Promise<{ rows: R[]; rowCount: number | null }>;
}

interface FeatureFlagRow {
  flag_key: string;
  description: string;
  is_enabled: boolean;
  scope: FlagScope;
}

function toModel(row: FeatureFlagRow): FeatureFlag {
  return {
    flagKey: row.flag_key,
    description: row.description,
    isEnabled: row.is_enabled,
    scope: row.scope,
  };
}

export async function listFlags(tx: TxClient): Promise<FeatureFlag[]> {
  const { rows } = await tx.query<FeatureFlagRow>(
    `SELECT flag_key, description, is_enabled, scope FROM feature_flags`,
  );
  return rows.map(toModel);
}

export async function setFlag(
  tx: TxClient,
  input: {
    flagKey: string;
    description: string;
    isEnabled: boolean;
    scope: FlagScope;
    updatedBy: string;
  },
): Promise<FeatureFlag> {
  const { rows } = await tx.query<FeatureFlagRow>(
    `INSERT INTO feature_flags (flag_key, description, is_enabled, scope, updated_by)
		 VALUES ($1, $2, $3, $4, $5)
		 ON CONFLICT (flag_key)
		 DO UPDATE SET is_enabled = EXCLUDED.is_enabled, description = EXCLUDED.description,
		               scope = EXCLUDED.scope, updated_by = EXCLUDED.updated_by
		 RETURNING flag_key, description, is_enabled, scope`,
    [input.flagKey, input.description, input.isEnabled, input.scope, input.updatedBy],
  );
  const row = rows[0];
  if (!row) throw new Error('setFlag returned no row');
  return toModel(row);
}

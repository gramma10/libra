export type ShopScope = "ALL" | string;

export const ALL_SCOPE = "ALL" as const;

export function isAllScope(scope: ShopScope): scope is "ALL" {
  return scope === ALL_SCOPE;
}

/**
 * Apply the current shop scope to a Supabase query.
 * - When scope === "ALL", the query is returned unchanged (RLS narrows results
 *   to the user's admin shops).
 * - When scope is a specific shop id, an `.eq('shop_id', scope)` is added.
 */
export function applyShopScope<Q extends { eq: (col: string, val: unknown) => Q }>(
  query: Q,
  scope: ShopScope,
): Q {
  return isAllScope(scope) ? query : query.eq("shop_id", scope);
}



## Root Cause Analysis

The bug is a **race condition** between the invite acceptance and the shop-loading state. Here's what happens:

1. New employee signs up, lands on `/` via ProtectedRoute
2. ProtectedRoute's useEffect correctly finds the `pending_invite_code` and calls `accept_invitation` RPC -- **this succeeds**
3. After success, it calls `refetch()` to refresh the shop context, then **immediately** sets `acceptingInvite = false` in the `finally` block
4. But `refetch()` is async and `fetchShop` in `useShop` **never sets `loading: true`** when called as a refetch (only the initial state is `loading: true`)
5. So the component re-renders with: `acceptingInvite=false`, `shopLoading=false`, `hasShop=false` (refetch hasn't completed yet)
6. This hits the `if (!hasShop) return <Navigate to="/onboarding" />` redirect before the refetch resolves

## Plan

### 1. Fix `useShop.tsx` -- set loading on refetch

Update `fetchShop` to set `loading: true` at the start of every call (not just the initial state). This ensures the ProtectedRoute spinner stays active while the shop data is being re-fetched.

```typescript
const fetchShop = useCallback(async () => {
  setState(prev => ({ ...prev, loading: true }));  // ADD THIS LINE
  if (!user) { ... }
  // rest unchanged
```

### 2. Fix `ProtectedRoute.tsx` -- await refetch before clearing state

Move `setAcceptingInvite(false)` **after** `refetch()` completes, not in the `finally` block. This prevents the brief window where both `acceptingInvite` and `hasShop` are false.

```typescript
const accept = async () => {
  setAcceptingInvite(true);
  try {
    const { error } = await supabase.rpc("accept_invitation", { _invite_code: pendingCode });
    if (error) throw error;
    localStorage.removeItem("pending_invite_code");
    toast.success("Welcome to the team!");
    await refetch();          // AWAIT the refetch
  } catch (e: any) {
    console.error("Failed to accept invitation:", e);
    localStorage.removeItem("pending_invite_code");
    toast.error(e.message || "Failed to accept invitation");
  } finally {
    setAcceptingInvite(false);
    setInviteHandled(true);
  }
};
```

The key change is making `refetch` return a promise and awaiting it, so the `finally` block only runs after `hasShop` has been updated in state.

### 3. Make `fetchShop` return a Promise properly

The `refetch` function is just `fetchShop` which is already async, so it already returns a Promise -- it just needs to be awaited in ProtectedRoute. No change needed in `useShop` beyond adding the loading state reset.

### Files to modify
- `src/hooks/useShop.tsx` (1 line addition)
- `src/components/ProtectedRoute.tsx` (add `await` to `refetch()`)


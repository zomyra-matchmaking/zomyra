/**
 * The mock backend's notion of a session.
 *
 * Small, but deliberately **faithful on the one behaviour that matters**:
 * refresh tokens here are single-use and rotating, exactly as BE TDD §9.2
 * describes. That means the concurrent-401 bug MIGRATION §5 warns about
 * reproduces against these mocks — present a rotated refresh token a second
 * time and you get `refresh_token_invalid`, just as staging would. A mock that
 * accepted any refresh token forever would hide the bug until integration.
 */

let counter = 0;
const nextId = () => `${Date.now().toString(36)}-${(counter += 1)}`;

/**
 * Tokens this mock issues are recognisable, which is what lets it re-adopt one
 * across a reload, and they **carry their own `userId`** so the re-adopted
 * session names the right account rather than a placeholder. See the header of
 * `accounts.ts` for why that matters. `~` is the delimiter because no mock
 * `userId` contains one.
 */
const ACCESS_TOKEN_PREFIX = "mock-access~";

const mintAccessToken = (userId: string) => `${ACCESS_TOKEN_PREFIX}${userId}~${nextId()}`;

function userIdFromAccessToken(token: string): string | null {
  if (!token.startsWith(ACCESS_TOKEN_PREFIX)) return null;
  const [userId] = token.slice(ACCESS_TOKEN_PREFIX.length).split("~");
  return userId || null;
}

type MockSession = {
  userId: string;
  accessToken: string;
  /** The one refresh token currently valid. Rotated on every refresh. */
  refreshToken: string;
  /** Tokens already spent, kept so replays can be rejected rather than ignored. */
  revoked: Set<string>;
};

let session: MockSession | null = null;

export function issueSession(userId: string): { accessToken: string; refreshToken: string } {
  session = {
    userId,
    accessToken: mintAccessToken(userId),
    refreshToken: `mock-refresh-${nextId()}`,
    revoked: new Set(),
  };
  return { accessToken: session.accessToken, refreshToken: session.refreshToken };
}

export type RefreshOutcome =
  | { ok: true; accessToken: string; refreshToken: string }
  | { ok: false };

export function rotateSession(presented: string): RefreshOutcome {
  if (!session || presented !== session.refreshToken || session.revoked.has(presented)) {
    return { ok: false };
  }
  session.revoked.add(session.refreshToken);
  session.accessToken = mintAccessToken(session.userId);
  session.refreshToken = `mock-refresh-${nextId()}`;
  return { ok: true, accessToken: session.accessToken, refreshToken: session.refreshToken };
}

export function currentUserId(): string | null {
  return session?.userId ?? null;
}

/**
 * Whether a bearer token is the one currently issued.
 *
 * `expireAccessToken()` below is what makes the silent-refresh path reachable
 * in development: without a way to invalidate an access token on demand, the
 * 401→refresh→retry flow would never run against mocks and would first
 * execute in front of a real backend.
 *
 * ## Re-adopting a token across a reload (added in Module 3)
 *
 * This state is module-scoped, so it dies with the JS context — but the
 * client's tokens do not: they are in the keychain (NFR-2) and survive a kill.
 * Until now that asymmetry meant **every cold start in mock mode force-logged
 * the user out**: `bootstrapSession` found a perfectly good token, `GET /me`
 * came back 401 because this file had forgotten it, the refresh failed for the
 * same reason, and `sessionExpired` fired. Which is precisely the one path the
 * root gate must *not* take on a normal reopen — Module 3 could not exercise
 * its own routing table, and Modules 5–9 would each have re-signed-in on every
 * reload.
 *
 * So a token this mock recognises as one of its own is **adopted**: a session is
 * re-established around it, exactly as a real backend still holding the session
 * server-side would behave. It stays strict about everything that matters —
 * a token it did not mint is still rejected, `expireAccessToken()` still forces
 * a refresh, and the refresh token stays single-use and rotating (§9.2), so the
 * concurrent-401 bug still reproduces here.
 *
 * **Module 4 made the adoption faithful.** It used to rebuild the session under
 * a hardcoded `"mock-user"`, because the user id was not recoverable from the
 * token. Now that the token carries it, a cold start resumes as *the same
 * account* — without which signing in as the returning user and relaunching
 * would come back as an incomplete signup, and neither FR-1a's Discover branch
 * nor O-18(a)'s deep-link case could be reproduced across a restart.
 */
export function isAccessTokenValid(token: string | undefined): boolean {
  if (!token) return false;
  if (session) return token === session.accessToken;

  const userId = userIdFromAccessToken(token);
  if (!userId) return false;

  session = {
    userId,
    accessToken: token,
    refreshToken: `mock-refresh-${nextId()}`,
    revoked: new Set(),
  };
  return true;
}

export function expireAccessToken(): void {
  // Deliberately not a mintAccessToken() call: this must produce a token the
  // *client* still presents but this module rejects, and one that cannot be
  // re-adopted after a reload either.
  if (session) session.accessToken = `mock-expired-${nextId()}`;
}

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
    accessToken: `mock-access-${nextId()}`,
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
  session.accessToken = `mock-access-${nextId()}`;
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
 */
export function isAccessTokenValid(token: string | undefined): boolean {
  return !!session && !!token && token === session.accessToken;
}

export function expireAccessToken(): void {
  if (session) session.accessToken = `mock-access-expired-${nextId()}`;
}

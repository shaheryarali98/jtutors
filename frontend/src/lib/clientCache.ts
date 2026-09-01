/**
 * Remote cache-busting.
 *
 * The server publishes a `clientCacheVersion` on /settings/public. Each browser
 * records the version it last saw; when an admin bumps it, every browser drops
 * its cached app state and reloads once on its next page load. That is how a
 * fix reaches people who are holding stale data, without asking anyone to clear
 * their browser or sign in again.
 *
 * Sign-in is deliberately preserved — `auth-storage` is never cleared.
 */

const VERSION_KEY = 'jtutors-client-cache-version'
const RELOAD_GUARD_KEY = 'jtutors-cache-reload-guard'

/** App caches that are safe to drop. Auth is intentionally absent. */
const CLEARABLE_SESSION_KEYS = ['student-profile-gate']
const CLEARABLE_LOCAL_PREFIXES = ['jtutors-booking-coupon', 'student-profile-gate']

const readStoredVersion = (): number | null => {
  try {
    const raw = window.localStorage.getItem(VERSION_KEY)
    if (!raw) return null
    const parsed = Number(raw)
    return Number.isFinite(parsed) ? parsed : null
  } catch {
    return null
  }
}

const writeStoredVersion = (version: number) => {
  try {
    window.localStorage.setItem(VERSION_KEY, String(version))
  } catch {
    /* storage unavailable (private mode); nothing else to do */
  }
}

/** Drop cached app state, leaving the session signed in. */
export const clearClientAppCaches = () => {
  try {
    CLEARABLE_SESSION_KEYS.forEach((key) => window.sessionStorage.removeItem(key))
  } catch {
    /* ignore */
  }

  try {
    const doomed: string[] = []
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i)
      if (key && CLEARABLE_LOCAL_PREFIXES.some((prefix) => key.startsWith(prefix))) {
        doomed.push(key)
      }
    }
    doomed.forEach((key) => window.localStorage.removeItem(key))
  } catch {
    /* ignore */
  }
}

/**
 * Compare the server's cache version with this browser's and, if it has moved,
 * clear cached state and reload once.
 *
 * The new version is written BEFORE reloading and a one-shot guard is set, so a
 * failure cannot put the page into a reload loop.
 */
export const applyServerCacheVersion = (serverVersion: unknown) => {
  if (typeof window === 'undefined') return

  const version = Number(serverVersion)
  if (!Number.isFinite(version)) return

  const stored = readStoredVersion()

  // First visit (or storage cleared): record the version, change nothing.
  if (stored === null) {
    writeStoredVersion(version)
    return
  }

  if (stored === version) {
    try {
      window.sessionStorage.removeItem(RELOAD_GUARD_KEY)
    } catch {
      /* ignore */
    }
    return
  }

  // Record first so the reload cannot repeat even if something below throws.
  writeStoredVersion(version)
  clearClientAppCaches()

  let alreadyReloaded = false
  try {
    alreadyReloaded = window.sessionStorage.getItem(RELOAD_GUARD_KEY) === String(version)
    if (!alreadyReloaded) window.sessionStorage.setItem(RELOAD_GUARD_KEY, String(version))
  } catch {
    // Without sessionStorage we cannot guard a reload safely, so skip it.
    alreadyReloaded = true
  }

  if (!alreadyReloaded) {
    window.location.reload()
  }
}

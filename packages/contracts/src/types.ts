/** The system's only theming axis. See @polls/tokens. */
export type Theme = 'light' | 'dark'

/**
 * The event contract between microfrontends.
 *
 * Flow is unidirectional: poll-list → poll-vote → poll-results.
 * No microfrontend reads another's state; everything that crosses the boundary
 * goes through here.
 *
 * Naming convention: `domain:action`.
 */
export interface Events {
  /** poll-list picked a poll. It does not navigate itself — the host translates that. */
  'poll:selected': { pollId: string }
  /** poll-vote confirmed a vote. `at` is ISO 8601. */
  'vote:cast': { pollId: string; optionId: string; at: string }
  /** Fresh per-option counts, keyed by optionId. */
  'results:updated': { pollId: string; tally: Record<string, number> }
  /** The host's simulated user changed. */
  'session:changed': { userId: string }
  /** The theme changed. Microfrontends react through custom properties, not by reloading. */
  'theme:changed': { theme: Theme }
}

/**
 * What the host injects on every mount.
 *
 * Capabilities are passed, not dependencies: `navigate` is a plain function, not
 * the `useNavigate` hook. No remote imports react-router.
 */
export interface HostContext {
  pollId: string | null
  theme: Theme
  user: { id: string } | null
  navigate: (to: string) => void
}

/** What `mount` returns, so the host can unmount without leaking. */
export type UnmountFn = () => void

/** The mount contract every remote exposes as `./App`. */
export type MountFn = (el: HTMLElement, ctx: HostContext) => UnmountFn

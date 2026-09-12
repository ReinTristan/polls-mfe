import type { Events } from './types'

/**
 * Key for the store of last-known values per event type.
 *
 * The store hangs off `globalThis` rather than module scope, on purpose.
 * `@polls/contracts` is not `shared: singleton` — every microfrontend carries
 * its own copy of the bundle, exactly like Jotai, and that is precisely what
 * keeps the bus from becoming the shared dependency this architecture is built
 * to shed.
 *
 * With a module-scoped Map there would be one store per copy: `emit` would still
 * cross (window.dispatchEvent is genuinely global) but `on(..., { replay: true })`
 * would read an empty Map and a late subscriber would receive nothing. With the
 * global key, all N copies share a single store.
 */
const STORE = Symbol.for('@polls/contracts/last-values')

type LastValues = Map<keyof Events, unknown>

function store(): LastValues {
  const global = globalThis as unknown as Record<symbol, LastValues | undefined>
  const existing = global[STORE]
  if (existing) return existing

  const created: LastValues = new Map()
  global[STORE] = created
  return created
}

/** Stores the value as the latest of its type and dispatches it on `window`. */
export function emit<K extends keyof Events>(type: K, detail: Events[K]): void {
  store().set(type, detail)
  window.dispatchEvent(new CustomEvent(type, { detail }))
}

export interface OnOptions {
  /**
   * Invoke the handler immediately with the latest emitted value, if any.
   * For microfrontends that mount after the event already happened.
   */
  replay?: boolean
}

/**
 * Subscribes to the event type and **always** returns a cleanup function.
 * Using it is not optional: an `on()` without cleanup is a listener leak the
 * moment the host unmounts the remote.
 */
export function on<K extends keyof Events>(
  type: K,
  fn: (detail: Events[K]) => void,
  options: OnOptions = {},
): () => void {
  const handler = (event: Event) => {
    fn((event as CustomEvent<Events[K]>).detail)
  }

  window.addEventListener(type, handler)

  if (options.replay) {
    const values = store()
    if (values.has(type)) fn(values.get(type) as Events[K])
  }

  return () => {
    window.removeEventListener(type, handler)
  }
}

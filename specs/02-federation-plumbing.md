# SPEC 02 — Federation plumbing and early deploy

> Status: **specified, not started** · Depends on: SPEC 1.5 · Unlocks: SPEC 03

## Objective

Module Federation working end to end **in production**, with trivial content. This milestone is
deployed before a single feature is written.

The bet here is the mirror image of SPEC 01's. SPEC 01 installed boundaries before any code could
violate them; SPEC 02 puts the riskiest moving parts — runtime composition across origins, shared
singletons, CORS, a real deploy — in place while there is nothing else on the page to blame. A
federation bug found next to a half-built voting flow is a debugging session. Found next to four
placeholder divs, it is a config line.

It also settles two debts written down earlier:

- **ADR-001** says "SPEC 02 builds it; revisit this file then."
- **SPEC 01, deferred verification:** replay to a late subscriber across separately built bundles
  was not testable without federation. It is now.

## Requirements

### R1 — Host

Vite + React 19 + **React Router v8**, declarative mode (`BrowserRouter`, `Routes`, `Route`).

The planning draft said "v7". What it meant was "the modern, unified `react-router` package, not
`react-router-dom`". v8 follows the same model and is current, so it is the one used; `CLAUDE.md`
is corrected accordingly.

Routes and what each one mounts:

| Route | Mounts |
|---|---|
| `/` | `poll-list` |
| `/polls/:pollId` | `poll-vote` and `poll-results` |

Having the two routes mount *different* remotes is deliberate: navigating between them is what
exercises mount and unmount, which is what the leak criterion needs.

A minimal navigation bar in the host links to `/` and `/polls/demo-1`. No styling beyond tokens.

The host builds `HostContext` like this:

| Field | Source in SPEC 02 |
|---|---|
| `pollId` | `useParams()`, `null` on `/` |
| `theme` | `'light'`, fixed. The toggle is SPEC 05. |
| `user` | Simulated: `{ id: 'demo-user' }` |
| `navigate` | A plain `(to: string) => void` wrapping `useNavigate()`. The hook itself never crosses the boundary (architecture rule 3). |

### R2 — Remotes expose `./App`

Each remote exposes a module `./App` whose `mount` export satisfies `MountFn` from
`@polls/contracts`. Federation names are valid JS identifiers:

| App | Federation name | Port |
|---|---|---|
| `apps/poll-list` | `poll_list` | 3001 |
| `apps/poll-vote` | `poll_vote` | 3002 |
| `apps/poll-results` | `poll_results` | 3003 |

How each one mounts:

- **React remotes** (`poll-list`, `poll-vote`) create their own root with `createRoot(el)` and
  return `() => root.unmount()`. They share the host's React instance through federation (R3), but
  not its tree.
- **`poll-results`** is vanilla TypeScript: it writes to `el` directly and returns a function that
  empties it. React does not appear in its `package.json` or in its bundle.

Trivial content, chosen so that every remote has something to prove:

| Remote | Content | What it proves |
|---|---|---|
| `poll-list` | A button that emits `poll:selected { pollId: 'demo-1' }`. It does **not** navigate. | The emitting side of replay |
| `poll-vote` | Subscribes to `poll:selected` with `{ replay: true }`, stores the value in a Jotai atom, renders it inside a `styled.div` that uses `tokens` | Replay across bundles; styled-components shared, Jotai not |
| `poll-results` | Subscribes to `vote:cast`, renders the `pollId` it received through `HostContext` | A framework-free remote under the same contract |

Every remote subscribes to at least one bus event and calls the cleanup returned by `on()` inside
its `unmount`. Without a real subscription there would be nothing to leak, and the leak criterion
would pass vacuously.

`poll-vote` creates its Jotai store **per mount** (`createStore()` handed to a `Provider`), so a
remount starts clean and no atom state outlives the unmount.

### R3 — Shared modules

| Module | Federation config | Why |
|---|---|---|
| `react` | `shared`, `singleton: true` | Two Reacts on one page break hooks |
| `react-dom` | `shared`, `singleton: true` | Must match `react` |
| `styled-components` | `shared`, `singleton: true` | One style sheet manager on the page |
| `jotai` | **not shared** | State library internal to `poll-vote` |
| `@polls/contracts` | **not shared** | Architecture rule 6; bus state lives on `globalThis` instead |
| `@polls/tokens` | **not shared** | Architecture rule 6 |

`poll-results` declares no shared modules at all: it has nothing to share.

Singletons only work if every app asks for a compatible version. Every `package.json` that lists
`react`, `react-dom` or `styled-components` uses the **same version specifier**, so a mismatch shows
up as a diff in review rather than as a runtime warning in the console.

Federation type generation is **off** (`dts: false`). The remote modules are typed by hand in
`apps/host/src/remotes.d.ts`, declaring each `<name>/App` as exporting `mount: MountFn`. The
contract already *is* the type; the generated-types plugin would add a dev-time fetch of type
archives from each remote and gain nothing over one import from `@polls/contracts`.

### R4 — Mounting in the host

A single `RemoteMount` component in the host owns the lifecycle of one remote:

1. Renders an empty container element.
2. In an effect, loads the remote with a dynamic `import()` and calls `mount(container, ctx)`.
3. On cleanup, calls the `unmount` it got back.

Two details that are easy to get wrong and are therefore requirements:

- **Cancellation.** The `import()` is asynchronous; the effect can be cleaned up before it resolves
  (React StrictMode does exactly this in development: mount, unmount, mount). If cleanup happens
  first, the late `mount` must not run — or, if it already ran, must be unmounted immediately.
- **Context changes remount.** `MountFn` has no "update" operation, by design: the contract is
  mount and unmount, nothing else. When `ctx` changes in a way the remote must see (in SPEC 02, only
  `pollId`), the host remounts by keying `RemoteMount` on it. This is recorded as an observation
  about the contract, to revisit if SPEC 04 or 05 find the remount too coarse.

### R5 — Every mount point has an error boundary

`RemoteBoundary` is a hand-written class component (React still has no hook for this, and adding
`react-error-boundary` for one class is not worth a dependency).

It must catch **both** ways a remote fails:

- **Load failure** — `remoteEntry.js` or a chunk is unreachable. The `import()` rejects outside of
  render, where a boundary cannot see it, so `RemoteMount` stores the error and rethrows it during
  render.
- **Mount failure** — `mount` itself throws.

The fallback is visible and names the remote that failed (for example, "poll-vote is unavailable").
The rest of the page keeps working.

### R6 — Remote URLs come from environment variables

The host reads three **build-time** variables in `vite.config.ts` through `loadEnv`:

| Variable | Default (development) |
|---|---|
| `POLL_LIST_URL` | `http://localhost:3001` |
| `POLL_VOTE_URL` | `http://localhost:3002` |
| `POLL_RESULTS_URL` | `http://localhost:3003` |

They are deliberately not `VITE_`-prefixed: they configure the federation plugin, and application
code has no reason to read them. `apps/host/.env.example` documents all three and is committed.

Consequence, stated rather than hidden: the URLs are baked into the host at build time, so pointing
the host at a different remote URL means rebuilding the host. Deploying a *new version* of a remote
at the same URL does not.

**Optional improvement, documented and not built:** a `remotes.json` fetched by the host at startup
and registered through the federation runtime would move the URLs from build time to run time. It
earns its keep once there are multiple environments per remote; this PoC has one.

### R7 — Each remote runs standalone in development

Each remote ships an `index.html` and a small entry that calls its own `mount` with a stub
`HostContext`, so `pnpm --filter <remote> dev` shows something on its fixed port. Ports are
enforced with `strictPort`: a remote silently moving to 3004 would break the host's defaults in a
way that looks like a federation bug.

Kept minimal on purpose. SPEC 05 R8 is where standalone rendering has to look right.

The root `package.json` gains a script that runs the four frontends in parallel.

### R8 — Static files served with `serve`

In production every frontend is served by [`serve`](https://github.com/vercel/serve), listed as a
`dependency` of that app — it is what runs in the container — listening on Railway's `$PORT`.

Configuration lives in a `serve.json` per app:

- **Remotes** send `Access-Control-Allow-Origin: *` on **every** file, not only `remoteEntry.js`.
  The planning draft named only the entry file, but the entry then imports its chunks as ES modules
  from the remote's own origin, and module scripts are subject to CORS. Covering only
  `remoteEntry.js` fails on the first chunk.
- **The host** rewrites every path to `/index.html`, so a deep link or a reload on
  `/polls/demo-1` reaches the router instead of a 404.

Why `*` and not the host's exact origin: these are public, credential-less static files, and a
wildcard keeps `serve.json` identical across environments. If cookies or credentials ever cross
this boundary, the wildcard has to go.

Why `serve` rather than `vite preview`: Vite's documentation states `preview` is not meant for
production. `serve` is small, single-purpose, and configured declaratively.

### R9 — Railway deploy

Five services from the same repository:

| Service | Source | Subdomain |
|---|---|---|
| host | `apps/host` | `app.<domain>` |
| poll-list | `apps/poll-list` | `mf-list.<domain>` |
| poll-vote | `apps/poll-vote` | `mf-vote.<domain>` |
| poll-results | `apps/poll-results` | `mf-results.<domain>` |
| api | `services/api` | `api.<domain>` |

`<domain>` is a placeholder until the real domain is filled in.

Every service builds from the **repository root**, not from its app folder, because the apps depend
on `@polls/contracts` and `@polls/tokens` through `workspace:` and those only resolve inside the
workspace. Each service carries a `railway.json` next to its code with:

- build and start commands scoped with `pnpm --filter`,
- `watchPatterns` covering its own folder, `packages/**` and the lockfile, so a change to
  `poll-list` does not redeploy `poll-vote`,
- a healthcheck path.

The API is deployed exactly as it is today — it answers `/health`. Postgres is SPEC 03.

#### Runbook

The deploy is done by hand in the Railway dashboard; this is the checklist.

1. Create a Railway project and connect the GitHub repository.
2. Create the five services from the table above, all from the same repository.
3. For each service, set **Config file path** to its `railway.json` (for example
   `/apps/poll-list/railway.json`). Leave the root directory at the repository root.
4. Deploy the three remotes and the API first. Note each generated URL and check it answers.
5. On the host service, set `POLL_LIST_URL`, `POLL_VOTE_URL` and `POLL_RESULTS_URL` to the remotes'
   public URLs, then deploy the host. These are build-time variables: changing one later requires
   a redeploy of the host.
6. Add the custom domains to each service and create the matching `CNAME` records at the DNS
   provider. Once they resolve, update the host's three variables to the custom domains and
   redeploy the host.

### R10 — Documentation follows the code

- `CLAUDE.md`: the Routing row says React Router v8; the Deploy row mentions `serve`.
- `docs/adr/001-module-federation.md`: status moves from "accepted, not yet validated" to validated,
  and the consequences section is rewritten with what was **observed** — including anything that
  contradicts what was expected.
- `README.md`: milestone 02 marked done, and how to run the four frontends locally.

## Dependencies added

Listed here so that approving this spec is approving the dependency list (working agreement 5).
Versions are the latest at the time of writing; the exact resolution is recorded in the lockfile.

| Package | Version | Used by | Why |
|---|---|---|---|
| `vite` | 8.3 | all four frontends | Bundler (fixed stack) |
| `@module-federation/vite` | 1.21 | all four frontends | Federation (ADR-001) |
| `@vitejs/plugin-react` | 6.1 | host, poll-list, poll-vote | JSX and fast refresh |
| `react`, `react-dom` | 19.3 | host, poll-list, poll-vote | Framework (fixed stack) |
| `@types/react`, `@types/react-dom` | 19.3 | host, poll-list, poll-vote | Types |
| `react-router` | 8.3 | **host only** | Routing (architecture rule 3) |
| `styled-components` | 6.5 | **poll-vote only** | Its styling strategy, and the shared singleton under test |
| `jotai` | 3.0 | **poll-vote only** | Its local state, and the non-shared module under test |
| `serve` | 14.2 | all four frontends | Static serving in production (R8) |

`poll-results` gets only `vite`, `@module-federation/vite` and `serve`.

`playwright-cli` is used to verify this milestone but is a globally installed tool, **not** a
dependency of the repository. Playwright as a repository dependency is SPEC 06.

## Risks

- **Public path of remote chunks.** A remote's chunks must resolve against the remote's own origin,
  not the host's. Depending on the plugin, this needs `base` set per remote. Verified by the
  production criterion, not assumed.
- **A dead remote at boot.** If the federation plugin fetches every remote entry while the host
  initializes, rather than on first `import()`, one unreachable remote could take the whole host
  down before any boundary exists. This is exactly what the resilience criterion checks, locally
  before in production.
- **Timebox.** Per `CLAUDE.md`, no more than two hours fighting `@module-federation/vite`. If the
  Rspack fallback is triggered, work stops and the decision goes back to the user before anything
  is migrated: it changes the fixed stack and ADR-001.

## Acceptance criteria

Local, against the **built and served** apps, not the dev servers:

- [ ] `pnpm install` runs clean from scratch; `pnpm lint` and `pnpm typecheck` run clean.
- [ ] `curl -I` on a remote's `remoteEntry.js` **and on one of its chunks** returns
      `Access-Control-Allow-Origin`.
- [ ] `curl` on the host's `/polls/demo-1` returns `index.html`.
- [ ] The host renders all three remotes, and the network log shows each one loaded from its own
      port.
- [ ] **Replay across bundles:** clicking the button in `poll-list`, then navigating to
      `/polls/demo-1`, shows `demo-1` in `poll-vote` — which mounted after the event was emitted,
      from a separately built bundle.
- [ ] **No listener leaks:** the number of listeners on `window` (read through the Chrome DevTools
      Protocol, `DOMDebugger.getEventListeners`) is the same after 20 round trips between `/` and
      `/polls/demo-1` as after the first one.
- [ ] **The leak check can fail:** with one remote's cleanup deliberately removed, the same
      procedure shows the count growing. Cleanup restored afterwards.
- [ ] **Resilience:** with one remote's server stopped, the host still loads, shows the fallback
      naming that remote, and the other remotes keep working. Also checked by blocking only that
      remote's `remoteEntry.js` at the network layer.
- [ ] `apps/poll-results/dist` contains no React.
- [ ] In `poll-vote`'s build, `styled-components` is resolved through federation's shared scope and
      `jotai` is bundled locally.
- [ ] No remote imports `react-router` (checked by search over `apps/poll-*`).
- [ ] The Biome app boundary still holds with real code in the apps: a deliberately written
      cross-app import fails with the expected message.

Production:

- [ ] `curl -I` on each remote's subdomain returns the CORS header.
- [ ] `https://app.<domain>` loads the three remotes from their own subdomains.
- [ ] A deep link to `https://app.<domain>/polls/demo-1` loads without a 404.
- [ ] Stopping one remote's service in Railway leaves the app alive, showing the fallback.
- [ ] `https://api.<domain>/health` answers.
- [ ] ADR-001, `CLAUDE.md` and the README reflect what was observed.

## Out of scope

Real content, definitive styles, data from the API, the host listening to `poll:selected` and
navigating (SPEC 04 R14), the theme toggle (SPEC 05), a runtime `remotes.json`, Playwright as a
repository dependency and automated tests (SPEC 06), CI, preview environments per branch.

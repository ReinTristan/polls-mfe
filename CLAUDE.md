# CLAUDE.md

Operating instructions for this repository. Read this before touching anything.

## Context

Microfrontend architecture PoC for a polling system. One host plus three federated remotes, a
pnpm monorepo, and a Fastify backend. Built as an architecture exercise, not as a product —
decisions are meant to be defensible, not merely functional.

## Working agreement

These are about *how* we work, not about the code. They override convenience.

1. **Never commit, never stage.** Running `git commit` or `git add` is the user's job: the commit
   boundary is where he reviews the work. Leave changes in the working tree and say what is ready.
   Proposing a commit split or drafting messages on request is fine — writing them to git is not.
2. **No milestone gets implemented before its spec exists** as its own extensive file in `specs/`.
3. **If it is not in the spec, it does not get built.** Ask before expanding scope. A good idea
   that nobody asked for is still scope creep.
4. **Verify claims, do not assert them.** Anything stated as working must have been run. A
   boundary that was never tested with a deliberate violation is a decorative boundary.
5. **Ask before adding any dependency.** The dependency list is part of the architecture argument
   here, not an implementation detail.

## Language policy

| Where | Language |
|---|---|
| Everything committed to the repo | **English** |
| `CLAUDE.md`, `specs/`, `docs/adr/`, `README` | English |
| Code comments, identifiers, lint messages, commit messages | English |
| Conversation with the user, plan files, scratch notes | **Spanish** |
| `specs-instructions.md`, `instructions-for-claude.md` | Spanish (never committed) |

Rule of thumb: if a reviewer who was not in the room will read it, it is English.

## Source of truth

- **Official specs** live in `specs/`, one extensive file per milestone (`specs/01-*.md`, …).
- **`specs-instructions.md` and `instructions-for-claude.md` are raw input, not official.** They
  are the initial planning drafts. Use them as a base, but `specs/` and this file win on any
  conflict. They are excluded through `.git/info/exclude` rather than `.gitignore`: the exclusion
  is local to this clone, so it never ships as a line in the published repo. Never stage or commit
  them.

## Fixed stack

| Layer | Decision |
|---|---|
| Package manager | pnpm workspaces |
| Bundler | Vite + `@module-federation/vite` |
| Framework | React 19 |
| Routing | React Router v7, declarative, **host only** |
| Local state | Jotai in `poll-vote`; `useState` in `poll-list` |
| Backend | Fastify + Postgres + `@fastify/websocket` |
| Event bus | **Hand-written** on `CustomEvent`. No library. |
| Lint and formatting | Biome ≥ 2.2 (JS, TS, CSS). **No ESLint, no Prettier, no oxlint.** |
| Testing | Vitest (unit) + Playwright (integration) |
| Deploy | Railway, one module per subdomain |

## Architecture rules (non-negotiable)

1. **A microfrontend never imports code from another microfrontend.** Only `@polls/contracts` and
   `@polls/tokens`. Enforced by Biome's `style/noRestrictedImports` over `apps/**`.
2. **Event flow is unidirectional:** `poll-list` → `poll-vote` → `poll-results`. No microfrontend
   reads another's state.
3. **Pass capabilities, not dependencies.** The host injects `navigate: (to: string) => void`, not
   the `useNavigate` hook. No remote imports `react-router`.
4. **Each microfrontend owns its styling strategy.** Them being different is the point.
5. **Every visual value comes from `@polls/tokens`.** Never hardcode colors, spacing, typography,
   radii or shadows.
6. **`shared: singleton` only for** `react`, `react-dom` and `styled-components`. `jotai`,
   `@polls/contracts` and `@polls/tokens` are **not** shared — every microfrontend carries its own
   copy, deliberately. Sharing the bus as a singleton would reintroduce exactly the coupling rule 9
   exists to prevent.
   *Consequence:* the bus's internal state — the cache behind `on(..., { replay: true })` — lives
   on `globalThis`, not in module scope. With a module-scoped store each copy would keep its own,
   and replay would never cross a microfrontend boundary.
7. **Every mount point is wrapped in an error boundary** with a visible fallback naming the remote
   that failed.
8. **The root `package.json` carries no runtime dependencies.** Shared devDeps and scripts only.
9. **The event bus is hand-written code in `@polls/contracts`**, built on the native `CustomEvent`
   API. Installing `mitt`, `MeBus`, `Postal.js`, `PubSubJS`, RxJS or any other pub/sub library is
   **forbidden**. Adopting a bus as a shared dependency reintroduces the coupling this architecture
   is built to avoid. Documented in ADR-003.
10. **One tool for linting and formatting: Biome.** Do not install ESLint, Prettier or their
    plugins under any circumstance.

## Conventions

- Events are named `domain:action` (`poll:selected`, `vote:cast`).
- Every `on()` returns a cleanup function, and it **must** be used. An `on()` without cleanup is a
  listener leak the moment the host unmounts the remote.
- Mount contract: `mount(el, context) => unmount`.
- Atomic commits with conventional prefixes (`feat:`, `docs:`, `test:`, `chore:`) — written by the
  user, see the working agreement.
- Fixed ports: host 3000, poll-list 3001, poll-vote 3002, poll-results 3003, API 4000.

## Constraints

- No UI libraries. CSS is written by hand.
- No real authentication. A simulated user lives in the host context.
- Fictional data only. No relation to any previous employer's code or data.

## Toolchain notes

Established and verified during SPEC 01. Treat as current facts, not assumptions:

- **Workspace packages are consumed as TypeScript source.** `main` and `types` point at
  `./src/index.ts`; there is no per-package `dist/`. Each Vite app inlines them at build time, so
  HMR crosses the package boundary in dev and only the app's `dist` ships.
- **`services/api` lives in the monorepo for convenience but is managed separately** from the
  frontend. It imports from `@polls/contracts` with `import type` only, so nothing resolves a `.ts`
  file under pnpm's symlink at runtime.
- **Node 24 runs `.ts` directly** via native type stripping. No `tsx`, no build step for the API.
- **`typecheck` is a per-package script** (`tsc --noEmit`) aggregated by
  `pnpm -r --if-present typecheck`. `pnpm -r exec` does not support `--if-present`.
- **Biome 2.5 deprecated `linter.rules.recommended`** in favor of `linter.rules.preset`. Run
  `biome migrate` rather than hand-editing when the schema shifts.

## Tooling fallback

If `@module-federation/vite` causes unresolvable problems during the initial plumbing,
**migrate to Rspack** — near-identical config to webpack 5, first-class Module Federation. Do not
spend more than 2 hours fighting Vite.

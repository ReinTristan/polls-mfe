# SPEC 01 — Monorepo foundations

> Status: implemented · Depends on: nothing · Unlocks: SPEC 02

## Objective

Stand up the workspace structure, the two shared packages, and the boundaries between
microfrontends enforced by tooling. **No features.**

The bet this milestone makes is one of ordering: boundaries are installed *before* any code exists
that could violate them, and the event contract and visual tokens are born as a single source of
truth in the first commit. A boundary added once four apps already exist is a negotiation; added
beforehand, it is a precondition.

## Requirements

### R1 — pnpm workspace

`pnpm-workspace.yaml` covering `apps/*`, `packages/*` and `services/*`.

### R2 — Structure

```
apps/host              apps/poll-list      apps/poll-vote      apps/poll-results
packages/contracts     packages/tokens
services/api
docs/adr               specs
```

### R3 — `packages/contracts`

Hand-written on the native `CustomEvent` API, with **zero runtime dependencies**. `mitt`, `MeBus`,
`Postal.js`, `PubSubJS` and RxJS are forbidden — the reasoning goes in ADR-003.

Exposes:

| Symbol | Shape |
|---|---|
| `Events` | `poll:selected` `{ pollId }` · `vote:cast` `{ pollId, optionId, at }` · `results:updated` `{ pollId, tally }` · `session:changed` `{ userId }` · `theme:changed` `{ theme }` |
| `emit<K>(type, detail)` | Stores the value as the latest of its type and dispatches a `CustomEvent` on `window` |
| `on<K>(type, fn, { replay })` | Subscribes and returns a cleanup function; with `replay: true`, invokes immediately with the latest value if one exists |
| `MountFn` | `(el: HTMLElement, ctx: HostContext) => () => void` |
| `HostContext` | `{ pollId: string \| null, theme: 'light' \| 'dark', user: { id: string } \| null, navigate: (to: string) => void }` |

Shape decisions the planning draft left open:

- `vote:cast.at` is an **ISO 8601 string**, not an epoch. It serializes readably in logs and in the
  WebSocket payload of SPEC 03 without conversion.
- `results:updated.tally` is `Record<optionId, number>`. Direct lookup by id, which is how
  `poll-results` consumes it.

### R4 — The replay cache lives on `globalThis`

`@polls/contracts` is **not** part of `shared: singleton` (architecture rule 6): every
microfrontend carries its own copy of the module, exactly like Jotai, and that is deliberate — it
is what keeps the bus from becoming the shared dependency this architecture exists to eliminate.

The consequence is that the bus's state cannot live in module scope:

```
poll-list emits poll:selected  →  stored in the Map belonging to poll-list's copy
poll-vote mounts afterwards    →  reads the Map in ITS copy, which is empty
                               →  on(..., { replay: true }) never fires
```

`emit` survives on its own, because `window.dispatchEvent` is genuinely global. What does not
survive duplication is the cache of last-known values.

So the Map hangs off `globalThis` under a `Symbol.for`, letting the N copies of the module share a
single store. It is the only way out that does not require declaring the bus a singleton.

This is not an optional implementation detail: SPEC 04 R5 mounts `poll-vote` *after* the event was
emitted, and SPEC 06 R1 marks "replay to a late subscriber" as the package's critical test.

### R5 — `packages/tokens`

Exposes `tokens.css` (custom properties under `:root` and `[data-theme="dark"]`) and `index.ts`,
with **a single source of truth**.

That last requirement rules out the naive reading — the same literals sitting in both files, which
is two copies rather than one source. Instead:

- The **values** live only in `tokens.css`.
- `index.ts` exports the **variable names**: `tokens.color.bg === 'var(--polls-color-bg)'`.

Beyond being genuinely single-source, this is what makes SPEC 05 R1 possible. If the JS object held
literal hex values, styled-components would bake the light-theme value into the class it generates,
and the theme toggle could not change it without a reload. By emitting `var(--polls-color-bg)`, a
change of `data-theme` propagates through custom property inheritance — live, no reload, across all
three microfrontends at once regardless of their styling strategy.

### R6 — Biome as the single tool

Biome ≥ 2.2 for JS, TS **and CSS**. Do not install ESLint or Prettier under any circumstance.
`biome.json` at the root; should a package ever need its own config, use a nested config with
`"root": false`.

### R7 — App boundary enforced by lint

Via `style/noRestrictedImports` and the `patterns` option (available since Biome 2.2). The rule
matches the **import string literal**, not the resolved path, so what gets blocked is the *shape*
of the import:

```json
{
  "overrides": [{
    "includes": ["apps/**"],
    "linter": { "rules": { "style": { "noRestrictedImports": {
      "level": "error",
      "options": { "patterns": [{
        "group": ["../../**", "@polls/host", "@polls/poll-*"],
        "message": "Microfrontends communicate only through @polls/contracts and @polls/tokens."
      }]}
    }}}}
  }]
}
```

Why this pattern: inside an app there is never a legitimate reason to climb two levels up from
`src/`, so `../../**` can only mean leaving the app. Sibling package names are blocked in case
someone adds one as a dependency.

### R8 — How workspace packages resolve

`@polls/contracts` and `@polls/tokens` are consumed as **TypeScript source**, with no per-package
`dist/`: `main` and `types` point at `./src/index.ts`.

Each Vite app inlines them into its own bundle at build time, so the outcome is the one we want —
HMR crossing the package boundary in development, `dist` only at deploy — without an intermediate
build step to remember or a package `dist/` that can drift out of sync.

`services/api` lives in the monorepo for convenience (to avoid splitting into multiple repos) but
is managed separately from the frontend, and consumes `@polls/contracts` **through `import type`
only**: those imports are erased at compile time, so Node never tries to resolve a `.ts` file under
pnpm's symlink.

### R9 — Pinned versions

Node in `.nvmrc`, pnpm in `packageManager`. `tsconfig.base.json` at the root, extended by each
package.

### R10 — Root carries no runtime dependencies

The root `package.json` holds shared devDeps and scripts only.

## Acceptance criteria

- [x] `pnpm install` runs clean from scratch.
- [x] `pnpm biome check .` runs clean.
- [x] A cross-app import fails the lint with the expected message. **Verified by writing the
      forbidden import on purpose and confirming Biome reports it** — a boundary that was never
      tested is a decorative boundary. Both shapes are covered: `../../**` and `@polls/poll-*`.
- [x] `packages/contracts` has no `dependencies` block in its `package.json`.
- [x] `packages/tokens` is importable as CSS and as JS from any app.
- [x] No literal visual values outside `tokens.css`.

## Out of scope

Turborepo, publishing to npm, changesets, Vite, React, Module Federation, the ADRs and the tests.
All of that belongs to SPEC 02 and beyond.

## Deferred verification

Replay to a late subscriber **across separate bundles** is not testable until Module Federation
exists in SPEC 02; its unit test is SPEC 06 R1. This milestone delivers the design that makes it
possible, not the proof.

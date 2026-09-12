# ADR-001 — Module Federation over iframes or build-time integration

> Status: **accepted, not yet validated.** SPEC 02 builds it; revisit this file then.
>
> This is a minimal version written during SPEC 1.5, when nothing federated exists yet. The
> consequences below are expected, not observed.

## Context

The host and the three remotes have to be built and deployed independently — one Railway service
per app — and composed in the browser at runtime. Nothing here is shared at build time.

## Decision

Module Federation, through `@module-federation/vite`.

## Alternatives

- **Iframes.** Real isolation for free, and the strongest failure containment. Rejected because
  sharing a theme, a router and a session across frames means rebuilding all of it over
  `postMessage`, and the seams show: focus, scroll, and sizing all become manual work.
- **Build-time integration** (each remote published as an npm package). Simpler tooling and
  type-safe across boundaries, but it puts every deploy back on one pipeline — changing one
  microfrontend means rebuilding and redeploying the host. That defeats the point.
- **Web components only, no federation.** Would work for `poll-results`, but there is still no
  answer for loading the code of an independently deployed app at runtime.

## Consequences

- `react`, `react-dom` and `styled-components` have to be shared singletons, or the page gets two
  Reacts and hooks break.
- Version skew between independently deployed remotes becomes a real failure mode.
- `remoteEntry.js` has to be served with CORS headers from each subdomain.
- A remote being unreachable must not take the host down, which is why every mount point is wrapped
  in an error boundary.
- If `@module-federation/vite` turns out to be unworkable, the fallback is Rspack.

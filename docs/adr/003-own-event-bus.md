# ADR-003 — A hand-written bus on CustomEvent, not MeBus or Postal.js

> Status: **accepted and implemented** in SPEC 01. `packages/contracts` exists and has no runtime
> dependencies. What is still unobserved is replay working across separately built bundles, which
> can only be tested once federation exists in SPEC 02.

## Context

The microfrontends must communicate without importing each other, in one direction only:
`poll-list` → `poll-vote` → `poll-results`. They are built separately and mount at different
times, so a subscriber can easily arrive after the event it cares about was already emitted.

## Decision

A bus written by hand in `@polls/contracts`, roughly fifty lines over the native `CustomEvent`
API, with **zero runtime dependencies**. It exposes `emit`, `on`, and the shared types.

`on` always returns a cleanup function, and with `{ replay: true }` it fires immediately with the
last value of that event type if one exists.

## Alternatives

- **mitt, PubSubJS, Postal.js, RxJS.** All of them work, and all of them defeat the purpose. A bus
  adopted as a library becomes a dependency that every microfrontend must agree on: the same
  package, at a compatible version, ideally as a shared singleton. That is precisely the coupling
  this architecture exists to remove, reintroduced through the one module every app is required to
  import. Fifty lines of our own code have no version to agree on.
- **A shared state store** (Redux, Zustand, a Jotai singleton). Would let one app read another's
  state, which rule 2 forbids outright — the flow is meant to be unidirectional, and a readable
  store makes accidental coupling the path of least resistance.
- **Passing callbacks down from the host.** Works, but turns the host into a hub that has to know
  what every remote wants, which is the coupling moved rather than removed.

## Consequences

- `packages/contracts/package.json` has no `dependencies` block, and is not meant to acquire one.
- Because the bus is *not* a shared singleton, every microfrontend bundles its own copy. `emit`
  survives that fine — `window.dispatchEvent` is genuinely global — but the cache of last values
  does not. So it lives on `globalThis` under a `Symbol.for`, letting all copies share one store.
  Without that, `{ replay: true }` would silently do nothing across an app boundary, which is
  exactly the case `poll-vote` depends on.
- No operators, no wildcard subscriptions, no typed filtering beyond what the `Events` interface
  gives. If something like that is ever needed, it gets written, not installed.
- Events are real DOM events, so they show up in browser devtools for free. Debugging the flow
  needs no special tooling.
- The bus is not private. Anything on the page can dispatch a matching `CustomEvent` or listen in.
  For a PoC with no untrusted code on the page, that is an acceptable trade.
- Every `on()` returns a cleanup function that callers must actually use. An unused one is a
  listener leak the moment the host unmounts a remote — and nothing enforces it but review.

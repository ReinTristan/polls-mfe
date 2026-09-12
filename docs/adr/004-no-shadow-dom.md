# ADR-004 — No Shadow DOM

> Status: **accepted, not yet validated.** The remotes get real markup in SPEC 04 and the theming
> layer lands in SPEC 05; revisit this file then.
>
> Minimal version written during SPEC 1.5. The consequences below are expected, not observed.

## Context

Each microfrontend owns its styling strategy, and three different ones share a page. The obvious
worry is that their styles collide.

## Decision

No Shadow DOM. Mount points are plain elements in the light DOM.

## Alternatives

- **A shadow root per mount point.** Real style isolation, but it fights ADR-002: custom properties
  do inherit through a shadow boundary, yet everything else — global focus styles, `@layer`
  ordering, portals, third-party CSS resets — gets harder, and each remote would need its styles
  injected into its own root.
- **Iframes.** Already rejected in ADR-001, for stronger reasons.

## Consequences

- Style isolation is a matter of discipline, not of the platform. Collisions are prevented by every
  visual value coming from `@polls/tokens` and by each app scoping its own class names.
- The theming contract from ADR-002 stays simple: one `data-theme` attribute on an ancestor, and
  inheritance does the rest.
- Focus management, keyboard navigation and anything that needs to escape its container (dropdowns,
  dialogs) stay straightforward.
- If a real collision shows up in SPEC 04 or 05, this decision is the first one to revisit.

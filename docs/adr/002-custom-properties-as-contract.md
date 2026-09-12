# ADR-002 — Custom properties as the contract, not global CSS

> Status: **accepted and implemented** in SPEC 01. `packages/tokens` exists and the argument below
> is built, not hypothetical. What is still unobserved is the live theme toggle, which lands in
> SPEC 05.

## Context

Three microfrontends share a page and each one styles itself differently on purpose — CSS Modules
in `poll-list`, styled-components in `poll-vote`, hand-written CSS in `poll-results`. They still
have to look like one product, and a theme toggle in the host has to change all three at once,
live, without a reload.

So something visual has to be shared. The question is what, exactly, crosses the boundary.

## Decision

The shared thing is a set of **CSS custom properties**, and nothing else. `@polls/tokens` ships:

- `tokens.css` — the values, declared on `:root` and `[data-theme="dark"]`. This is the only place
  a literal color, size, radius or shadow is allowed to appear in the whole repository.
- `index.ts` — the **names**, for anyone styling from JavaScript. `tokens.color.bg` is the string
  `'var(--polls-color-bg)'`, not a hex value.

## Alternatives

- **Ship a global stylesheet with classes.** Every app would depend on the shape of someone else's
  CSS, and renaming a class would be a breaking change across four deploys.
- **A shared JS theme object holding literal values.** This is the one that looks reasonable and
  quietly breaks the feature. styled-components would bake the light-theme hex into the class it
  generates at render time, so flipping `data-theme` would change nothing until a re-render — and
  nothing at all in the app that does not use styled-components.
- **The same literals duplicated in the CSS file and the JS file.** That is two sources of truth
  wearing a trench coat. They drift the first time someone edits one of them.

## Consequences

- The theme toggle is one attribute on an ancestor element. Inheritance does the rest, across all
  three styling strategies at once, with no coordination between the apps and no reload.
- JavaScript consumers receive strings like `var(--polls-color-bg)`, never values. That is the
  point, but it does mean color math in JS is not possible — anything like "this color, 20% darker"
  has to be expressed in CSS or declared as its own token.
- A typo in a variable name fails silently: CSS ignores an unknown `var()` and the property simply
  does not apply. There is no compiler to catch it. This is mitigated by checking that every name
  used in `index.ts` is declared in `tokens.css` — 45 of them, matching one to one.
- Every app can run standalone and still look right, as long as it imports `tokens.css` itself.

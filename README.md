# Polls MFE

A microfrontend proof of concept: one host app plus three smaller apps that are built and deployed
on their own, then stitched together in the browser with Module Federation. It is a polling app —
you pick a poll, vote, and watch the results move.

This was built to try out the architecture, not to ship a product.

> **Work in progress.** Only the foundations are here so far: the workspace, the shared packages,
> and the rules that keep the apps from reaching into each other. The full README — with diagrams,
> a demo, and the reasoning behind each choice — is milestone 6.

## Where it's at

| Milestone | What it covers | State |
|---|---|---|
| 01 | Monorepo foundations | Done |
| 1.5 | README, ADRs, license | Done |
| 02 | Federation wiring and first deploy | Next |
| 03 | API | Not started |
| 04 | Features in each app | Not started |
| 05 | CSS, theming, responsive | Not started |
| 06 | Tests and write-up | Not started |

## What's in here

```
apps/host           the shell that loads the other three
apps/poll-list      pick a poll
apps/poll-vote      cast a vote
apps/poll-results   watch the results
packages/contracts  the event bus and the shared types
packages/tokens     every color, size and font, in one place
services/api        the Fastify backend
```

Only `packages/` and `services/api` have code right now. The four apps are folders with a
`package.json` and nothing else — they get filled in during milestone 2.

## Running it

You need Node 24 and pnpm 11. Both are pinned, in `.nvmrc` and in `packageManager`.

```bash
pnpm install
pnpm biome check .    # lint and formatting, one tool for JS, TS, JSON and CSS
pnpm typecheck
```

To start the backend:

```bash
pnpm --filter @polls/api dev
```

It answers at `http://localhost:4000/health`. There is nothing to look at in a browser yet — that
starts in milestone 2.

## The one rule worth knowing

The three small apps never import each other. They only talk through `@polls/contracts`, and they
only get their colors and sizes from `@polls/tokens`. This is not on the honor system: Biome fails
the lint if an app tries to import from a sibling.

## Where the decisions are written down

- `specs/` — one file per milestone, written before the code it describes
- `docs/adr/` — why the bigger calls were made, and what was given up
- `CLAUDE.md` — the rules the code has to follow

## License

MIT. See [LICENSE](LICENSE).

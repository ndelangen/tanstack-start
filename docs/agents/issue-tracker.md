# Issue tracker: GitHub

Issues and specs for this repo live as GitHub issues. Use the `gh` CLI for all operations and infer `ndelangen/dunezone` from the configured remote.

## Conventions

- Create, read, comment on, label, and close issues with `gh issue`.
- Pull requests are not a triage request surface.
- When a skill says to publish something to the issue tracker, create a GitHub issue.
- When a skill names a ticket, fetch it with `gh issue view <number> --comments`.

## Wayfinding operations

- A Wayfinder map is an issue labelled `wayfinder:map`.
- Decision tickets are child issues labelled `wayfinder:research`, `wayfinder:prototype`, `wayfinder:grilling`, or `wayfinder:task`.
- Use GitHub sub-issues for map membership, falling back to a map task list only when sub-issues are unavailable.
- Use GitHub's native issue dependencies for blocking relationships, falling back to a `Blocked by:` line only when dependencies are unavailable.
- Claim a ticket by assigning it to the current GitHub user before beginning work.
- Resolve a ticket by posting its answer, closing it, and adding a linked gist of the decision to the map.
- The frontier consists of open, unassigned child tickets with no open blockers.

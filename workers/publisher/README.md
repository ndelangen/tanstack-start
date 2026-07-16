# Disabled production faction-sheet publisher

This is the production-shaped, one-item publisher surface. It is checked in inert and unprovisioned:

- `PUBLISHER_ENABLED` and `CRON_DISPATCH_ENABLED` are `false`;
- the Cron trigger list is empty;
- Queue and R2 names are deliberately unprovisioned placeholders;
- Convex and capture hosts use the reserved `.invalid` domain;
- estimated R2 inventory has no observation time, so writes fail closed;
- poll and executor secrets are distinct required bindings and are not checked in.

The Queue payload is only `{ schemaVersion, scheduledCutoff, triggerId }`. Convex owns all batch,
claim, retry, snapshot, publication, and Browser reservation state. R2 metadata is diagnostic only.
The 480-second work deadline cannot be extended by phase settings. A separate 30-second
post-lifecycle window may only settle definitely closed Browser usage; it is bounded well inside the
15-minute Queue wall and cannot perform more Browser, R2, or publication work.

The capture shell, HTML, and isolated bundle revalidate the host-only render capability against the
exact Convex snapshot endpoint before serving. Capture diagnostics retain at most an artwork
origin plus a redacted marker, never userinfo, path, query, or fragment data.

The 200 MB unaccounted-write budget covers 96 scheduled one-item attempts per 24-hour inventory
window at the 2 MB PDF ceiling, plus 8 MB margin. Changing the schedule, item maximum, PDF ceiling,
or inventory refresh cadence requires recalculating this guard before activation.

The Worker intentionally has no `limits.cpu_ms` block. Current Queue documentation describes a
30-second default consumer CPU limit, while the real Workers Free proof rejected a custom limit and
successfully measured the actual default at 270 ms CPU for one PDF. Ticket 6 must preserve the
no-custom-limit configuration and re-measure the production one-item path rather than infer a Free
allowance from the generic documentation.

## Local checks

```bash
bun run publisher:types
bun run publisher:typecheck
bun run publisher:test
bun run publisher:assets
bun run publisher:font-regression
bun run publisher:dry-run
bun run publisher:startup
```

Do not deploy this configuration. Ticket 6 must explicitly create/verify the private bucket and
Queue, configure the real hosts and immutable renderer version, supply a fresh estimated-inventory
observation below the 8 GB decimal ceiling with enough room for the configured unaccounted-write
budget, install distinct secrets, verify Browser/Queue/R2 Free
plan guardrails and alerts, deploy inert, run one-item health checks, and only then add the approved
15-minute Cron and activate Convex/Worker configuration in the ordered release workflow.

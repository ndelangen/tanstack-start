# Publisher pre-measurement contract

The Worker remains structurally capped at one item. The telemetry and promotion policy in this
directory are evidence collection and recommendation only; they cannot change execution capacity,
activate publishing, or create a renderer rollout.

## What the Worker records

An owned Queue delivery emits one bounded `asset_publisher_invocation_telemetry` event. It emits a
bounded `asset_publisher_item_telemetry` event only after a real claim. Pre-claim systemic stops
remain invocation outcomes with `claimed: 0` and `failed: 0`. Every event is reconstructed through
an exact per-event output schema; unknown keys, raw claim renderer labels, diagnostics, payloads,
tokens, secrets, session ids, and URLs have no output slot. Only an enumerated failure class is
admitted. Events exceeding 8,192 UTF-8 bytes collapse to a fixed truncation record. They include:

- exact Cloudflare Worker version id/tag/timestamp and the generated capture/PDF renderer digest.
  The digest covers the complete deterministic deployed asset tree, Browser/PDF implementation,
  capture-route/document/snapshot serving closure, and explicit viewport/PDF contract;
- Queue name, message id, attempt, trigger, foreground lane, and SHA-256 batch/claim/session
  correlation hashes (never the underlying tokens or Browser session id);
- acquire, Browser availability, launch attempt, late-launch wait, capture/close, Convex checkpoint,
  R2 HEAD/PUT, and settlement durations. A late launch resolving inside the cleanup fence receives
  exactly one bounded close attempt; an unresolved boundary is reported as
  `late_launch_unresolved_fenced` while retaining the reservation/batch fence and an attached close
  continuation;
- logical Convex/fetch/R2/Cache call counts, PDF bytes/pages/dimensions, named claim,
  last-pre-upload, post-R2, post-completion, and cleanup-start lease margins, their true minimum,
  and bounded outcome/failure class;
- Browser open-to-close time and Worker-observed close outcome, reservation, measured lifecycle
  settlement amount, daily accounted usage after the reservation, and whether settlement succeeded.

The Worker cannot truthfully observe its final platform CPU, runtime wall, isolate memory,
subrequest total, invocation outcome, or authoritative Browser close reason from inside the same
invocation. Those fields remain explicitly `null` with their required provider source. They must
not be inferred from phase timings or logical call counts.

## Ticket 6 production capture

Ticket 6 must measure the final Ticket 5 delivery-enabled Worker under representative public
delivery load and join provider evidence to the structured events by exact Worker version and
bounded Queue correlation fields. Capture per invocation where Cloudflare exposes it and record the
exact aggregation window/quantile where it does not. The evidence set must include:

1. Cloudflare invocation CPU, wall, memory, subrequests, outcome, and any exceeded-resource signal.
2. Browser Run history close reason, open/close duration, active-session count after cleanup, and
   dashboard usage/accounting agreement. `NormalClosure` must come from Browser Run history, not
   the Worker's successful `close()` promise.
3. Queue attempt/action and the existing one-item failure/recovery suite result.
4. Convex/R2 logical counts, phase timings, PDF contract, every named lease checkpoint and its true
   minimum, reservation/settlement, and exact Worker/renderer identity from the structured events.
5. Redirect count or evidence that redirects cannot make the subrequest total uncertain, modeled
   failure-path subrequests, memory trend, projected size-five CPU, close maximum, settlement
   maximum, and one cold Browser launch.

When constructing `PromotionSample` rows, use one bounded unique evidence id and one unique,
monotonic non-negative `windowSequence` per observation, plus one exact Worker/renderer cohort
across full, partial, and failure/recovery invocations. Include every candidate Browser session in
the observed maximum and reservation calculation. The evaluator sorts by `windowSequence` before
applying consecutive-window rollback; caller array order is irrelevant. The ownership failure-suite
result and every correctness value must be literal booleans. Use the safer of CPU maximum and
rolling p99 (or the maximum when the window is too small for a meaningful percentile), memory p99,
maximum wall and subrequests, and the authoritative provider invocation/Browser outcomes. Do not
substitute the Worker's logical counters for provider subrequests. Non-finite, negative, fractional
integer-domain, duplicate-window, oversized-identity, malformed-boolean, or missing measurements
are non-promotable.

The checked-in Ticket 1 observation (270 ms CPU, 9,114 ms wall, 8,170 ms Browser Run, 107,792-byte
PDF, `NormalClosure`) is classified by the policy as useful one-item evidence but insufficient for
promotion: it is not a size-two full batch and lacks memory, subrequest, lease, cleanup,
reservation, failure-recovery, projected-slope, and production ownership/stable-write correctness
measurements. Those correctness fields remain explicitly unknown; Ticket 1 did not prove them.

## Ticket 7 Phase C work still blocked

The additive Convex rollout ledger/state machine, strict operator projection, page-50 discovery,
foreground supersession, and batch-retaining rollout checkpoints are implemented disabled-first.
They do not create or resume a production rollout, raise either runtime cap, or change the fixed
240,000-ms reservation/deadline. Until a separately measured scaling batch supplies the stable
delivery-enabled baseline, do not add or activate:

- an effective maximum above one or multi-item claiming;
- dynamic batch-sized quota admission, weighted foreground/rollout scheduling, or quota borrowing;
- candidate renderer activation or a broad production rollout;
- a dynamic Browser reservation, CPU/memory/subrequest slope, marginal reused-session cost, or any
  claim that batch sizes two through five are safe.

`evaluateBatchPromotion` is pure. It recommends only the next step in `1 -> 2 -> 3 -> 4 -> 5`,
requires the readiness minimum sample count and complete metrics, and returns hold/pause/rollback
when evidence or rollback gates demand it. No caller connects that report to runtime configuration.

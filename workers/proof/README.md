# One-faction-sheet Queue-consumer proof

This is a non-production proof harness for exactly one faction-sheet PDF. Convex remains the sole
durable control plane. The Queue carries only a wake-up signal:

```text
annual inert Cron (temporarily armed for one observation window)
  -> stateless Convex empty/eligible poll
  -> one minimal Queue message
  -> independent Queue consumer invocation
  -> before checkpoint -> one Browser Session -> PDF -> private R2 -> after checkpoint
```

The Queue message contains only `schemaVersion`, `scheduledCutoff`, and diagnostic `triggerId`. It
contains no faction payload, target id, claim, backlog state, or asset authority. This proof has no
publisher schema or durable lease yet. Configuration-level consumer concurrency one plus a bounded
in-process busy/duplicate guard prevent overlapping proof browsers; Ticket 2 replaces that proof
guard with the real Convex lease.

## Local verification

```bash
bun run proof:typecheck
bun run proof:test
bun run proof:assets
bun run proof:browser-regression
bun run proof:dry-run
```

`proof:browser-regression` performs real Chromium checks against fresh proof and Storybook builds.
It verifies corrupt HTTP-200 SVG image/use bodies fail readiness, the print document starts at the
physical page origin, Storybook fonts/images/SVGs settle without HTTP or browser errors, and both PDF
paths produce exactly two 150 mm x 195 mm pages. Every run replaces these ignored reference files and
prints their SHA-256 hashes and source identities:

```text
tmp/asset-publishing-proof/local-proof.pdf
tmp/asset-publishing-proof/storybook-reference.pdf
```

The unit suite also verifies empty versus eligible dispatch, minimal message validation, duplicate
and busy acknowledgement, bounded unexpected-error retry, render timeout, invalid PDF structure, R2
failure, Convex checkpoint failure, and browser cleanup. There is no client-disconnect or Durable
Object evidence path.

For local Wrangler use, copy `.dev.vars.example` to `.dev.vars`, supply a local capture URL, and run
with local Queue support. The authenticated manual HTTP trigger is enqueue-only:

```bash
curl -fsS -X POST \
  'http://127.0.0.1:8787/__proof/enqueue' \
  -H "Authorization: Bearer $PROOF_TRIGGER_TOKEN"
```

The HTTP response is `202`; capture happens later in the Queue consumer invocation.

## Account and superseded-proof preflight

Do not run these commands while preparing or reviewing code. They are the deployment operator's
future runbook.

```bash
bunx wrangler whoami
export CLOUDFLARE_ACCOUNT_ID='<account id printed by wrangler whoami>'
```

The obsolete Durable Object Worker and namespace have already been deleted. The official namespace
API returned an empty list. Do not add a deletion migration: this Worker config intentionally has no
`durable_objects` or `migrations` block. Before deployment, re-check the account and stop if any old
`FactionSheetProof` namespace or Durable Object binding has reappeared.

The retained private Standard bucket is deliberately reused:

```bash
bunx wrangler r2 bucket info tanstack-start-asset-publisher-proof --json
bunx wrangler r2 bucket dev-url get tanstack-start-asset-publisher-proof
bunx wrangler r2 bucket domain list tanstack-start-asset-publisher-proof
```

Expected: the bucket exists, its `r2.dev` URL is disabled, and it has no custom domain. Delete the
old `proof/faction-sheet.pdf` object before collecting new evidence if it still exists. Do not delete
the bucket.

Create exactly one Queue before deploying the Worker:

```bash
bunx wrangler queues create faction-sheet-one-pdf-proof
bunx wrangler queues list
```

The checked config binds that Queue as producer `PROOF_QUEUE` and consumer with batch size one,
consumer concurrency one, two retries, and a 60-second retry delay. It explicitly requests
`limits.cpu_ms: 300000` so the Free-account proof does not accidentally measure only the default
30-second Queue CPU limit. The checked Cron is the inert annual `0 0 1 1 *` schedule.

## Production Convex proof endpoints

The proof uses only two stateless, secret-gated endpoints on the existing DuneGen production
deployment. They have no database, schema, query, mutation, scheduler, or storage access.

```bash
export CONVEX_PROOF_URL='https://exuberant-finch-263.eu-west-1.convex.site/asset-publishing/proof/checkpoint'
export CONVEX_PROOF_ELIGIBILITY_URL='https://exuberant-finch-263.eu-west-1.convex.site/asset-publishing/proof/eligibility'
test "$(bunx convex dashboard --prod --no-open)" = \
  'https://dashboard.convex.dev/d/exuberant-finch-263'
```

Use local Convex OAuth, never a deploy key. A local production dry-run is a read-only review gate;
require no schema or index change:

```bash
test -z "${CONVEX_DEPLOY_KEY:-}" || { echo 'Refusing a deploy key' >&2; exit 1; }
bunx convex deploy --dry-run --verbose
```

Do not deploy production Convex functions from this workstation. The reviewed change must merge to
`main`, then the repository's existing **Deploy production** GitHub Actions workflow must deploy the
Convex functions and pass. Record the merge commit and successful workflow run before any Cloudflare
proof deployment. The ordered release remains GitHub-Actions-controlled; do not enable an independent
Cloudflare Git auto-deploy.

Create one scoped secret and initially force the eligibility endpoint to `empty`:

```bash
export CONVEX_PROOF_TOKEN="$(openssl rand -hex 32)"
printf '%s' "$CONVEX_PROOF_TOKEN" \
  | bunx convex env set ASSET_PUBLISHING_PROOF_SECRET --prod
printf '%s' 'empty' \
  | bunx convex env set ASSET_PUBLISHING_PROOF_ELIGIBILITY --prod
```

Cloudflare receives only the endpoint URLs and matching proof token. Never provide it a
`CONVEX_DEPLOY_KEY`, `CONVEX_DEPLOYMENT`, app auth secret, or general database credential.

## Build and deploy with the annual Cron

```bash
export PROOF_CAPTURE_TOKEN="$(openssl rand -hex 32)"
export PROOF_TRIGGER_TOKEN="$(openssl rand -hex 32)"
export PROOF_SECRETS_FILE="$(mktemp)"
chmod 600 "$PROOF_SECRETS_FILE"
printf 'PROOF_CAPTURE_TOKEN=%s\nPROOF_TRIGGER_TOKEN=%s\nCONVEX_PROOF_TOKEN=%s\n' \
  "$PROOF_CAPTURE_TOKEN" "$PROOF_TRIGGER_TOKEN" "$CONVEX_PROOF_TOKEN" \
  > "$PROOF_SECRETS_FILE"

bun run proof:assets
bun run proof:typecheck
bun run proof:test
bun run proof:dry-run
```

The dry-run must list `CPU Time: 300000 ms` or otherwise show that `limits.cpu_ms: 300000` was
accepted. The real Workers Free deploy must also accept that limit. If Wrangler or Cloudflare rejects
it for the Free account, stop and record NO-GO; do not fall back to an accidental 30-second test.

The first deployment keeps the annual Cron and uses a placeholder only to discover the workers.dev
origin. It must not invoke Browser Run:

```bash
bunx wrangler deploy \
  --config workers/proof/wrangler.jsonc \
  --secrets-file "$PROOF_SECRETS_FILE" \
  --triggers '0 0 1 1 *' \
  --var PROOF_CAPTURE_URL:'https://bootstrap.invalid/capture/proof/faction-sheet' \
  --var PROOF_FAILURE_MODE:none \
  --var PROOF_RENDER_TIMEOUT_MS:45000

export WORKER_URL='https://faction-sheet-one-pdf-proof.<workers-dev-subdomain>.workers.dev'

bunx wrangler deploy \
  --config workers/proof/wrangler.jsonc \
  --secrets-file "$PROOF_SECRETS_FILE" \
  --triggers '0 0 1 1 *' \
  --var PROOF_CAPTURE_URL:"$WORKER_URL/capture/proof/faction-sheet" \
  --var PROOF_FAILURE_MODE:none \
  --var PROOF_RENDER_TIMEOUT_MS:45000

rm -f "$PROOF_SECRETS_FILE"
unset PROOF_SECRETS_FILE
```

Do not arm a frequent Cron until the manual Queue proof succeeds.

`PROOF_RENDER_TIMEOUT_MS=45000` is one end-to-end Browser capture deadline covering Browser launch,
navigation, readiness, bounds validation, PDF generation, and parsing. It is not reset per phase.
On expiry the consumer immediately starts context/browser closure, waits at most 15 seconds for
cleanup, records `closed`, `error`, or `cleanup_timed_out`, checkpoints failure, and acknowledges the
ordinary handled failure. Code rejects a deadline above six minutes, leaving at least 1 minute 45
seconds including cleanup before the future eight-minute production soft budget and far more before
the Queue's 15-minute wall limit.

## Manual Queue message first

Start a tail before sending anything:

```bash
bunx wrangler tail faction-sheet-one-pdf-proof --format json \
  | tee /tmp/faction-sheet-queue-proof-tail.jsonl
```

Send one explicit minimal message through the authenticated enqueue-only producer endpoint. The
installed Wrangler CLI does not expose a direct Queue-message command:

```bash
export PROOF_TRIGGER_ID="$(uuidgen | tr '[:upper:]' '[:lower:]')"
export PROOF_CUTOFF="$(date -u +%Y-%m-%dT%H:%M:%S.000Z)"
export PROOF_MESSAGE="$(printf \
  '{\"schemaVersion\":1,\"scheduledCutoff\":\"%s\",\"triggerId\":\"%s\"}' \
  "$PROOF_CUTOFF" "$PROOF_TRIGGER_ID")"
curl -fsS -X POST "$WORKER_URL/__proof/enqueue" \
  -H "Authorization: Bearer $PROOF_TRIGGER_TOKEN" \
  -H 'Content-Type: application/json' \
  --data "$PROOF_MESSAGE"
```

The endpoint validates and enqueues that message; it never captures inline. An empty request body is
also allowed and generates a fresh cutoff and trigger id.

Require a Queue-consumer log with `action: "ack"`, `reason: "completed"`, attempt metadata, and a
proof report showing:

- `outcome: "success"` and `browserCloseOutcome: "closed"`;
- exactly two pages within 0.5 mm of `150 x 195`;
- one R2 operation and two correlated Convex calls;
- finite before/after Convex latency, PDF bytes, browser duration, and wall duration;
- empty console and request-failure arrays.

Download through authenticated Wrangler access into the same ignored comparison directory:

```bash
mkdir -p tmp/asset-publishing-proof
bunx wrangler r2 object get \
  tanstack-start-asset-publisher-proof/proof/faction-sheet.pdf \
  --remote --file=tmp/asset-publishing-proof/deployed-queue-proof.pdf
pdfinfo tmp/asset-publishing-proof/local-proof.pdf
pdfinfo tmp/asset-publishing-proof/storybook-reference.pdf
pdfinfo tmp/asset-publishing-proof/deployed-queue-proof.pdf
```

Rasterize every source with the identical command and resolution:

```bash
rasterize_pdf() {
  input="$1"
  output="$2"
  mkdir -p "$(dirname "$output")"
  pdftoppm -png -r 150 "$input" "$output"
}
rasterize_pdf tmp/asset-publishing-proof/local-proof.pdf \
  tmp/asset-publishing-proof/raster/local-proof/page
rasterize_pdf tmp/asset-publishing-proof/storybook-reference.pdf \
  tmp/asset-publishing-proof/raster/storybook-reference/page
rasterize_pdf tmp/asset-publishing-proof/deployed-queue-proof.pdf \
  tmp/asset-publishing-proof/raster/deployed-queue-proof/page
shasum -a 256 \
  tmp/asset-publishing-proof/local-proof.pdf \
  tmp/asset-publishing-proof/storybook-reference.pdf \
  tmp/asset-publishing-proof/deployed-queue-proof.pdf
```

Record the exact three paths, hashes, reference identities printed by the regression, raster command,
and comparison result. Compare both pages for fonts, artwork, backgrounds, clipping, and physical
size. A verbal comparison without reproducible files and hashes is not accepted evidence.

## Failure and delivery observations

The checked unit tests are the authoritative deterministic coverage for invalid checkpoint,
render-timeout, invalid PDF, R2 failure, Convex failure, duplicate/busy delivery, and bounded retry.
For deployed evidence, use only Queue executions; never restore the old inline HTTP or Durable Object
path.

To observe ordinary render failure, temporarily deploy `PROOF_FAILURE_MODE` as `render_timeout` or
`reporting_error_after_capture`, send one manual Queue message, and then restore `none`. Each handled
failure must log `action: "ack"`, `reason: "failed"`, zero R2 operations, and a closed browser. An
unexpected orchestration throw retries at 60 seconds and is acknowledged as exhausted on attempt
three; ordinary capture/checkpoint outcomes are acknowledged immediately to avoid a retry storm.

Sending the exact same `PROOF_MESSAGE` twice can demonstrate the bounded in-process duplicate guard
when both deliveries reach the same isolate. Treat that as proof-harness evidence only, not durable
deduplication. `max_concurrency: 1` is the account-level overlap fence for this proof; Ticket 2 must
use Convex leases.

## One bounded Cron observation window

Keep the tail running. Run the entire observation from one shell with fail-closed cleanup armed
before changing either control. Cleanup first forces Convex to `empty`, then restores the annual
Cron. The helper verifies the empty endpoint; Cloudflare schedule verification still requires the
dashboard because this Wrangler version has no trigger-list command.

```bash
set -Eeuo pipefail

verify_convex_empty() {
  local trigger_id cutoff response
  trigger_id="$(uuidgen | tr '[:upper:]' '[:lower:]')"
  cutoff="$(date -u +%Y-%m-%dT%H:%M:%S.000Z)"
  response="$(curl -fsS "$CONVEX_PROOF_ELIGIBILITY_URL" \
    -H "Authorization: Bearer $CONVEX_PROOF_TOKEN" \
    -H 'Content-Type: application/json' \
    --data "{\"schemaVersion\":1,\"scheduledCutoff\":\"$cutoff\",\"triggerId\":\"$trigger_id\"}")"
  test "$(printf '%s' "$response" | jq -r '.eligibility')" = 'empty'
}

cleanup_proof_window() {
  set_and_verify_empty || {
    printf '%s\n' \
      'UNVERIFIED CLEANUP: eligibility could not be proven empty.' \
      'Do not restore or continue the observation; recover manually and record NO-GO.' >&2
    return 1
  }
  bunx wrangler triggers deploy \
    --name faction-sheet-one-pdf-proof \
    --triggers '0 0 1 1 *' || {
    printf '%s\n' \
      'UNVERIFIED CLEANUP: eligibility is empty, but annual Cron restoration failed.' \
      'Recover manually and record NO-GO.' >&2
    return 1
  }
  printf '%s\n' \
    'Cleanup submitted. Allow up to 15 minutes for trigger propagation.' \
    'Do not call cleanup complete until the Cloudflare dashboard shows only 0 0 1 1 *' \
    'and the tail shows no further frequent-trigger invocation after propagation.'
}

set_and_verify_empty() {
  printf '%s' 'empty' \
    | bunx convex env set ASSET_PUBLISHING_PROOF_ELIGIBILITY --prod
  verify_convex_empty
}

cleanup_verified=0
cleanup_on_exit() {
  local original_status="$?"
  trap - EXIT HUP INT TERM
  if test "$cleanup_verified" != '1'; then
    if ! cleanup_proof_window; then
      printf '%s\n' \
        'FAIL-CLOSED: automatic cleanup failed; this observation is unverified/NO-GO.' \
        'Perform manual recovery before any further proof work.' >&2
    else
      printf '%s\n' \
        'FAIL-CLOSED: cleanup commands ran, but propagation was not verified.' \
        'This observation remains unverified/NO-GO until manual dashboard/tail verification.' >&2
    fi
    exit 97
  fi
  exit "$original_status"
}
trap cleanup_on_exit EXIT
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM

set_and_verify_empty

bunx wrangler triggers deploy \
  --name faction-sheet-one-pdf-proof \
  --triggers '*/15 * * * *'
```

Allow up to 15 minutes for the schedule change to propagate. Verify the Cloudflare dashboard shows
only `*/15 * * * *`. The empty firing must log `result: "empty"` and show no Queue send, browser
invocation, R2 operation, or Convex checkpoint write. Then switch only the stateless proof mode:

```bash
printf '%s' 'eligible' \
  | bunx convex env set ASSET_PUBLISHING_PROOF_ELIGIBILITY --prod
```

Observe the **FIRST** `result: "enqueued"` dispatch log. Before waiting for or inspecting the Queue
consumer, immediately disable and verify eligibility:

```bash
set_and_verify_empty
```

Only after that command succeeds may you correlate the separate Queue-consumer invocation by
`triggerId` and wait for one successful PDF. A failure to set or verify `empty` is immediate
unverified/NO-GO and requires manual recovery; do not continue waiting as if the observation were
safe. After the consumer result is recorded, restore the annual Cron through the ordered cleanup:

```bash
cleanup_proof_window
```

Allow up to 15 minutes for restoration to propagate. Confirm the eligibility probe is `empty`, the
Cloudflare dashboard shows only `0 0 1 1 *`, and no further frequent invocation appears after the
propagation window. Only then run `trap - EXIT HUP INT TERM` and record cleanup complete. If the
shell is interrupted earlier, the EXIT/signal trap attempts the same ordered cleanup and exits 97;
it never swallows failure or marks the run safe. Once the manual propagation checks pass, finish with:

```bash
cleanup_verified=1
trap - EXIT HUP INT TERM
```

An unverified cleanup attempt is not cleanup completion.

If the poll or Queue send fails, the Cron logs the error and performs no browser work. Convex remains
authoritative; the later Cron is the retry.

## Free-tier GO / NO-GO gate

Use Workers Logs/Metrics for the Queue consumer invocation, not the producer Cron, to record CPU,
wall time, memory, subrequests, retry/ack result, and exceeded-resource status. Correlate Browser Run
session duration, daily browser usage, PDF bytes, R2 operations, and Convex checkpoint latencies from
the structured report, Browser Runs dashboard, R2 analytics, and Worker metrics.

```text
Decision: GO | NO-GO
Empty Cron CPU / outcome / Queue sends:
Eligible Cron CPU / outcome / Queue sends:
Queue consumer CPU / wall / memory / subrequests / exceededCpu:
300000 ms CPU limit deploy acceptance / rejection:
Queue message attempts / ack-or-retry result:
Browser Session duration / close outcome / daily usage:
PDF bytes / pages / physical size / visual comparison:
R2 operations / object verification:
Convex before+after latency:
Failure-mode outcomes:
Unexpected console or network errors:
Reason and follow-up:
```

GO requires Cloudflare to accept the explicit 300000 ms limit and the independent Queue consumer to
complete reliably on the actual Workers Free account without `exceededCpu` and with comfortable
measured margin. A rejected limit, accidental default-30-second deployment, exceeded-resource result,
unreadable or incorrectly sized PDF, unclosed browser, bytes passing through Convex, false success,
unverified Cron cleanup, or unclear consumer metrics is NO-GO and returns to technical planning. Do
not proceed to Ticket 2 and do not silently reintroduce Durable Objects.

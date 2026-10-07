# Cloud cost defaults

Apply to new projects and changes to Convex, Trigger.dev and R2.

## Convex

- Identify the actual live deployment, including deployments labelled dev. Reuse the appropriate team with isolated app projects; never pause a deployment from its label alone.
- Use indexed, bounded queries and pagination. Avoid frequent full-table or long-history reads in polling loops. Reconcile changed records incrementally with a verified recovery path; preserve coverage and correctness.
- Scope dashboard subscriptions to visible data. Materialize expensive aggregates with explicit invalidation and freshness requirements; verify the existing cached path before adding more caching.
- Measure database ingress/egress by function and project. Capture comparable production measurements before and after changes. Use the real billing period and allowances; calendar usage is not an invoice.
- Preserve backups, security, audit and consistency guarantees. Preserve approved plans and caps.

## Trigger.dev

- Use one authoritative schedule per task. Require configuration and credentials before enabling dispatch. Permanent configuration/authentication failures should stop retries and signal an actionable incident; transient failures use bounded backoff and measured timeouts.
- Use supported checkpointed waits or callbacks for long waits rather than holding execution open. Verify replay, cancellation and idempotency before changing execution paths.
- Keep reconciliation and provider cleanup working. Repair failing reapers and check actual active capacity; disabling cleanup can increase provider bills.
- Preserve polling latency and fallback coverage. Small scheduler savings do not justify slowing customer workflows or dropping recovery.
- Baseline billable production usage across the organization, including failures and duplicate legacy schedules. Record API retention windows and invoice credits/base fees separately. Preserve spend controls.

## Cloudflare R2

- Keep finished output in the requesting app's bucket with its verified hash and receipt. Preserve originals, required weights, immutable runtimes, provenance and qualification assets.
- Assign disposable scratch/diagnostic objects explicit prefixes and agreed retention at creation. Expire only proven disposable prefixes; never blanket-expire app buckets.
- Enable/read back incomplete multipart cleanup while preserving existing lifecycle rules. Check pending-upload metrics before diagnosing a multipart leak.
- Measure stored bytes and operation classes. Evaluate retrieval fees and minimum retention before Infrequent Access migration. Cross-app deduplication must preserve isolation and verified dependencies.

## Completion

Record the actual account/project inventory, billing period, before/after usage and production verification. Separate estimates, invoiced charges and realized savings. Account changes, destructive cleanup and new paid capacity retain their existing authorization gates.


## CI source guard

Run `npm run check:cloud-cost` before deployment. The guard catches unindexed registered Convex query scans and minute Vercel crons. Document real bounded-cardinality/frequency exceptions using `@cloud-cost allow-full-scan: <evidence>` inside the declaration; preserve indexed date/range limits and pagination. Passing this source guard does not prove billing, runtime retention or latency compliance. Preserve all model and visual-quality checks.

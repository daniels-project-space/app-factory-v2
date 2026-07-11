"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import type { Doc, Id } from "@/../convex/_generated/dataModel";
import { STAGES, money, timeAgo } from "@/lib/format";
import {
  EmptyState,
  OriginBadge,
  SectionHeader,
  StageLed,
  stateLabel,
  useNow,
} from "@/components/ui";

/* ── pending approvals: Daniel's main lever ─────────────────────────────── */

function ApprovalCard({
  approval,
  app,
}: {
  approval: Doc<"approvals">;
  app?: Doc<"apps">;
}) {
  const decide = useMutation(api.intake.decideApproval);
  const [note, setNote] = useState("");
  const [showContext, setShowContext] = useState(false);
  const [busy, setBusy] = useState(false);

  const act = async (approve: boolean) => {
    setBusy(true);
    try {
      await decide({
        id: approval._id,
        approve,
        note: note.trim() || undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="panel panel-ticks p-3 sm:p-4 flex flex-col gap-2 min-w-0">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="led led-waiting" />
        {app ? (
          <Link
            href={`/apps/${app.slug}`}
            className="font-display font-bold uppercase tracking-wide text-[15px] text-ink hover:text-amber-hot"
          >
            {app.name}
          </Link>
        ) : (
          <span className="font-display font-bold text-[15px]">app</span>
        )}
        <span className="font-mono text-[10px] uppercase tracking-widest text-amber border border-amber/40 px-1.5 py-[1px]">
          {approval.stage} gate
        </span>
      </div>
      <p className="text-[13px] text-ink leading-snug">{approval.question}</p>
      {approval.context && (
        <div>
          <button
            onClick={() => setShowContext((s) => !s)}
            className="microlabel hover:text-amber cursor-pointer"
          >
            {showContext ? "− hide context" : "+ context"}
          </button>
          {showContext && (
            <pre className="mt-1 max-h-40 overflow-auto border border-line bg-void p-2 font-mono text-[11px] text-ink-dim whitespace-pre-wrap">
              {approval.context}
            </pre>
          )}
        </div>
      )}
      <input
        className="field"
        placeholder="optional note (rejection note becomes a P1 issue)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <div className="flex gap-2">
        <button
          className="btn btn-hot flex-1"
          disabled={busy}
          onClick={() => act(true)}
        >
          Approve
        </button>
        <button
          className="btn btn-danger flex-1"
          disabled={busy}
          onClick={() => act(false)}
        >
          Reject
        </button>
      </div>
    </div>
  );
}

function ApprovalsStrip({ apps }: { apps: Doc<"apps">[] | undefined }) {
  const approvals = useQuery(api.intake.pendingApprovals);
  const byId = new Map<Id<"apps">, Doc<"apps">>(
    (apps ?? []).map((a) => [a._id, a]),
  );

  if (approvals === undefined) return null;
  if (approvals.length === 0) {
    return (
      <div className="mb-4 flex items-center gap-2 border border-line px-3 py-2">
        <span className="led led-ok" />
        <span className="microlabel">Gate clear — no pending approvals</span>
      </div>
    );
  }

  return (
    <section className="mb-5">
      <div className="hazard h-[6px]" />
      <div className="border border-t-0 border-amber/40 bg-amber/[0.04] p-3 sm:p-4">
        <div className="mb-3 flex items-center gap-2">
          <span className="font-display font-bold uppercase tracking-[0.14em] text-[14px] text-amber">
            Awaiting your call
          </span>
          <span className="font-mono text-[11px] text-void bg-amber px-1.5 font-semibold">
            {approvals.length}
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {approvals.map((a) => (
            <ApprovalCard key={a._id} approval={a} app={byId.get(a.appId)} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── pipeline board ─────────────────────────────────────────────────────── */

function AppCard({ app }: { app: Doc<"apps"> }) {
  const label = stateLabel(app.stageState, app.status);
  const edge =
    label === "failed"
      ? "border-red/50"
      : label === "waiting"
        ? "border-amber/50"
        : label === "running"
          ? "border-line-bright"
          : "border-line";
  return (
    <Link
      href={`/apps/${app.slug}`}
      className={`panel block border ${edge} p-2.5 hover:border-amber/70 transition-colors group`}
    >
      <div className="font-display font-bold uppercase tracking-wide text-[13px] leading-tight text-ink group-hover:text-amber-hot">
        {app.name}
      </div>
      <div className="mt-1 text-[11px] leading-snug text-ink-dim line-clamp-2">
        {app.oneLiner}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <OriginBadge origin={app.origin} />
        <span className="ml-auto flex items-center gap-1.5">
          {app.buildRound > 0 && (
            <span className="font-mono text-[9px] text-ink-faint">
              R{app.buildRound}
            </span>
          )}
          <StageLed stageState={app.stageState} status={app.status} />
          <span
            className={`font-mono text-[9px] uppercase tracking-widest ${
              label === "failed"
                ? "text-red"
                : label === "running" || label === "waiting"
                  ? "text-amber"
                  : label === "shipped" || label === "approved"
                    ? "text-green"
                    : "text-ink-faint"
            }`}
          >
            {label}
          </span>
        </span>
      </div>
    </Link>
  );
}

function PipelineBoard({ apps }: { apps: Doc<"apps">[] | undefined }) {
  if (apps === undefined) {
    return (
      <div className="microlabel animate-pulse px-1 py-8">
        Connecting to the line…
      </div>
    );
  }
  const grouped = STAGES.map((stage, i) => ({
    stage,
    index: String(i + 1).padStart(2, "0"),
    apps: apps.filter((a) => a.stage === stage && a.status !== "archived"),
  }));

  if (apps.length === 0) {
    return (
      <EmptyState
        label="Line idle — no apps in the pipeline"
        hint="feed an idea at /ideas to start the machine"
      />
    );
  }

  return (
    <div className="-mx-3 overflow-x-auto px-3 pb-2 sm:mx-0 sm:px-0">
      <div className="flex gap-2 min-w-max">
        {grouped.map((col) => (
          <div key={col.stage} className="w-[218px] shrink-0">
            <div className="mb-2 flex items-baseline gap-2 border-b-2 border-line pb-1.5">
              <span className="font-mono text-[10px] text-amber">
                {col.index}
              </span>
              <span className="font-display font-semibold uppercase tracking-[0.14em] text-[12px] text-ink">
                {col.stage}
              </span>
              <span className="ml-auto font-mono text-[10px] text-ink-faint">
                {col.apps.length || "·"}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {col.apps.map((a) => (
                <AppCard key={a._id} app={a} />
              ))}
              {col.apps.length === 0 && (
                <div className="border border-dashed border-line/70 py-5 text-center font-mono text-[10px] text-ink-faint">
                  empty
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── live activity feed ─────────────────────────────────────────────────── */

const KIND_COLOR: Record<string, string> = {
  stage_failed: "text-red",
  gate_failed: "text-red",
  rejected: "text-red",
  approved: "text-green",
  stage_done: "text-green",
  demo_updated: "text-blue",
  app_created: "text-amber",
  forge_approved: "text-blue",
  daniel_request: "text-amber",
};

function ActivityFeed({ apps }: { apps: Doc<"apps">[] | undefined }) {
  const events = useQuery(api.pipeline.recentEvents, { limit: 45 });
  const now = useNow();
  const nameById = new Map<Id<"apps">, Doc<"apps">>(
    (apps ?? []).map((a) => [a._id, a]),
  );

  return (
    <aside className="panel p-3 lg:sticky lg:top-[60px] lg:max-h-[calc(100vh-90px)] lg:overflow-y-auto">
      <SectionHeader
        title="Live feed"
        right={<span className="led led-running" />}
      />
      {events === undefined && (
        <div className="microlabel animate-pulse py-4">Tuning in…</div>
      )}
      {events?.length === 0 && (
        <EmptyState label="No activity yet" hint="events stream in here live" />
      )}
      <ol className="flex flex-col">
        {events?.map((e) => {
          const app = e.appId ? nameById.get(e.appId) : undefined;
          return (
            <li
              key={e._id}
              className="feed-in border-b border-line/60 py-2 last:border-0"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`font-mono text-[9px] uppercase tracking-widest ${KIND_COLOR[e.kind] ?? "text-ink-dim"}`}
                >
                  {e.kind.replace(/_/g, " ")}
                </span>
                <span className="ml-auto font-mono text-[9px] text-ink-faint whitespace-nowrap">
                  {timeAgo(e.ts, now)}
                </span>
              </div>
              <div className="mt-0.5 text-[11px] leading-snug text-ink-dim">
                {app && (
                  <Link
                    href={`/apps/${app.slug}`}
                    className="text-ink hover:text-amber font-medium"
                  >
                    {app.name}
                  </Link>
                )}{" "}
                {e.message}
              </div>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}

/* ── page ───────────────────────────────────────────────────────────────── */

export default function Dashboard() {
  const apps = useQuery(api.apps.list);
  const settings = useQuery(api.intake.getSettings);

  const counts = {
    active: apps?.filter((a) => a.status === "active" || a.status === "queued")
      .length,
    waiting: apps?.filter((a) => a.status === "waiting_approval").length,
    failed: apps?.filter((a) => a.status === "failed").length,
    shipped: apps?.filter((a) => a.status === "shipped").length,
  };
  const today = new Date().toISOString().slice(0, 10);
  const spent =
    settings && settings.budgetDay === today ? settings.spentTodayUsd : 0;

  return (
    <div>
      {/* mobile-visible stat strip */}
      <div className="mb-4 grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-5">
        {[
          ["In work", counts.active, "text-ink"],
          ["Waiting", counts.waiting, "text-amber"],
          ["Failed", counts.failed, "text-red"],
          ["Shipped", counts.shipped, "text-green"],
        ].map(([label, val, color]) => (
          <div key={label as string} className="bg-panel px-3 py-2">
            <div className="microlabel">{label}</div>
            <div
              className={`font-display font-bold text-[22px] leading-none mt-1 ${color}`}
            >
              {val ?? "–"}
            </div>
          </div>
        ))}
        <div className="bg-panel px-3 py-2 col-span-2 sm:col-span-1">
          <div className="microlabel">Spend today</div>
          <div className="font-display font-bold text-[22px] leading-none mt-1">
            <span className={spent >= (settings?.dailyBudgetUsd ?? Infinity) ? "text-red" : "text-ink"}>
              {money(spent)}
            </span>
            <span className="text-[13px] text-ink-faint font-mono">
              {" "}/ {money(settings?.dailyBudgetUsd ?? 0)}
            </span>
          </div>
        </div>
      </div>

      <ApprovalsStrip apps={apps} />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section className="min-w-0">
          <SectionHeader
            index="//"
            title="Production line"
            right={
              settings && !settings.running ? (
                <span className="font-mono text-[10px] uppercase tracking-widest text-red border border-red/50 px-2 py-0.5">
                  Factory halted
                </span>
              ) : undefined
            }
          />
          <PipelineBoard apps={apps} />
        </section>
        <ActivityFeed apps={apps} />
      </div>
    </div>
  );
}

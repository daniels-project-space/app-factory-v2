"use client";

import Link from "next/link";
import { use, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import type { Doc } from "@/../convex/_generated/dataModel";
import { STAGES, duration, money, timeAgo, tokens } from "@/lib/format";
import { Markdown } from "@/lib/markdown";
import {
  EmptyState,
  OriginBadge,
  SeverityChip,
  StageLed,
  stateLabel,
  useNow,
} from "@/components/ui";

/* ── stage progress rail ────────────────────────────────────────────────── */

function StageRail({ app }: { app: Doc<"apps"> }) {
  const currentIdx = STAGES.indexOf(app.stage);
  return (
    <div className="mt-4">
      <div className="grid grid-cols-8 gap-[3px]">
        {STAGES.map((s, i) => {
          const isCurrent = i === currentIdx;
          const isDone = i < currentIdx || app.status === "shipped";
          const failed = isCurrent && app.stageState === "failed";
          return (
            <div key={s} className="min-w-0">
              <div
                className={`h-[6px] ${
                  failed
                    ? "bg-red"
                    : isCurrent
                      ? app.stageState === "running"
                        ? "rail-active"
                        : "bg-amber"
                      : isDone
                        ? "bg-amber/30"
                        : "bg-line"
                }`}
              />
              <div
                className={`mt-1.5 hidden truncate font-mono text-[9px] uppercase tracking-widest sm:block ${
                  isCurrent
                    ? failed
                      ? "text-red"
                      : "text-amber"
                    : isDone
                      ? "text-ink-dim"
                      : "text-ink-faint"
                }`}
              >
                {s}
                {s === "build" && app.buildRound > 0 && (
                  <span className="text-ink-faint"> r{app.buildRound}</span>
                )}
                {s === "review" && app.reviewRound > 0 && (
                  <span className="text-ink-faint"> r{app.reviewRound}/2</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {/* mobile: just the current stage */}
      <div className="mt-1.5 sm:hidden font-mono text-[10px] uppercase tracking-widest text-amber">
        {String(currentIdx + 1).padStart(2, "0")} {app.stage}
        {app.buildRound > 0 && (
          <span className="text-ink-faint"> · build r{app.buildRound}</span>
        )}
        {app.reviewRound > 0 && (
          <span className="text-ink-faint"> · review r{app.reviewRound}/2</span>
        )}
      </div>
    </div>
  );
}

/* ── actions ────────────────────────────────────────────────────────────── */

function Actions({ app }: { app: Doc<"apps"> }) {
  const setPaused = useMutation(api.apps.setPaused);
  const retry = useMutation(api.apps.retry);
  const requestChanges = useMutation(api.apps.requestChanges);
  const [changeText, setChangeText] = useState("");
  const [showChanges, setShowChanges] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState(false);

  const paused = app.status === "paused";

  const copyShare = async () => {
    await navigator.clipboard.writeText(
      `${window.location.origin}/s/${app.shareToken}`,
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const submitChanges = async () => {
    const text = changeText.trim();
    if (!text) return;
    await requestChanges({ id: app._id, text });
    setChangeText("");
    setShowChanges(false);
    setSent(true);
    setTimeout(() => setSent(false), 2000);
  };

  return (
    <div className="mt-4">
      <div className="flex flex-wrap gap-2">
        <button
          className={`btn ${paused ? "btn-hot" : ""}`}
          onClick={() => setPaused({ id: app._id, paused: !paused })}
        >
          {paused ? "Resume" : "Pause"}
        </button>
        <button className="btn" onClick={() => retry({ id: app._id })}>
          Retry stage
        </button>
        <button
          className={`btn ${showChanges ? "border-amber text-amber" : ""}`}
          onClick={() => setShowChanges((s) => !s)}
        >
          {sent ? "Sent → build" : "Request changes"}
        </button>
        <button className="btn" onClick={copyShare}>
          {copied ? "Copied ✓" : "Copy share link"}
        </button>
        {app.demoBuildKey && (
          <a
            className="btn"
            href={`/demo/${app.slug}/`}
            target="_blank"
            rel="noreferrer"
          >
            Open demo ↗
          </a>
        )}
      </div>
      {showChanges && (
        <div className="mt-2 flex flex-col gap-2 border border-amber/40 bg-amber/[0.04] p-3">
          <span className="microlabel text-amber">
            Change request → P1 issue → app re-enters build
          </span>
          <textarea
            className="field min-h-[80px] resize-y"
            placeholder="What should change?"
            value={changeText}
            onChange={(e) => setChangeText(e.target.value)}
          />
          <div className="flex gap-2">
            <button
              className="btn btn-hot"
              disabled={!changeText.trim()}
              onClick={submitChanges}
            >
              Send to build
            </button>
            <button className="btn" onClick={() => setShowChanges(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── tabs ───────────────────────────────────────────────────────────────── */

const ROADMAP_ICON: Record<string, [string, string]> = {
  todo: ["□", "text-ink-faint"],
  in_progress: ["◪", "text-amber"],
  done: ["■", "text-ink-dim"],
  verified: ["✔", "text-green"],
};

function RoadmapTab({ items }: { items: Doc<"roadmapItems">[] | undefined }) {
  if (items === undefined)
    return <div className="microlabel animate-pulse py-6">Loading…</div>;
  if (items.length === 0)
    return (
      <EmptyState
        label="No roadmap yet"
        hint="written once at the roadmap stage — hard cap 60 items"
      />
    );
  const milestones = [...new Set(items.map((i) => i.milestone))].sort(
    (a, b) => a - b,
  );
  return (
    <div className="flex flex-col gap-4">
      {milestones.map((m) => {
        const rows = items.filter((i) => i.milestone === m);
        const done = rows.filter(
          (r) => r.status === "done" || r.status === "verified",
        ).length;
        return (
          <div key={m}>
            <div className="mb-1.5 flex items-center gap-2 border-b border-line pb-1">
              <span className="font-display font-bold uppercase tracking-widest text-[12px] text-amber">
                Milestone {m}
              </span>
              <span className="ml-auto font-mono text-[10px] text-ink-faint">
                {done}/{rows.length}
              </span>
            </div>
            <ul>
              {rows.map((r) => {
                const [icon, color] = ROADMAP_ICON[r.status] ?? ROADMAP_ICON.todo;
                return (
                  <li
                    key={r._id}
                    className="flex gap-2 border-b border-line/40 py-1.5 last:border-0"
                  >
                    <span className={`font-mono text-[13px] leading-tight ${color}`}>
                      {icon}
                    </span>
                    <div className="min-w-0">
                      <div
                        className={`text-[13px] leading-snug ${
                          r.status === "verified" ? "text-ink-dim" : "text-ink"
                        }`}
                      >
                        {r.title}
                      </div>
                      <div className="font-mono text-[10px] leading-snug text-ink-faint">
                        ✓ {r.acceptance}
                      </div>
                    </div>
                    <span className="ml-auto shrink-0 font-mono text-[9px] uppercase tracking-widest text-ink-faint">
                      {r.status.replace("_", " ")}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

const SEV_ORDER: Record<string, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };
const ISSUE_STATUS_STYLE: Record<string, string> = {
  open: "border-red/60 text-red",
  fixing: "border-amber/60 text-amber",
  fixed: "border-blue/50 text-blue",
  verified: "border-green/50 text-green",
  waived: "border-line-bright text-ink-faint",
};

function IssuesTab({ issues }: { issues: Doc<"issues">[] | undefined }) {
  const updateIssues = useMutation(api.pipeline.updateIssues);
  if (issues === undefined)
    return <div className="microlabel animate-pulse py-6">Loading…</div>;
  if (issues.length === 0)
    return <EmptyState label="No issues raised" hint="clean line so far" />;
  const sorted = [...issues].sort(
    (a, b) =>
      (SEV_ORDER[a.severity] ?? 9) - (SEV_ORDER[b.severity] ?? 9) ||
      b.updatedAt - a.updatedAt,
  );
  return (
    <ul className="flex flex-col gap-2">
      {sorted.map((i) => (
        <li
          key={i._id}
          className={`panel p-3 ${i.status === "waived" ? "opacity-50" : ""}`}
        >
          <div className="flex flex-wrap items-center gap-2">
            <SeverityChip severity={i.severity} />
            <span className="font-mono text-[9px] uppercase tracking-widest text-ink-faint">
              {i.source}
            </span>
            <span
              className={`font-mono text-[9px] uppercase tracking-widest border px-1.5 py-[1px] ${ISSUE_STATUS_STYLE[i.status] ?? ""}`}
            >
              {i.status}
            </span>
            {i.attempts > 0 && (
              <span className="font-mono text-[9px] text-ink-faint">
                {i.attempts} attempt{i.attempts > 1 ? "s" : ""}
              </span>
            )}
            {(i.status === "open" || i.status === "fixing") && (
              <button
                className="btn ml-auto !px-2 !py-1 !text-[9px]"
                onClick={() =>
                  updateIssues({ updates: [{ id: i._id, status: "waived" }] })
                }
                title="Accept as-is; never re-raised"
              >
                Waive
              </button>
            )}
          </div>
          <div className="mt-1.5 text-[13px] font-medium text-ink">
            {i.title}
          </div>
          {i.detail && i.detail !== i.title && (
            <div className="mt-0.5 whitespace-pre-wrap font-mono text-[11px] leading-snug text-ink-dim">
              {i.detail}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

function RunsTab({ runs }: { runs: Doc<"runs">[] | undefined }) {
  if (runs === undefined)
    return <div className="microlabel animate-pulse py-6">Loading…</div>;
  if (runs.length === 0)
    return <EmptyState label="No runs yet" hint="stage runs appear here" />;
  return (
    <div className="-mx-3 overflow-x-auto px-3 sm:mx-0 sm:px-0">
      <table className="w-full min-w-[560px] border-collapse font-mono text-[11px]">
        <thead>
          <tr className="border-b-2 border-line text-left">
            {["Stage", "Model", "Status", "In", "Out", "Cost", "Time", "When"].map(
              (h) => (
                <th key={h} className="microlabel py-1.5 pr-3 font-normal">
                  {h}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {runs.map((r) => (
            <tr key={r._id} className="border-b border-line/50">
              <td className="py-1.5 pr-3 text-ink">{r.stage}</td>
              <td className="py-1.5 pr-3 text-ink-dim">
                {r.model.replace(/^claude-/, "")}
              </td>
              <td
                className={`py-1.5 pr-3 ${
                  r.status === "failed"
                    ? "text-red"
                    : r.status === "running"
                      ? "text-amber"
                      : "text-green"
                }`}
              >
                {r.status}
              </td>
              <td className="py-1.5 pr-3 text-ink-dim">{tokens(r.inputTokens)}</td>
              <td className="py-1.5 pr-3 text-ink-dim">{tokens(r.outputTokens)}</td>
              <td className="py-1.5 pr-3 text-ink">{money(r.costUsd)}</td>
              <td className="py-1.5 pr-3 text-ink-dim">
                {duration(r.startedAt, r.endedAt)}
              </td>
              <td className="py-1.5 text-ink-faint whitespace-nowrap">
                {timeAgo(r.startedAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EventsTab({ events }: { events: Doc<"events">[] | undefined }) {
  const now = useNow();
  if (events === undefined)
    return <div className="microlabel animate-pulse py-6">Loading…</div>;
  if (events.length === 0)
    return <EmptyState label="No events" hint="stage activity logs here" />;
  return (
    <ol>
      {events.map((e) => (
        <li key={e._id} className="border-b border-line/50 py-1.5 last:border-0">
          <div className="flex items-baseline gap-2">
            <span className="shrink-0 font-mono text-[9px] uppercase tracking-widest text-amber">
              {e.kind.replace(/_/g, " ")}
            </span>
            <span className="ml-auto shrink-0 font-mono text-[9px] text-ink-faint">
              {timeAgo(e.ts, now)}
            </span>
          </div>
          <div className="text-[12px] leading-snug text-ink-dim">{e.message}</div>
        </li>
      ))}
    </ol>
  );
}

/* ── phone demo preview ─────────────────────────────────────────────────── */

function PhonePreview({ app }: { app: Doc<"apps"> }) {
  if (!app.demoBuildKey) {
    return (
      <div className="panel flex flex-col items-center justify-center gap-2 p-8">
        <span className="led led-waiting" />
        <span className="microlabel">Demo brewing</span>
        <span className="text-center font-mono text-[10px] text-ink-faint">
          web export lands here after the first passing build
        </span>
      </div>
    );
  }
  return (
    <div>
      <div className="mx-auto w-full max-w-[280px] rounded-[36px] border-2 border-line-bright bg-black p-2 shadow-[0_0_40px_rgba(255,176,0,0.06)]">
        <div className="relative overflow-hidden rounded-[28px] bg-void">
          <div className="absolute left-1/2 top-1.5 z-10 h-[18px] w-[86px] -translate-x-1/2 rounded-full bg-black" />
          <iframe
            src={`/demo/${app.slug}/`}
            title={`${app.name} demo`}
            className="h-[560px] w-full border-0 bg-white"
          />
        </div>
      </div>
      {app.demoUpdatedAt && (
        <div className="mt-2 text-center font-mono text-[9px] text-ink-faint">
          demo updated {timeAgo(app.demoUpdatedAt)}
        </div>
      )}
    </div>
  );
}

/* ── page ───────────────────────────────────────────────────────────────── */

const TABS = ["brief", "roadmap", "issues", "runs", "events"] as const;
type Tab = (typeof TABS)[number];

export default function AppDetail(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(props.params);
  const app = useQuery(api.apps.bySlug, { slug });
  const appId = app?._id;
  const roadmap = useQuery(
    api.pipeline.roadmap,
    appId ? { appId } : "skip",
  );
  const issues = useQuery(
    api.pipeline.allIssues,
    appId ? { appId } : "skip",
  );
  const runs = useQuery(
    api.pipeline.recentRuns,
    appId ? { appId } : "skip",
  );
  const events = useQuery(
    api.pipeline.recentEvents,
    appId ? { appId, limit: 60 } : "skip",
  );
  const [tab, setTab] = useState<Tab>("brief");

  if (app === undefined) {
    return <div className="microlabel animate-pulse py-16 text-center">Locating unit…</div>;
  }
  if (app === null) {
    return (
      <div className="py-16 text-center">
        <div className="font-display text-[28px] font-bold uppercase text-ink">
          Unknown unit
        </div>
        <div className="microlabel mt-2">no app with slug “{slug}”</div>
        <Link href="/" className="btn mt-6 inline-block">
          ← Back to the line
        </Link>
      </div>
    );
  }

  const openCount = (issues ?? []).filter(
    (i) => i.status === "open" || i.status === "fixing",
  ).length;
  const label = stateLabel(app.stageState, app.status);

  return (
    <div>
      {/* header */}
      <div className="panel panel-ticks p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <Link href="/" className="microlabel hover:text-amber">
            ← line
          </Link>
          <h1 className="font-display text-[24px] font-bold uppercase leading-none tracking-wide text-ink sm:text-[30px]">
            {app.name}
          </h1>
          <OriginBadge origin={app.origin} />
          <span className="flex items-center gap-1.5">
            <StageLed stageState={app.stageState} status={app.status} />
            <span
              className={`font-mono text-[10px] uppercase tracking-widest ${
                label === "failed"
                  ? "text-red"
                  : label === "shipped" || label === "approved"
                    ? "text-green"
                    : label === "paused"
                      ? "text-ink-faint"
                      : "text-amber"
              }`}
            >
              {label}
            </span>
          </span>
          {app.brand && (
            <span className="ml-auto flex items-center gap-1.5">
              <span
                className="h-4 w-4 border border-line-bright"
                style={{ background: app.brand.primary }}
                title={`primary ${app.brand.primary}`}
              />
              <span
                className="h-4 w-4 border border-line-bright"
                style={{ background: app.brand.accent }}
                title={`accent ${app.brand.accent}`}
              />
              <span className="hidden font-mono text-[10px] text-ink-faint sm:inline">
                {app.brand.font} · {app.brand.vibe}
              </span>
            </span>
          )}
        </div>
        <p className="mt-2 max-w-3xl text-[14px] leading-snug text-ink-dim">
          {app.oneLiner}
        </p>
        {app.pricing && (
          <p className="mt-1 font-mono text-[11px] text-amber">{app.pricing}</p>
        )}
        {app.lastError && (
          <div className="mt-3 border border-red/50 bg-red/5 p-2.5">
            <span className="microlabel text-red">
              last error · attempt {app.attempts}/3
            </span>
            <pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap font-mono text-[11px] text-red/90">
              {app.lastError}
            </pre>
          </div>
        )}
        <StageRail app={app} />
        <Actions app={app} />
      </div>

      {/* body */}
      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="min-w-0">
          <div className="flex overflow-x-auto border-b-2 border-line">
            {TABS.map((t) => {
              const count =
                t === "roadmap"
                  ? roadmap?.length
                  : t === "issues"
                    ? openCount || undefined
                    : undefined;
              return (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`shrink-0 cursor-pointer px-4 py-2 font-mono text-[11px] uppercase tracking-[0.16em] transition-colors ${
                    tab === t
                      ? "-mb-[2px] border-b-2 border-amber bg-amber/5 text-amber"
                      : "text-ink-dim hover:text-ink"
                  }`}
                >
                  {t}
                  {count !== undefined && count > 0 && (
                    <span
                      className={`ml-1.5 ${t === "issues" ? "text-red" : "text-ink-faint"}`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="pt-4">
            {tab === "brief" &&
              (app.brief ? (
                <Markdown text={app.brief} />
              ) : (
                <EmptyState
                  label="No brief yet"
                  hint="inception writes the brief"
                />
              ))}
            {tab === "roadmap" && <RoadmapTab items={roadmap} />}
            {tab === "issues" && <IssuesTab issues={issues} />}
            {tab === "runs" && <RunsTab runs={runs} />}
            {tab === "events" && <EventsTab events={events} />}
          </div>
        </section>

        <aside>
          <div className="microlabel mb-2">Demo preview</div>
          <PhonePreview app={app} />
          <div className="panel mt-4 p-3">
            <div className="microlabel mb-2">Unit data</div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 font-mono text-[10px]">
              <dt className="text-ink-faint">slug</dt>
              <dd className="text-ink-dim">{app.slug}</dd>
              <dt className="text-ink-faint">priority</dt>
              <dd className="text-ink-dim">{app.priority}</dd>
              <dt className="text-ink-faint">created</dt>
              <dd className="text-ink-dim">{timeAgo(app.createdAt)}</dd>
              <dt className="text-ink-faint">updated</dt>
              <dd className="text-ink-dim">{timeAgo(app.updatedAt)}</dd>
              {app.forgeSource && (
                <>
                  <dt className="text-ink-faint">forge src</dt>
                  <dd className="truncate">
                    <a
                      href={app.forgeSource.repoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue hover:text-amber"
                    >
                      {app.forgeSource.repoUrl.replace("https://github.com/", "")}
                    </a>{" "}
                    <span className="text-ink-faint">
                      ★{app.forgeSource.stars} {app.forgeSource.license}
                    </span>
                  </dd>
                </>
              )}
            </dl>
          </div>
        </aside>
      </div>
    </div>
  );
}

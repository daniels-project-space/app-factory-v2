"use client";

import { useEffect, useState } from "react";

/** Re-render ticker so relative timestamps stay fresh under Convex reactivity. */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

const ORIGIN_STYLE: Record<string, string> = {
  daniel: "border-amber/60 text-amber",
  factory: "border-line-bright text-ink-dim",
  forge: "border-blue/50 text-blue",
};

export function OriginBadge({ origin }: { origin: string }) {
  return (
    <span
      className={`font-mono text-[9px] uppercase tracking-[0.18em] border px-1.5 py-[1px] ${ORIGIN_STYLE[origin] ?? ORIGIN_STYLE.factory}`}
    >
      {origin}
    </span>
  );
}

export function StageLed({
  stageState,
  status,
}: {
  stageState: string;
  status: string;
}) {
  let cls = "led-off";
  if (status === "shipped" || status === "approved") cls = "led-ok";
  else if (status === "failed" || stageState === "failed") cls = "led-failed";
  else if (status === "paused" || status === "archived") cls = "led-off";
  else if (stageState === "running") cls = "led-running";
  else if (stageState === "waiting") cls = "led-waiting";
  return <span className={`led ${cls}`} />;
}

export function stateLabel(stageState: string, status: string): string {
  if (status === "shipped") return "shipped";
  if (status === "paused") return "paused";
  if (status === "failed") return "failed";
  if (status === "archived") return "archived";
  if (status === "approved") return "approved";
  if (stageState === "running") return "running";
  if (stageState === "waiting") return "waiting";
  if (stageState === "failed") return "failed";
  return "pending";
}

const SEV_STYLE: Record<string, string> = {
  P0: "bg-red text-void",
  P1: "border border-red/70 text-red",
  P2: "border border-amber/60 text-amber",
  P3: "border border-line-bright text-ink-dim",
};

export function SeverityChip({ severity }: { severity: string }) {
  return (
    <span
      className={`font-mono text-[10px] font-semibold tracking-widest px-1.5 py-[1px] ${SEV_STYLE[severity] ?? SEV_STYLE.P3}`}
    >
      {severity}
    </span>
  );
}

export function EmptyState({ label, hint }: { label: string; hint?: string }) {
  return (
    <div className="border border-dashed border-line px-4 py-8 text-center">
      <div className="microlabel mb-1">{label}</div>
      {hint && (
        <div className="text-[12px] text-ink-faint font-mono">{hint}</div>
      )}
    </div>
  );
}

export function SectionHeader({
  index,
  title,
  right,
}: {
  index?: string;
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 border-b border-line pb-2 mb-3">
      {index && (
        <span className="font-mono text-[10px] text-amber tracking-widest">
          {index}
        </span>
      )}
      <h2 className="font-display font-bold uppercase tracking-[0.12em] text-[13px] text-ink">
        {title}
      </h2>
      <div className="ml-auto">{right}</div>
    </div>
  );
}

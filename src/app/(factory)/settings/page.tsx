"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { money } from "@/lib/format";
import { SectionHeader } from "@/components/ui";

function Toggle({
  label,
  hint,
  value,
  onChange,
  danger,
}: {
  label: string;
  hint: string;
  value: boolean;
  onChange: (v: boolean) => void;
  danger?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-line py-3 last:border-0">
      <div className="min-w-0 flex-1">
        <div className="font-display font-semibold uppercase tracking-[0.1em] text-[13px] text-ink">
          {label}
        </div>
        <div className="mt-0.5 font-mono text-[10px] leading-snug text-ink-faint">
          {hint}
        </div>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`flex h-7 w-14 shrink-0 cursor-pointer items-center border p-[3px] transition-colors ${
          value
            ? danger
              ? "justify-end border-red bg-red/15"
              : "justify-end border-amber bg-amber/15"
            : "justify-start border-line-bright bg-void"
        }`}
        aria-pressed={value}
      >
        <span
          className={`h-full w-6 ${
            value ? (danger ? "bg-red" : "bg-amber") : "bg-ink-faint"
          }`}
        />
      </button>
    </div>
  );
}

function NumberControl({
  label,
  hint,
  value,
  step,
  min,
  max,
  format,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  step: number;
  min: number;
  max: number;
  format?: (n: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-line py-3 last:border-0">
      <div className="min-w-0 flex-1">
        <div className="font-display font-semibold uppercase tracking-[0.1em] text-[13px] text-ink">
          {label}
        </div>
        <div className="mt-0.5 font-mono text-[10px] leading-snug text-ink-faint">
          {hint}
        </div>
      </div>
      <div className="flex shrink-0 items-center border border-line-bright">
        <button
          className="cursor-pointer px-3 py-1.5 font-mono text-[14px] text-ink-dim hover:bg-raised hover:text-amber"
          onClick={() => onChange(Math.max(min, value - step))}
        >
          −
        </button>
        <span className="min-w-[64px] border-x border-line-bright px-2 py-1.5 text-center font-mono text-[13px] text-ink">
          {format ? format(value) : value}
        </span>
        <button
          className="cursor-pointer px-3 py-1.5 font-mono text-[14px] text-ink-dim hover:bg-raised hover:text-amber"
          onClick={() => onChange(Math.min(max, value + step))}
        >
          +
        </button>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const settings = useQuery(api.intake.getSettings);
  const update = useMutation(api.intake.updateSettings);

  if (settings === undefined) {
    return <div className="microlabel animate-pulse py-16 text-center">Loading…</div>;
  }

  const today = new Date().toISOString().slice(0, 10);
  const spent = settings.budgetDay === today ? settings.spentTodayUsd : 0;

  return (
    <div className="mx-auto max-w-2xl">
      <SectionHeader index="//" title="Factory controls" />

      <div className="panel panel-ticks p-4 sm:p-5">
        <Toggle
          label="Master switch"
          hint="kill switch — orchestrator claims no work while halted; running stages finish"
          value={settings.running}
          danger={!settings.running}
          onChange={(v) => update({ running: v })}
        />
        <NumberControl
          label="Max concurrent"
          hint="stage-runners working in parallel (2 = balanced budget)"
          value={settings.maxConcurrent}
          step={1}
          min={1}
          max={8}
          onChange={(v) => update({ maxConcurrent: v })}
        />
        <NumberControl
          label="Daily budget"
          hint="orchestrator pauses the line at the cap; resets each day"
          value={settings.dailyBudgetUsd}
          step={5}
          min={5}
          max={500}
          format={(n) => `$${n}`}
          onChange={(v) => update({ dailyBudgetUsd: v })}
        />
        <Toggle
          label="Design sign-off"
          hint="hold each app at the design stage for your approval (non-blocking for other apps)"
          value={settings.designSignoffRequired}
          onChange={(v) => update({ designSignoffRequired: v })}
        />
        <Toggle
          label="Forge scout"
          hint="daily hunt for MIT/Apache OSS conversion candidates"
          value={settings.forgeScoutEnabled}
          onChange={(v) => update({ forgeScoutEnabled: v })}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-px border border-line bg-line">
        <div className="bg-panel px-3 py-2.5">
          <div className="microlabel">Spend today</div>
          <div
            className={`font-display font-bold text-[24px] leading-none mt-1 ${
              spent >= settings.dailyBudgetUsd ? "text-red" : "text-ink"
            }`}
          >
            {money(spent)}
          </div>
        </div>
        <div className="bg-panel px-3 py-2.5">
          <div className="microlabel">Budget day</div>
          <div className="font-display font-bold text-[24px] leading-none mt-1 text-ink-dim">
            {settings.budgetDay === today ? today : `${today} (fresh)`}
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import type { Doc, Id } from "@/../convex/_generated/dataModel";
import { slugify, timeAgo } from "@/lib/format";
import { EmptyState, SectionHeader, useNow } from "@/components/ui";

const CAND_STATUS_STYLE: Record<string, string> = {
  candidate: "border-line-bright text-ink-dim",
  approved: "border-amber/60 text-amber",
  converting: "border-amber/60 text-amber",
  converted: "border-green/50 text-green",
  rejected: "border-red/40 text-red/80",
};

function LicenseBadge({ license }: { license: string }) {
  const ok = /mit|apache|bsd|isc/i.test(license);
  return (
    <span
      className={`font-mono text-[9px] uppercase tracking-widest border px-1.5 py-[1px] ${
        ok ? "border-green/50 text-green" : "border-red/60 text-red"
      }`}
    >
      {license}
    </span>
  );
}

function CandidateCard({
  cand,
  apps,
}: {
  cand: Doc<"forgeCandidates">;
  apps: Map<Id<"apps">, Doc<"apps">>;
}) {
  const approve = useMutation(api.intake.approveForgeCandidate);
  const setStatus = useMutation(api.intake.setForgeStatus);
  const [approving, setApproving] = useState(false);
  const [slug, setSlug] = useState(() => slugify(cand.name));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const now = useNow();
  const linkedApp = cand.appId ? apps.get(cand.appId) : undefined;

  const go = async () => {
    setBusy(true);
    setError(null);
    try {
      await approve({ id: cand._id, slug: slug.trim() });
      setApproving(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="panel p-3 sm:p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-display font-bold uppercase tracking-wide text-[15px] text-ink">
          {cand.name}
        </span>
        <span className="font-mono text-[11px] text-amber">
          ★ {cand.stars.toLocaleString()}
        </span>
        <LicenseBadge license={cand.license} />
        <span
          className={`font-mono text-[9px] uppercase tracking-widest border px-1.5 py-[1px] ${CAND_STATUS_STYLE[cand.status]}`}
        >
          {cand.status}
        </span>
        <span className="ml-auto font-mono text-[9px] text-ink-faint">
          {timeAgo(cand.createdAt, now)}
        </span>
      </div>

      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">
          {cand.category}
        </span>
        <a
          href={cand.repoUrl}
          target="_blank"
          rel="noreferrer"
          className="font-mono text-[11px] text-blue hover:text-amber"
        >
          {cand.repoUrl.replace("https://github.com/", "")} ↗
        </a>
      </div>

      <p className="mt-2 text-[13px] leading-snug text-ink-dim">{cand.pitch}</p>

      {linkedApp && (
        <Link
          href={`/apps/${linkedApp.slug}`}
          className="mt-2 inline-block font-mono text-[11px] uppercase tracking-widest text-green hover:text-amber"
        >
          → converting as {linkedApp.name} · {linkedApp.stage}
        </Link>
      )}

      {cand.status === "candidate" && (
        <>
          {!approving && (
            <div className="mt-3 flex gap-2">
              <button className="btn btn-hot" onClick={() => setApproving(true)}>
                Convert
              </button>
              <button
                className="btn btn-danger"
                onClick={() => setStatus({ id: cand._id, status: "rejected" })}
              >
                Reject
              </button>
            </div>
          )}
          {approving && (
            <div className="mt-3 flex flex-col gap-2 border border-amber/40 bg-amber/[0.04] p-3">
              <label className="flex flex-col gap-1">
                <span className="microlabel">App slug</span>
                <input
                  className="field"
                  value={slug}
                  onChange={(e) => setSlug(slugify(e.target.value) || e.target.value)}
                />
              </label>
              {error && (
                <span className="font-mono text-[11px] text-red">⚠ {error}</span>
              )}
              <div className="flex gap-2">
                <button
                  className="btn btn-hot"
                  disabled={busy || !slug.trim()}
                  onClick={go}
                >
                  {busy ? "Forging…" : "Start conversion"}
                </button>
                <button className="btn" onClick={() => setApproving(false)}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </li>
  );
}

export default function ForgePage() {
  const candidates = useQuery(api.intake.forgeCandidates);
  const apps = useQuery(api.apps.list);
  const settings = useQuery(api.intake.getSettings);
  const updateSettings = useMutation(api.intake.updateSettings);

  const appMap = new Map<Id<"apps">, Doc<"apps">>(
    (apps ?? []).map((a) => [a._id, a]),
  );
  const scoutOn = settings?.forgeScoutEnabled ?? false;
  const pending = candidates?.filter((c) => c.status === "candidate") ?? [];
  const decided = candidates?.filter((c) => c.status !== "candidate") ?? [];

  return (
    <div className="mx-auto max-w-3xl">
      <SectionHeader
        index="//"
        title="Forge — OSS to commercial"
        right={
          settings && (
            <button
              onClick={() => updateSettings({ forgeScoutEnabled: !scoutOn })}
              className={`flex cursor-pointer items-center gap-2 border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] transition-colors ${
                scoutOn
                  ? "border-green/40 text-green hover:border-green"
                  : "border-line-bright text-ink-faint hover:text-ink"
              }`}
            >
              <span className={`led ${scoutOn ? "led-ok" : "led-off"}`} />
              Scout {scoutOn ? "on" : "off"}
            </button>
          )
        }
      />
      <p className="mb-4 font-mono text-[11px] leading-relaxed text-ink-faint">
        Daily scout finds high-star MIT/Apache apps worth rebranding + wiring
        payments into. Approved candidates join the same pipeline as everything
        else — no separate quality path.
      </p>

      {candidates === undefined && (
        <div className="microlabel animate-pulse py-6">Loading…</div>
      )}
      {candidates?.length === 0 && (
        <EmptyState
          label="No candidates yet"
          hint={
            scoutOn
              ? "scout runs daily — candidates land here"
              : "scout is off — flip it on to start hunting"
          }
        />
      )}

      {pending.length > 0 && (
        <ul className="flex flex-col gap-2.5">
          {pending.map((c) => (
            <CandidateCard key={c._id} cand={c} apps={appMap} />
          ))}
        </ul>
      )}

      {decided.length > 0 && (
        <div className="mt-6">
          <SectionHeader title="Decided" />
          <ul className="flex flex-col gap-2.5">
            {decided.map((c) => (
              <CandidateCard key={c._id} cand={c} apps={appMap} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

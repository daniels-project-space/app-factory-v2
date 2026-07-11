"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import type { Doc, Id } from "@/../convex/_generated/dataModel";
import { deriveName, slugify, timeAgo } from "@/lib/format";
import { EmptyState, SectionHeader, useNow } from "@/components/ui";

const IDEA_STATUS_STYLE: Record<string, string> = {
  new: "border-line-bright text-ink-dim",
  deliberated: "border-amber/60 text-amber",
  approved: "border-green/50 text-green",
  rejected: "border-red/40 text-red/80",
};

function ScoreMeter({ score }: { score: number }) {
  const pct = Math.max(0, Math.min(10, score)) * 10;
  const color = score >= 7 ? "bg-green" : score >= 4 ? "bg-amber" : "bg-red";
  return (
    <span className="flex items-center gap-2">
      <span className="h-[6px] w-20 border border-line bg-void">
        <span className={`block h-full ${color}`} style={{ width: `${pct}%` }} />
      </span>
      <span className="font-mono text-[11px] text-ink">{score}/10</span>
    </span>
  );
}

function ApprovePanel({
  idea,
  onDone,
}: {
  idea: Doc<"ideas">;
  onDone: () => void;
}) {
  const approveIdea = useMutation(api.intake.approveIdea);
  const [name, setName] = useState(() => deriveName(idea.text));
  const [slug, setSlug] = useState(() => slugify(deriveName(idea.text)));
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const go = async () => {
    setBusy(true);
    setError(null);
    try {
      await approveIdea({ id: idea._id, name: name.trim(), slug: slug.trim() });
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed");
      setBusy(false);
    }
  };

  return (
    <div className="mt-2 flex flex-col gap-2 border border-amber/40 bg-amber/[0.04] p-3">
      <span className="microlabel text-amber">
        Approve → creates the app, enters the line at inception
      </span>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="microlabel">Name</span>
          <input
            className="field"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!slugTouched) setSlug(slugify(e.target.value));
            }}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="microlabel">Slug</span>
          <input
            className="field"
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(slugify(e.target.value) || e.target.value);
            }}
          />
        </label>
      </div>
      {error && (
        <span className="font-mono text-[11px] text-red">⚠ {error}</span>
      )}
      <div className="flex gap-2">
        <button
          className="btn btn-hot"
          disabled={busy || !name.trim() || !slug.trim()}
          onClick={go}
        >
          {busy ? "Creating…" : "Start build"}
        </button>
        <button className="btn" onClick={onDone}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function IdeaRow({
  idea,
  apps,
}: {
  idea: Doc<"ideas">;
  apps: Map<Id<"apps">, Doc<"apps">>;
}) {
  const decideIdea = useMutation(api.intake.decideIdea);
  const [approving, setApproving] = useState(false);
  const now = useNow();
  const linkedApp = idea.appId ? apps.get(idea.appId) : undefined;

  return (
    <li className="panel p-3 sm:p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`font-mono text-[9px] uppercase tracking-widest border px-1.5 py-[1px] ${IDEA_STATUS_STYLE[idea.status]}`}
        >
          {idea.status}
        </span>
        <span className="font-mono text-[9px] uppercase tracking-widest text-ink-faint">
          {idea.source}
        </span>
        {idea.score !== undefined && <ScoreMeter score={idea.score} />}
        <span className="ml-auto font-mono text-[9px] text-ink-faint">
          {timeAgo(idea.createdAt, now)}
        </span>
      </div>

      <p className="mt-2 whitespace-pre-wrap text-[13px] leading-snug text-ink">
        {idea.text}
      </p>

      {idea.verdict && (
        <div className="mt-2 border-l-2 border-amber/60 pl-2.5">
          <span className="microlabel">Triage verdict</span>
          <p className="mt-0.5 text-[12px] leading-snug text-ink-dim">
            {idea.verdict}
          </p>
        </div>
      )}

      {linkedApp && (
        <div className="mt-2">
          <Link
            href={`/apps/${linkedApp.slug}`}
            className="font-mono text-[11px] uppercase tracking-widest text-green hover:text-amber"
          >
            → in the factory: {linkedApp.name} · {linkedApp.stage}
          </Link>
        </div>
      )}

      {(idea.status === "new" || idea.status === "deliberated") && (
        <>
          {!approving && (
            <div className="mt-3 flex gap-2">
              <button className="btn btn-hot" onClick={() => setApproving(true)}>
                Approve
              </button>
              <button
                className="btn btn-danger"
                onClick={() => decideIdea({ id: idea._id, approve: false })}
              >
                Reject
              </button>
            </div>
          )}
          {approving && (
            <ApprovePanel idea={idea} onDone={() => setApproving(false)} />
          )}
        </>
      )}
    </li>
  );
}

export default function IdeasPage() {
  const ideas = useQuery(api.intake.ideas);
  const apps = useQuery(api.apps.list);
  const submitIdea = useMutation(api.intake.submitIdea);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const appMap = new Map<Id<"apps">, Doc<"apps">>(
    (apps ?? []).map((a) => [a._id, a]),
  );

  const submit = async () => {
    const t = text.trim();
    if (!t) return;
    setBusy(true);
    try {
      await submitIdea({ text: t, source: "daniel" });
      setText("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <SectionHeader index="//" title="Idea intake" />
      <div className="panel panel-ticks p-4">
        <span className="microlabel">
          Feed the machine — one idea per drop
        </span>
        <textarea
          className="field mt-2 min-h-[110px] resize-y text-[14px]"
          placeholder="An app that…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit();
          }}
        />
        <div className="mt-2 flex items-center gap-3">
          <button
            className="btn btn-hot"
            disabled={busy || !text.trim()}
            onClick={submit}
          >
            {busy ? "Feeding…" : "Feed the factory"}
          </button>
          <span className="hidden font-mono text-[10px] text-ink-faint sm:inline">
            ⌘↵ to submit
          </span>
        </div>
      </div>

      <div className="mt-6">
        <SectionHeader
          title="Backlog"
          right={
            ideas && (
              <span className="font-mono text-[10px] text-ink-faint">
                {ideas.length} total
              </span>
            )
          }
        />
        {ideas === undefined && (
          <div className="microlabel animate-pulse py-6">Loading…</div>
        )}
        {ideas?.length === 0 && (
          <EmptyState
            label="No ideas yet"
            hint="drop the first one above — the factory deliberates, you decide"
          />
        )}
        <ul className="flex flex-col gap-2.5">
          {ideas?.map((idea) => (
            <IdeaRow key={idea._id} idea={idea} apps={appMap} />
          ))}
        </ul>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import type { Doc } from "@/../convex/_generated/dataModel";
import { STAGES, timeAgo } from "@/lib/format";
import {
  EmptyState,
  SectionHeader,
  StageLed,
  stateLabel,
  useNow,
} from "@/components/ui";

type PreviewView = {
  label: string;
  detail: string;
  tone: "ready" | "active" | "failed" | "idle";
};

function describePreview(app: Doc<"apps">): PreviewView {
  const preview = app.iosPreview;
  if (preview) {
    if (preview.status === "finished") {
      return {
        label: "ready",
        detail: "Cloud Simulator artifact is ready for your Mac.",
        tone: "ready",
      };
    }
    if (preview.status === "errored") {
      return {
        label: "failed",
        detail: preview.error ?? "The cloud build failed.",
        tone: "failed",
      };
    }
    return {
      label: preview.status === "queued" ? "queued" : "building",
      detail: "Expo is building this iOS Simulator artifact in the cloud.",
      tone: "active",
    };
  }

  if (app.status === "archived") {
    return {
      label: "not queued",
      detail:
        "Archived Factory record — no Factory web export or iOS artifact is registered.",
      tone: "idle",
    };
  }
  if (app.stage === "preview" && app.status === "waiting_approval") {
    return {
      label: "setup needed",
      detail:
        "The factory needs its Expo credential before it can queue this cloud build.",
      tone: "active",
    };
  }
  if (app.stage === "preview") {
    return {
      label: "waiting to queue",
      detail:
        "The app has reached Preview and is waiting for its cloud build handoff.",
      tone: "active",
    };
  }
  if (STAGES.indexOf(app.stage) > STAGES.indexOf("preview")) {
    return {
      label: "no receipt",
      detail:
        "This app is beyond Preview but has no native build receipt recorded.",
      tone: "failed",
    };
  }
  return {
    label: "not reached",
    detail: `Currently ${stateLabel(app.stageState, app.status)} at ${app.stage}.`,
    tone: "idle",
  };
}

function PreviewCard({ app, now }: { app: Doc<"apps">; now: number }) {
  const preview = app.iosPreview;
  const view = describePreview(app);
  const href = preview?.artifactUrl ?? preview?.detailsUrl;
  const webLabel = app.portfolioDisposition
    ? "Open web archive"
    : "Open live app";
  const stageState =
    view.tone === "failed"
      ? "failed"
      : view.tone === "active"
        ? "running"
        : "waiting";
  const status = view.tone === "ready" ? "release_ready" : app.status;

  return (
    <article className="panel border border-line p-3 sm:p-4">
      <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
        <div className="min-w-0">
          {app.externalUrl ? (
            <a
              href={app.externalUrl}
              target="_blank"
              rel="noreferrer"
              className="font-display text-[16px] font-bold uppercase tracking-wide text-ink hover:text-amber-hot"
            >
              {app.name} ↗
            </a>
          ) : (
            <Link
              href={`/apps/${app.slug}`}
              className="font-display text-[16px] font-bold uppercase tracking-wide text-ink hover:text-amber-hot"
            >
              {app.name}
            </Link>
          )}
          <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-ink-dim">
            {app.oneLiner}
          </p>
        </div>
        <span className="ml-auto flex shrink-0 items-center gap-1.5">
          <StageLed stageState={stageState} status={status} />
          <span
            className={`font-mono text-[10px] uppercase tracking-widest ${
              view.tone === "ready"
                ? "text-green"
                : view.tone === "failed"
                  ? "text-red"
                  : view.tone === "active"
                    ? "text-amber"
                    : "text-ink-faint"
            }`}
          >
            {view.label}
          </span>
        </span>
      </div>

      <p
        className={`mt-3 text-[12px] leading-snug ${
          view.tone === "failed" ? "text-red/90" : "text-ink-dim"
        }`}
      >
        {view.detail}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10px] text-ink-faint">
        <span>stage · {app.stage}</span>
        {preview && <span>build · {preview.buildId}</span>}
        {preview && (
          <span>
            updated · {timeAgo(preview.completedAt ?? preview.startedAt, now)}
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10px] uppercase tracking-widest">
        {app.externalUrl && (
          <a
            href={app.externalUrl}
            target="_blank"
            rel="noreferrer"
            className="text-amber hover:text-amber-hot"
          >
            {webLabel} ↗
          </a>
        )}
        {href && (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="text-blue hover:text-amber"
          >
            {preview?.artifactUrl
              ? "Open Simulator artifact"
              : "Open EAS build"}{" "}
            →
          </a>
        )}
        <Link
          href={`/apps/${app.slug}`}
          className="text-ink-faint hover:text-blue"
        >
          Factory details →
        </Link>
      </div>
    </article>
  );
}

export default function PreviewsPage() {
  const apps = useQuery(api.apps.list);
  const now = useNow();

  const builds = apps?.filter((app) => app.iosPreview) ?? [];
  const building = builds.filter(
    (app) =>
      app.iosPreview?.status === "queued" ||
      app.iosPreview?.status === "building",
  ).length;
  const ready = builds.filter(
    (app) => app.iosPreview?.status === "finished",
  ).length;
  const failed = builds.filter(
    (app) => app.iosPreview?.status === "errored",
  ).length;

  return (
    <div className="mx-auto max-w-6xl">
      <SectionHeader
        index="//"
        title="Runtimes & iOS builds"
        right={
          apps && (
            <span className="font-mono text-[10px] text-ink-faint">
              {apps.length} project{apps.length === 1 ? "" : "s"}
            </span>
          )
        }
      />
      <div className="panel panel-ticks p-4 sm:p-5">
        <p className="max-w-3xl text-[13px] leading-snug text-ink-dim">
          Every Factory project is visible here. Real web links, Factory web
          exports, and cloud iOS receipts are kept separate so an archived
          design record is never mistaken for a runnable build.
        </p>
        <div className="mt-4 grid gap-px border border-line bg-line sm:grid-cols-3">
          <div className="bg-panel px-3 py-2.5">
            <div className="microlabel">Building</div>
            <div className="mt-1 font-display text-[24px] font-bold leading-none text-amber">
              {building}
            </div>
          </div>
          <div className="bg-panel px-3 py-2.5">
            <div className="microlabel">Ready</div>
            <div className="mt-1 font-display text-[24px] font-bold leading-none text-green">
              {ready}
            </div>
          </div>
          <div className="bg-panel px-3 py-2.5">
            <div className="microlabel">Failed</div>
            <div
              className={`mt-1 font-display text-[24px] font-bold leading-none ${failed ? "text-red" : "text-ink-faint"}`}
            >
              {failed}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        {apps === undefined && (
          <div className="microlabel animate-pulse py-6">
            Loading native build ledger…
          </div>
        )}
        {apps?.length === 0 && (
          <EmptyState
            label="No Factory projects yet"
            hint="Feed an idea to the Factory, then its iOS Preview will appear here once it reaches that stage."
          />
        )}
        <div className="grid gap-3 md:grid-cols-2">
          {apps?.map((app) => (
            <PreviewCard key={app._id} app={app} now={now} />
          ))}
        </div>
      </div>
    </div>
  );
}

import { task, wait } from "@trigger.dev/sdk";
import { cvxMutation, cvxQuery, logEvent } from "@/factory/convex";
import { EasSetupError, getEasBuild } from "./lib/eas";

type PollPayload = { appId: string; buildId: string };

type AppSnapshot = {
  stage: string;
  buildRound: number;
  iosPreview?: { buildId: string };
};

const POLL_SECONDS = 120;
const MAX_POLLS = 40;
const FAILED = new Set(["ERRORED", "CANCELED", "CANCELLED"]);

async function returnToBuild(
  appId: string,
  buildId: string,
  round: number,
  detail: string,
  detailsUrl?: string,
) {
  await cvxMutation("pipeline:reportIssues", {
    appId,
    round,
    issues: [
      {
        fingerprint: "gate:ios-preview",
        severity: "P0",
        source: "gate",
        title: "iOS Simulator Preview build failed",
        detail: detail.slice(0, 1800),
      },
    ],
  });
  await cvxMutation("apps:completeIosPreviewBuild", {
    id: appId,
    buildId,
    succeeded: false,
    detailsUrl,
    error: detail.slice(0, 1800),
  });
  await logEvent(appId, "ios_preview_failed", detail.slice(0, 600));
}

/**
 * EAS queues and builds independently of Trigger. Waiting checkpointed here
 * keeps the main stage-runner lease short and prevents a cloud queue delay
 * from blocking unrelated app creation work.
 */
export const iosPreviewPoller = task({
  id: "ios-preview-poller",
  machine: "small-1x",
  maxDuration: 5400,
  retry: { maxAttempts: 1 },
  run: async ({ appId, buildId }: PollPayload) => {
    for (let poll = 0; poll < MAX_POLLS; poll++) {
      const app = (await cvxQuery("apps:get", { id: appId })) as AppSnapshot | null;
      if (!app || app.stage !== "preview") {
        return { skipped: true };
      }
      // The runner deliberately registers this durable poller before releasing
      // its lease. On a fast worker the first poll can win that race; wait for
      // the receipt rather than losing the only watcher for the EAS build.
      if (!app.iosPreview) {
        await wait.for({ seconds: 5 });
        continue;
      }
      if (app.iosPreview.buildId !== buildId) {
        return { skipped: true };
      }

      try {
        const build = await getEasBuild(buildId);
        if (build.status === "FINISHED") {
          await cvxMutation("apps:completeIosPreviewBuild", {
            id: appId,
            buildId,
            succeeded: true,
            detailsUrl: build.detailsUrl,
            artifactUrl: build.artifactUrl,
          });
          await logEvent(appId, "ios_preview_ready", `Cloud iOS Preview ready: ${build.id}`);
          return { succeeded: true, artifactUrl: build.artifactUrl };
        }
        if (FAILED.has(build.status)) {
          await returnToBuild(
            appId,
            buildId,
            app.buildRound,
            build.error ?? `EAS finished with ${build.status}`,
            build.detailsUrl,
          );
          return { succeeded: false, status: build.status };
        }
        await cvxMutation("apps:updateIosPreviewStatus", {
          id: appId,
          buildId,
          status: "building",
          detailsUrl: build.detailsUrl,
        });
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        if (error instanceof EasSetupError) {
          await cvxMutation("intake:requestApproval", {
            appId,
            stage: "preview",
            question: "Reconnect the Expo credential before resuming this iOS Preview build.",
            context: detail.slice(0, 1800),
          });
          await cvxMutation("apps:parkIosPreviewBuild", {
            id: appId,
            buildId,
            error: detail.slice(0, 1800),
          });
          return { setupRequired: true };
        }
        if (poll === MAX_POLLS - 1) {
          await returnToBuild(appId, buildId, app.buildRound, detail);
          return { succeeded: false, error: detail };
        }
      }
      await wait.for({ seconds: POLL_SECONDS });
    }

    const app = (await cvxQuery("apps:get", { id: appId })) as AppSnapshot | null;
    await returnToBuild(
      appId,
      buildId,
      app?.buildRound ?? 0,
      `EAS did not reach a terminal state within ${MAX_POLLS * POLL_SECONDS / 60} minutes`,
    );
    return { succeeded: false, timedOut: true };
  },
});

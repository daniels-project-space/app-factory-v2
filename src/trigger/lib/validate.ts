import { createServer, type Server } from "node:http";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join, normalize } from "node:path";
import { chromium, type Page } from "playwright";
import { contentType } from "./r2";

/**
 * THE validation driver. v1 had ~14 overlapping Playwright scripts; this is
 * the only one. It serves the web export, drives real sessions, and returns
 * facts: console errors, blank screens, dead taps, paywall reachability,
 * plus a screenshot per visited screen for the vision reviewer.
 */

export type ValidationIssue = {
  fingerprint: string;
  severity: "P0" | "P1" | "P2" | "P3";
  source: "gate";
  title: string;
  detail: string;
};

export type ValidationResult = {
  issues: ValidationIssue[];
  screenshots: string[]; // local paths
  screensVisited: number;
  paywallReachable: boolean;
  consoleErrorCount: number;
};

function serveStatic(dir: string): Promise<{ server: Server; port: number }> {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      const urlPath = decodeURIComponent((req.url ?? "/").split("?")[0]);
      let filePath = normalize(join(dir, urlPath));
      if (!filePath.startsWith(normalize(dir))) {
        res.writeHead(403).end();
        return;
      }
      if (!existsSync(filePath) || urlPath === "/") filePath = join(dir, "index.html");
      // SPA fallback for deep routes without extensions
      if (!existsSync(filePath)) filePath = join(dir, "index.html");
      try {
        const body = readFileSync(filePath);
        res.writeHead(200, { "content-type": contentType(filePath) });
        res.end(body);
      } catch {
        res.writeHead(404).end();
      }
    });
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve({ server, port: typeof address === "object" && address ? address.port : 0 });
    });
  });
}

const IPHONE = { width: 390, height: 844 };

async function isBlank(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const text = document.body?.innerText?.trim() ?? "";
    const els = document.body?.querySelectorAll("*").length ?? 0;
    return text.length < 3 && els < 12;
  });
}

async function shot(page: Page, dir: string, name: string, paths: string[]) {
  const p = join(dir, `${name.replace(/[^a-z0-9_-]/gi, "_").slice(0, 60)}.png`);
  try {
    await page.screenshot({ path: p });
    paths.push(p);
  } catch {
    /* screenshot failure is not itself a finding */
  }
}

export async function validateWebBuild(distDir: string, shotsDir: string): Promise<ValidationResult> {
  mkdirSync(shotsDir, { recursive: true });
  const { server, port } = await serveStatic(distDir);
  const base = `http://127.0.0.1:${port}`;
  const issues: ValidationIssue[] = [];
  const screenshots: string[] = [];
  const consoleErrors = new Map<string, number>();
  let screensVisited = 0;
  let paywallReachable = false;

  const browser = await chromium.launch({ headless: true });
  try {
    const ctx = await browser.newContext({ viewport: IPHONE, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const key = msg.text().slice(0, 160);
        consoleErrors.set(key, (consoleErrors.get(key) ?? 0) + 1);
      }
    });
    page.on("pageerror", (err) => {
      const key = `pageerror: ${String(err.message).slice(0, 160)}`;
      consoleErrors.set(key, (consoleErrors.get(key) ?? 0) + 1);
    });

    // ── Session 1: cold start ────────────────────────────────────────────
    const nav = await page.goto(base, { waitUntil: "networkidle", timeout: 45_000 }).catch(() => null);
    await page.waitForTimeout(2500);
    if (!nav) {
      issues.push({
        fingerprint: "pw:no-load",
        severity: "P0",
        source: "gate",
        title: "App failed to load in browser",
        detail: "goto('/') never settled within 45s",
      });
      return { issues, screenshots, screensVisited, paywallReachable, consoleErrorCount: 0 };
    }
    if (await isBlank(page)) {
      issues.push({
        fingerprint: "pw:blank:root",
        severity: "P0",
        source: "gate",
        title: "Blank screen on cold start",
        detail: "document body has no visible content after load",
      });
    }
    await shot(page, shotsDir, "00-cold-start", screenshots);
    screensVisited++;

    // ── Session 2: onboarding walk — press primary CTA up to 6 times ────
    for (let step = 0; step < 6; step++) {
      const cta = page
        .locator("[data-testid*='cta'], [data-testid*='continue'], [data-testid*='next'], [data-testid*='get-started'], [data-testid*='onboarding']")
        .first();
      const generic = page.getByRole("button", { name: /continue|next|get started|start|begin|skip/i }).first();
      const target = (await cta.count()) > 0 ? cta : (await generic.count()) > 0 ? generic : null;
      if (!target) break;
      const before = page.url() + ((await page.textContent("body").catch(() => "")) ?? "").slice(0, 80);
      await target.click({ timeout: 4000 }).catch(() => {});
      await page.waitForTimeout(1400);
      const after = page.url() + ((await page.textContent("body").catch(() => "")) ?? "").slice(0, 80);
      if (before === after) break;
      await shot(page, shotsDir, `01-onboarding-${step}`, screenshots);
      screensVisited++;
    }

    // ── Session 3: tab/nav walk ──────────────────────────────────────────
    const tabSel =
      "[role='tab'], [data-testid^='tab-'], [aria-label*='tab' i] a, nav a, [role='tablist'] [role='button']";
    const tabCount = Math.min(await page.locator(tabSel).count(), 6);
    for (let i = 0; i < tabCount; i++) {
      const tab = page.locator(tabSel).nth(i);
      const label = ((await tab.textContent().catch(() => "")) ?? `tab${i}`).trim().slice(0, 24) || `tab${i}`;
      await tab.click({ timeout: 4000 }).catch(() => {});
      await page.waitForTimeout(1200);
      if (await isBlank(page)) {
        issues.push({
          fingerprint: `pw:blank:${label}`,
          severity: "P0",
          source: "gate",
          title: `Blank screen on tab "${label}"`,
          detail: "tab renders no visible content",
        });
      }
      await shot(page, shotsDir, `02-tab-${i}-${label}`, screenshots);
      screensVisited++;
    }

    // ── Session 4: interaction probe — tap visible buttons, watch errors ─
    const buttons = page.locator("[role='button']:visible, button:visible");
    const btnCount = Math.min(await buttons.count(), 12);
    let deadTaps = 0;
    for (let i = 0; i < btnCount; i++) {
      const b = buttons.nth(i);
      const label = ((await b.textContent().catch(() => "")) ?? "").trim().slice(0, 24);
      if (/delete|remove|sign out|log ?out|reset/i.test(label)) continue;
      const beforeErr = totalErrors(consoleErrors);
      const beforeState =
        page.url() + String(((await page.textContent("body").catch(() => "")) ?? "").length);
      await b.click({ timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(700);
      const afterState =
        page.url() + String(((await page.textContent("body").catch(() => "")) ?? "").length);
      if (totalErrors(consoleErrors) > beforeErr + 2) {
        issues.push({
          fingerprint: `pw:tap-error:${label || i}`,
          severity: "P1",
          source: "gate",
          title: `Tapping "${label || `button ${i}`}" throws console errors`,
          detail: [...consoleErrors.keys()].slice(-3).join("\n"),
        });
      } else if (beforeState === afterState && label) {
        deadTaps++;
      }
      // Paywall detection anywhere along the way
      const body = ((await page.textContent("body").catch(() => "")) ?? "").toLowerCase();
      if (/(unlock|subscribe|go pro|premium|free trial|\/week|\/month)/.test(body)) {
        paywallReachable = true;
      }
      await page.goBack({ timeout: 2500 }).catch(() => {});
      await page.waitForTimeout(400);
    }
    if (deadTaps >= 4) {
      issues.push({
        fingerprint: "pw:dead-taps",
        severity: "P1",
        source: "gate",
        title: `${deadTaps} buttons visibly do nothing when tapped`,
        detail: "multiple interactive elements produce no state change",
      });
    }

    await shot(page, shotsDir, "99-final", screenshots);
  } finally {
    await browser.close().catch(() => {});
    server.close();
  }

  // Console error rollup — 1 fingerprint per distinct error class.
  const errs = [...consoleErrors.entries()].filter(
    ([k]) => !/favicon|manifest|source map|net::ERR_FAILED.*fonts?/i.test(k),
  );
  for (const [text, count] of errs.slice(0, 5)) {
    issues.push({
      fingerprint: `pw:console:${text.slice(0, 48)}`,
      severity: count > 4 || /pageerror/.test(text) ? "P0" : "P1",
      source: "gate",
      title: `Console error (${count}x)`,
      detail: text,
    });
  }

  return {
    issues,
    screenshots,
    screensVisited,
    paywallReachable,
    consoleErrorCount: totalErrors(consoleErrors),
  };
}

const totalErrors = (m: Map<string, number>) => [...m.values()].reduce((a, b) => a + b, 0);

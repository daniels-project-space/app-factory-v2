import type { Metadata } from "next";
import { headers } from "next/headers";
import { fetchQuery } from "convex/nextjs";
import QRCode from "qrcode";
import { api } from "@/../convex/_generated/api";

/**
 * PUBLIC share page. No factory chrome, no links back, noindex.
 * Styled with the shared app's own brand colors.
 */

export async function generateMetadata(props: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await props.params;
  const app = await fetchQuery(api.apps.byShareToken, { token }).catch(
    () => null,
  );
  return {
    title: app ? app.name : "Preview",
    description: app?.oneLiner,
    robots: { index: false, follow: false },
  };
}

/** Pick a readable text color on near-black for a possibly-dark brand hex. */
function readable(hex: string | undefined, fallback: string): string {
  if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex)) return fallback;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum < 70 ? fallback : hex;
}

export default async function SharePage(props: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await props.params;
  const app = await fetchQuery(api.apps.byShareToken, { token }).catch(
    () => null,
  );

  if (!app) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
        <p className="font-mono text-sm text-neutral-500">
          Nothing here.
        </p>
      </div>
    );
  }

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "https";
  const shareUrl = `${proto}://${host}/s/${token}`;

  const qr = await QRCode.toDataURL(shareUrl, {
    margin: 1,
    width: 220,
    color: { dark: "#0a0a0a", light: "#ffffff" },
  });

  const primary = readable(app.brand?.primary, "#f5f2ea");
  const accent = readable(app.brand?.accent ?? app.brand?.primary, "#8f8a80");

  return (
    <div
      className="min-h-screen bg-[#0a0a0a] text-white"
      style={{
        background: `radial-gradient(ellipse 80% 55% at 50% -10%, ${accent}22, transparent), #0a0a0a`,
      }}
    >
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center px-6 py-10">
        <h1
          className="text-center text-4xl font-bold tracking-tight"
          style={{ color: primary, fontFamily: "var(--font-archivo)" }}
        >
          {app.name}
        </h1>
        <p className="mt-3 max-w-sm text-center text-[15px] leading-relaxed text-neutral-400">
          {app.oneLiner}
        </p>

        {/* phone frame */}
        <div className="mt-8 w-full max-w-[300px]">
          <div
            className="rounded-[42px] p-[10px]"
            style={{
              background: "#1a1a1a",
              boxShadow: `0 0 0 1px #333, 0 24px 80px -20px ${accent}44`,
            }}
          >
            <div className="relative overflow-hidden rounded-[32px] bg-black">
              <div className="absolute left-1/2 top-2 z-10 h-[20px] w-[90px] -translate-x-1/2 rounded-full bg-black" />
              {app.demoBuildKey ? (
                <iframe
                  src={`/demo/${app.slug}/`}
                  title={`${app.name} live demo`}
                  className="h-[590px] w-full border-0 bg-white"
                />
              ) : (
                <div className="flex h-[590px] w-full flex-col items-center justify-center gap-4 bg-[#101010] px-8">
                  <div
                    className="h-3 w-3 animate-pulse rounded-full"
                    style={{ background: accent }}
                  />
                  <p
                    className="text-center text-lg font-semibold"
                    style={{ color: primary }}
                  >
                    Demo brewing
                  </p>
                  <p className="text-center text-[13px] leading-relaxed text-neutral-500">
                    {app.name} is on the production line right now. Check back
                    soon — this page updates automatically with the latest
                    build.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* QR */}
        <div className="mt-10 flex flex-col items-center gap-3">
          <div
            className="rounded-2xl bg-white p-3"
            style={{ boxShadow: `0 0 0 1px ${accent}55` }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt="QR code for this page" width={150} height={150} />
          </div>
          <p className="text-[12px] uppercase tracking-[0.2em] text-neutral-500">
            Scan to open on your phone
          </p>
        </div>

        <footer className="mt-auto pt-12 pb-2">
          <p className="text-[11px] uppercase tracking-[0.25em] text-neutral-600">
            Built by App Factory
          </p>
        </footer>
      </div>
    </div>
  );
}

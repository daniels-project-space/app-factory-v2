"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { money } from "@/lib/format";

const LINKS = [
  { href: "/", label: "Factory" },
  { href: "/ideas", label: "Ideas" },
  { href: "/forge", label: "Forge" },
  { href: "/settings", label: "Settings" },
];

export function Nav() {
  const pathname = usePathname();
  const settings = useQuery(api.intake.getSettings);
  const updateSettings = useMutation(api.intake.updateSettings);

  const today = new Date().toISOString().slice(0, 10);
  const spent =
    settings && settings.budgetDay === today ? settings.spentTodayUsd : 0;
  const running = settings?.running ?? true;

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-void/95 backdrop-blur-sm">
      <div className="hazard-thin h-[3px]" />
      <div className="mx-auto max-w-[1600px] px-3 sm:px-5">
        <div className="flex h-12 items-center gap-4">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <span className="hazard block h-4 w-4" />
            <span className="font-display font-bold uppercase tracking-[0.22em] text-[14px] text-ink">
              App<span className="text-amber">Factory</span>
            </span>
          </Link>

          <nav className="hidden sm:flex items-center gap-1 ml-2">
            {LINKS.map((l) => {
              const active =
                l.href === "/"
                  ? pathname === "/" || pathname.startsWith("/apps")
                  : pathname.startsWith(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`font-mono text-[11px] uppercase tracking-[0.16em] px-3 py-1.5 border transition-colors ${
                    active
                      ? "border-amber/60 text-amber bg-amber/5"
                      : "border-transparent text-ink-dim hover:text-ink"
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-3 sm:gap-5">
            {settings && (
              <>
                <div className="hidden md:flex flex-col items-end leading-none">
                  <span className="microlabel">Spend today</span>
                  <span
                    className={`font-mono text-[12px] mt-0.5 ${
                      spent >= settings.dailyBudgetUsd
                        ? "text-red"
                        : "text-ink"
                    }`}
                  >
                    {money(spent)}
                    <span className="text-ink-faint">
                      {" "}
                      / {money(settings.dailyBudgetUsd)}
                    </span>
                  </span>
                </div>
                <div className="hidden md:flex flex-col items-end leading-none">
                  <span className="microlabel">Conc</span>
                  <span className="font-mono text-[12px] mt-0.5 text-ink">
                    {settings.maxConcurrent}
                  </span>
                </div>
              </>
            )}
            <button
              onClick={() => updateSettings({ running: !running })}
              title={running ? "Kill switch: halt the factory" : "Resume the factory"}
              className={`flex items-center gap-2 border px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors cursor-pointer ${
                running
                  ? "border-green/40 text-green hover:border-green"
                  : "border-red/60 text-red hover:border-red bg-red/5"
              }`}
            >
              <span className={`led ${running ? "led-ok" : "led-failed"}`} />
              {running ? "Running" : "Halted"}
            </button>
          </div>
        </div>

        {/* mobile nav row */}
        <nav className="flex sm:hidden items-center gap-1 pb-2 -mt-1 overflow-x-auto">
          {LINKS.map((l) => {
            const active =
              l.href === "/"
                ? pathname === "/" || pathname.startsWith("/apps")
                : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`font-mono text-[11px] uppercase tracking-[0.16em] px-3 py-1 border transition-colors ${
                  active
                    ? "border-amber/60 text-amber bg-amber/5"
                    : "border-line text-ink-dim"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

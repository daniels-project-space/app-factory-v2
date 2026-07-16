"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode, useMemo } from "react";

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  // This app owns its Convex deployment. Keep that binding project-specific so
  // a stale workspace-wide NEXT_PUBLIC_CONVEX_URL cannot silently point the UI
  // at another app (the previous Vercel value was a placeholder deployment).
  const convexUrl =
    process.env.NEXT_PUBLIC_FACTORY_CONVEX_URL ??
    "https://successful-starling-140.convex.cloud";
  const client = useMemo(
    () => new ConvexReactClient(convexUrl),
    [convexUrl],
  );
  return <ConvexProvider client={client}>{children}</ConvexProvider>;
}

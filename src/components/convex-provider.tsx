"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode, useMemo } from "react";

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  // This app owns its Convex deployment. Its Vercel project is bound to this
  // app-scoped value; do not allow a second legacy variable to override it.
  const convexUrl =
    process.env.NEXT_PUBLIC_CONVEX_URL ??
    "https://successful-starling-140.eu-west-1.convex.cloud";
  const client = useMemo(
    () => new ConvexReactClient(convexUrl),
    [convexUrl],
  );
  return <ConvexProvider client={client}>{children}</ConvexProvider>;
}

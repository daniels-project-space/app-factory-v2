import { Nav } from "@/components/nav";
import Script from "next/script";

export default function FactoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="flex min-h-screen flex-col">
        <Nav />
        <main className="mx-auto w-full max-w-[1600px] flex-1 px-3 py-4 sm:px-5 sm:py-6">
          {children}
        </main>
        <footer className="border-t border-line px-5 py-3">
          <span className="microlabel">
            App Factory v2 · autonomous production line
          </span>
        </footer>
      </div>
      <Script
        src="https://jarvis-orcin-six.vercel.app/jarvis-embed.js?v=universal-controls-20260719-1"
        strategy="afterInteractive"
        data-jarvis-app="app-factory-v2"
      />
    </>
  );
}

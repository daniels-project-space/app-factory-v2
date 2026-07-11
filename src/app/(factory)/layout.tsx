import { Nav } from "@/components/nav";

export default function FactoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
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
  );
}

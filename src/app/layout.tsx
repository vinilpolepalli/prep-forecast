import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Prep Forecast: forecast, prep, learn (sample restaurant)",
  description: "Independent demo: a deterministic forecast-to-prep loop with a bias-correcting learn step. Sample restaurant data.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

const NAV = [["/", "Desk"], ["/prep/today", "Prep"], ["/purchasing", "Purchasing"], ["/learn", "Learn loop"], ["/review", "Waste review"]] as const;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-ground text-ink">
        <header className="border-b border-line bg-white no-print">
          <div className="mx-auto max-w-6xl px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2">
            <Link href="/" className="font-bold tracking-tight text-lg">Prep Forecast</Link>
            <span className="chip chip-sample">SAMPLE restaurant</span>
            <nav className="flex flex-wrap gap-x-4 gap-y-1 text-sm font-medium text-ink-mute sm:ml-auto">
              {NAV.map(([h, l]) => <Link key={h} href={h} className="hover:text-accent py-1">{l}</Link>)}
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 py-5 flex-1">{children}</main>
        <footer className="border-t border-line text-xs text-ink-mute">
          <p className="mx-auto max-w-6xl px-4 py-4">Demo built by Vinil Polepalli - engine and data flow are real; restaurant, menu and costs are sample data. Independent demo; not affiliated with or endorsed by Marble.</p>
        </footer>
      </body>
    </html>
  );
}

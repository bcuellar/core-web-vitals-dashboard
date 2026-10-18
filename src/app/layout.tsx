import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Web Vitals Observatory", template: "%s · Web Vitals Observatory" },
  description: "Track Core Web Vitals and PageSpeed Insights trends across your websites.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full">
      <body className="flex min-h-full flex-col font-sans">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight text-slate-900">
              <span aria-hidden className="grid size-7 place-items-center rounded-lg bg-indigo-600 text-sm text-white">
                ◉
              </span>
              Web Vitals Observatory
            </Link>
            <a
              href="https://web.dev/articles/vitals"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-slate-500 hover:text-slate-900"
            >
              About Core Web Vitals ↗
            </a>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">{children}</main>
        <footer className="border-t border-slate-200 py-4 text-center text-xs text-slate-400">
          Field data: Chrome UX Report (p75, trailing 28 days) · Lab data: Lighthouse via PageSpeed Insights
        </footer>
      </body>
    </html>
  );
}

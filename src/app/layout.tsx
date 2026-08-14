import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TuneView — REW Measurement Viewer",
  description: "Read-only viewer for REW SPL and impulse measurements",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#0b1120] text-slate-200">
        <header className="border-b border-slate-800/80 bg-slate-950/40">
          <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
            <a href="/" className="flex items-center gap-2">
              <span className="text-lg font-semibold tracking-tight text-white">
                Tune<span className="text-sky-400">View</span>
              </span>
            </a>
            <nav className="ml-auto flex items-center gap-4 text-sm text-slate-400">
              <a href="/" className="hover:text-white">
                Tunes
              </a>
              <a href="/upload" className="hover:text-white">
                Upload
              </a>
              <a href="/admin" className="hover:text-white">
                Admin
              </a>
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">{children}</main>
      </body>
    </html>
  );
}

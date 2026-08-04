import type { Metadata } from "next";
import { Figtree, Instrument_Serif } from "next/font/google";
import { Nav } from "@/components/Nav";
import "./globals.css";

const body = Figtree({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const display = Instrument_Serif({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400"],
});

export const metadata: Metadata = {
  title: "MovieBoxd",
  description:
    "A personal movie recommender with Letterboxd import, watched archive, and TMDB-backed For You picks.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${body.variable} ${display.variable} h-full`}>
      <body className="min-h-full antialiased">
        <div className="relative z-10 flex min-h-full flex-col">
          <Nav />
          <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-8 sm:px-8 sm:py-10">
            {children}
          </main>
          <footer className="mx-auto w-full max-w-6xl px-5 pb-8 text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)] sm:px-8">
            MovieBoxd · single-seat screening room
          </footer>
        </div>
      </body>
    </html>
  );
}

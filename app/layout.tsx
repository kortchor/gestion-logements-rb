import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AuthProvider } from "./context/AuthContext";
import "./globals.css";
import Header from "@/app/components/Header";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'Gestion Logements - Les Roches Blanches',
  description: 'Application de gestion des logements saisonniers',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body className={`${inter.className} bg-slate-50 text-slate-900`}>
        <AuthProvider>
          <div className="relative min-h-screen overflow-x-hidden">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.12),_transparent_32%),radial-gradient(circle_at_top_right,_rgba(15,23,42,0.08),_transparent_28%),linear-gradient(to_bottom,_rgba(255,255,255,0.9),_rgba(248,250,252,1))]" />
            <div className="pointer-events-none absolute left-0 top-24 h-72 w-72 rounded-full bg-cyan-200/30 blur-3xl" />
            <div className="pointer-events-none absolute right-0 top-96 h-80 w-80 rounded-full bg-slate-200/40 blur-3xl" />
            <div className="relative z-10">
              <Header />
              <main className="mx-auto w-full max-w-[1600px] px-4 pb-10 pt-4 sm:px-6 lg:px-8">
                {children}
              </main>
            </div>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
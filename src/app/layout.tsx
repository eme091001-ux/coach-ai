import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";
import { NextAuthProvider } from "@/components/providers/SessionProvider";
import { auth } from "@/auth";

export const metadata: Metadata = {
  title: "CoachAI — 面談フィードバック",
  description: "AI面談・営業フィードバック自動生成ツール",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let session = null;
  try {
    session = await auth();
  } catch {
    // Auth not configured or secret missing
  }

  return (
    <html lang="ja">
      <body className="bg-gray-50 text-gray-900 antialiased">
        <NextAuthProvider session={session}>
          {session ? (
            <div className="flex h-screen overflow-hidden">
              <Sidebar />
              <main className="flex-1 overflow-y-auto">{children}</main>
            </div>
          ) : (
            children
          )}
        </NextAuthProvider>
      </body>
    </html>
  );
}

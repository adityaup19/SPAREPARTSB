import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { getCurrentUser } from "@/lib/auth";
import { AuthProvider } from "@/components/auth-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Spare Parts Tracker",
  description: "Internal warehouse spare parts inventory management system",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <html lang="en">
      <body className={inter.className}>
        {user ? (
          <div className="min-h-screen bg-gray-50">
            <Sidebar user={user} />
            <MobileNav />
            <main className="lg:pl-64">
              <div className="p-4 sm:p-6 lg:p-8 pt-16 lg:pt-6 pb-24 lg:pb-8">
                <AuthProvider user={user}>{children}</AuthProvider>
              </div>
            </main>
          </div>
        ) : (
          children
        )}
      </body>
    </html>
  );
}

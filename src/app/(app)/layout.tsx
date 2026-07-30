import { AccessDenied } from "@/components/access-denied";
import { AuthProvider } from "@/components/auth-provider";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Sidebar } from "@/components/layout/sidebar";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

/**
 * Shell for every signed-in page. Sign-in and password screens sit outside this
 * group so they render without warehouse navigation.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (session.status === "anonymous") redirect("/login");

  // A signed-in identity without an active profile never sees warehouse data.
  if (session.status === "denied") {
    return <AccessDenied email={session.email} reason={session.reason} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar user={session.user} />
      <MobileNav />
      <main className="lg:pl-64">
        <div className="p-4 sm:p-6 lg:p-8 pt-16 lg:pt-6 pb-24 lg:pb-8">
          <AuthProvider user={session.user}>{children}</AuthProvider>
        </div>
      </main>
    </div>
  );
}

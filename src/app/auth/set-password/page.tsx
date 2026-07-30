import { PasswordSetup } from "@/components/password-setup";
import { Suspense } from "react";

export default function SetPasswordPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-slate-950" />}>
      <PasswordSetup mode="invite" />
    </Suspense>
  );
}

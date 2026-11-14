import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";

async function Welcome() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (error || !claims) {
    return (
      <p className="text-destructive">
        We couldn&apos;t start your session. Refresh the page to try again.
      </p>
    );
  }

  if (claims.is_anonymous || !claims.email) {
    return (
      <p className="text-muted-foreground">
        Guest session{" "}
        <span className="font-mono">{claims.sub.slice(0, 8)}</span>. No account
        needed, and only you can see what you add here.
      </p>
    );
  }

  return (
    <p className="text-muted-foreground">Signed in as {claims.email}</p>
  );
}

export default function ProtectedPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <Suspense>
        <Welcome />
      </Suspense>
    </div>
  );
}

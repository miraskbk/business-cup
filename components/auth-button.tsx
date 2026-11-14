import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "./logout-button";

/**
 * The app needs no sign-up: visitors get an anonymous session from the proxy.
 * So the navbar only shows account controls for someone who signed in with a
 * real (email) account; guests see nothing here.
 */
export async function AuthButton() {
  const supabase = await createClient();

  // You can also use getUser() which will be slower.
  const { data } = await supabase.auth.getClaims();

  const user = data?.claims;

  if (!user || user.is_anonymous || !user.email) {
    return null;
  }

  return (
    <div className="flex items-center gap-4">
      Hey, {user.email}!
      <LogoutButton />
    </div>
  );
}

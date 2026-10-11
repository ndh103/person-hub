import { jsonOk, rejectUnsafePost } from "@/lib/server/http";
import { createClient } from "@/lib/supabase/server";

/** AUTH-006: end this browser's session (local scope, requirements A4). */
export async function POST(request: Request) {
  const rejected = rejectUnsafePost(request);
  if (rejected) return rejected;

  const supabase = await createClient();
  // Even if revoking the refresh token fails, signOut clears this browser's
  // session cookies, so the user is signed out here either way.
  await supabase.auth.signOut({ scope: "local" });

  return jsonOk({ redirectTo: "/sign-in?signed_out=1" });
}

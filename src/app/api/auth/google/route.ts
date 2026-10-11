import { safeNext } from "@/lib/auth/safe-next";
import { getSiteOrigin, siteUrl } from "@/lib/auth/site-url";
import { jsonError, jsonOk, readJsonObject, rejectUnsafePost } from "@/lib/server/http";
import { supabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

/**
 * AUTH-003: start Google sign-in. Returns the provider URL for the page to
 * navigate to. The PKCE code verifier cookie is set on this response and is
 * needed later by /auth/callback.
 */
export async function POST(request: Request) {
  const rejected = rejectUnsafePost(request);
  if (rejected) return rejected;

  const body = (await readJsonObject(request)) ?? {};
  const callback = siteUrl("/auth/callback");
  callback.searchParams.set("next", safeNext(body.next, getSiteOrigin()));

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: callback.toString(), skipBrowserRedirect: true },
  });

  // Only ever send the browser to this project's Auth server.
  if (error || !data.url || new URL(data.url).origin !== new URL(supabaseEnv().url).origin) {
    return jsonError("unavailable", 503);
  }

  return jsonOk({ url: data.url });
}

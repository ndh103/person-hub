import { redirect } from "next/navigation";
import { DEFAULT_NEXT } from "@/lib/auth/safe-next";

/** "/" has no content of its own; proxy.ts sends signed-out visitors to /sign-in first. */
export default function RootPage() {
  redirect(DEFAULT_NEXT);
}

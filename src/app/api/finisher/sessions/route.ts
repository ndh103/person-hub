import { markSession } from "@/features/finisher/server/mutations";
import { handleFinisherRequest } from "@/features/finisher/server/route";

/** FIN-027: set a session to done | skipped | unmarked. Idempotent. Body: { slotId, date, state } */
export async function PUT(request: Request) {
  return handleFinisherRequest(request, { mutation: true, body: true }, (body) => markSession(body));
}

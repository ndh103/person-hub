import { addSlot } from "@/features/finisher/server/mutations";
import { handleFinisherRequest } from "@/features/finisher/server/route";

/** FIN-025: add a weekly slot; sessions start today. */
export async function POST(request: Request, ctx: RouteContext<"/api/finisher/projects/[id]/slots">) {
  const { id } = await ctx.params;
  return handleFinisherRequest(request, { mutation: true, body: true }, (body) => addSlot(id, body));
}

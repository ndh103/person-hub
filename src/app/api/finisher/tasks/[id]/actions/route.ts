import { taskAction } from "@/features/finisher/server/mutations";
import { handleFinisherRequest } from "@/features/finisher/server/route";

/** Task lifecycle: { action: done | park | unpark | let_go | reopen, revisitDate?, reason? } */
export async function POST(request: Request, ctx: RouteContext<"/api/finisher/tasks/[id]/actions">) {
  const { id } = await ctx.params;
  return handleFinisherRequest(request, { mutation: true, body: true }, (body) => taskAction(id, body));
}

import { projectAction } from "@/features/finisher/server/mutations";
import { handleFinisherRequest } from "@/features/finisher/server/route";

/** Project lifecycle: { action: finish | park | unpark | let_go | reopen, revisitDate?, reason?, reflection? } */
export async function POST(request: Request, ctx: RouteContext<"/api/finisher/projects/[id]/actions">) {
  const { id } = await ctx.params;
  return handleFinisherRequest(request, { mutation: true, body: true }, (body) => projectAction(id, body));
}

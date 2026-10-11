import { deleteProject, updateProject } from "@/features/finisher/server/mutations";
import { handleFinisherRequest } from "@/features/finisher/server/route";

/** FIN-024: edit an Active or Parked project. */
export async function PATCH(request: Request, ctx: RouteContext<"/api/finisher/projects/[id]">) {
  const { id } = await ctx.params;
  return handleFinisherRequest(request, { mutation: true, body: true }, async (body) => {
    await updateProject(id, body);
    return { ok: true };
  });
}

/** FIN-016: delete a project, its slots and session records. Linked tasks are kept, unlinked. */
export async function DELETE(request: Request, ctx: RouteContext<"/api/finisher/projects/[id]">) {
  const { id } = await ctx.params;
  return handleFinisherRequest(request, { mutation: true }, async () => {
    await deleteProject(id);
    return { ok: true };
  });
}

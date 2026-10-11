import { deleteTask, updateTask } from "@/features/finisher/server/mutations";
import { handleFinisherRequest } from "@/features/finisher/server/route";

/** FIN-020: edit an Open or Parked task. */
export async function PATCH(request: Request, ctx: RouteContext<"/api/finisher/tasks/[id]">) {
  const { id } = await ctx.params;
  return handleFinisherRequest(request, { mutation: true, body: true }, async (body) => {
    await updateTask(id, body);
    return { ok: true };
  });
}

/** FIN-016: delete a task permanently. */
export async function DELETE(request: Request, ctx: RouteContext<"/api/finisher/tasks/[id]">) {
  const { id } = await ctx.params;
  return handleFinisherRequest(request, { mutation: true }, async () => {
    await deleteTask(id);
    return { ok: true };
  });
}

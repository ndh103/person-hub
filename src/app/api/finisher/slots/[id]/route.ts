import { removeSlot, updateSlot } from "@/features/finisher/server/mutations";
import { handleFinisherRequest } from "@/features/finisher/server/route";

/** FIN-025: edit a slot from today forward. */
export async function PATCH(request: Request, ctx: RouteContext<"/api/finisher/slots/[id]">) {
  const { id } = await ctx.params;
  return handleFinisherRequest(request, { mutation: true, body: true }, async (body) => {
    await updateSlot(id, body);
    return { ok: true };
  });
}

/** FIN-025: remove a slot; past session records are kept. */
export async function DELETE(request: Request, ctx: RouteContext<"/api/finisher/slots/[id]">) {
  const { id } = await ctx.params;
  return handleFinisherRequest(request, { mutation: true }, async () => {
    await removeSlot(id);
    return { ok: true };
  });
}

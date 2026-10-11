import { getClosed } from "@/features/finisher/server/queries";
import { handleFinisherRequest } from "@/features/finisher/server/route";

/** FIN-032 "Load more": GET ?type=all|tasks|projects&outcome=all|completed|let_go&cursor=<closed_at> */
export async function GET(request: Request) {
  return handleFinisherRequest(request, { mutation: false }, async () => {
    const params = new URL(request.url).searchParams;
    const data = await getClosed(params.get("type"), params.get("outcome"), params.get("cursor"));
    return { page: data.page };
  });
}

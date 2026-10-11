import { createProject } from "@/features/finisher/server/mutations";
import { handleFinisherRequest } from "@/features/finisher/server/route";

/** FIN-023: create a project with its first slots. */
export async function POST(request: Request) {
  return handleFinisherRequest(request, { mutation: true, body: true }, (body) => createProject(body));
}

import { createTask } from "@/features/finisher/server/mutations";
import { getTaskGroup, isTaskGroup, TASK_PAGE_SIZE } from "@/features/finisher/server/queries";
import { FinisherError } from "@/features/finisher/server/errors";
import { handleFinisherRequest } from "@/features/finisher/server/route";

const MAX_OFFSET = 10_000;

/** FIN-022 "Load more": GET ?group=overdue|today|upcoming|nodate|parked&project=all|none|<id>&offset=N */
export async function GET(request: Request) {
  return handleFinisherRequest(request, { mutation: false }, async () => {
    const params = new URL(request.url).searchParams;
    const group = params.get("group");
    const offset = Number(params.get("offset") ?? "0");
    if (!isTaskGroup(group) || !Number.isInteger(offset) || offset < 0 || offset > MAX_OFFSET || offset % TASK_PAGE_SIZE) {
      throw new FinisherError("invalid_request", 400);
    }
    return getTaskGroup(group, params.get("project"), offset);
  });
}

/** FIN-019: create a task. */
export async function POST(request: Request) {
  return handleFinisherRequest(request, { mutation: true, body: true }, (body) => createTask(body));
}

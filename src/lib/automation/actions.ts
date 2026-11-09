import { getSite } from "./registry";
import { touchSession } from "./sessions";
import { AutomationError } from "./errors";
import type { SiteOperation } from "./types";

function findOperation(operations: SiteOperation[], name: string, kind: string) {
  const operation = operations.find((item) => item.name === name);
  if (!operation) {
    throw new AutomationError("unknown_operation", `${kind} 동작 '${name}' 은 없습니다.`);
  }
  return operation;
}

export async function runQuery(sessionId: string, operation: string, input: Record<string, unknown>) {
  const session = touchSession(sessionId);
  const site = getSite(session.site);
  const spec = findOperation(site.queryOperations, operation, "조회");
  if (spec.requiresLogin && !session.loggedIn) {
    throw new AutomationError("login_required", "먼저 로그인해야 합니다.", 401);
  }
  const data = await site.query(session.page, operation, input);
  return { operation, data };
}

export async function runRegister(sessionId: string, operation: string, input: Record<string, unknown>) {
  const session = touchSession(sessionId);
  const site = getSite(session.site);
  const spec = findOperation(site.registerOperations, operation, "등록");
  if (spec.requiresLogin && !session.loggedIn) {
    throw new AutomationError("login_required", "먼저 로그인해야 합니다.", 401);
  }
  const data = await site.register(session.page, operation, input);
  return { operation, data };
}

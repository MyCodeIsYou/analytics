import { launchBrowser } from "./browser";
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

export async function runJob(body: Record<string, unknown>) {
  if (typeof body.site !== "string" || !body.site.trim()) {
    throw new AutomationError("invalid_body", "site 를 입력해 주세요.");
  }
  const site = getSite(body.site.trim());
  const action = body.action;
  if (action !== "login" && action !== "query" && action !== "register") {
    throw new AutomationError("invalid_body", "action 은 login, query, register 중 하나여야 합니다.");
  }

  const username = typeof body.username === "string" ? body.username.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if ((username && !password) || (!username && password)) {
    throw new AutomationError("invalid_body", "username 과 password 를 함께 보내 주세요.");
  }

  const browser = await launchBrowser();
  try {
    const context = await browser.newContext({
      locale: "ko-KR",
      viewport: { width: 1280, height: 900 },
    });
    const page = await context.newPage();
    page.setDefaultTimeout(25_000);
    page.setDefaultNavigationTimeout(35_000);
    await page.goto(site.startUrl, { waitUntil: "domcontentloaded" });

    let loggedIn = false;
    if (username) {
      const result = await site.login(page, { username, password });
      if (!result.ok) throw new AutomationError("login_failed", result.message, 401);
      loggedIn = true;
    }

    if (action === "login") {
      if (!loggedIn) {
        throw new AutomationError("invalid_body", "로그인하려면 username 과 password 가 필요합니다.");
      }
      const opened = site.openHome ? await site.openHome(page) : undefined;
      const pages = Array.isArray(opened?.pages) ? opened.pages : [];
      const screen = pages.find(
        (item) => item && typeof item === "object" && "html" in item && typeof item.html === "string" && item.html,
      );
      const failed = pages.filter(
        (item) => item && typeof item === "object" && "error" in item && typeof item.error === "string",
      );
      const screenError =
        !screen && failed.length > 0
          ? failed.map((item) => `${"name" in item ? item.name : "화면"}: ${item.error}`).join("\n")
          : undefined;
      return {
        action,
        loggedIn,
        message: "로그인되었습니다.",
        ...(pages.length > 0 ? { pages } : {}),
        ...(screen ? { screen } : {}),
        ...(screenError ? { screenError } : {}),
      };
    }

    const operation = typeof body.operation === "string" ? body.operation.trim() : "";
    if (!operation) throw new AutomationError("invalid_body", "operation 을 입력해 주세요.");
    const input =
      body.input && typeof body.input === "object" && !Array.isArray(body.input)
        ? (body.input as Record<string, unknown>)
        : {};
    const operations = action === "query" ? site.queryOperations : site.registerOperations;
    const spec = findOperation(operations, operation, action === "query" ? "조회" : "등록");
    if (spec.requiresLogin && !loggedIn) {
      throw new AutomationError("login_required", "이 동작은 username 과 password 가 필요합니다.", 401);
    }

    const data =
      action === "query" ? await site.query(page, operation, input) : await site.register(page, operation, input);
    return { action, operation, loggedIn, data };
  } finally {
    await browser.close().catch(() => undefined);
  }
}

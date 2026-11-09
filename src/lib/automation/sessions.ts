import type { Browser, BrowserContext, Page } from "playwright-core";
import { launchBrowser, onVercel } from "./browser";
import { AutomationError } from "./errors";
import { getSite } from "./registry";

export type AutomationSession = {
  id: string;
  site: string;
  context: BrowserContext;
  page: Page;
  createdAt: number;
  lastUsedAt: number;
  loggedIn: boolean;
};

type Store = {
  browser: Promise<Browser> | null;
  sessions: Map<string, AutomationSession>;
  sweeper: ReturnType<typeof setInterval> | null;
};

const globalStore = globalThis as typeof globalThis & { __automationStore?: Store };

function store(): Store {
  if (!globalStore.__automationStore) {
    globalStore.__automationStore = { browser: null, sessions: new Map(), sweeper: null };
  }
  return globalStore.__automationStore;
}

function ttlMs() {
  const parsed = Number(process.env.AUTOMATION_SESSION_TTL_MS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 30 * 60 * 1000;
}

function maxSessions() {
  const parsed = Number(process.env.AUTOMATION_MAX_SESSIONS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 4;
}

async function browser() {
  const current = store();
  if (!current.browser) {
    current.browser = launchBrowser().catch((error: unknown) => {
      current.browser = null;
      throw error;
    });
  }
  return current.browser;
}

function ensureSweeper() {
  const current = store();
  if (current.sweeper) return;
  current.sweeper = setInterval(() => {
    const expiredBefore = Date.now() - ttlMs();
    for (const session of current.sessions.values()) {
      if (session.lastUsedAt < expiredBefore) {
        void closeSession(session.id);
      }
    }
  }, 60_000);
  current.sweeper.unref?.();
}

export async function openSession(siteId: string): Promise<AutomationSession> {
  if (onVercel()) {
    throw new AutomationError(
      "use_run",
      "Vercel에서는 브라우저 세션을 유지할 수 없습니다. POST /api/automation/run 을 사용하세요.",
      400,
    );
  }
  const site = getSite(siteId);
  const current = store();
  if (current.sessions.size >= maxSessions()) {
    throw new AutomationError("too_many_sessions", "열려 있는 세션이 너무 많습니다.", 429);
  }

  const context = await (await browser()).newContext({
    locale: "ko-KR",
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  page.setDefaultTimeout(30_000);
  page.setDefaultNavigationTimeout(45_000);

  try {
    await page.goto(site.startUrl, { waitUntil: "domcontentloaded" });
  } catch {
    await context.close().catch(() => undefined);
    throw new AutomationError("navigation_failed", "사이트에 접속하지 못했습니다.", 502);
  }

  const session: AutomationSession = {
    id: crypto.randomUUID(),
    site: site.id,
    context,
    page,
    createdAt: Date.now(),
    lastUsedAt: Date.now(),
    loggedIn: false,
  };
  current.sessions.set(session.id, session);
  ensureSweeper();
  return session;
}

export function touchSession(id: string): AutomationSession {
  const session = store().sessions.get(id);
  if (!session) {
    throw new AutomationError("session_not_found", "세션을 찾을 수 없습니다.", 404);
  }
  session.lastUsedAt = Date.now();
  return session;
}

export async function closeSession(id: string) {
  const session = store().sessions.get(id);
  if (!session) return false;
  store().sessions.delete(id);
  await session.context.close().catch(() => undefined);
  return true;
}

export function sessionSummary(session: AutomationSession) {
  return {
    sessionId: session.id,
    site: session.site,
    loggedIn: session.loggedIn,
    createdAt: new Date(session.createdAt).toISOString(),
    url: session.page.url(),
  };
}

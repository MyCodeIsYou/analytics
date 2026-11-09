import type { Dialog, Page, Response } from "playwright";
import { AutomationError } from "@/lib/automation/errors";
import type { SiteAdapter } from "@/lib/automation/types";
import { applyDrivingFields, clickDrivingSearch, type DrivingField } from "@/sites/drivingForm";

const ORIGIN = "https://www.xn--lu5b7kx8m.kr";
const SITE_PAGES = [
  { id: "notify", name: "공지", url: `${ORIGIN}/ms/public/notify.do` },
  { id: "driving", name: "차량운행일지", url: `${ORIGIN}/ms/driving.do` },
];

async function postForm(page: Page, path: string, fields: Record<string, string>) {
  return page.evaluate(
    async ({ path, fields }) => {
      const body = new URLSearchParams(fields);
      const response = await fetch(`${path}?v=${Date.now()}`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
        body,
      });
      const text = await response.text();
      try {
        return JSON.parse(text) as unknown;
      } catch {
        return { raw: text.slice(0, 500), status: response.status };
      }
    },
    { path, fields },
  );
}

function text(input: Record<string, unknown>, key: string) {
  const value = input[key];
  return typeof value === "string" ? value.trim() : "";
}

function pageNo(input: Record<string, unknown>) {
  const value = input.page;
  return typeof value === "number" && value > 0 ? String(Math.floor(value)) : "1";
}

async function companies(page: Page, input: Record<string, unknown>) {
  const data = (await postForm(page, "/cmpy.go", {
    actionID: "ACTION_CM_CMPY_LIST",
    pageNo: pageNo(input),
    sortField: "",
    sortDirection: "",
    search_bl_cd: text(input, "regionCode"),
    search_bm_cd: "",
    search_meas_cate: text(input, "category"),
    search_meas_item: "",
    search_meas_cmpy_name: text(input, "name"),
    search_evaluat_year: text(input, "year"),
  })) as {
    nTotalRecords?: number;
    nPageNo?: number;
    currList?: Array<Record<string, string>>;
  };

  const items = (data.currList ?? []).map((row) => ({
    id: row.meas_cmpy_no,
    name: row.meas_cmpy_name,
    tel: row.meas_cmpy_tel_no,
    email: row.contact_email,
    address: row.lab_addr,
    outairGrade: row.outair_cls_name,
    waterGrade: row.water_cls_name,
  }));

  return {
    total: data.nTotalRecords ?? items.length,
    page: data.nPageNo ?? Number(pageNo(input)),
    items,
  };
}

async function notices(page: Page) {
  const data = (await postForm(page, "/cm/pub/notify.go", {
    actionID: "ACTION_CM_PUBLIC_NOTIFY_LIST",
    search_alarm_yn: "Y",
  })) as { aaData?: Array<Record<string, string>> };

  return (data.aaData ?? []).map((row) => ({
    id: row.ntce_no,
    title: row.ntce_title,
  }));
}

function captureDocument() {
  document.querySelectorAll("nav li, aside li, #left-panel li").forEach((item) => {
    const child = item.querySelector(":scope > ul");
    if (!(child instanceof HTMLElement)) return;
    item.classList.add("open", "active");
    child.style.display = "block";
  });
  document.querySelectorAll("script").forEach((node) => node.remove());
  document.querySelectorAll("*").forEach((node) => {
    [...node.attributes].forEach((attribute) => {
      if (attribute.name.toLowerCase().startsWith("on")) node.removeAttribute(attribute.name);
    });
  });
  if (!document.querySelector("base")) {
    const base = document.createElement("base");
    base.href = `${location.origin}/`;
    document.head.prepend(base);
  }
  return {
    url: location.href,
    title: document.title,
    html: document.documentElement.outerHTML,
  };
}

function watchNetwork(page: Page) {
  const network: Array<{ url: string; status: number; data: unknown }> = [];
  const onResponse = async (response: Response) => {
    const type = response.request().resourceType();
    if (type !== "xhr" && type !== "fetch") return;
    const contentType = response.headers()["content-type"] ?? "";
    if (!contentType.includes("json") && !contentType.includes("text/plain") && !contentType.includes("text/html")) {
      return;
    }
    try {
      const text = await response.text();
      if (!text || text.length > 400_000) return;
      let data: unknown = text;
      try {
        data = JSON.parse(text) as unknown;
      } catch {
        data = text.slice(0, 20_000);
      }
      network.push({ url: response.url().split("?")[0], status: response.status(), data });
    } catch {
      // The body can already be consumed by the page.
    }
  };
  page.on("response", onResponse);
  return {
    network,
    stop() {
      page.off("response", onResponse);
    },
  };
}

async function gotoDocument(page: Page, url: string, name: string) {
  try {
    await page.goto(url, { waitUntil: "domcontentloaded" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (!message.includes("ERR_ABORTED")) throw error;
    await page.waitForLoadState("domcontentloaded", { timeout: 15_000 }).catch(() => undefined);
  }
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => undefined);
  await page.waitForTimeout(1_000);
  const landed = page.url();
  if (landed.includes("init.go") || landed.includes("LOGIN_NEED") || landed.includes("forward.go")) {
    throw new AutomationError("navigation_failed", `${name} 화면으로 이동하지 못했습니다.`, 502);
  }
}

async function readDocument(page: Page, name: string) {
  const view = await page.evaluate(captureDocument);
  if (view.html.length > 2_000_000) {
    throw new AutomationError("payload_too_large", `${name} 화면이 너무 커서 가져오지 못했습니다.`, 502);
  }
  return view;
}

async function openSitePage(page: Page, target: { id: string; name: string; url: string }) {
  const watch = watchNetwork(page);
  try {
    await gotoDocument(page, target.url, target.name);
    const view = await readDocument(page, target.name);
    return { id: target.id, name: target.name, ...view, network: watch.network.slice(-30) };
  } finally {
    watch.stop();
  }
}

function drivingFields(input: Record<string, unknown>): DrivingField[] {
  if (!Array.isArray(input.fields)) return [];
  const fields: DrivingField[] = [];
  for (const item of input.fields) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const value = typeof record.value === "string" ? record.value.trim() : "";
    const id = typeof record.id === "string" ? record.id : "";
    const name = typeof record.name === "string" ? record.name : "";
    if (!value || value.length > 500 || (!id && !name)) continue;
    fields.push({ id, name, value });
  }
  return fields.slice(0, 40);
}

function blocksSearch(message: string) {
  return /입력|선택|오류|실패|기간|확인/.test(message);
}

async function searchDriving(page: Page, input: Record<string, unknown>) {
  const fields = drivingFields(input);
  const watch = watchNetwork(page);
  let dialogMessage = "";
  const onDialog = (dialog: Dialog) => {
    dialogMessage = dialog.message();
    return dialog.accept();
  };
  page.on("dialog", onDialog);
  try {
    await gotoDocument(page, `${ORIGIN}/ms/driving.do`, "차량운행일지");
    if (fields.length > 0) await page.evaluate(applyDrivingFields, fields);
    const pending = page
      .waitForResponse(
        (response) => {
          const type = response.request().resourceType();
          return type === "xhr" || type === "fetch";
        },
        { timeout: 12_000 },
      )
      .catch(() => null);
    let clicked = false;
    try {
      clicked = await page.evaluate(clickDrivingSearch);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (!message.includes("Execution context was destroyed") && !message.includes("ERR_ABORTED")) throw error;
      clicked = true;
    }
    if (!clicked) throw new AutomationError("search_failed", "검색 버튼을 찾지 못했습니다.", 502);
    await pending;
    await page.waitForLoadState("domcontentloaded", { timeout: 15_000 }).catch(() => undefined);
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => undefined);
    await page.waitForTimeout(1_000);
    if (dialogMessage && blocksSearch(dialogMessage)) {
      throw new AutomationError("search_failed", dialogMessage, 422);
    }
    const landed = page.url();
    if (landed.includes("init.go") || landed.includes("LOGIN_NEED") || landed.includes("forward.go")) {
      throw new AutomationError("navigation_failed", "차량운행일지 조회 화면으로 이동하지 못했습니다.", 502);
    }
    const view = await readDocument(page, "차량운행일지");
    return {
      id: "driving",
      name: "차량운행일지",
      ...view,
      network: watch.network.slice(-30),
      ...(dialogMessage ? { notice: dialogMessage } : {}),
    };
  } finally {
    page.off("dialog", onDialog);
    watch.stop();
  }
}

async function openHome(page: Page) {
  const pages = [];
  for (const target of SITE_PAGES) {
    try {
      pages.push(await openSitePage(page, target));
    } catch (error) {
      pages.push({
        id: target.id,
        name: target.name,
        error: error instanceof Error && error.message ? error.message : `${target.name} 화면을 열지 못했습니다.`,
      });
    }
  }
  return { pages };
}

export const chookjeongin: SiteAdapter = {
  id: "chookjeongin",
  name: "측정인",
  startUrl: `${ORIGIN}/init.go`,
  queryOperations: [
    {
      name: "companies",
      description: "측정대행업체 목록. input: name, regionCode, category, year, page",
      requiresLogin: false,
    },
    {
      name: "notices",
      description: "상단 알림 공지 목록",
      requiresLogin: false,
    },
    {
      name: "driving",
      description: "차량운행일지 조회. input.fields 에 운행일, 측정분야, 차량번호, 사용인력, 차량운행일지 값이 있으면 넣고 검색합니다.",
      requiresLogin: true,
    },
  ],
  registerOperations: [],
  openHome,
  async login(page, credentials) {
    await page.goto(this.startUrl, { waitUntil: "domcontentloaded" });
    await page.locator("#user_email").fill(credentials.username);
    await page.locator("#login_pwd_confirm").fill(credentials.password);

    const dialog = page
      .waitForEvent("dialog", { timeout: 12_000 })
      .then(async (popup) => {
        const message = popup.message();
        await popup.accept();
        return message;
      })
      .catch(() => null);

    await page.locator("#login").click();
    const leftLogin = page
      .waitForFunction(() => !document.querySelector("#login-form"), null, { timeout: 12_000 })
      .then(() => "left" as const)
      .catch(() => null);
    const message = await Promise.race([dialog, leftLogin]);
    if (message && message !== "left") return { ok: false, message };

    const stillOnLogin = await page.locator("#login-form").count();
    if (stillOnLogin > 0) {
      return { ok: false, message: "로그인 화면에서 이동하지 못했습니다." };
    }
    return { ok: true, message: "로그인되었습니다." };
  },
  async query(page, operation, input) {
    if (operation === "companies") return companies(page, input);
    if (operation === "notices") return notices(page);
    if (operation === "driving") return searchDriving(page, input);
    throw new AutomationError("unknown_operation", `조회 동작 '${operation}' 은 없습니다.`);
  },
  async register(_page, operation) {
    throw new AutomationError(
      "not_implemented",
      `등록 동작 '${operation}' 은 아직 연결되지 않았습니다.`,
      501,
    );
  },
};

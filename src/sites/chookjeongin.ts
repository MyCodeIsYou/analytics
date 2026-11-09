import type { Page } from "playwright";
import { AutomationError } from "@/lib/automation/errors";
import type { SiteAdapter } from "@/lib/automation/types";

const ORIGIN = "https://www.xn--lu5b7kx8m.kr";

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
  ],
  registerOperations: [],
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

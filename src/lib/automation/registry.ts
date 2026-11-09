import { AutomationError } from "./errors";
import type { SiteAdapter } from "./types";
import { chookjeongin } from "@/sites/chookjeongin";

const sites = new Map<string, SiteAdapter>([[chookjeongin.id, chookjeongin]]);

export function listSites() {
  return [...sites.values()].map((site) => ({
    id: site.id,
    name: site.name,
    query: site.queryOperations,
    register: site.registerOperations,
  }));
}

export function getSite(id: string) {
  const site = sites.get(id);
  if (!site) {
    throw new AutomationError("unknown_site", `사이트 '${id}' 는 등록되어 있지 않습니다.`, 404);
  }
  return site;
}

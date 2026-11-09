import type { Page } from "playwright";

export type Credentials = {
  username: string;
  password: string;
};

export type LoginResult = {
  ok: boolean;
  message: string;
};

export type SiteOperation = {
  name: string;
  description: string;
  requiresLogin: boolean;
};

export type SiteAdapter = {
  id: string;
  name: string;
  startUrl: string;
  queryOperations: SiteOperation[];
  registerOperations: SiteOperation[];
  login: (page: Page, credentials: Credentials) => Promise<LoginResult>;
  openHome?: (page: Page) => Promise<Record<string, unknown>>;
  query: (page: Page, operation: string, input: Record<string, unknown>) => Promise<unknown>;
  register: (page: Page, operation: string, input: Record<string, unknown>) => Promise<unknown>;
};

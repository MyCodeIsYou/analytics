import { chromium as playwrightChromium, type Browser } from "playwright-core";

export function onVercel() {
  return process.env.VERCEL === "1";
}

export async function launchBrowser(): Promise<Browser> {
  if (onVercel()) {
    const { default: chromium } = await import("@sparticuz/chromium");
    chromium.setGraphicsMode = false;
    return playwrightChromium.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }

  return playwrightChromium.launch({
    headless: process.env.PLAYWRIGHT_HEADLESS !== "false",
  });
}

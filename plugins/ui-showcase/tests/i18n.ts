import { readFileSync } from "node:fs";
import type { PluginFrontendI18n } from "learnharness-plugin-api";

const english = JSON.parse(readFileSync(new URL("../locales/en.json", import.meta.url), "utf8")) as Record<string, string>;

/** The host's English lookup for unit fixtures; native tests use the real host. */
export const englishI18n: PluginFrontendI18n = {
  language: "en",
  t: (key, vars) => (english[key] ?? key).replace(/\{(\w+)\}/g, (match, name: string) => vars && Object.hasOwn(vars, name) ? String(vars[name]) : match),
};

import { readFileSync } from "node:fs";
import type { PluginBackendI18n, PluginFrontendI18n } from "learnharness-plugin-api";

const english = JSON.parse(readFileSync(new URL("../locales/en.json", import.meta.url), "utf8")) as Record<string, string>;

function translate(key: string, vars?: Readonly<Record<string, string | number>>): string {
  return (english[key] ?? key).replace(/\{(\w+)\}/g, (match, name: string) => vars && Object.hasOwn(vars, name) ? String(vars[name]) : match);
}

/** The host's English lookup for unit fixtures; native tests use the real host. */
export const englishI18n: PluginFrontendI18n = {
  language: "en",
  t: translate,
};

export const englishBackendI18n: PluginBackendI18n = {
  language: () => "en",
  t: (key, vars) => translate(key, vars),
};

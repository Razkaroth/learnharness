import type { PluginFrontendI18n } from "learnharness-plugin-api";
import english from "../locales/en.json" with { type: "json" };

type Vars = Parameters<PluginFrontendI18n["t"]>[1];
type Translator = { t(key: string, vars?: Vars, language?: string): string };

const dictionary = english as Record<string, string>;

function fromEnglish(key: string, vars?: Vars): string {
  const text = Object.hasOwn(dictionary, key) ? dictionary[key]! : key;
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (match, name: string) => Object.hasOwn(vars, name) ? String(vars[name]) : match);
}

let active: PluginFrontendI18n["t"] = fromEnglish;

/** Installs the host dictionary for this activation. The host re-activates
 * the plugin when the app language changes, so text is read at mount time. */
export function useI18n(i18n: Translator): void {
  active = (key, vars) => i18n.t(key, vars);
}

export function t(key: string, vars?: Vars): string {
  return active(key, vars);
}

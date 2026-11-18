import type { PluginFrontendI18n } from "learnharness-plugin-api";

let active: PluginFrontendI18n["t"] = key => key;

/** Installs the host dictionary for this activation. The host re-activates
 * the plugin when the app language changes, so text is read at mount time. */
export function useI18n(i18n: PluginFrontendI18n): void { active = (key, vars) => i18n.t(key, vars); }

export function t(key: string, vars?: Parameters<PluginFrontendI18n["t"]>[1]): string { return active(key, vars); }

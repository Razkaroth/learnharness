import english from "../locales/en.json" with { type: "json" };

type Vars = Readonly<Record<string, string | number>>;
type Lookup = (key: string, vars?: Vars) => string;

const fill = (text: string, vars?: Vars) =>
  vars ? text.replace(/\{(\w+)\}/g, (m, name: string) => Object.hasOwn(vars, name) ? String(vars[name]) : m) : text;

let active: Lookup = (key, vars) => fill((english as Record<string, string>)[key] ?? key, vars);

/** Installs the host dictionary for this activation. English applies until then.
 * The host re-activates the plugin when the app language changes. */
export function useI18n(i18n: { t: Lookup }): void {
  active = (key, vars) => i18n.t(key, vars);
}

export function t(key: string, vars?: Vars): string {
  return active(key, vars);
}

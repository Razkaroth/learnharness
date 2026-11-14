/**
 * Which plugin runtime serves the calling profile. Kept free of plugin and
 * store imports so the profile lifecycle (users.ts) can stop a runtime
 * without loading the plugin system.
 *
 * The unclaimed install's runtime lives in the original `__lhPlugins` slot;
 * each profile gets its own entry in `__lhProfilePlugins`, created lazily
 * by plugins.ts inside that profile's context.
 */
import { activeUserId, runAsUser } from "../../config.ts";

export const ROOT_PLUGIN_PROFILE = "root";

export interface PluginRuntimeEntry<H extends { dispose(): Promise<void> } = { dispose(): Promise<void> }> {
	host: H;
	/** Callers await this before using the host; a language sync extends it. */
	ready: Promise<void>;
	/** Re-activates backends when the profile's language differs from the one
	 *  they were activated in. */
	syncLanguage?(): Promise<void>;
}

interface RuntimeGlobal {
	__lhPlugins?: PluginRuntimeEntry;
	__lhProfilePlugins?: Map<string, PluginRuntimeEntry>;
}

const globals = () => globalThis as typeof globalThis & RuntimeGlobal;

/** The calling profile, or the root key on an unclaimed install. */
export function pluginProfile(): string {
	return activeUserId() ?? ROOT_PLUGIN_PROFILE;
}

/** Run inside `profile`'s context, so plugin callbacks read and write its records. */
export function inPluginProfile<T>(profile: string, fn: () => T): T {
	return profile === ROOT_PLUGIN_PROFILE ? fn() : runAsUser(profile, fn);
}

export function pluginRuntime<E extends PluginRuntimeEntry>(profile: string): E | undefined {
	const g = globals();
	return (profile === ROOT_PLUGIN_PROFILE ? g.__lhPlugins : g.__lhProfilePlugins?.get(profile)) as E | undefined;
}

export function setPluginRuntime(profile: string, entry: PluginRuntimeEntry): void {
	const g = globals();
	if (profile === ROOT_PLUGIN_PROFILE) g.__lhPlugins = entry;
	else (g.__lhProfilePlugins ??= new Map()).set(profile, entry);
}

/** After a language write: plugin calls wait until the profile's backends
 *  re-register their text in the new language. No runtime, nothing to do. */
export function syncPluginLanguage(profile: string): Promise<void> {
	const entry = pluginRuntime(profile);
	if (!entry?.syncLanguage) return Promise.resolve();
	const sync = entry.syncLanguage.bind(entry);
	entry.ready = entry.ready.then(() => sync().catch((error: unknown) => {
		console.error(`[plugins] Re-activating the ${profile} plugins after a language change failed:`, error);
	}));
	return entry.ready;
}

/** Forget a profile's runtime and dispose its host: backends deactivate and
 *  their signals abort. Callers fence it before moving or deleting the
 *  profile's folder; disposal itself finishes asynchronously. */
export function stopPluginRuntime(profile: string): Promise<void> {
	const g = globals();
	const entry = pluginRuntime(profile);
	if (!entry) return Promise.resolve();
	if (profile === ROOT_PLUGIN_PROFILE) delete g.__lhPlugins;
	else g.__lhProfilePlugins?.delete(profile);
	return entry.host.dispose().catch((error: unknown) => {
		console.error(`[plugins] Stopping the ${profile} plugin runtime failed:`, error);
	});
}

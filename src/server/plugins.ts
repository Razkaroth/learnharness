import * as fs from "node:fs";
import * as path from "node:path";
import { PATHS, activeUserId, graphFormatFile, renderSettingsFile } from "../../config.ts";
import packageJson from "../../package.json";
import { emit, subscribe } from "../core/events.ts";
import { createPluginAgentService } from "../agent/plugin-agents.ts";
import { createPluginWorkerService } from "../agent/plugin-workers.ts";
import { registerJobAbort, unregisterJobAbort } from "../agent/subagents/aborts.ts";
import { createPluginAgentRecordStore } from "../store/plugin-agent-records.ts";
import { createPluginTaskRecordStore, readPluginTaskRecord, recoverPluginTaskRecords } from "../store/plugin-task-records.ts";
import corePluginIds from "../../core-plugins.json";
import { assertGraphFormat } from "../store/graph-format.ts";
import { createPluginLearningData } from "./plugin-learning.ts";
import { createPluginInference } from "./plugin-inference.ts";
import { createPluginBackgroundTool, recoverPluginBackgroundJob } from "./plugin-background-tools.ts";
import { registerPluginWorkerActivity } from "./plugin-worker-activity.ts";
import { deliverJobResult, setPluginJobRecovery } from "./jobs.ts";
import { createPluginHost } from "./plugin-host.ts";
import { createPluginTransport } from "./plugin-transport.ts";
import { createPluginDocumentConverter } from "./plugin-documents.ts";
import { ROOT_PLUGIN_PROFILE, inPluginProfile, pluginProfile, pluginRuntime, setPluginRuntime, syncPluginLanguage, type PluginRuntimeEntry } from "./plugin-runtimes.ts";
import type { AgentBuildOptions } from "../agent/teacher-agent.ts";
import { effectiveSettings, stores } from "./stores.ts";
import { localizedPluginManifest } from "../core/plugins.ts";
import { isTurnRunning } from "./turn-liveness.ts";
import { compactionInFlight } from "./compaction.ts";
import { registryExists } from "../store/users.ts";

/** The calling profile's community plugin folder (learner data, never module-load time). */
export function pluginDirectory(): string {
	return path.join(/* turbopackIgnore: true */ PATHS.data, "plugins");
}
// Core plugin code is install-wide; its records live with each profile.
// Explicitly staged by build-server, not discovered by Next's filesystem tracer.
const coreCode = path.join(/* turbopackIgnore: true */ PATHS.root, "core-plugins");
const coreData = () => ({ directory: path.join(/* turbopackIgnore: true */ PATHS.data, "core-plugin-data"), ids: corePluginIds });
type Host = ReturnType<typeof createPluginHost>;
type Runtime = PluginRuntimeEntry<Host>;

/** Every function property runs inside `profile`, wherever the plugin calls it from. */
function bound<T extends object>(profile: string, service: T): T {
	return Object.fromEntries(Object.entries(service).map(([key, value]) => [key,
		typeof value === "function" ? (...args: unknown[]) => inPluginProfile(profile, () => value.apply(service, args)) : value,
	])) as T;
}

/** One runtime per profile (root on an unclaimed install), created lazily inside
 * that profile's context. Importing this module does not load plugin code or
 * touch plugin storage; instrumentation (or a route) initializes it. */
function runtime(profile = pluginProfile()): Runtime {
	const existing = pluginRuntime<Runtime>(profile);
	if (existing) return existing;
	return inPluginProfile(profile, () => {
		const directory = pluginDirectory();
		const data = coreData();
		const core = { directory: coreCode, dataDirectory: data.directory, ids: data.ids };
		const learning = bound(profile, createPluginLearningData({
			directory: PATHS.data, chatStore: stores.chatStore, graphStore: stores.graphStore,
			isBusy: isTurnRunning, isCompacting: compactionInFlight,
			readMetadata(name) {
				assertGraphFormat();
				try { return JSON.parse(fs.readFileSync(name === "format.json" ? graphFormatFile() : renderSettingsFile(), "utf8")); }
				catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return null; throw error; }
			},
		}));
		const installationErrors: Record<string, string> = Object.create(null);
		const language = () => inPluginProfile(profile, () => effectiveSettings().general.language);
		const host = createPluginHost({
			directory, core, appVersion: packageJson.version, installationErrors,
			// Each profile's runtime owns its plugin activations; worker requests
			// still share the process-wide admission slots.
			convertDocument: createPluginDocumentConverter().convert,
			language,
			createServices({ manifest, locales, dataDirectory, signal }) {
				const inference = createPluginInference({ signal, dataDirectory });
				const agents = createPluginAgentService({
					store: createPluginAgentRecordStore(path.join(/* turbopackIgnore: true */ dataDirectory, "agents")),
					engineFor: inference.engineFor, onUsage: inference.onUsage, signal,
					onChange: () => { if (!signal.aborted) inPluginProfile(profile, () => emit("plugin-message", { pluginId: manifest.id, topic: "agents-changed" })); },
				});
				const workerActivity = registerPluginWorkerActivity({
					profile, pluginId: manifest.id, pluginName: () => localizedPluginManifest(manifest, locales, language()).name, signal,
					cancel: taskId => workers.cancel(taskId),
				});
				const workers = createPluginWorkerService({
					store: createPluginTaskRecordStore(path.join(/* turbopackIgnore: true */ dataDirectory, "tasks")),
					engineFor: inference.engineFor, onUsage: inference.onUsage, signal,
					onChange: metadata => inPluginProfile(profile, () => workerActivity(metadata)),
				});
				return { learning, inference: bound(profile, inference.inference), agents: bound(profile, agents), workers: bound(profile, workers),
					createBackgroundTool(context, definition) {
						return inPluginProfile(profile, () => createPluginBackgroundTool({
							pluginId: manifest.id, context, definition, workers, signal, jobStore: stores.jobStore,
							deliver: deliverJobResult, isActive: () => !signal.aborted,
							registerAbort: registerJobAbort, unregisterAbort: unregisterJobAbort,
						}));
					},
				};
			},
			// emit() runs listeners in the emitter's context: another profile's
			// events never reach this profile's plugins (profile-less ones do).
			subscribeEvents: listener => subscribe(event => {
				const emitter = activeUserId();
				if (profile !== ROOT_PLUGIN_PROFILE && emitter && emitter !== profile) return;
				inPluginProfile(profile, () => listener(event));
			}),
			onChange: () => inPluginProfile(profile, () => emit("plugins-changed", {})),
			onNotification: (notification) => inPluginProfile(profile, () => emit("plugin-message", notification)),
		});
		// Defer recovery/activation until the runtime is published.
		const ready = Promise.resolve().then(() => inPluginProfile(profile, async () => {
			registerJobRecovery();
			// Exclusive bootstrap sweep, including disabled packages whose services
			// will not construct. Read-only job recovery never activates plugin code.
			for (const [id, error] of Object.entries(recoverPluginTaskRecords(directory, data))) {
				installationErrors[id] = `Task recovery failed: ${error}`;
			}
			await host.initialize();
		}));
		let activeLanguage = language();
		const entry: Runtime = { host, ready, async syncLanguage() {
			const next = language();
			if (next === activeLanguage) return;
			activeLanguage = next;
			await host.relocalize();
		} };
		setPluginRuntime(profile, entry);
		return entry;
	});
}

/** Job sweeps run inside the owning profile, so recovery reads that profile's
 * task records after its runtime's own bootstrap sweep. */
function registerJobRecovery(): void {
	setPluginJobRecovery(async job => {
		await runtime().ready;
		return recoverPluginBackgroundJob(job, {
			jobStore: stores.jobStore, deliver: deliverJobResult,
			readTask: (pluginId, taskId, requestId) => readPluginTaskRecord(pluginDirectory(), pluginId, taskId, requestId, coreData()),
			registerAbort: registerJobAbort, unregisterAbort: unregisterJobAbort,
		});
	});
}

/** Startup: only an unclaimed install has a profile-less runtime to warm up.
 * Profile runtimes start on their first plugin use. */
export async function initializePlugins(): Promise<void> {
	registerJobRecovery();
	if (registryExists()) return;
	await runtime(ROOT_PLUGIN_PROFILE).ready;
}
export async function getPluginHost(): Promise<Host> {
	const entry = runtime();
	await entry.ready;
	return entry.host;
}
/** Await startup once; actual factories run synchronously during per-turn Agent construction. */
export async function getPluginAgentContributions(): Promise<NonNullable<AgentBuildOptions["pluginContributions"]>> {
	return (await getPluginHost()).agentContributions;
}
/** Await startup before reading canonical truth; the returned resolver itself is synchronous. */
export async function getPluginQuestionTypeResolver(): Promise<Host["resolveQuestionType"]> {
	return (await getPluginHost()).resolveQuestionType;
}
/** Re-activate the calling profile's plugin backends if its language changed. */
export function syncProfilePluginLanguage(): Promise<void> {
	return syncPluginLanguage(pluginProfile());
}
export const pluginTransport = createPluginTransport({ getHost: getPluginHost, get directory() { return pluginDirectory(); } });

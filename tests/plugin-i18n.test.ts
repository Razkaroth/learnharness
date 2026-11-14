import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";
import type { TestContext } from "node:test";
import { createPluginHost } from "../src/server/plugin-host.ts";
import type { PluginHostDependencies } from "../src/server/plugin-host.ts";
import { localizedPluginManifest, parsePluginLocale, pluginTranslate } from "../src/core/plugins.ts";
import type { PluginFrontendContext, PluginInference, PluginInfo, PluginLearningData, PluginManifest } from "../src/core/plugins.ts";
import type { PluginAgentService } from "../src/core/plugin-agents.ts";
import type { PluginWorkerService } from "../src/core/plugin-workers.ts";
import { PluginFrontendManager } from "../components/plugin-manager.ts";

const locales = {
	en: { "manifest.name": "Flashcards", "manifest.description": "Review cards", "due": "{count} cards due", "only.en": "English only" },
	es: { "manifest.name": "Tarjetas", "due": "{count} tarjetas pendientes" },
};
const manifest: PluginManifest = { apiVersion: 1, id: "cards", name: "cards", version: "1.0.0", minAppVersion: "0.3.0", main: "main.js" };

test("translation falls back to English, then to the key, and fills placeholders", () => {
	assert.equal(pluginTranslate(locales, "es", "due", { count: 3 }), "3 tarjetas pendientes");
	assert.equal(pluginTranslate(locales, "es", "only.en"), "English only");
	assert.equal(pluginTranslate(locales, "fr", "due", { count: 1 }), "1 cards due");
	assert.equal(pluginTranslate(locales, "es", "missing.key"), "missing.key");
	assert.equal(pluginTranslate(undefined, "es", "due"), "due");
	assert.equal(pluginTranslate(locales, "es", "due", {}), "{count} tarjetas pendientes");
	assert.equal(pluginTranslate(locales, "es", "constructor"), "constructor");
});

test("manifest name and description come from the dictionaries; unrelated manifests are untouched", () => {
	const es = localizedPluginManifest(manifest, locales, "es");
	assert.equal(es.name, "Tarjetas");
	assert.equal(es.description, "Review cards");
	assert.equal(es.version, "1.0.0");
	assert.equal(localizedPluginManifest(manifest, undefined, "es"), manifest);
	assert.equal(localizedPluginManifest(manifest, { en: { other: "x" } }, "es"), manifest);
});

test("locale files must be flat string maps", () => {
	assert.deepEqual(parsePluginLocale({ a: "b" }, "locales/en.json"), { a: "b" });
	for (const bad of [null, [], "text", { a: 1 }, { a: { nested: "x" } }, { "": "x" }]) assert.throws(() => parsePluginLocale(bad, "locales/en.json"), /Invalid plugin locale/);
});

function hostFixture(t: TestContext, language: () => string) {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), "plugin-i18n-"));
	const directory = path.join(root, "plugins");
	fs.mkdirSync(directory);
	t.after(() => fs.rmSync(root, { recursive: true, force: true }));
	const serviceLocales: unknown[] = [];
	const deps: PluginHostDependencies = {
		directory, appVersion: "0.3.7", language,
		createServices(info) {
			serviceLocales.push(info.locales);
			return { learning: { directory: root } as unknown as PluginLearningData, inference: {} as PluginInference,
				agents: { dispose: async () => {} } as PluginAgentService, workers: { dispose: async () => {} } as PluginWorkerService,
				createBackgroundTool() { throw new Error("unused"); } };
		},
		subscribeEvents() { return () => {}; },
	};
	const host = createPluginHost(deps);
	t.after(() => host.dispose());
	function plugin(id: string, files: Record<string, string>) {
		const dir = path.join(directory, id, "dist");
		fs.mkdirSync(path.join(dir, "locales"), { recursive: true });
		fs.writeFileSync(path.join(dir, "manifest.json"), JSON.stringify({ apiVersion: 1, id, name: id, version: "1.0.0", minAppVersion: "0.3.0", backend: "backend.cjs" }));
		fs.writeFileSync(path.join(dir, "backend.cjs"), "exports.activate = ctx => { ctx.handle('say', input => [ctx.i18n.language(), ctx.i18n.t('due', { count: 2 }), ctx.i18n.t('due', { count: 2 }, input)]); };");
		for (const [file, text] of Object.entries(files)) fs.writeFileSync(path.join(dir, file), text);
	}
	return { host, plugin, serviceLocales };
}

test("the host loads package dictionaries and backend ctx.i18n follows the current language", async t => {
	let language = "es";
	const f = hostFixture(t, () => language);
	f.plugin("cards", { "locales/en.json": JSON.stringify(locales.en), "locales/es.json": JSON.stringify(locales.es) });
	await f.host.initialize();
	const info = f.host.list().find(p => p.id === "cards")!;
	assert.deepEqual(info.locales, locales);
	await f.host.setEnabled("cards", true);
	assert.deepEqual(f.serviceLocales, [locales]);
	assert.deepEqual(await f.host.call("cards", "say", "en"), ["es", "2 tarjetas pendientes", "2 cards due"]);
	language = "en";
	assert.deepEqual(await f.host.call("cards", "say", "es"), ["en", "2 cards due", "2 tarjetas pendientes"]);
});

test("malformed or misplaced locale files make the package an error", async t => {
	const f = hostFixture(t, () => "en");
	f.plugin("bad-json", { "locales/en.json": "{nope" });
	f.plugin("bad-name", { "locales/english.json": "{}" });
	f.plugin("bad-shape", { "locales/en.json": JSON.stringify({ a: 1 }) });
	await f.host.initialize();
	const errors = Object.fromEntries(f.host.list().map(p => [p.id, p.error]));
	assert.match(errors["bad-json"]!, /not JSON/);
	assert.match(errors["bad-name"]!, /Invalid plugin locale file/);
	assert.match(errors["bad-shape"]!, /string value/);
});

const tick = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };

test("frontend ctx.i18n uses the window language; a language change re-activates and relabels", async () => {
	const seen: string[] = [];
	let disposed = 0;
	const manager = new PluginFrontendManager({
		language: "es",
		fetch: async () => Response.json({ plugins: [], directory: "/fixture" }),
		importModule: async () => ({ activate(ctx: PluginFrontendContext) {
			seen.push(`${ctx.i18n.language}:${ctx.i18n.t("due", { count: 1 })}:${ctx.manifest.name}`);
			return () => { disposed++; };
		} }),
		pathname: () => "/", navigate() {},
	});
	const info: PluginInfo = { id: "cards", origin: "community", enabled: true, status: "active", revision: "r1", manifest, locales };
	manager.reconcile([info]); await tick();
	assert.deepEqual(seen, ["es:1 tarjetas pendientes:cards"]);
	assert.equal(manager.getSnapshot().plugins[0]!.info.manifest!.name, "Tarjetas");
	assert.equal(manager.getSnapshot().plugins[0]!.info.manifest!.description, "Review cards");
	manager.setLanguage("es"); await tick();
	assert.equal(seen.length, 1);
	manager.setLanguage("en"); await tick();
	assert.equal(disposed, 1);
	assert.deepEqual(seen, ["es:1 tarjetas pendientes:cards", "en:1 cards due:cards"]);
	assert.equal(manager.getSnapshot().plugins[0]!.info.manifest!.name, "Flashcards");
	manager.dispose();
});

/**
 * Per-profile plugin runtimes: each profile gets its own host, enabled
 * state, plugin data, backend module instance and event stream; learning
 * reads see only that profile's records; deleting a profile stops its host.
 *
 * One isolated LH_DATA_DIR for the file, set BEFORE config.ts loads; the
 * tests run in order on the install state the previous one left.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, describe, it } from "node:test";

const ROOT = fs.mkdtempSync(path.join(os.tmpdir(), "lh-plugin-profiles-"));
process.env.LH_DATA_DIR = ROOT;

const config = await import("../config.ts");
const users = await import("../src/server/users.ts");
const { getPluginHost, initializePlugins, pluginTransport } = await import("../src/server/plugins.ts");
const { pluginRuntime } = await import("../src/server/plugin-runtimes.ts");
const { stores } = await import("../src/server/stores.ts");
const { emit } = await import("../src/core/events.ts");

after(() => fs.rmSync(ROOT, { recursive: true, force: true }));

const PLUGIN = "profile-fixture";
const BACKEND = `"use strict";
const fs = require("node:fs");
const path = require("node:path");
const instance = Symbol("module instance");
let loads = (globalThis.__lhProfileFixtureLoads ?? 0) + 1;
globalThis.__lhProfileFixtureLoads = loads;
exports.activate = (ctx) => {
	const seen = [];
	ctx.events.on((event) => { if (event.type === "chats-changed") seen.push(event.type); });
	ctx.handle("whoami", () => {
		fs.mkdirSync(ctx.dataDirectory, { recursive: true });
		fs.writeFileSync(path.join(ctx.dataDirectory, "mark.txt"), "written");
		return { load: loads, instance: String(instance.description), sessions: ctx.learning.listSessions().map((s) => s.title), dataDirectory: ctx.dataDirectory, seen: seen.length };
	});
};
`;

function install(userId: string): void {
	const dist = path.join(config.userDataDir(userId), "plugins", PLUGIN, "dist");
	fs.mkdirSync(dist, { recursive: true });
	fs.writeFileSync(path.join(dist, "manifest.json"), JSON.stringify({ apiVersion: 1, id: PLUGIN, name: "Profile fixture", version: "1.0.0", minAppVersion: "0.3.0", backend: "backend.cjs" }));
	fs.writeFileSync(path.join(dist, "backend.cjs"), BACKEND);
}

function reqAs(sessionId: string): Request {
	return new Request("http://localhost/api/x", { headers: { cookie: `${users.SESSION_COOKIE}=${sessionId}` } });
}

type WhoAmI = { load: number; sessions: string[]; dataDirectory: string; seen: number };

let ada = "", adaSession = "", bea = "";

describe("per-profile plugin runtimes", () => {
	it("startup does nothing once profiles exist, without needing an active profile", async () => {
		const created = users.createProfile(undefined, { name: "Ada", color: "teal", pin: null });
		ada = created.profile.id;
		adaSession = created.sessionId!;
		bea = users.createProfile(reqAs(adaSession), { name: "Bea", color: "amber", pin: null }).profile.id;
		install(ada);
		install(bea);
		await initializePlugins();
		assert.equal(pluginRuntime("root"), undefined, "no root runtime on a claimed install");
	});

	it("each profile has its own enabled state, data folder and backend module instance", async () => {
		config.runAsUser(ada, () => stores.chatStore.createChat("Ada's session"));
		const adaHost = await config.runAsUser(ada, () => getPluginHost());
		const beaHost = await config.runAsUser(bea, () => getPluginHost());
		assert.notEqual(adaHost, beaHost);

		await config.runAsUser(ada, () => adaHost.setEnabled(PLUGIN, true));
		assert.equal(beaHost.list().find((p) => p.id === PLUGIN)?.enabled, false, "enabling for Ada leaves Bea's plugin off");
		await config.runAsUser(bea, () => beaHost.setEnabled(PLUGIN, true));

		const adaView = await config.runAsUser(ada, () => adaHost.call(PLUGIN, "whoami")) as WhoAmI;
		const beaView = await config.runAsUser(bea, () => beaHost.call(PLUGIN, "whoami")) as WhoAmI;
		assert.deepEqual(adaView.sessions, ["Ada's session"]);
		assert.deepEqual(beaView.sessions, [], "learning reads only the calling profile's records");
		assert.ok(adaView.dataDirectory.startsWith(config.userDataDir(ada) + path.sep));
		assert.ok(beaView.dataDirectory.startsWith(config.userDataDir(bea) + path.sep));
		assert.notEqual(adaView.load, beaView.load, "each host evaluates its own backend module");
		for (const id of [ada, bea]) {
			assert.ok(fs.existsSync(path.join(config.userDataDir(id), "plugins-state.json")));
			assert.ok(fs.existsSync(path.join(config.userDataDir(id), "plugins", PLUGIN, "data", "mark.txt")));
		}
	});

	it("learning reads stay with the owning profile even when called from another context", async () => {
		const adaHost = await config.runAsUser(ada, () => getPluginHost());
		const view = await config.runAsUser(bea, () => adaHost.call(PLUGIN, "whoami")) as WhoAmI;
		assert.deepEqual(view.sessions, ["Ada's session"]);
	});

	it("a profile's plugins only hear that profile's events", async () => {
		const before = await config.runAsUser(bea, async () => (await (await getPluginHost()).call(PLUGIN, "whoami")) as WhoAmI);
		config.runAsUser(ada, () => emit("chats-changed", {}));
		const adaAfter = await config.runAsUser(ada, async () => (await (await getPluginHost()).call(PLUGIN, "whoami")) as WhoAmI);
		const beaAfter = await config.runAsUser(bea, async () => (await (await getPluginHost()).call(PLUGIN, "whoami")) as WhoAmI);
		assert.ok(adaAfter.seen >= 1);
		assert.equal(beaAfter.seen, before.seen, "Ada's event never reaches Bea's plugin");
	});

	it("the transport lists the calling profile's plugin folder", async () => {
		const body = await config.runAsUser(bea, async () => (await pluginTransport.list()).json()) as { directory: string };
		assert.equal(body.directory, path.join(config.userDataDir(bea), "plugins"));
	});

	it("deleting a profile stops its plugin host", async () => {
		const beaHost = await config.runAsUser(bea, () => getPluginHost());
		users.deleteProfile(reqAs(adaSession), bea);
		assert.equal(pluginRuntime(bea), undefined);
		assert.throws(() => beaHost.list(), /disposed/);
		const adaHost = await config.runAsUser(ada, () => getPluginHost());
		assert.equal(adaHost.list().find((p) => p.id === PLUGIN)?.status, "active", "other profiles keep running");
	});
});

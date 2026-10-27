"use strict";

/**
 * Linux server mode: the packaged standalone server in browser-only mode,
 * listening on a chosen host and port, with no Electron window, loopback
 * bind, or desktop API secret. The Linux launcher installed by
 * scripts/after-pack.cjs runs, for `learnharness --headless ...`:
 *
 *   ELECTRON_RUN_AS_NODE=1 learnharness.bin resources/server-mode.cjs --headless ...
 *
 * Browser-only mode has no login: a non-loopback --host exposes chats,
 * settings, and API keys to anyone who can reach the port.
 */
const os = require("node:os");
const path = require("node:path");

const USAGE = "usage: learnharness --headless [--host <address>] [--port <1-65535>]";
const DEFAULTS = { host: "127.0.0.1", port: 3000 };

/** --flag value and --flag=value. AppRun adds --no-sandbox on hosts
 *  without user namespaces, so it is accepted and ignored. */
function parseArgs(argv) {
	const options = { ...DEFAULTS };
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === "--headless" || arg === "--no-sandbox") continue;
		const match = /^--(host|port)(?:=(.*))?$/.exec(arg);
		if (!match) throw new Error(`unknown argument: ${arg}`);
		const [, name, inline] = match;
		const value = inline ?? argv[++i];
		if (!value || value.startsWith("--")) throw new Error(`--${name} needs a value`);
		if (name === "host") {
			options.host = value;
		} else {
			const port = Number(value);
			if (!/^\d+$/.test(value) || port < 1 || port > 65535) throw new Error(`invalid port: ${value}`);
			options.port = port;
		}
	}
	return options;
}

/** Electron's Linux userData for "LearnHarness" (app.getPath("userData")),
 *  so server mode and the desktop app share data and keys. */
function profileDir(env = process.env, home = os.homedir()) {
	return path.join(env.XDG_CONFIG_HOME || path.join(home, ".config"), "LearnHarness");
}

/** The server's environment. The desktop gate variables are removed: with
 *  either one set, every browser request to /api/* is refused. */
function serverEnv({ host, port }, env = process.env, home = os.homedir()) {
	const profile = profileDir(env, home);
	const out = {
		...env,
		NODE_ENV: "production",
		HOSTNAME: host,
		PORT: String(port),
		LH_DATA_DIR: env.LH_DATA_DIR || path.join(profile, "data"),
		LH_AUTH_FILE: env.LH_AUTH_FILE || path.join(profile, "auth.json"),
	};
	delete out.LH_DESKTOP_SERVER;
	delete out.LH_DESKTOP_API_SECRET;
	return out;
}

module.exports = { DEFAULTS, parseArgs, profileDir, serverEnv };

if (require.main === module) {
	let options;
	try {
		options = parseArgs(process.argv.slice(2));
	} catch (err) {
		console.error(`${err.message}\n${USAGE}`);
		process.exit(2);
	}
	const env = serverEnv(options);
	for (const key of Object.keys(process.env)) if (!(key in env)) delete process.env[key];
	Object.assign(process.env, env);
	const entry = path.join(__dirname, "server", "standalone", "server.js");
	console.log(`LearnHarness server mode on ${options.host}:${options.port} (data: ${env.LH_DATA_DIR})`);
	// Next's graceful shutdown waits on open connections, and every open tab
	// holds /api/events. The desktop shell SIGKILLs its child after 3s;
	// server mode has no parent to do that.
	for (const signal of ["SIGINT", "SIGTERM"]) {
		process.once(signal, () => setTimeout(() => process.exit(0), 3000).unref());
	}
	process.chdir(path.dirname(entry));
	require(entry);
}

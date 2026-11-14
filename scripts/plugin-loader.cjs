"use strict";
// Shipped as a real file, NOT imported into the Next module graph. Both this
// sidecar and plugin entrypoints are opened by Node's native createRequire.
const { createRequire } = require("node:module");
const { isAbsolute, sep } = require("node:path");

exports.load = function load(filename) {
	if (!isAbsolute(filename)) throw new Error("Plugin entrypoint must be absolute");
	// Keep Node's cache: toggling creates a fresh activation, not a code reload.
	return createRequire(filename)(filename);
};

/** A private module instance per plugin host: each profile's runtime
 * evaluates the package itself and never shares plugin module state. Files
 * under `root` are evicted from Node's shared cache around the load, so a
 * package file required lazily after activation evaluates again — backends
 * should be bundled (the core plugins are single esbuild files). */
exports.loadIsolated = function loadIsolated(filename, root) {
	if (!isAbsolute(filename) || !isAbsolute(root)) throw new Error("Plugin entrypoint and root must be absolute");
	const inside = (key) => key.startsWith(root.endsWith(sep) ? root : root + sep);
	const cache = require.cache;
	const previous = new Map();
	for (const key of Object.keys(cache)) if (inside(key)) { previous.set(key, cache[key]); delete cache[key]; }
	try { return createRequire(filename)(filename); }
	finally {
		for (const key of Object.keys(cache)) if (inside(key)) delete cache[key];
		for (const [key, mod] of previous) cache[key] = mod;
	}
};

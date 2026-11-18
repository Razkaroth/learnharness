/**
 * Bundled plugin dictionaries: every core/example plugin that ships locales
 * must keep en and es on the same keys, non-empty, with matching placeholders.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PLUGINS = ["flashcards", "coding-questions", "drawing-pad", "rich-code-blocks", "ui-showcase"] as const;
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("bundled plugin locales", () => {
	for (const id of PLUGINS) {
		it(`${id}: en and es share keys, non-empty values, matching placeholders`, () => {
			const dir = path.join(root, "plugins", id, "locales");
			const en = JSON.parse(fs.readFileSync(path.join(dir, "en.json"), "utf8")) as Record<string, string>;
			const es = JSON.parse(fs.readFileSync(path.join(dir, "es.json"), "utf8")) as Record<string, string>;
			assert.deepEqual(Object.keys(es).sort(), Object.keys(en).sort());
			assert.ok(Object.keys(en).length > 0, `${id} has no keys`);
			assert.ok(typeof en["manifest.name"] === "string" && en["manifest.name"].trim(), `${id} missing manifest.name`);
			assert.ok(typeof en["manifest.description"] === "string" && en["manifest.description"].trim(), `${id} missing manifest.description`);
			for (const [key, value] of Object.entries(en)) {
				assert.equal(typeof value, "string", `${id} en ${key}`);
				assert.ok(value.trim().length > 0, `${id} en ${key} empty`);
				assert.equal(typeof es[key], "string", `${id} es ${key}`);
				assert.ok(es[key]!.trim().length > 0, `${id} es ${key} empty`);
				assert.deepEqual(placeholders(es[key]!), placeholders(value), `${id} ${key} placeholders`);
			}
		});
	}
});

/**
 * The phone dock's corner controls: Minimize and the Full screen toggle,
 * labelled in the provider's language with stable English testids.
 */
import React from "react";
(globalThis as Record<string, unknown>).React = React;

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { I18nProvider } from "../components/i18n.tsx";
import { DockControls } from "../components/dock-controls.tsx";

const noop = () => {};
const render = (fullscreen: boolean, language?: "es") => {
	const node = <DockControls fullscreen={fullscreen} onMinimize={noop} onToggleFullscreen={noop} />;
	return renderToStaticMarkup(language ? <I18nProvider initialLanguage={language}>{node}</I18nProvider> : node);
};
const tagOf = (html: string, testid: string) => /<[^>]*>/.exec(html.slice(html.lastIndexOf("<", html.indexOf(`data-testid="${testid}"`))))?.[0] ?? "";

describe("DockControls", () => {
	it("in the normal dock: Minimize plus an unpressed Full screen toggle", () => {
		const html = render(false);
		assert.ok(tagOf(html, "dock-minimize").includes('aria-label="Minimize"'));
		const toggle = tagOf(html, "dock-fullscreen");
		assert.ok(toggle.includes('aria-label="Full screen"'));
		assert.ok(toggle.includes('aria-pressed="false"'));
	});

	it("in full screen: the toggle is pressed and reads Exit full screen", () => {
		const toggle = tagOf(render(true), "dock-fullscreen");
		assert.ok(toggle.includes('aria-label="Exit full screen"'));
		assert.ok(toggle.includes('aria-pressed="true"'));
	});

	it("reads Spanish under the Spanish provider", () => {
		assert.ok(tagOf(render(false, "es"), "dock-minimize").includes('aria-label="Minimizar"'));
		assert.ok(tagOf(render(false, "es"), "dock-fullscreen").includes('aria-label="Pantalla completa"'));
		assert.ok(tagOf(render(true, "es"), "dock-fullscreen").includes('aria-label="Salir de pantalla completa"'));
	});
});

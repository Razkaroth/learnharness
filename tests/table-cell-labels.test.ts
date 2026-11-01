/**
 * stampCellLabels: every body cell carries its column heading as
 * data-label, which the phone layout's stacked table cards print before
 * each value.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseHTML } from "linkedom";
import { stampCellLabels } from "../components/md-blocks.tsx";

const { document } = parseHTML("<html><body></body></html>");

function table(html: string): HTMLTableElement {
	const host = document.createElement("div");
	host.innerHTML = html;
	return host.querySelector("table") as unknown as HTMLTableElement;
}
const labels = (t: HTMLTableElement) =>
	Array.from(t.querySelectorAll("tbody tr"), (row) => Array.from(row.children, (cell) => cell.getAttribute("data-label")));

describe("stampCellLabels", () => {
	it("labels each body cell with its column heading", () => {
		const t = table(
			"<table><thead><tr><th>Stage</th><th> Location </th><th>Outputs</th></tr></thead>" +
				"<tbody><tr><td>Light</td><td>Thylakoid</td><td>O2</td></tr><tr><td>Calvin</td><td>Stroma</td><td>Sugar</td></tr></tbody></table>",
		);
		stampCellLabels(t);
		assert.deepEqual(labels(t), [
			["Stage", "Location", "Outputs"],
			["Stage", "Location", "Outputs"],
		]);
	});

	it("re-stamps after rows and headings change", () => {
		const t = table("<table><thead><tr><th>A</th><th>B</th></tr></thead><tbody><tr><td>1</td><td>2</td></tr></tbody></table>");
		stampCellLabels(t);
		t.querySelector("tbody")!.insertAdjacentHTML("beforeend", "<tr><td>3</td><td>4</td></tr>");
		t.querySelectorAll("thead th")[1]!.textContent = "Beta";
		stampCellLabels(t);
		assert.deepEqual(labels(t), [
			["A", "Beta"],
			["A", "Beta"],
		]);
	});

	it("skips cells whose heading is empty or missing", () => {
		const t = table("<table><thead><tr><th>Name</th><th></th></tr></thead><tbody><tr><td>x</td><td>y</td><td>z</td></tr></tbody></table>");
		t.querySelector("tbody td:nth-child(2)")!.setAttribute("data-label", "stale");
		stampCellLabels(t);
		assert.deepEqual(labels(t), [["Name", null, null]]);
	});
});

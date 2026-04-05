// @vitest-environment jsdom

/**
 * Tests for the Button component and its associated Zod schema.
 *
 * buttonCtaSchema — Zod validation tests (node-compatible, run under jsdom
 * but require no DOM; astro:content and astro/loaders are mocked so the
 * content.config module can be imported outside an Astro build context).
 *
 * Button DOM tests — build representative HTML structures with
 * document.createElement / document.createElementNS to verify element
 * semantics and accessibility attributes. The .astro source file is never
 * imported: Vitest cannot compile it.
 */

import { describe, expect, it, vi } from "vitest";

vi.mock("astro:content", () => ({
	defineCollection: (config: unknown) => config,
}));

vi.mock("astro/loaders", () => ({
	file: (_path: string, _opts?: unknown) => ({ type: "file" }),
}));

// Static import works because the vi.mock calls above are hoisted by Vitest.
import { buttonCtaSchema } from "../content.config";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface BuildButtonOptions {
	/** Visual variant — controls shape SVG presence and CSS modifier. */
	variant?: "primary" | "shape";
	/** When set the root element is rendered as <a href="...">. */
	href?: string;
	/** Visible button label text placed in .btn__label. */
	label?: string;
	/** Optional icon text / glyph placed in .btn__icon. */
	icon?: string;
	/** Disables the element following native/ARIA patterns. */
	disabled?: boolean;
	/** Forwarded to <button type="…">; ignored for <a> elements. */
	type?: "button" | "submit" | "reset";
	/** When set, adds aria-label to the root element. */
	ariaLabel?: string;
}

/**
 * Builds an HTML element that mirrors the structure rendered by the real
 * Button Astro component.
 *
 * - No href  → <button type="button|submit|reset">
 * - href set → <a href="…">
 * - variant="shape" → prepends a decorative <svg class="btn__shape">
 * - icon set → appends a <span class="btn__icon"> inside .btn__content
 */
function buildButton({
	variant = "primary",
	href,
	label = "Click me",
	icon,
	disabled = false,
	type = "button",
	ariaLabel,
}: BuildButtonOptions = {}): HTMLElement {
	const isLink = href !== undefined;
	const el = document.createElement(isLink ? "a" : "button") as HTMLElement;

	el.className = `btn btn--${variant}`;

	if (isLink) {
		(el as HTMLAnchorElement).href = href as string;
		if (disabled) {
			el.setAttribute("aria-disabled", "true");
			el.setAttribute("tabindex", "-1");
		}
	} else {
		(el as HTMLButtonElement).type = type;
		if (disabled) {
			(el as HTMLButtonElement).disabled = true;
			el.setAttribute("aria-disabled", "true");
		}
	}

	if (ariaLabel) {
		el.setAttribute("aria-label", ariaLabel);
	}

	// Decorative shape SVG — shape variant only.
	if (variant === "shape") {
		const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
		svg.setAttribute("class", "btn__shape");
		svg.setAttribute("aria-hidden", "true");
		svg.setAttribute("focusable", "false");
		const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
		path.setAttribute("d", "M 16 0 L 164 0 L 180 28 L 164 56 L 16 56 L 0 28 Z");
		svg.appendChild(path);
		el.appendChild(svg);
	}

	// Content wrapper.
	const content = document.createElement("span");
	content.className = "btn__content";

	const labelSpan = document.createElement("span");
	labelSpan.className = "btn__label";
	labelSpan.textContent = label;
	content.appendChild(labelSpan);

	if (icon) {
		const iconSpan = document.createElement("span");
		iconSpan.className = "btn__icon";
		iconSpan.setAttribute("aria-hidden", "true");
		iconSpan.setAttribute("focusable", "false");
		iconSpan.textContent = icon;
		content.appendChild(iconSpan);
	}

	el.appendChild(content);
	return el;
}

// ---------------------------------------------------------------------------
// buttonCtaSchema
// ---------------------------------------------------------------------------

describe("buttonCtaSchema", () => {
	it("accepts a label only", () => {
		const result = buttonCtaSchema.safeParse({ label: "Let's connect" });
		expect(result.success).toBe(true);
	});

	it("accepts label + href + icon", () => {
		const result = buttonCtaSchema.safeParse({
			label: "Let's connect",
			href: "https://example.com",
			icon: "arrow-right",
		});
		expect(result.success).toBe(true);
	});

	it("accepts label with undefined href (optional field)", () => {
		const result = buttonCtaSchema.safeParse({
			label: "Let's connect",
			href: undefined,
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.href).toBeUndefined();
		}
	});

	it("rejects an empty label", () => {
		const result = buttonCtaSchema.safeParse({ label: "" });
		expect(result.success).toBe(false);
	});

	it("rejects a missing label", () => {
		const result = buttonCtaSchema.safeParse({ href: "https://example.com" });
		expect(result.success).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// Button — element semantics
// ---------------------------------------------------------------------------

describe("Button — element semantics", () => {
	it("renders a <button> by default (no href)", () => {
		const el = buildButton();
		expect(el.tagName.toLowerCase()).toBe("button");
	});

	it("renders an <a> when href is provided", () => {
		const el = buildButton({ href: "https://example.com" });
		expect(el.tagName.toLowerCase()).toBe("a");
	});

	it("<button> has type='button' by default", () => {
		const el = buildButton();
		expect((el as HTMLButtonElement).type).toBe("button");
	});

	it("<button type='submit'> is set correctly", () => {
		const el = buildButton({ type: "submit" });
		expect((el as HTMLButtonElement).type).toBe("submit");
	});
});

// ---------------------------------------------------------------------------
// Button — accessible name
// ---------------------------------------------------------------------------

describe("Button — accessible name", () => {
	it("has visible label text in .btn__label", () => {
		const el = buildButton({ label: "Let's connect" });
		const labelSpan = el.querySelector(".btn__label");
		expect(labelSpan).not.toBeNull();
		expect(labelSpan?.textContent).toBe("Let's connect");
	});

	it("sets aria-label when ariaLabel prop is given", () => {
		const el = buildButton({ ariaLabel: "Open contact form" });
		expect(el.getAttribute("aria-label")).toBe("Open contact form");
	});

	it("icon span has aria-hidden='true' and focusable='false'", () => {
		const el = buildButton({ icon: "→" });
		const iconSpan = el.querySelector(".btn__icon");
		expect(iconSpan).not.toBeNull();
		expect(iconSpan?.getAttribute("aria-hidden")).toBe("true");
		expect(iconSpan?.getAttribute("focusable")).toBe("false");
	});
});

// ---------------------------------------------------------------------------
// Button — disabled state
// ---------------------------------------------------------------------------

describe("Button — disabled state", () => {
	it("<button disabled> carries the native disabled attribute", () => {
		const el = buildButton({ disabled: true });
		expect((el as HTMLButtonElement).disabled).toBe(true);
	});

	it("<button disabled> has aria-disabled='true'", () => {
		const el = buildButton({ disabled: true });
		expect(el.getAttribute("aria-disabled")).toBe("true");
	});

	it("<a> disabled: has aria-disabled='true' and tabindex='-1' (no native disabled on anchors)", () => {
		const el = buildButton({ href: "https://example.com", disabled: true });
		expect(el.getAttribute("aria-disabled")).toBe("true");
		expect(el.getAttribute("tabindex")).toBe("-1");
	});
});

// ---------------------------------------------------------------------------
// Button — shape variant
// ---------------------------------------------------------------------------

describe("Button — shape variant", () => {
	it("renders <svg class='btn__shape'> inside the button", () => {
		const el = buildButton({ variant: "shape" });
		const svg = el.querySelector("svg.btn__shape");
		expect(svg).not.toBeNull();
	});

	it("the shape SVG has aria-hidden='true' and focusable='false' (purely decorative)", () => {
		const el = buildButton({ variant: "shape" });
		const svg = el.querySelector("svg.btn__shape");
		expect(svg?.getAttribute("aria-hidden")).toBe("true");
		expect(svg?.getAttribute("focusable")).toBe("false");
	});

	it("the shape SVG does not replace the label — .btn__label still contains the text", () => {
		const el = buildButton({ variant: "shape", label: "Let's connect" });
		const labelSpan = el.querySelector(".btn__label");
		expect(labelSpan?.textContent).toBe("Let's connect");
	});
});

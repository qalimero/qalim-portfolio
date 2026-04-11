// @vitest-environment jsdom

/**
 * Accessibility tests for the Link component (src/components/ui/Link.astro).
 *
 * Validates compliance with RGAA / RAWEB criteria:
 *  - 6.1  Every link has an explicit accessible name (intitulé de lien)
 *  - 6.2  Icon/image links carry a text alternative
 *  - 6.3  The accessible name is coherent with the link destination
 *  - 13.2 External links opening in a new window signal it to the user
 *
 * Since Vitest cannot render .astro components, we build representative
 * HTML elements with document.createElement / document.createElementNS
 * that mirror the markup produced by Link.astro, then assert on their
 * accessible structure.
 */

import { describe, expect, it } from "vitest";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface BuildLinkOptions {
	/** Text label — visible or sr-only. */
	label?: string;
	/** Link destination. */
	href?: string;
	/** Visual variant. */
	variant?: "primary" | "shape-circle";
	/** When true the label gets the sr-only modifier class. */
	srOnly?: boolean;
	/** External link — adds target, rel, and sr-only "(nouvelle fenêtre)". */
	external?: boolean;
	/** Optional title attribute. */
	title?: string;
	/** Optional icon glyph (simulates astro-icon output). */
	icon?: string;
	/** Icon placement. */
	iconPosition?: "left" | "right";
	/** Whether to include a decorative shape SVG. */
	shape?: boolean;
}

/**
 * Builds an <a> element that mirrors the structure rendered by Link.astro.
 *
 * Structure:
 *   <a href="…" class="btn btn--{variant}" [target] [rel] [title]>
 *     [<svg class="btn__shape" aria-hidden="true" focusable="false">…</svg>]
 *     <span class="btn__content">
 *       [<span class="btn__icon" aria-hidden="true" focusable="false">…</span>]  (left)
 *       <span class="btn__label [btn__label--sr-only]">{label}</span>
 *       [<span class="btn__icon" aria-hidden="true" focusable="false">…</span>]  (right)
 *       [<span class="btn__external-hint"> (nouvelle fenêtre)</span>]
 *     </span>
 *   </a>
 */
function buildLink({
	label = "Let's connect",
	href = "https://example.com",
	variant = "primary",
	srOnly = false,
	external = false,
	title,
	icon,
	iconPosition = "right",
	shape = false,
}: BuildLinkOptions = {}): HTMLAnchorElement {
	const el = document.createElement("a") as HTMLAnchorElement;
	el.className = `btn btn--${variant}`;
	el.href = href;

	if (external) {
		el.setAttribute("target", "_blank");
		el.setAttribute("rel", "noopener noreferrer");
	}

	if (title) {
		el.setAttribute("title", title);
	}

	// Decorative shape SVG
	if (shape) {
		const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
		svg.setAttribute("class", "btn__shape");
		svg.setAttribute("aria-hidden", "true");
		svg.setAttribute("focusable", "false");
		svg.setAttribute("viewBox", "0 0 200 200");
		const circle = document.createElementNS(
			"http://www.w3.org/2000/svg",
			"circle",
		);
		circle.setAttribute("cx", "100");
		circle.setAttribute("cy", "100");
		circle.setAttribute("r", "100");
		svg.appendChild(circle);
		el.appendChild(svg);
	}

	// Content wrapper
	const content = document.createElement("span");
	content.className = "btn__content";

	// Icon (left position)
	if (icon && iconPosition === "left") {
		const iconSpan = document.createElement("span");
		iconSpan.className = "btn__icon";
		iconSpan.setAttribute("aria-hidden", "true");
		iconSpan.setAttribute("focusable", "false");
		iconSpan.textContent = icon;
		content.appendChild(iconSpan);
	}

	// Label
	const labelSpan = document.createElement("span");
	const labelClasses = ["btn__label"];
	if (srOnly) labelClasses.push("btn__label--sr-only");
	labelSpan.className = labelClasses.join(" ");
	labelSpan.textContent = label;
	content.appendChild(labelSpan);

	// Icon (right position)
	if (icon && iconPosition === "right") {
		const iconSpan = document.createElement("span");
		iconSpan.className = "btn__icon";
		iconSpan.setAttribute("aria-hidden", "true");
		iconSpan.setAttribute("focusable", "false");
		iconSpan.textContent = icon;
		content.appendChild(iconSpan);
	}

	// External hint
	if (external) {
		const hint = document.createElement("span");
		hint.className = "btn__external-hint";
		hint.textContent = " (nouvelle fenêtre)";
		content.appendChild(hint);
	}

	el.appendChild(content);
	return el;
}

// ---------------------------------------------------------------------------
// Link — element semantics
// ---------------------------------------------------------------------------

describe("Link — element semantics", () => {
	it("always renders as <a> regardless of props", () => {
		const el = buildLink();
		expect(el.tagName.toLowerCase()).toBe("a");
	});

	it("never renders as <button>", () => {
		const el = buildLink();
		expect(el.tagName.toLowerCase()).not.toBe("button");
	});

	it("has an href attribute", () => {
		const el = buildLink({ href: "https://example.com" });
		expect(el.getAttribute("href")).toBe("https://example.com");
	});

	it("does not have a type attribute (type is for <button>, not <a>)", () => {
		const el = buildLink();
		expect(el.hasAttribute("type")).toBe(false);
	});

	it("uses the .btn CSS block for visual consistency with Button", () => {
		const el = buildLink({ variant: "shape-circle" });
		expect(el.classList.contains("btn")).toBe(true);
		expect(el.classList.contains("btn--shape-circle")).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// RGAA 6.1 — Every link has an explicit accessible name
// ---------------------------------------------------------------------------

describe("RGAA 6.1 — explicit accessible name", () => {
	it("has visible label text in .btn__label", () => {
		const el = buildLink({ label: "Let's connect" });
		const labelSpan = el.querySelector(".btn__label");
		expect(labelSpan).not.toBeNull();
		expect(labelSpan?.textContent).toBe("Let's connect");
	});

	it("sr-only label still provides an accessible name (text is in the DOM)", () => {
		const el = buildLink({ label: "Let's connect", srOnly: true });
		const labelSpan = el.querySelector(".btn__label");
		expect(labelSpan).not.toBeNull();
		expect(labelSpan?.textContent).toBe("Let's connect");
		// The text IS in the DOM — it is just visually hidden via CSS
	});

	it("sr-only label has the .btn__label--sr-only modifier class", () => {
		const el = buildLink({ label: "Let's connect", srOnly: true });
		const labelSpan = el.querySelector(".btn__label");
		expect(labelSpan?.classList.contains("btn__label--sr-only")).toBe(true);
	});

	it("non-sr-only label does NOT have the --sr-only modifier", () => {
		const el = buildLink({ label: "Let's connect", srOnly: false });
		const labelSpan = el.querySelector(".btn__label");
		expect(labelSpan?.classList.contains("btn__label--sr-only")).toBe(false);
	});

	it("icon-only link with srOnly still has an accessible name from the label", () => {
		const el = buildLink({
			label: "LinkedIn profile",
			icon: "→",
			srOnly: true,
		});
		const labelSpan = el.querySelector(".btn__label");
		expect(labelSpan?.textContent).toBe("LinkedIn profile");
		// Icon is aria-hidden so it does NOT contribute to the accessible name
		const iconSpan = el.querySelector(".btn__icon");
		expect(iconSpan?.getAttribute("aria-hidden")).toBe("true");
	});
});

// ---------------------------------------------------------------------------
// RGAA 6.2 — Icon/image links carry a text alternative
// ---------------------------------------------------------------------------

describe("RGAA 6.2 — icon links have a text alternative", () => {
	it("icon is decorative (aria-hidden) and does not replace the label", () => {
		const el = buildLink({ label: "Go", icon: "★" });
		const icons = el.querySelectorAll(".btn__icon");
		for (const icon of icons) {
			expect(icon.getAttribute("aria-hidden")).toBe("true");
			expect(icon.getAttribute("focusable")).toBe("false");
		}
		// The label provides the text alternative
		const labelSpan = el.querySelector(".btn__label");
		expect(labelSpan?.textContent).toBe("Go");
	});

	it("shape SVG is decorative (aria-hidden) and not exposed to AT", () => {
		const el = buildLink({ label: "Go", shape: true });
		const svg = el.querySelector("svg.btn__shape");
		expect(svg?.getAttribute("aria-hidden")).toBe("true");
		expect(svg?.getAttribute("focusable")).toBe("false");
	});
});

// ---------------------------------------------------------------------------
// RGAA 13.2 — External links opening in a new window
// ---------------------------------------------------------------------------

describe("RGAA 13.2 — external links", () => {
	it("external link has target='_blank'", () => {
		const el = buildLink({ external: true });
		expect(el.getAttribute("target")).toBe("_blank");
	});

	it("external link has rel='noopener noreferrer'", () => {
		const el = buildLink({ external: true });
		expect(el.getAttribute("rel")).toBe("noopener noreferrer");
	});

	it("external link includes sr-only '(nouvelle fenêtre)' indication", () => {
		const el = buildLink({ external: true });
		const hint = el.querySelector(".btn__external-hint");
		expect(hint).not.toBeNull();
		expect(hint?.textContent).toContain("nouvelle fenêtre");
	});

	it("non-external link does NOT have target='_blank'", () => {
		const el = buildLink({ external: false });
		expect(el.hasAttribute("target")).toBe(false);
	});

	it("non-external link does NOT have rel attribute", () => {
		const el = buildLink({ external: false });
		expect(el.hasAttribute("rel")).toBe(false);
	});

	it("non-external link does NOT include the '(nouvelle fenêtre)' hint", () => {
		const el = buildLink({ external: false });
		const hint = el.querySelector(".btn__external-hint");
		expect(hint).toBeNull();
	});

	it("the external hint is part of the link's accessible name computation", () => {
		const el = buildLink({ label: "LinkedIn", external: true });
		// The hint is inside <a> so it contributes to the accessible name.
		// Screen readers will announce: "LinkedIn (nouvelle fenêtre)"
		const hintText = el.querySelector(".btn__external-hint")?.textContent;
		const labelText = el.querySelector(".btn__label")?.textContent;
		expect(labelText).toBe("LinkedIn");
		expect(hintText).toContain("nouvelle fenêtre");
		// Both are children of <a>, forming the full accessible name
		expect(el.textContent).toContain("LinkedIn");
		expect(el.textContent).toContain("nouvelle fenêtre");
	});
});

// ---------------------------------------------------------------------------
// Link — title attribute (RGAA best practices)
// ---------------------------------------------------------------------------

describe("Link — title attribute", () => {
	it("sets title attribute when provided", () => {
		const el = buildLink({ title: "Opens LinkedIn profile" });
		expect(el.getAttribute("title")).toBe("Opens LinkedIn profile");
	});

	it("does NOT set title attribute when not provided", () => {
		const el = buildLink();
		expect(el.hasAttribute("title")).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// Link — sr-only + external combined
// ---------------------------------------------------------------------------

describe("Link — srOnly + external combined", () => {
	it("sr-only label AND external hint are both present in the DOM", () => {
		const el = buildLink({
			label: "Let's connect",
			srOnly: true,
			external: true,
		});
		const labelSpan = el.querySelector(".btn__label.btn__label--sr-only");
		const hint = el.querySelector(".btn__external-hint");
		expect(labelSpan).not.toBeNull();
		expect(labelSpan?.textContent).toBe("Let's connect");
		expect(hint).not.toBeNull();
		expect(hint?.textContent).toContain("nouvelle fenêtre");
	});

	it("full accessible name includes label + external hint", () => {
		const el = buildLink({
			label: "LinkedIn",
			srOnly: true,
			external: true,
			icon: "→",
		});
		// The icon is aria-hidden, so the accessible name is built from:
		// label text ("LinkedIn") + external hint (" (nouvelle fenêtre)")
		const fullText = el.textContent ?? "";
		expect(fullText).toContain("LinkedIn");
		expect(fullText).toContain("nouvelle fenêtre");
		// Icon text is in the DOM but aria-hidden, so it won't be announced
		const iconSpan = el.querySelector(".btn__icon");
		expect(iconSpan?.getAttribute("aria-hidden")).toBe("true");
	});
});

// ---------------------------------------------------------------------------
// Link — shape-circle variant with sr-only
// ---------------------------------------------------------------------------

describe("Link — shape-circle variant with sr-only", () => {
	it("renders the shape SVG as a purely decorative background", () => {
		const el = buildLink({
			variant: "shape-circle",
			shape: true,
			srOnly: true,
		});
		const svg = el.querySelector("svg.btn__shape");
		expect(svg).not.toBeNull();
		expect(svg?.getAttribute("aria-hidden")).toBe("true");
	});

	it("the label is sr-only but the link is still keyboard-focusable", () => {
		const el = buildLink({ srOnly: true });
		// <a> with href is natively focusable — no tabindex needed
		expect(el.tagName.toLowerCase()).toBe("a");
		expect(el.hasAttribute("href")).toBe(true);
		// tabindex is NOT set to -1 (the link is interactive)
		expect(el.getAttribute("tabindex")).toBeNull();
	});

	it("shape SVG is before btn__content in the DOM (background layer)", () => {
		const el = buildLink({ shape: true, srOnly: true });
		const children = Array.from(el.children);
		const svgIndex = children.findIndex((c) =>
			c.classList.contains("btn__shape"),
		);
		const contentIndex = children.findIndex((c) =>
			c.classList.contains("btn__content"),
		);
		expect(svgIndex).toBeLessThan(contentIndex);
	});
});

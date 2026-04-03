# Penpot Component Creation Skill

## Overview

This skill covers creating Penpot library components programmatically via the plugin API, registering them in the local library, and ensuring they are placed on the correct target page.

---

## Core Concept: How Components Are Placed

`penpot.library.local.createComponent(shapes)` registers shapes **already on the canvas** as a library component. The **main instance lives on whatever page those shapes were currently drawn on**. There is no `page` argument — placement follows the shapes, not a parameter.

This means: **to create a component on a specific page, you must first navigate to that page and draw the shapes there.**

---

## Standard Flow: Create a Component on a Specific Page

```javascript
// 1. Navigate to the target page
await penpot.openPage(targetPage);

// 2. Create shapes on the canvas root of that page
const rect = penpot.root.createRectangle();
rect.name = "Button/Background";
rect.resize(120, 40);
// ... configure shape properties

// 3. Register the shape(s) as a library component
const component = penpot.library.local.createComponent([rect]);

// 4. (Optional) Get the main instance to reposition it on the page
const instance = component.instance();
instance.x = 100;
instance.y = 100;
```

---

## Guardrails

### ✅ Always verify the current page before creating shapes

Never assume you are on the correct page. Always navigate explicitly:

```javascript
// WRONG — assumes current page is correct
const shape = penpot.root.createRectangle();

// RIGHT — navigate first, then create
await penpot.openPage(targetPage);
const shape = penpot.root.createRectangle();
```

---

### ✅ Collect all shapes before calling createComponent

`createComponent()` takes a snapshot of the shapes as-is. All child shapes must exist on the canvas **before** the call. You cannot add shapes to a component after the fact via this API.

```javascript
// WRONG — passing an empty or incomplete array
const component = penpot.library.local.createComponent([]);

// RIGHT — build all shapes first, then register
const bg = penpot.root.createRectangle();
const label = penpot.root.createText("Label");
const component = penpot.library.local.createComponent([bg, label]);
```

---

### ✅ Name shapes and components meaningfully before registering

The component name is derived from the shapes at registration time. Rename shapes **before** calling `createComponent`, not after.

```javascript
// RIGHT — name before registering
rect.name = "Badge/Container";
const component = penpot.library.local.createComponent([rect]);
```

---

### ✅ Do not attempt page deletion via the API

Page deletion is **not supported** by the Penpot plugin API. If a cleanup step requires page removal, surface this as a manual action for the user:

```javascript
// NOT POSSIBLE — no API for this
// penpot.deletePage(page); ← does not exist

// RIGHT — inform the user
console.warn("Page deletion must be done manually in Penpot.");
```

---

### ✅ Use component.instance() to place copies — not shape duplication

To place an instance of a registered component on another page, use `component.instance()`. Do not manually duplicate the original shapes, as this creates ungrouped copies outside the library system.

```javascript
// After creating the component on its target page:
const component = penpot.library.local.createComponent([shape]);

// To place a copy on a different page:
await penpot.openPage(anotherPage);
const copy = component.instance();
copy.x = 200;
copy.y = 300;
```

---

## Summary Table

| Step | Method | Notes |
|---|---|---|
| Navigate to page | `penpot.openPage(page)` | Must be done before creating shapes |
| Create shapes | `penpot.root.createRectangle()`, `createText()`, etc. | Shapes land on the current page |
| Register component | `penpot.library.local.createComponent([shapes])` | Main instance stays on the current page |
| Place instance elsewhere | `component.instance()` after `openPage()` | Correct way to reuse across pages |
| Delete a page | ❌ Not available | Must be done manually by the user |

---

## Known Limitations

- `createComponent()` accepts no `page` argument — the page is implicitly the one where shapes were created.
- You cannot retrospectively move a component's main instance to a different page via the API.
- Shape grouping before `createComponent` is recommended for complex components (use `penpot.root.createGroup([shapes])` if available).
- Always check the Penpot plugin API version for availability of `createGroup` and other helpers, as the API surface is still evolving.

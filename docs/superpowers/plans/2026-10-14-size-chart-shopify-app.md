# Free Shopify Size Chart App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a free public Shopify size chart app with unlimited charts, no watermark, strong targeting, CSV import/export, and storefront rendering through a Theme App Extension.

**Architecture:** Start from Shopify's Remix app scaffold, then add focused modules for chart persistence, assignment matching, CSV parsing, and storefront serialization. The admin UI uses Polaris and App Bridge; storefront output is delivered through a Theme App Extension plus an app-owned route/app proxy endpoint.

**Tech Stack:** Shopify Remix app, React, Polaris, App Bridge, Prisma, SQLite for local development, Shopify Admin GraphQL API, Theme App Extension, Vitest or the scaffold's default test runner.

**Spec:** `docs/superpowers/specs/2026-10-14-size-chart-shopify-app-design.md`

## Global Constraints

- V1 is free and includes unlimited charts.
- V1 has no app watermark.
- V1 does not include billing, AI, translations, country rules, shopper body measurement collection, or analytics beyond internal timestamps.
- The app must avoid protected customer data.
- Storefront integration must use a Shopify Theme App Extension, not direct theme-code modification.
- Chart assignment priority is product, collection, tag, vendor, product type, then all-products fallback.
- If priority ties within a target type, the most recently updated chart wins.
- CSV import uses the first row as headers and remaining rows as chart rows.

## Review Focus

- Malformed or empty CSV input should show a clear validation error; covered in Task 3.
- Products with no matching assignment should render no size chart without storefront errors; covered in Task 5.
- Multiple matching charts should select by the exact priority rules from the spec; covered in Task 2.
- Mobile storefront tables should remain readable without layout overflow; covered in Task 5.
- App review posture should remain free of protected customer data scopes; covered in Task 1 and Task 6.

---

## File Structure

- `package.json`, `shopify.app.toml`, generated app files: Shopify Remix scaffold and app configuration.
- `prisma/schema.prisma`: Shop, session, size chart, chart table, assignment, and display settings models.
- `app/models/chart.server.ts`: CRUD functions for charts and chart tables.
- `app/models/assignment.server.ts`: assignment persistence and matching rules.
- `app/utils/csv.server.ts`: CSV import/export parsing and validation.
- `app/utils/storefront-chart.server.ts`: public chart payload serialization.
- `app/routes/app._index.tsx`: dashboard and setup checklist.
- `app/routes/app.charts._index.tsx`: chart list.
- `app/routes/app.charts.new.tsx`: create chart flow.
- `app/routes/app.charts.$id.tsx`: edit chart flow.
- `app/routes/app.charts.$id.assignments.tsx`: assignment rules.
- `app/routes/app.settings.tsx`: display defaults.
- `app/routes/api.chart.ts`: storefront-safe chart lookup endpoint.
- `extensions/size-chart/`: Theme App Extension block/assets.
- `tests/`: focused tests for CSV parsing, assignment matching, chart model behavior, and storefront serialization.
- `docs/launch/shopify-app-store-checklist.md`: launch checklist for publishing.

---

### Task 1: Scaffold Shopify Remix App And App Baseline

**Files:**
- Create: Shopify Remix scaffold in the repository root.
- Create/Modify: `package.json`
- Create/Modify: `shopify.app.toml`
- Create/Modify: `prisma/schema.prisma`
- Test: scaffold test command or minimal smoke test configured by scaffold.

**Interfaces:**
- Produces: Working Shopify Remix app with Prisma enabled and minimum scopes for products/collections/theme extension behavior.
- Produces: Prisma models `Shop`, `SizeChart`, `SizeChartTable`, `ChartAssignment`, and `DisplaySettings`.

- [ ] **Step 1: Scaffold the Shopify Remix app**

Run: `npm init @shopify/app@latest`

Choose Remix, Node, and TypeScript if prompted. Scaffold into the current workspace.

- [ ] **Step 2: Add the v1 Prisma schema**

Define `Shop`, `SizeChart`, `SizeChartTable`, `ChartAssignment`, and `DisplaySettings` with fields from the spec. Keep the scaffold's Shopify session model if generated.

- [ ] **Step 3: Configure minimum Shopify scopes**

Set scopes for reading products and collections only unless the scaffold requires additional standard app scopes. Do not request customer scopes or protected customer data.

- [ ] **Step 4: Run baseline install and generation**

Run: `npm install`

Run: `npx prisma generate`

Expected: dependencies install and Prisma client generates.

- [ ] **Step 5: Run baseline verification**

Run the scaffold's typecheck/test command from `package.json`.

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json shopify.app.toml prisma app extensions tests
git commit -m "chore: scaffold Shopify size chart app"
```

If the workspace is still not a Git repository, skip the commit and note that Git initialization is needed before source control checkpoints can be made.

---

### Task 2: Chart Persistence And Assignment Matching

**Files:**
- Create: `app/models/chart.server.ts`
- Create: `app/models/assignment.server.ts`
- Test: `tests/chart-model.test.ts`
- Test: `tests/assignment-matching.test.ts`

**Interfaces:**
- Produces: `createSizeChart(input: CreateSizeChartInput): Promise<SizeChartWithTable>`
- Produces: `updateSizeChart(id: string, input: UpdateSizeChartInput): Promise<SizeChartWithTable>`
- Produces: `listSizeCharts(shopId: string): Promise<SizeChartSummary[]>`
- Produces: `deleteSizeChart(id: string): Promise<void>`
- Produces: `duplicateSizeChart(id: string): Promise<SizeChartWithTable>`
- Produces: `findMatchingChart(shopId: string, product: ProductMatchInput): Promise<SizeChartWithTable | null>`
- Consumes: Prisma client and schema from Task 1.

- [ ] **Step 1: Write chart CRUD tests**

Assert that creating a chart stores name, draft/active status, fit note, display mode, button text, columns, rows, and base unit. Assert duplicate creates a new chart with copied table data.

- [ ] **Step 2: Write assignment matching tests**

Assert priority order: product beats collection, collection beats tag, tag beats vendor, vendor beats product type, product type beats all-products. Assert lower numeric priority wins inside the same target type. Assert most recently updated chart wins when target type and priority tie. Assert no match returns `null`.

- [ ] **Step 3: Run tests to verify failure**

Run: assignment and chart model test files.

Expected: FAIL because model functions do not exist.

- [ ] **Step 4: Implement chart model functions**

Implement the signatures listed in Interfaces using Prisma. Store table content in `SizeChartTable.columnsJson` and `SizeChartTable.rowsJson`.

- [ ] **Step 5: Implement assignment matching**

Implement `findMatchingChart(shopId: string, product: ProductMatchInput)` in `app/models/assignment.server.ts` using the spec priority order exactly.

- [ ] **Step 6: Run tests**

Run: assignment and chart model test files.

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add app/models tests prisma/schema.prisma
git commit -m "feat: add chart persistence and matching"
```

---

### Task 3: CSV Import And Export

**Files:**
- Create: `app/utils/csv.server.ts`
- Test: `tests/csv.test.ts`

**Interfaces:**
- Produces: `parseSizeChartCsv(csvText: string): ParsedSizeChartTable`
- Produces: `exportSizeChartCsv(table: ParsedSizeChartTable): string`
- Produces: `ParsedSizeChartTable = { columns: string[]; rows: string[][] }`

- [ ] **Step 1: Write CSV parsing tests**

Assert the spec sample parses into headers `Size`, `Chest`, `Waist`, `Hip` and three rows. Assert empty files, files with no data rows, and malformed quoted values return clear validation errors. Assert trailing empty rows and columns are trimmed.

- [ ] **Step 2: Write CSV export tests**

Assert exporting parsed chart data returns a CSV that can be parsed back into the same columns and rows.

- [ ] **Step 3: Run tests to verify failure**

Run: CSV test file.

Expected: FAIL because CSV functions do not exist.

- [ ] **Step 4: Implement CSV utilities**

Use a real CSV parser package if the scaffold does not already include one. Do not parse CSV with manual string splitting.

- [ ] **Step 5: Run tests**

Run: CSV test file.

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/utils/csv.server.ts tests/csv.test.ts package.json package-lock.json
git commit -m "feat: add size chart CSV import export"
```

---

### Task 4: Admin Chart Management UI

**Files:**
- Create/Modify: `app/routes/app._index.tsx`
- Create: `app/routes/app.charts._index.tsx`
- Create: `app/routes/app.charts.new.tsx`
- Create: `app/routes/app.charts.$id.tsx`
- Create: `app/routes/app.charts.$id.assignments.tsx`
- Create: `app/routes/app.settings.tsx`
- Create: `app/components/ChartTableEditor.tsx`
- Create: `app/components/AssignmentEditor.tsx`
- Create: `app/components/DisplayModePicker.tsx`
- Test: route/component tests supported by the scaffold.

**Interfaces:**
- Consumes: chart CRUD functions from Task 2.
- Consumes: CSV utilities from Task 3.
- Produces: Merchant-facing flows for chart list, create, edit, duplicate, delete, import/export, assignments, and settings.

- [ ] **Step 1: Write route/component tests for dashboard and chart list**

Assert dashboard shows setup checklist and recent charts. Assert chart list shows existing charts and an empty state when none exist.

- [ ] **Step 2: Write route/component tests for chart editor**

Assert editor can submit name, table data, fit note, display mode, button text, and measurement instructions.

- [ ] **Step 3: Write route/component tests for assignments**

Assert assignment UI can save target type and target value for product, collection, tag, vendor, product type, and all-products.

- [ ] **Step 4: Run tests to verify failure**

Run: admin route/component tests.

Expected: FAIL because routes/components do not exist.

- [ ] **Step 5: Implement admin routes and components**

Use Polaris components and keep the first screen operational, not marketing-heavy. Include clear empty states and setup guidance for enabling the theme app extension.

- [ ] **Step 6: Wire CSV import/export into chart flows**

Import should call `parseSizeChartCsv`; export should call `exportSizeChartCsv`.

- [ ] **Step 7: Run tests and typecheck**

Run: admin route/component tests and typecheck.

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add app/routes app/components app/models app/utils tests
git commit -m "feat: add size chart admin workflow"
```

---

### Task 5: Storefront Chart Endpoint And Theme App Extension

**Files:**
- Create: `app/utils/storefront-chart.server.ts`
- Create: `app/routes/api.chart.ts`
- Create/Modify: `extensions/size-chart/blocks/size-chart.liquid`
- Create/Modify: `extensions/size-chart/assets/size-chart.css`
- Create/Modify: `extensions/size-chart/assets/size-chart.js`
- Test: `tests/storefront-chart.test.ts`

**Interfaces:**
- Consumes: `findMatchingChart(shopId, product)` from Task 2.
- Produces: `getStorefrontChartPayload(input: StorefrontChartRequest): Promise<StorefrontChartPayload | null>`
- Produces: public JSON route that returns chart name, rows, columns, fit note, measurement instructions, display mode, and display settings.

- [ ] **Step 1: Write storefront payload tests**

Assert matching products return only storefront-safe chart fields. Assert no matching product returns `null`. Assert merchant-only data and access tokens are never serialized.

- [ ] **Step 2: Write display-mode behavior checks**

Assert payload includes `inline`, `popup`, `accordion`, or `floating` display mode exactly as stored.

- [ ] **Step 3: Run tests to verify failure**

Run: storefront chart test file.

Expected: FAIL because storefront utilities do not exist.

- [ ] **Step 4: Implement storefront serialization and route**

Implement `getStorefrontChartPayload` and the route/app-proxy handler. Keep responses cache-friendly and safe for public storefront use.

- [ ] **Step 5: Implement Theme App Extension block**

Render accessible markup for inline, popup, accordion, and floating-button modes. Include a cm/inch toggle when conversion data is available. Ensure mobile tables can scroll horizontally without breaking layout.

- [ ] **Step 6: Run tests and manual Dawn check**

Run: storefront tests and typecheck.

Manual: install on a development store using Dawn, add the app block to a product page, and verify each display mode.

Expected: PASS and visible chart rendering on product page.

- [ ] **Step 7: Commit**

```bash
git add app/routes/api.chart.ts app/utils/storefront-chart.server.ts extensions tests
git commit -m "feat: render charts on storefront"
```

---

### Task 6: App Store Launch Readiness

**Files:**
- Create: `docs/launch/shopify-app-store-checklist.md`
- Modify: `README.md`
- Modify: `shopify.app.toml`
- Modify: `package.json`
- Test: full project verification commands.

**Interfaces:**
- Consumes: working app from Tasks 1-5.
- Produces: launch checklist and review-ready notes.

- [ ] **Step 1: Write launch checklist**

Create checklist covering app name, icon, screenshots, demo store, privacy policy URL, terms URL, support email, review instructions, app scopes, uninstall behavior, and free-plan positioning.

- [ ] **Step 2: Update README**

Document local setup, Shopify CLI commands, Prisma commands, testing commands, theme extension testing, and the v1 free feature promise.

- [ ] **Step 3: Verify privacy and scope posture**

Confirm no customer/protected customer scopes are configured. Confirm the app listing copy says no shopper personal data collection only if the implemented app still matches that claim.

- [ ] **Step 4: Run full verification**

Run: install check, Prisma generate/migrate, typecheck, tests, and app build.

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add README.md docs/launch shopify.app.toml package.json package-lock.json
git commit -m "docs: prepare Shopify app store launch checklist"
```

---

## Final Verification

- [ ] Run the full test suite.
- [ ] Run typecheck.
- [ ] Run production build.
- [ ] Verify on a development store with Dawn.
- [ ] Confirm all v1 free promises are present and no Pro-only gating exists.
- [ ] Confirm App Store checklist is complete enough for submission.

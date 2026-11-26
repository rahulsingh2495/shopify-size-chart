# Size Chart Plugin Audit for Antigravity

**Audit date:** 26 November 2026  
**Product:** Pixelotech Shopify Size Chart  
**Audit type:** Combined live workflow, implementation, security, accessibility, Shopify configuration, and release-readiness audit  
**Overall verdict:** **Not production-ready.** The admin editor now opens correctly, but the current release has critical tenant-isolation, migration, uninstall-data, storefront-settings, and targeting defects.

## 1. Scope and evidence

The following merchant flows were inspected in the signed-in Shopify development store without saving, duplicating, deleting, or otherwise modifying store data:

1. Dashboard and quick-start links.
2. Size-chart list and search.
3. Create-size-chart navigation and editor loading.
4. Existing chart targeting.
5. App button and chart styling settings.
6. Desktop/mobile settings preview.
7. Shopify navigation integration.

The codebase, Prisma schema and migrations, Shopify configuration, app proxy, Theme App Extension, storefront renderer, admin actions, tests, build, TypeScript, lint, and deployment posture were also inspected.

### Evidence limits

- The storefront was not fully exercised on a published product page. Storefront findings are implementation-backed, not claims of a complete visual storefront audit.
- Destructive actions (delete), data-changing actions (save and duplicate), CSV download, and Theme Editor save were not executed against the live store.
- Accessibility findings are implementation risks. A keyboard and screen-reader pass is still required after fixes.
- No formal Shopify App Store CLI self-review or deployment was run.

## 2. Live workflow results

| Step | Workflow | Health | Result |
|---|---|---:|---|
| 1 | Dashboard | Partial | Loaded correctly and showed three active charts. Quick-start actions are understandable, but the UI makes claims such as “Free Forever” and “Zero customer tracking” that must stay aligned with the actual listing and scopes. |
| 2 | Create size chart | Pass | The primary **Create size chart** action opened `/app/charts/new` and displayed the complete editor. The previously reported blink-back behavior did not reproduce in Chrome. |
| 3 | Chart editor | Partial | Details, measurement grid, targeting, display modes and guidance were present. The editor duplicates **Live preview** and **Save chart** actions in both `Page` and `TitleBar`, defaults to an active sample chart, and starts with a non-matching collection rule. |
| 4 | Chart list | Partial | Search correctly filtered charts case-insensitively. At the tested width, Duplicate/Delete actions were hidden behind horizontal scrolling, making important operations hard to discover. |
| 5 | Targeting | Partial | Targeting page loaded. It requires merchants to manually enter raw product/collection identifiers; there is no Shopify resource picker or validation that the referenced resource exists. |
| 6 | App settings | Partial | Button styling, chart styling and desktop/mobile preview switched correctly. Several settings shown in this UI are not applied by the storefront renderer. |
| 7 | Theme Editor links | Link verified | Both dashboard and settings generate a Shopify Theme Editor URL for the current store. Saving an app block in the Theme Editor was not performed. |
| 8 | Storefront chart | Blocked/Code reviewed | Not visually verified on a published product page. App-proxy and renderer code were audited and contain release-blocking defects listed below. |

### Answer to the “no products” question

Having no products **does not prevent the chart editor from opening or a chart from being created**. It only means there is no product page on which to display or visually verify the chart and no product to select for product-specific targeting. An `all_products` rule can still be saved, but nothing will appear until the store has at least one product and the Theme App Extension block is enabled.

## 3. Advertised-feature audit

| Advertised feature | Implementation status | Audit result |
|---|---|---|
| Unlimited charts | Implemented in database/UI | No application limit found. Production database setup is currently broken by missing migrations. |
| No watermark | Implemented | No storefront watermark found in renderer. |
| Product targeting | Partially implemented | Matching exists, but admin requires a raw ID/handle. No Shopify picker or existence validation. |
| Collection targeting | Partially implemented | Matching exists, but raw ID is required. New-chart default `collection: "*"` never matches a normal collection ID. |
| Tag/vendor/product type targeting | Implemented | Case-normalized matching exists. Values are unvalidated free text. |
| Store-wide targeting | Implemented | `all_products` matches. |
| Popup modal | Implemented with accessibility gaps | No focus trap, initial focus, focus return, or labelled dialog relationship. |
| Inline display | Implemented | Code path exists; storefront visual pass still required. |
| Accordion | Implemented with accessibility gaps | Missing `aria-expanded`, `aria-controls`, and controlled-region semantics. |
| Floating button | Implemented with lifecycle risk | Global cleanup removes every chart modal/floating/injected button before rendering one container, so multiple app blocks can interfere with each other. |
| Inch/cm conversion | Defective | Every number in every cell is converted, including numeric size labels such as 28, 30 and 32. |
| Fit guidance | Implemented | Text is hardcoded in English and not localized. |
| Measurement notes | Implemented | Newlines are escaped into a paragraph on storefront and may not preserve the admin preview formatting. |
| CSV import/export | Implemented | Unit tests pass; no file-size, row-count, column-count, or cell-length limits. Export does not revoke the object URL. |
| Button styling | Partially broken | Colors/radius partly apply; shop-level button text, button style, border color and ruler-icon setting are stored but ignored by storefront JS. |
| Custom CSS | Broken | Admin states CSS is injected, API returns it, but storefront JS never applies it. |
| Privacy-friendly | Needs correction | Storefront payload contains no token, but an extra access token is persisted in `Shop`, is retained after uninstall, and public API access is not verified as an app-proxy request. |

## 4. Prioritized findings and required changes

### P0 — Release blockers

#### P0-1. Production migrations do not create the app tables

**Evidence**

- `prisma/schema.prisma` defines `Shop`, `SizeChart`, `SizeChartTable`, `ChartAssignment`, and `DisplaySettings`.
- The only migration, `prisma/migrations/20240530213853_create_session_table/migration.sql`, creates only `Session`.
- `npm run setup` uses `prisma migrate deploy`, so a clean production deployment will not create the feature tables.
- `npx prisma migrate status` reports the single migration as unapplied locally; the working development database appears to have been created with `db push`.

**Required change**

1. Create a real migration containing every current model, relation, index and cascade rule.
2. Test `prisma migrate deploy` against a brand-new empty database.
3. Add a CI smoke test that starts from an empty database, deploys migrations, and performs a basic chart create/read.
4. Decide and configure the production database explicitly. The current datasource is fixed to SQLite despite documentation describing PostgreSQL/MySQL readiness.

**Acceptance criteria**

- A clean deployment creates all tables without `prisma db push`.
- The application starts and can create a chart on a clean database.

#### P0-2. Dashboard and list actions allow cross-shop mutation by chart ID

**Evidence**

- `app/routes/app._index.tsx:27-38` authenticates the requester, then calls `duplicateSizeChart(chartId)` or `deleteSizeChart(chartId)` without confirming that the chart belongs to the authenticated shop.
- `app/routes/app.charts._index.tsx:25-36` has the same defect.
- The edit and assignment routes correctly compare `chart.shopId` with the authenticated shop, showing the intended pattern.

**Impact**

An authenticated merchant who obtains or guesses another chart UUID could duplicate or delete another shop’s chart.

**Required change**

1. Resolve the authenticated `Shop` in every mutation action.
2. Replace ID-only model mutations with shop-scoped mutations such as `deleteSizeChartForShop(chartId, shopId)` and `duplicateSizeChartForShop(chartId, shopId)`.
3. Return 404 or 403 without revealing whether another shop’s chart exists.
4. Add route/action tests with two shops proving cross-tenant update, duplicate, delete and assignment operations fail.

#### P0-3. Authentication fallback can attach a request to the wrong shop

**Evidence**

- `app/utils/auth.server.ts:32-45` falls back to the most recently found offline session or `Shop` when `shop`/`host` are missing.
- This fallback is global rather than tied to the requester, browser session, signed token, or verified Shopify context.

**Impact**

In a multi-shop installation, an incomplete request could be authenticated or routed using another merchant’s shop context.

**Required change**

Remove database-wide “last shop” recovery. Recover context only from a valid session token, signed Shopify parameters, or a verifiable current-shop route. Preserve embedded query parameters in links, but never invent tenant identity from the latest database record.

#### P0-4. Uninstall leaves merchant data and an access-token copy behind

**Evidence**

- `Shop.accessToken` duplicates Shopify credentials outside the session storage.
- `app/routes/webhooks.app.uninstalled.tsx:12-13` deletes only `Session` records and only when `session` is truthy.
- The shop, token copy, charts, assignments and styling data remain indefinitely.

**Required change**

1. Remove `Shop.accessToken` unless a documented requirement makes it unavoidable; use Shopify session storage.
2. On verified uninstall, delete sessions and either delete or deliberately retain merchant content according to a published retention policy. Never retain usable access credentials.
3. Make cleanup idempotent and run it even when `session` is already absent.
4. Add an uninstall webhook integration test.

### P1 — Core functionality and platform readiness

#### P1-1. Most shop-level styling settings do not reach the storefront

**Evidence**

- `app/routes/app.settings.tsx` stores `buttonText`, `buttonStyle`, `borderColor`, and `showRulerIcon` inside a JSON comment prepended to `customCss`.
- The API returns `customCss` unchanged.
- `extensions/size-chart/assets/size-chart.src.js:82-87` reads only `primaryColor`, `textColor`, and `borderStyle`.
- The renderer never parses the JSON header and never applies `customCss`.
- The per-chart `buttonText` always wins, so the settings-page button text has no effect.

**Required change**

1. Add real typed database fields for button text/style, border color, icon visibility, modal accent and table-header color instead of embedding configuration in a CSS comment.
2. Serialize those fields explicitly in the storefront payload.
3. Apply every supported value in the Theme App Extension.
4. Either safely scope and apply custom CSS or remove the field and its “Injected directly” claim.
5. Add storefront renderer tests proving each saved setting changes the generated UI.

#### P1-2. Unit conversion corrupts numeric size labels

**Evidence**

- `size-chart.src.js:57-68` converts every number found in a cell.
- `size-chart.src.js:122-127` applies conversion to every column, including the first “Size” column.
- The admin preview duplicates the same algorithm.

**Example**

A jeans size `28` becomes `71` when converting inches to centimeters, even though 28 is a size label, not a measurement.

**Required change**

1. Mark columns as measurement or label columns, or at minimum exclude the first size/label column.
2. Store unit metadata per measurement column rather than inferring units from all text.
3. Preserve decimal precision consistently and define rounding rules.
4. Add tests for numeric sizes, ranges, decimals, mixed units, nonnumeric sizes and empty values.

#### P1-3. New charts default to an active but non-matching assignment

**Evidence**

- `app/routes/app.charts.new.tsx:107-108` defaults to the sample name “Women’s bottoms” and status `active`.
- `app/routes/app.charts.new.tsx:132-136` defaults targeting to `collection` with target value `*`.
- Collection matching checks equality with real collection IDs; `*` is not treated as a wildcard.

**Impact**

Merchants can save an apparently active chart that never appears. The sample content also makes accidental publication more likely.

**Required change**

Default to a blank name, `draft` status and either no targeting rule or an explicitly chosen `all_products` rule. Block activation until required chart and targeting fields are valid.

#### P1-4. Targeting lacks Shopify resource selection and validation

**Evidence**

- `AssignmentEditor.tsx` asks for “Product ID, Handle, or GID” and “Collection ID or GID” in free-text fields.
- No resource picker or Admin GraphQL validation is used.

**Required change**

1. Use Shopify’s product/collection resource picker.
2. Store normalized GIDs.
3. Display resource names and thumbnails rather than raw identifiers.
4. Validate tags, vendors and product types or provide autocomplete populated from the store.
5. Clearly explain the empty-store state and link to product creation when no products exist.

#### P1-5. Production Shopify configuration still contains placeholders and obsolete versions

**Evidence**

- `shopify.app.toml:5` and redirect URLs point to `https://shopify.dev/apps/default-app-home`.
- The app-proxy target also uses that placeholder base URL.
- Webhooks use API version `2024-10`.
- Runtime uses `ApiVersion.January25` in `app/shopify.server.ts:13,29`.

**Required change**

Use an environment-specific production config with the real HTTPS application URL, redirect URLs and proxy target. Upgrade runtime and webhook versions together to a currently supported stable Shopify API version, then run the Shopify CLI validation and App Store self-review before release.

#### P1-6. Storefront endpoint does not verify the app-proxy request

**Evidence**

- `/api/chart` accepts any caller-provided `shop` value.
- CORS is `*`, GET and POST are accepted, and no proxy signature/session validation or rate limiting is present.

**Required change**

1. Expose one documented GET app-proxy endpoint.
2. Verify Shopify app-proxy signatures using the official Shopify authentication helper.
3. Remove unnecessary POST and wildcard CORS if requests are same-origin through the proxy.
4. Add rate limiting/caching and safe error logging.

#### P1-7. Server actions trust unvalidated enums and JSON shapes

**Evidence**

- Status, fit note, display mode, base unit, table JSON and assignments are cast directly from form data.
- Malformed JSON is silently ignored in several routes.
- There are no bounds for chart names, cell lengths, row/column counts, CSS length or priority values.

**Required change**

Add a shared schema validator for every action and API input. Reject invalid enums, ragged tables, oversized payloads, empty required cells, invalid colors/selectors and non-finite priorities with field-level errors.

### P2 — UX, accessibility and maintainability

#### P2-1. List actions are hidden behind horizontal scrolling

At the audited desktop width, only Edit and part of Targeting were visible; Duplicate and Delete required horizontal scrolling.

**Change:** Use an IndexTable/responsive row layout, keep the primary action visible, and move secondary actions into a per-row menu. Do not require horizontal scrolling for standard merchant actions.

#### P2-2. Admin editor duplicates primary actions

The create/edit routes define Live Preview and Save actions in both Polaris `Page` and App Bridge `TitleBar`, producing repeated controls.

**Change:** Keep one canonical Shopify action surface and ensure loading/disabled state is identical.

#### P2-3. No unsaved-change protection

The chart editor and settings page allow navigation away after changes without a save bar or confirmation.

**Change:** Track dirty state, use Shopify contextual save bar, and warn before route/browser navigation.

#### P2-4. Storefront popup is not keyboard-complete

The storefront dialog has `role="dialog"` and `aria-modal`, but lacks `aria-labelledby`, initial focus, focus trapping, background inertness and focus return. The admin live-preview overlay has no dialog role at all and does not handle Escape.

**Change:** Implement an accessible modal primitive with labelled title, Escape close, focus trap, focus return and scroll restoration.

#### P2-5. Accordion state is not announced

The storefront accordion toggles a CSS class only.

**Change:** Add stable IDs, `aria-expanded`, `aria-controls`, a labelled region and keyboard-tested state changes.

#### P2-6. Multiple app blocks can delete each other’s UI

`renderChart()` globally removes every `.px-sc-floating-btn`, `.px-sc-modal-overlay`, and `.px-sc-injected-btn` before rendering a container.

**Change:** Scope generated elements to a unique container/chart ID and clean up only that instance. Remove document-level listeners during section unload/re-render.

#### P2-7. Storefront failures are silent

The Theme App Extension ends its fetch chain with an empty catch.

**Change:** Show a useful Theme Editor-only error, log a safe diagnostic, allow retry, and distinguish proxy/configuration errors from “no matching chart.”

#### P2-8. Localization is incomplete

Storefront text such as “How to Measure,” unit names and fit messages is hardcoded in JavaScript. The locale file is not used for these strings.

**Change:** Move merchant-facing and shopper-facing strings into locale resources and support storefront locale selection.

#### P2-9. Theme block is missing Shopify editor attributes

The root Liquid element does not include `{{ block.shopify_attributes }}`.

**Change:** Add Shopify block attributes to the root element so the Theme Editor can correctly identify and focus the app block.

#### P2-10. CSV lifecycle and limits need hardening

CSV parsing works and unit tests pass, but there are no import limits. Exported object URLs are not revoked.

**Change:** Limit file bytes/rows/columns/cell lengths, show a preview before replacing the table, validate row widths, revoke object URLs, and add spreadsheet-formula injection protection if exported files may be opened in spreadsheet software.

### P3 — Quality and release process

#### P3-1. Lint is broken

`npm run lint` fails because the inherited Jest ESLint rule cannot detect Jest while this project uses Vitest.

**Change:** Replace/override Jest rules with Vitest-compatible lint configuration and make lint required in CI.

#### P3-2. Build contains a CSS minification warning

The build succeeds but warns about Polaris CSS: `@media (--p-breakpoints-md-up) and print`.

**Change:** Confirm the supported Polaris/Vite combination or add the documented preprocessing/configuration fix, then require a warning-reviewed build.

#### P3-3. Test coverage misses the highest-risk paths

Current result: **7 files, 29 tests passed**. TypeScript and build pass. Tests mainly cover models/serialization and SSR navigation.

Missing coverage:

- Cross-shop route/action authorization.
- Clean-database migration/deployment.
- App-proxy signature verification.
- Uninstall cleanup.
- Storefront DOM behavior for four display modes.
- Unit conversion of numeric size labels.
- Settings-to-storefront parity.
- Keyboard/focus behavior.
- Browser-level Create/Edit/Targeting/Settings navigation.

#### P3-4. Documentation and configuration disagree

- README and launch checklist say only `read_products`; `shopify.app.toml` currently lists `read_products,write_app_proxy`.
- Checklist marks technical items complete while migrations, token cleanup, endpoint verification and storefront settings remain incomplete.
- “Free Forever” is presented as a product promise and should only ship if it is an approved durable business commitment.

**Change:** Update documentation only after implementation and Shopify configuration are final.

## 5. Link and control audit

| Surface | Control | Result / required follow-up |
|---|---|---|
| Dashboard | Create size chart | Pass; opened editor without blink-back. |
| Dashboard | Add new chart | Same route; implementation preserves current query context. |
| Dashboard | Manage assignments | Opens chart list rather than a dedicated assignment overview; acceptable but indirect. |
| Dashboard | Button styling | Opens app settings. |
| Dashboard | Open/Customize theme | URL generation is correct; Theme Editor save not tested. |
| Dashboard | View all | Opens chart list. |
| Dashboard | Edit/Targeting | Routes exist and load. |
| Dashboard | Duplicate/Delete | Not executed; both are currently unsafe because actions are not tenant-scoped. |
| Chart list | Search/Clear | Pass. |
| Chart list | Create | Pass; route works. |
| Chart list | Edit/Targeting | Pass; routes load. |
| Chart list | Duplicate/Delete | Not executed; hidden by horizontal overflow and affected by tenant-isolation defect. |
| Create/Edit | Back to charts | URL implemented with embedded query preservation. |
| Create/Edit | Live preview | Control exists; code review found modal accessibility and numeric conversion defects. |
| Create/Edit | Save | Not executed live; server-side validation is insufficient. |
| Create/Edit | Import/Export CSV | Code and unit tests pass; live file operations not performed. |
| Targeting | Add/remove rule | Controls exist; no resource picker or validation. |
| Targeting | Save | Not executed live; action is tenant-scoped but payload validation is weak. |
| Settings | Button/Chart styling tabs | Pass. |
| Settings | Desktop/Mobile preview | Pass. |
| Settings | Save | Not executed live; storefront does not consume several saved settings. |
| Settings | Open Theme Editor | Correct Shopify admin URL observed. |

## 6. Recommended implementation order

1. **Tenant and credential safety:** P0-2, P0-3, P0-4.
2. **Clean deployment:** P0-1 plus explicit production database configuration.
3. **Storefront correctness:** P1-1, P1-2, P1-3, P1-6.
4. **Targeting usability:** P1-4 and validation in P1-7.
5. **Shopify production config:** P1-5.
6. **Accessibility and responsive UX:** P2 findings.
7. **CI/release discipline:** P3 findings and browser-level regression tests.

Do not submit to the Shopify App Store until all P0 and P1 findings are resolved and the storefront has passed a real product-page test in a supported theme.

## 7. Antigravity implementation brief

Copy the following into Antigravity:

> Work through `docs/audits/2026-11-26-size-chart-plugin-audit.md` in priority order. Preserve existing merchant data and current unrelated work. First add failing tests for each P0 issue, then implement shop-scoped mutations, remove the global last-shop authentication fallback, remove the duplicate Shop access token and make uninstall cleanup idempotent. Create and verify complete Prisma migrations on a clean database. Next make settings-to-storefront serialization typed and complete, fix numeric-size unit conversion, replace the invalid active/collection-* new-chart defaults, add Shopify resource pickers and server-side schema validation, verify app-proxy requests, and update production Shopify URLs/API versions. Finally fix responsive action layout, modal/accordion accessibility, multi-block storefront lifecycle, localization, Theme Editor attributes, lint and end-to-end regression coverage. Do not mark an item complete without the acceptance criteria and relevant tests passing.

## 8. Verification checklist after fixes

- [ ] `npm test` passes with new security, conversion, settings and cleanup tests.
- [ ] `npx tsc --noEmit` passes.
- [ ] `npm run lint` passes.
- [ ] `npm run build` passes with reviewed/no unexpected warnings.
- [ ] Clean database + `prisma migrate deploy` creates every table.
- [ ] Cross-shop duplicate/delete/update/assignment attempts fail.
- [ ] Uninstall removes credentials and follows the documented data-retention policy.
- [ ] Create opens from dashboard/list without blink-back.
- [ ] New chart defaults to draft and cannot silently save an invalid wildcard collection.
- [ ] Product and collection pickers work on stores with and without products.
- [ ] All four display modes work on an actual product page.
- [ ] Numeric sizes remain unchanged during unit conversion.
- [ ] Every setting shown in admin matches the real storefront.
- [ ] Popup and accordion pass keyboard and screen-reader checks.
- [ ] Multiple Size Chart blocks do not remove or interfere with each other.
- [ ] App proxy rejects invalid signatures and handles failures visibly in Theme Editor.
- [ ] Production Shopify config contains no placeholder URL and uses a supported API version.
- [ ] Shopify CLI validation and App Store self-review pass.

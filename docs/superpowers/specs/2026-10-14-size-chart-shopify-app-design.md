# Free Shopify Size Chart App Design

Date: 2026-10-14

## Purpose

Build a public Shopify App Store app that gives merchants a genuinely useful free size chart tool. The first release should win attention by being more generous than most competing size chart apps: unlimited charts, no watermark, strong product targeting, CSV import/export, and multiple display styles without requiring a paid plan.

The app should be built cleanly enough that a Pro plan can be added later, but v1 should not include billing or AI features.

## Target Users

Primary users are Shopify merchants selling apparel, shoes, accessories, jewelry, or any product where shoppers need size guidance before purchase.

The merchant should be able to install the app, create a chart, assign it to relevant products, enable the storefront block, and publish useful size guidance without editing theme code.

## Competitive Wedge

The app should lead with these free promises:

- Unlimited size charts.
- No app watermark.
- Product, collection, tag, vendor, and product type targeting.
- Inline, popup, accordion, and floating-button display modes.
- Cm/inch conversion.
- CSV import/export.
- Fit note: runs small, true to size, or runs large.
- Measurement guide content.
- No shopper personal data collection.

These are intentionally free because many current size chart apps restrict chart count, watermark removal, advanced targeting, import/export, or fit guidance behind paid plans.

## V1 Scope

### Merchant Admin

The embedded Shopify admin app will let merchants:

- View all size charts.
- Create, edit, duplicate, and delete charts.
- Build chart tables manually.
- Start from common templates such as tops, bottoms, shoes, rings, and generic apparel.
- Import a chart from CSV.
- Export a chart to CSV.
- Add a fit note.
- Add measurement instructions.
- Assign a chart by product, collection, product tag, vendor, or product type.
- Choose display mode.
- Customize button text.
- See basic setup guidance for enabling the theme app block or app embed.

### Storefront

The storefront integration will use a Shopify Theme App Extension, not direct theme-code modification.

The extension will support:

- Product-page app block rendering.
- App embed or block settings for display mode.
- Automatic chart selection based on the current product and assignment rules.
- Responsive table rendering on mobile and desktop.
- Optional cm/inch toggle when alternate-unit values are available or derivable.
- Accessible popup behavior for modal display.

### Exclusions From V1

V1 will not include:

- Paid plans or Shopify billing.
- AI size recommendation.
- AI chart creation from images.
- Shopper body measurement collection.
- Customer accounts integration.
- Analytics beyond basic internal timestamps.
- Translation management.
- Country-specific rules.
- Migration tooling from competitor apps.

These can become Pro features later.

## Architecture

Use Shopify's standard public app structure:

- Shopify Remix app for the embedded admin.
- Shopify App Bridge and Polaris for the admin UI.
- Prisma for persistence.
- SQLite for local development.
- A production-ready database boundary so PostgreSQL or MySQL can be used later.
- Theme App Extension for storefront rendering.
- Shopify Admin GraphQL API for reading products and collections.

The app should request the minimum Shopify scopes needed for v1. It should avoid protected customer data entirely.

## Data Model

### Shop

Stores shop-level installation and app configuration.

Fields:

- `id`
- `shopDomain`
- `accessToken`
- `plan`, default `free`
- `createdAt`
- `updatedAt`

### SizeChart

Stores chart-level content and configuration.

Fields:

- `id`
- `shopId`
- `name`
- `status`, either draft or active
- `fitNote`, one of runs_small, true_to_size, runs_large, or none
- `measurementInstructions`
- `displayMode`, one of inline, popup, accordion, or floating
- `buttonText`
- `createdAt`
- `updatedAt`

### SizeChartTable

Stores table content as structured JSON for flexibility.

Fields:

- `id`
- `sizeChartId`
- `columnsJson`
- `rowsJson`
- `baseUnit`, one of cm, inch, or mixed

### ChartAssignment

Stores targeting rules.

Fields:

- `id`
- `sizeChartId`
- `targetType`, one of product, collection, tag, vendor, product_type, or all_products
- `targetValue`
- `priority`

### DisplaySettings

Stores optional storefront styling per chart or shop.

Fields:

- `id`
- `shopId`
- `sizeChartId`, nullable
- `primaryColor`
- `textColor`
- `borderStyle`
- `customCss`, nullable for later use

## Chart Matching Rules

When rendering a product page, the app should select the highest-priority active chart matching the product.

Priority order:

1. Product-specific assignment.
2. Collection assignment.
3. Product tag assignment.
4. Vendor assignment.
5. Product type assignment.
6. All-products fallback.

If multiple charts match within the same target type, lower `priority` number wins. If priority ties, the most recently updated chart wins.

## Admin Routes

Planned routes:

- `/app` dashboard and setup checklist.
- `/app/charts` chart list.
- `/app/charts/new` create chart.
- `/app/charts/:id` edit chart.
- `/app/charts/:id/assignments` assignment rules.
- `/app/settings` shop-level display defaults.
- `/app/import` CSV import flow.

## Storefront API Shape

The theme extension should load the matching chart through an app proxy or app-owned route that accepts product context.

Input:

- shop domain
- product id
- product handle
- product tags, vendor, type, and collection ids where available

Output:

- chart name
- table columns and rows
- fit note
- measurement instructions
- display settings
- display mode

The output should be cache-friendly and should not include secret or merchant-only data.

## CSV Format

CSV import should support a simple merchant-friendly format:

```csv
Size,Chest,Waist,Hip
S,36-38,30-32,35-37
M,39-41,33-35,38-40
L,42-44,36-38,41-43
```

The first row becomes table headers. Remaining rows become chart rows. The importer should trim empty trailing columns and rows, reject fully empty files, and show a clear validation error for malformed input.

## UX Principles

The app should feel practical and quick, not marketing-heavy.

- Dashboard first screen should show setup status and recent charts.
- Chart editing should keep table editing, fit note, and display preview close together.
- Assignment settings should use familiar Shopify resource pickers where possible.
- Empty states should guide the merchant to the next action.
- Storefront output should inherit theme typography where possible and avoid heavy styling.

## Privacy And Review Posture

The app should not collect shopper personal data. It should not require protected customer data access. It should not modify merchant theme code directly.

The Shopify App Store listing should emphasize:

- Free unlimited charts.
- No watermark.
- No customer data collection.
- Easy theme app block setup.

Required launch assets:

- App icon.
- App screenshots.
- Privacy policy URL.
- Terms of service URL.
- Support email.
- Review instructions and demo store access.

## Testing Plan

Manual and automated verification should cover:

- App install and OAuth.
- Chart create/edit/delete/duplicate.
- CSV import/export.
- Assignment rule matching.
- Storefront rendering for each display mode.
- Products with no matching chart.
- Mobile table behavior.
- Theme App Extension behavior on Dawn.
- App uninstall cleanup.

## Future Pro Plan

Possible paid features:

- AI chart generation from product images or existing chart screenshots.
- AI size recommender.
- Multi-language chart translations.
- Country-specific chart rules.
- Analytics for chart views and interactions.
- Bulk editing and bulk assignment.
- Competitor app migration.
- Advanced styling.

The v1 data model includes `plan` so billing can be added later without changing the core shop model.

## Success Criteria

The v1 app is successful when:

- A merchant can install it on a development store.
- A merchant can create unlimited size charts.
- A merchant can assign charts to products or product groups.
- A size chart renders correctly on a product page through a theme app extension.
- The app can be submitted to Shopify review with no protected customer data dependency.
- The codebase has a clear path to add Pro billing later.

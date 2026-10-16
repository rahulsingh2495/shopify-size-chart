# Pixelotech Free Size Chart & Size Guide for Shopify

A free, watermark-free Shopify app that allows merchants to create responsive size charts, target them by product or collection, and display them on the storefront via a Shopify Theme App Extension.

---

## Features

- **Unlimited Size Charts:** No chart limits on the free plan.
- **Zero Watermark:** Clean, merchant-branded presentation with no app branding.
- **Granular Targeting:** Assign charts by Product, Collection, Tag, Vendor, Product Type, or Store-wide fallback.
- **Multiple Display Modes:** Inline table, responsive Popup Modal, collapsible Accordion, and Floating Button.
- **Unit Conversion:** Real-time conversion toggle between inches and centimeters.
- **Fit Guidance & Measurement Notes:** Highlight whether products run small, true to size, or run large.
- **CSV Import & Export:** Easily migrate or bulk edit charts via standard CSV format.
- **100% Privacy-Friendly:** Zero shopper personal data collected or stored; requests only `read_products` scope.

---

## Architecture & Tech Stack

- **Framework:** Shopify Remix App (`@shopify/shopify-app-remix`)
- **Admin UI:** React, Shopify Polaris, App Bridge
- **Database / ORM:** Prisma ORM with SQLite for local dev (production-ready for PostgreSQL or MySQL)
- **Storefront:** Shopify Theme App Extension (Liquid, vanilla JavaScript, responsive CSS)
- **Testing:** Vitest test suite covering models, rule matching, CSV parsing, and storefront serialization

---

## Quick Start & Local Development

### 1. Prerequisites
- Node.js >= 20.0.0
- npm >= 10.0.0
- Shopify CLI: `npm run shopify`

### 2. Setup Environment
```bash
npm install
npx prisma generate
npx prisma db push
```

### 3. Run Test Suite
```bash
npm test
```

### 4. Start Local Development
To connect to your Shopify Partner account and test on a Development Store:
```bash
npm run dev
```
Shopify CLI will:
1. Create a secure tunnel to your local machine.
2. Link or create your app in the Shopify Partner Dashboard.
3. Push the Theme App Extension to your test store.
4. Provide an install URL to test the embedded admin experience in real-time.

---

## Adding the Size Chart to Your Storefront

1. Open your Shopify Admin.
2. Navigate to **Online Store > Themes > Customize**.
3. Select the **Default Product** template from the top dropdown.
4. In the Product Information section, click **Add Block** and select **Size Chart**.
5. Position the block (e.g. above or below the variant picker) and click **Save**.

---

## Project Structure

```
├── app/
│   ├── components/            # Polaris UI components (ChartTableEditor, DisplayModePicker, AssignmentEditor)
│   ├── models/                # Prisma persistence (chart.server.ts, assignment.server.ts, shop.server.ts)
│   ├── routes/                # Remix admin routes & public /api/chart endpoint
│   ├── types/                 # Shared TypeScript interfaces
│   └── utils/                 # CSV parsing and storefront payload serialization
├── extensions/
│   └── size-chart/            # Shopify Theme App Extension
│       ├── assets/            # Storefront CSS & JS
│       └── blocks/            # Liquid app block (size-chart.liquid)
├── prisma/                    # Prisma database schema & migrations
├── tests/                     # Vitest automated test suites
└── docs/                      # Design specs, plans, and App Store submission checklists
```

---

## License & Ownership

Developed by **Pixelotech**.

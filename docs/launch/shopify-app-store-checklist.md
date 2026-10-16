# Shopify App Store Launch Checklist & Submission Guide

**App Name:** Pixelotech Free Size Chart & Size Guide  
**Category:** Conversion & Product Information  
**Pricing:** 100% Free (Unlimited charts, no watermark, all display modes included)

---

## 1. App Store Listing Details

- [ ] **App Title:** Pixelotech Free Size Chart & Size Guide
- [ ] **Tagline:** Unlimited size charts, zero watermarks, and fit guidance.
- [ ] **Key Benefits:**
  1. **Unlimited Watermark-Free Charts:** Create as many size charts as you need without branding or limits.
  2. **Smart Product Targeting:** Automatically assign charts by individual product, collection, tag, vendor, or store-wide.
  3. **Multiple Display Modes:** Inline table, responsive popup modal, collapsible accordion, or floating button.
  4. **Unit Conversion:** One-click instant toggle between inches and centimeters.
  5. **Zero Shopper Data Tracking:** 100% privacy compliant with no customer tracking or personal data collection.

---

## 2. Listing Assets

- [ ] **App Icon:** 1200 x 1200 px (PNG, no transparency, crisp branding).
- [ ] **Screenshots:** Minimum 3 (1600 x 1000 px):
  - Screenshot 1: Admin Size Chart Editor with Table Presets & CSV Import.
  - Screenshot 2: Product Targeting Rules (by product, collection, vendor, tag).
  - Screenshot 3: Storefront Popup Modal & CM/Inches Toggle on Dawn Theme.
- [ ] **App Video (Optional):** Short 30-60 second walkthrough demonstrating ease of setup.

---

## 3. URLs & Support

- [ ] **Privacy Policy URL:** Publicly accessible page stating that no shopper personal data or protected customer data is collected or stored.
- [ ] **Terms of Service URL:** Publicly accessible terms page.
- [ ] **Support Email:** `support@pixelotech.com` (monitored).
- [ ] **FAQ / Setup Documentation:** Guide showing how to add the Theme App Block in Shopify Theme Editor.

---

## 4. Technical & Review Posture

- [x] **No Protected Customer Data:** The app only requests `read_products` and never requests `read_customers` or protected customer scopes.
- [x] **Theme App Extension Integration:** Zero direct modifications to merchant theme code; rendered safely via Shopify App Block (`blocks/size-chart.liquid`).
- [x] **App Bridge & Polaris Admin:** Embedded cleanly inside Shopify admin using official Shopify Remix App template and Polaris components.
- [x] **Automated Tests:** Comprehensive unit and integration test coverage for models, CSV parsing, rule matching, and storefront serialization.

---

## 5. Reviewer Demo Store Instructions

Provide these clear steps in the Shopify Partner review notes:
1. Open the embedded app dashboard.
2. Review the pre-populated "Men's Classic Tops" chart or click **Create Size Chart**.
3. Target the chart to all products or a specific collection/product.
4. Open the Development Store Theme Editor (**Online Store > Themes > Customize**).
5. Open any Product template, click **Add Block > Size Chart**, and click **Save**.
6. Visit the product on the storefront to verify the responsive popup modal, unit conversion switch, and fit guidance note.

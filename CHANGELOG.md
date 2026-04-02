# Changelog

All notable changes to the Meal Planner PWA are documented here.

## [2026-04-01] — Dietary Preferences & UI Enhancements

### Added
- **Preferences tab** with three sections:
  - Allergen checklist (top 10 food allergies + custom "Other" input)
  - Diet goals & guidelines text area with AI Assistant integration tip
  - Ingredient tier list (S/A/B/C/D/I'll try it) with drag-and-drop and click-to-place
- **Trash bin** in tier list to remove unwanted ingredients
- **Macro progress bars** for fats, carbs, fiber, and protein on each day view
- **Daily NF badge** on day summary header — shows summed nutrition facts for all assigned meals
- **Collapsible category sections** (Breakfast, Lunch, etc.) in the All tab
- Green circle indicator moved from today's date to the **All** tab

### Removed
- Daily description/goal notes from day view (e.g. "Midweek balance — lean proteins...")

## [2026-04-01] — Static Nutrition & Warning Removal

### Changed
- Replaced USDA API lookups with **hard-coded per-100g nutrition data** (USDA SR Legacy) for all 49 ingredients
- Simplified `computeMealNutrition` to read directly from static data
- Nutrition label rendering is now fully synchronous and offline-capable

### Removed
- All **warning badges**, warning acknowledgment UI, and `@keyframes warningPulse` animation
- USDA API client functions (`searchUSDA`, `fetchNutrientsByFdcId`)
- API key input field and all localStorage caching for nutrition data
- `if (url.hostname === 'api.nal.usda.gov') return;` bypass in service worker

## [2026-04-01] — Collapsible Ingredients & Meal Details

### Added
- **Collapsible ingredient lists** on each meal card with toggle button
- **Ingredient detail descriptions** for all 25 meals (e.g. "Non-fat vanilla Greek yogurt", "90/10 ground beef", "Wild-caught Atlantic salmon fillet, skin-on")
- Portion-specific weights for accurate nutrition calculations (e.g. 1 cup oats = 80g, 1 large egg = 50g)

### Fixed
- Collapsible toggle using class-based approach (`ingredients-hidden`) instead of HTML `hidden` attribute to avoid CSS `display: flex` override
- Bidirectional string matching for portion unit parsing (fixes plural matching like "cups" vs "cup")

## [2026-03-31] — Calendar Date System

### Changed
- Switched planner from fixed weekday tabs to **real calendar dates**
- Added date range picker with presets (1 Week, 2 Weeks, 30 Days)
- Day tabs now show actual dates (e.g. "Wed 4/1") instead of generic weekday names

## [2026-03-31] — Initial Release

### Added
- Meal Planner PWA with 25 pre-built meals across 5 categories
- Drag-and-drop meal assignment to daily slots
- Grocery list auto-generated from assigned meals, grouped by store section
- FDA-format nutrition facts modal per meal
- AI chat assistant (Claude) for meal suggestions and plan modifications
- Dark theme with responsive layout
- Service worker for offline support and PWA installation

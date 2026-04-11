# Meal Planner PWA

## File Structure

```
meal-planner/
├── index.html          — Main HTML shell, loads all scripts and styles
├── app.js              — All application logic: state, rendering, navigation, AI chat
├── meals.js            — Meal data array (edit this to add/change meals)
├── styles.css          — All styles, dark theme, responsive layout
├── manifest.json       — PWA manifest for standalone install
├── service-worker.js   — Caches all assets for offline use
├── CLAUDE.md           — This file
└── icons/
    ├── icon-192.png    — App icon 192x192
    └── icon-512.png    — App icon 512x512
```

## Where Meal Data Lives

All meal content is in **`meals.js`**. This file defines a single `MEALS` array that the app reads on startup. You never need to touch `app.js` to add, edit, or remove meals.

## How to Add or Edit Meals

Each meal in the `MEALS` array has this structure:

```js
{
  id: "unique-string-id",       // Must be unique across all meals
  name: "Meal Name",
  description: "Short description.",
  category: "Breakfast",         // One of: Breakfast, Lunch, Snack, Dinner, Dessert
  macros: {
    fats: 10,                    // grams
    carbs: 30,
    fiber: 8,
    protein: 15
  },
  ingredients: [
    { name: "Oats", amount: "1 cup", section: "Pantry and Grains" }
  ]
}
```

### Valid ingredient sections

These map to grocery list tabs:
- `Produce`
- `Dairy`
- `Meat and Seafood`
- `Pantry and Grains`
- `Canned and Jarred`
- `Refrigerated`
- `Frozen`

### To add a meal

Copy an existing entry, change the `id` to something unique, fill in all fields, and add it to the `MEALS` array.

### To remove a meal

Delete its object from the `MEALS` array. If it was assigned to any day slot, clear localStorage or the assignment will reference a missing meal.

## Meal Authoring

For any bulk meal work — generating new recipes, auditing `meals.js` for portion/unit issues, or cleaning up existing entries — delegate to the **`meal-author`** subagent (`.claude/agents/meal-author.md`). Its system prompt is the canonical source of unit conventions, portion ceilings, macro ranges, and cooking-sense rules; main Claude should not re-derive them.

Every edit to meals (by any route — subagent, main Claude, or the standalone CLI) must pass:

```sh
node scripts/validate-meals.js               # validates meals.js
node scripts/validate-meals.js generated-meals.json   # validates a generated batch
```

Exit 0 = clean, exit 1 = errors that must be fixed before committing. Warnings are acceptable but review them.

The standalone `generate-meals.js` CLI script mirrors the subagent's rules for users who aren't running Claude Code. When you change rules in one, sync the other.

## Deployment

No build step required. Serve all files from a static host. For GitHub Pages, push to a repo and enable Pages — all paths use relative URLs (`./`) so it works from any subdirectory.

## Local Development

Run any static server from the project root:

```sh
python3 -m http.server 8000
npx serve .
```

## AI Assistant

The chat assistant uses the Anthropic API (claude-sonnet-4-20250514). Users enter their own API key in the chat panel. The assistant can add, edit, remove, and reassign meals using structured commands embedded in its responses.

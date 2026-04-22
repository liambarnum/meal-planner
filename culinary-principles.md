# Culinary Principles

Shared knowledge for the meal-planner project. Two subagents (`culinary-knowledge`, `meal-author`) read this doc, and its text is embedded into the in-app chat's system prompt via `culinary-data.js`. Treat this as the source of truth — if a principle changes, it changes here, and everything downstream is regenerated.

## 1. UI buckets (custom-meal modal)

The custom-meal modal groups ingredients into five user-facing buckets. Every ingredient in `nutrition.js` is tagged with exactly one bucket, or with a hidden flag.

| Bucket | What belongs here |
|---|---|
| **Protein** | The ingredient's primary nutritional role is supplying protein: meat, fish, poultry, tofu, tempeh, seitan, eggs, Greek yogurt, cottage cheese, most beans and legumes when used as a protein (black beans, chickpeas, cannellini), protein powders. |
| **Starch / Grain** | Calorie-dense carb staples: rice (white/brown/jasmine/etc.), oats, quinoa, pasta, bread, tortillas, potatoes, sweet potatoes, couscous, farro, barley, dry lentils (used as a grain-like staple). |
| **Vegetable** | Savory produce: leafy greens, cruciferous, peppers, onions, squash, carrots, mushrooms. Tomatoes, avocado, olives, and cucumbers live here despite being botanical fruit — culinary use wins. |
| **Fruit** | Sweet produce: apples, bananas, berries (including "mixed berries"), citrus fruits eaten as fruit (not juiced/zested as flavoring), stone fruits, grapes, melon, pineapple, mango, pomegranate. |
| **Other** | Everything that doesn't fit above but is a real ingredient contribution: dairy for drinking/pouring (milk, heavy cream), cheese (as a flavor/fat contributor, not a primary protein), nuts and nut butters, oils as a *meal component* not a cooking medium, canned tomatoes/coconut milk, condiments with meaningful calories (peanut sauce, pesto, hummus). |

### Hidden flag (not shown in any bucket)

Set `hide: true` on anything that is functionally a **flavoring** or **aromatic** — used in small amounts to season, not consumed as a meal component. These clutter the picker and confuse the "pick a protein/starch/veg" mental model.

Includes:
- Alliums used as aromatics: garlic, shallots, scallions when ≤ 2 tbsp, ginger (fresh or powder).
- Fresh and dried herbs: rosemary, thyme, basil, oregano, cilantro, parsley, sage, mint, dill, chives, tarragon, bay leaves.
- Spices and spice powders: cumin, paprika, chili powder, turmeric, cinnamon, nutmeg, cayenne, etc. (These should already be sectioned `Seasonings` in meals.js — but tag them hidden regardless of section so the bucket picker stays clean.)
- Acid/flavor additions in small amounts: lemon juice, lime juice, vinegar (all kinds), soy sauce, fish sauce, hot sauce, Worcestershire.
- Salt, pepper, and anything else a cook would list at the bottom of a recipe.
- Water.

Aromatic garlic / ginger / herbs are hidden in the bucket picker *even if* the meal author happened to section them under `Produce`. Sectioning drives the grocery list; bucketing drives the picker. They're independent.

### The ≥10 g protein rule is gone

Previously the custom-meal modal classified anything with ≥10 g protein per default serving as Protein. That rule mis-classifies white rice (1 dry cup ≈ 13 g), dry lentils, and similar carb-dominant staples. It also miscategorizes a single egg (~6 g) as Other. **Culinary role trumps macros.** Eggs are always Protein. Rice is always Starch. Tag by what the ingredient *is*, not what it weighs.

## 2. Bucket principles — worked examples

| Ingredient | Section in meals.js | Bucket | Why |
|---|---|---|---|
| Eggs | Dairy | **protein** | Culinary role is protein, regardless of Dairy section or low-per-egg macros. |
| White rice | Pantry and Grains | **starch** | Staple grain. Dry-cup protein is a statistical artifact, not culinary identity. |
| Red lentils | Pantry and Grains | **starch** | Used as a grain-like staple (soups, dal). Whole lentils used as a pulse could plausibly be protein; err toward starch when sectioned under grains. |
| Chickpeas (canned) | Canned and Jarred | **protein** | Used as the protein element of most dishes they appear in. |
| Cottage cheese | Dairy | **protein** | High-protein dairy used as the main protein. |
| Feta / cheddar / parmesan | Dairy | **other** | Flavor/fat contributor, not the main protein. |
| Greek yogurt | Dairy | **protein** | Used as the protein element (parfaits, high-protein snacks). |
| Mixed berries | Produce | **fruit** | Any produce item whose name contains "berry" or "berries" is fruit. |
| Avocado | Produce | **vegetable** | Culinary use — treated as a savory component. |
| Tomatoes (fresh) | Produce | **vegetable** | Same reasoning. |
| Canned tomatoes | Canned and Jarred | **other** | Base/sauce ingredient, not a produce item. |
| Garlic | Produce | **hide (aromatic)** | Aromatic, used in small amounts. |
| Fresh ginger | Produce | **hide (aromatic)** | Same. |
| Fresh rosemary | Produce | **hide (aromatic)** | Herb. |
| Lemon juice | Produce | **hide (aromatic)** | Acid flavoring. |
| Whole lemon | Produce | **fruit** | When used as a fruit (wedges on a plate), not juiced. |
| Olive oil | Pantry and Grains | **other** | Used as a meal component in dressings and drizzles. Cooking-medium uses are also fine in Other. |
| Salt / black pepper | Seasonings | **hide (seasoning)** | Always hidden. |

When in doubt, ask: "If I told a friend 'I had an X bowl for dinner,' would they expect X to be the main thing on the plate?" Garlic-and-rice bowl? No. Chicken-and-rice bowl? Yes. That's the bucket test.

## 3. Unit conventions

Amount strings are human-readable (`"6 oz"`, `"1.5 cups"`, `"3 cloves"`). The unit class depends on the ingredient.

| Ingredient class | Required unit style | Examples |
|---|---|---|
| **Proteins** (meat, fish, tofu) | Weight (oz, lb, g) OR count | `"6 oz"`, `"1 fillet"`, `"2 thighs"` |
| **Eggs** | Count with size | `"3 large"` |
| **Liquids** (broth, milk, juice) | Volume (cup, tbsp, ml, fl oz) | `"1.5 cups"`, `"0.25 cup"` |
| **Dry grains** (rice, oats, quinoa) | Volume — specify dry or cooked | `"0.5 cup dry"`, `"1 cup cooked"` |
| **Flour, sugar, nuts, seeds** | Volume (cup, tbsp) | `"2 tbsp"`, `"0.25 cup"` |
| **Cheese** | Weight (oz) or count | `"1 oz"`, `"2 slices"` |
| **Produce — whole items** | Count + size | `"1 medium apple"`, `"0.5 medium onion"` |
| **Produce — leafy/loose** | Volume | `"2 cups spinach"` |
| **Herbs, spices, salt** | tsp / tbsp | `"1 tsp cumin"`, `"0.5 tsp salt"` |
| **Oils, vinegars** | tsp / tbsp | `"1 tbsp olive oil"` |

**Never measure proteins by volume.** `"2 cups shredded chicken"` is wrong — use `"8 oz"` or `"1 large breast, shredded"`.

## 4. Portion ceilings (single serving for one adult)

| Ingredient | Soft max | Hard max |
|---|---|---|
| Broth / stock | 2 cups | 3 cups |
| Cooking oil | 2 tbsp | 4 tbsp |
| Dry rice / grains | 0.5 cup dry | 0.75 cup dry |
| Cooked rice / grains | 1.5 cups | 2 cups |
| Cheese | 2 oz | 3 oz |
| Nuts / seeds | 0.33 cup | 0.5 cup |
| Honey / maple syrup | 1 tbsp | 2 tbsp |
| Salt | 1 tsp | 1.5 tsp |

If a dish genuinely needs more, reduce the portion or split into two servings. Don't edit the ceilings to fit a dish.

## 5. Macro plausibility per category (single serving)

Soft targets. Outliers should be deliberate (e.g., keto breakfast), not accidental.

| Category | Protein (g) | Carbs (g) | Fats (g) |
|---|---|---|---|
| Breakfast | 10–45 | 20–110 | 5–30 |
| Lunch | 20–60 | 25–100 | 8–40 |
| Dinner | 20–60 | 25–100 | 8–42 |
| Snack | 3–30 | 5–50 | 2–20 |
| Dessert | 0–25 | 10–60 | 0–20 |

If the app has `categoryRanges` in state, those override this table.

## 6. Meal audit checklist

When auditing a meal, surface any of the following as issues, ordered by severity:

1. **Unit-class mismatch.** Protein measured by volume, liquid measured by weight, leafy green measured by count. (`error`)
2. **Portion over hard max.** Broth > 3 cups, oil > 4 tbsp, cooked rice > 2 cups, etc. (`error`)
3. **Portion over soft max.** Same list, soft numbers. (`warning`)
4. **Missing aromatic / seasoning.** A savory meal with no salt, no aromatic, and no spice entries. (`warning`)
5. **Missing staple for the dish type.** Stir-fry with no protein; salad with no dressing/fat; sandwich with no bread; soup with no liquid. (`warning`)
6. **Implausible combination.** Breakfast with 3 cups broth; dessert with 8 oz chicken; pile of healthy foods that isn't structured as a dish. (`warning`)
7. **Description ↔ ingredients mismatch.** "Creamy mushroom pasta" with no cream. (`warning`)
8. **Lopsided portions.** 8 oz protein with 0.25 cup of everything else. (`info`)
9. **Macros outside category range, non-deliberately.** Dinner with 5 g protein. (`info`)

For each issue return: `{ severity, category, message, ingredients?: [...names] }`.

## 7. Cooking sense

- **Is it a dish, or a pile of healthy foods?** A meal has a form (bowl, skillet, sandwich, soup). "Chicken, broccoli, rice" is three ingredients; "Chicken and broccoli rice bowl" is a meal.
- **Can a normal person cook this in one session?** No 48-hour marinades or industrial equipment.
- **Is there balance?** Main meals typically have protein + carb + vegetable. Snack/Dessert are exceptions.
- **Does the description match the ingredients?** Anything hinted at in the description must be in the ingredients.

When in doubt between two choices, pick the one a home cook would make, not a test kitchen.

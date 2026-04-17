#!/usr/bin/env node
/**
 * Generates new meals based on ingredient tier preferences.
 *
 * Usage:
 *   node generate-meals.js --key <anthropic-api-key> [--prefs preferences.json] [--count 5] [--out generated-meals.json]
 *
 * 1. Export preferences.json from the Preferences page in the app
 * 2. Run this script
 * 3. Import generated-meals.json via the "Import Generated Meals" button in the app
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// ─── CLI ARGS ───
function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { prefs: './preferences.json', count: 5, out: './generated-meals.json', key: '' };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--prefs' && args[i + 1]) opts.prefs = args[++i];
    else if (args[i] === '--count' && args[i + 1]) opts.count = parseInt(args[++i]) || 5;
    else if (args[i] === '--out' && args[i + 1]) opts.out = args[++i];
    else if (args[i] === '--key' && args[i + 1]) opts.key = args[++i];
  }
  return opts;
}

// ─── READ EXISTING MEAL NAMES ───
function getExistingMeals() {
  const mealsPath = path.join(__dirname, 'meals.js');
  if (!fs.existsSync(mealsPath)) return [];
  const content = fs.readFileSync(mealsPath, 'utf8');
  const names = [];
  const idNameRegex = /id:\s*["']([^"']+)["'][\s\S]*?name:\s*["']([^"']+)["']/g;
  let m;
  while ((m = idNameRegex.exec(content)) !== null) {
    names.push({ id: m[1], name: m[2] });
  }
  return names;
}

// ─── BUILD PROMPT ───
function buildPrompt(prefs, existingMeals, count) {
  const { ingredientTiers = {}, allergens = [], dietGoals = '' } = prefs;

  const tierGroups = { S: [], A: [], B: [], C: [], D: [], try: [], trash: [] };
  for (const [ing, tier] of Object.entries(ingredientTiers)) {
    if (tierGroups[tier]) tierGroups[tier].push(ing);
  }

  const tierDesc = [
    tierGroups.S.length ? `STRONGLY PREFER (S-tier): ${tierGroups.S.join(', ')}` : '',
    tierGroups.A.length ? `PREFER (A-tier): ${tierGroups.A.join(', ')}` : '',
    tierGroups.B.length ? `LIKE (B-tier): ${tierGroups.B.join(', ')}` : '',
    tierGroups.C.length ? `NEUTRAL (C-tier): ${tierGroups.C.join(', ')}` : '',
    tierGroups.D.length ? `DISLIKE (D-tier): ${tierGroups.D.join(', ')}` : '',
    tierGroups.try.length ? `WILLING TO TRY: ${tierGroups.try.join(', ')}` : '',
    tierGroups.trash.length ? `NEVER USE: ${tierGroups.trash.join(', ')}` : '',
  ].filter(Boolean).join('\n');

  const existingList = existingMeals.map(m => `- ${m.name} (id: ${m.id})`).join('\n');

  return `You are authoring recipes for a single-adult meal planner. Generate exactly ${count} new meals as a JSON array. Each meal is ONE serving for ONE adult and must read like something a real person would cook and eat — not a pile of healthy ingredients.

USER INGREDIENT PREFERENCES:
${tierDesc || '(no preferences set)'}

ALLERGENS TO AVOID: ${allergens.length ? allergens.join(', ') : 'none'}

DIET GOALS: ${dietGoals || 'none specified'}

EXISTING MEALS (do not duplicate these):
${existingList}

SCHEMA:
- Required fields: id (kebab-case, unique), name, description, category, ingredients.
- Valid categories: Breakfast, Lunch, Snack, Dinner, Dessert.
- Valid ingredient sections: Produce, Dairy, Meat and Seafood, Pantry and Grains, Canned and Jarred, Refrigerated, Frozen.
- Macros are integers in grams: fats, carbs, fiber, protein. Calories are NOT included.

UNIT CONVENTIONS (strict):
- Proteins (meat, fish, tofu, tempeh): weight (oz, lb, g) OR count ("1 fillet", "2 thighs"). NEVER volume. "2 cups shredded chicken" is wrong — use "8 oz shredded".
- Eggs: count with size, e.g. "3 large".
- Liquids (broth, milk, juice): volume (cup, tbsp, fl oz, ml).
- Dry grains (rice, oats, quinoa): volume, specify dry or cooked, e.g. "0.5 cup dry" or "1 cup cooked".
- Cheese: weight (oz) or count ("2 slices").
- Produce whole items: count + size ("1 medium apple"). Produce leafy/loose: volume ("2 cups spinach").
- Herbs, spices, salt, oils: tsp / tbsp.

SINGLE-SERVING SANITY CEILINGS:
- Broth / stock: max 2 cups (hard limit 3).
- Cooking oil: max 2 tbsp (hard limit 4).
- Dry rice / grains: max 0.5 cup dry.
- Cheese: max 2 oz.
- Nuts / seeds: max 0.33 cup.
- Honey / syrup: max 1 tbsp.

MACRO RANGES (per single serving):
- Breakfast: protein 10–45g, carbs 20–110g, fats 5–30g.
- Lunch / Dinner: protein 20–60g, carbs 25–100g, fats 8–42g.
- Snack: protein 3–30g, carbs 5–50g, fats 2–20g.
- Dessert: protein 0–25g, carbs 10–60g, fats 0–20g.

COOKING SENSE CHECKLIST — apply to every meal before finalizing:
1. It is a dish (bowl, skillet, soup, sandwich, stir-fry), not three ingredients listed together.
2. A normal home cook can make it in one session with standard equipment.
3. Seasoning is present — salt + aromatics (garlic, onion, herbs, spice) for savory dishes.
4. Balanced: protein + carb + vegetable for main meals, unless the category says otherwise.
5. The description matches the ingredient list exactly — no implied ingredients missing.
6. Ingredient portions are consistent with each other (not 8 oz protein + 0.25 cup veg).

PREFERENCE RULES:
- Prioritize S and A tier ingredients across the batch.
- Avoid D-tier ingredients unless necessary.
- Never use NEVER USE (trash) tier or allergens.

OUTPUT FORMAT — respond with ONLY a valid JSON array, no other text:
[
  {
    "id": "unique-kebab-case-id",
    "name": "Meal Name",
    "description": "One sentence description.",
    "category": "Breakfast",
    "ingredients": [
      { "name": "Ingredient Name", "amount": "1 cup", "section": "Produce" }
    ]
  }
]

NOTE: Nutrition data (macros, calories) is computed automatically from ingredients via the USDA database. Do not include a "macros" property.`;
}

// ─── CALL CLAUDE API ───
function callAPI(prompt, apiKey) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }]
    });

    const req = https.request({
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(body)
      }
    }, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode !== 200) {
          return reject(new Error(`API error ${res.statusCode}: ${data}`));
        }
        try {
          const parsed = JSON.parse(data);
          resolve(parsed.content[0].text.trim());
        } catch (e) {
          reject(new Error('Failed to parse API response'));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function parseMealsFromText(text) {
  // Strip markdown code fences if present
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = fenceMatch ? fenceMatch[1].trim() : text.trim();
  return JSON.parse(jsonStr);
}

// ─── MAIN ───
async function main() {
  const opts = parseArgs();

  if (!opts.key) {
    opts.key = process.env.ANTHROPIC_API_KEY || '';
    if (!opts.key) {
      console.error('Error: Anthropic API key required. Pass --key <key> or set ANTHROPIC_API_KEY env var.');
      process.exit(1);
    }
  }

  if (!fs.existsSync(opts.prefs)) {
    console.error(`Error: Preferences file not found: ${opts.prefs}`);
    console.error("Export your preferences from the app's Preferences page first.");
    process.exit(1);
  }

  const prefs = JSON.parse(fs.readFileSync(opts.prefs, 'utf8'));
  const existingMeals = getExistingMeals();

  const tierCount = Object.keys(prefs.ingredientTiers || {}).length;
  console.error(`Loaded preferences: ${tierCount} ingredients tiered, ${(prefs.allergens || []).length} allergens`);
  console.error(`Found ${existingMeals.length} existing meals to avoid duplicating`);
  console.error(`Generating ${opts.count} meals via Claude API...`);

  const prompt = buildPrompt(prefs, existingMeals, opts.count);
  const responseText = await callAPI(prompt, opts.key);
  const meals = parseMealsFromText(responseText);

  if (!Array.isArray(meals)) throw new Error('Response was not a JSON array');

  fs.writeFileSync(opts.out, JSON.stringify(meals, null, 2));
  console.error(`\n✓ Generated ${meals.length} meals → ${opts.out}`);
  meals.forEach(m => console.error(`  - [${m.category}] ${m.name}`));
  console.error('\nImport generated-meals.json via the "Import Generated Meals" button on the Preferences page.');
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });

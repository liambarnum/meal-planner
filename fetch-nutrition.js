#!/usr/bin/env node
/**
 * Fetches accurate USDA nutrition data for all meal ingredients.
 *
 * Usage:
 *   node fetch-nutrition.js            # fetches data and writes into nutrition.js
 *   node fetch-nutrition.js --dry-run  # outputs to stdout instead of writing
 */

const API_KEY = '9hOC3zECxuVSP4ZTbxIty0k0gi9PsuUXdEgUR26h';
const BASE = 'https://api.nal.usda.gov/fdc/v1';

// Nutrient IDs we need (per 100g values from SR Legacy)
const NUTRIENT_MAP = {
  1008: 'calories',        // Energy kcal
  1004: 'totalFat',        // Total lipid (fat)
  1258: 'saturatedFat',    // Fatty acids, total saturated
  1257: 'transFat',        // Fatty acids, total trans
  1253: 'cholesterol',     // Cholesterol mg
  1093: 'sodium',          // Sodium mg
  1005: 'totalCarbs',      // Carbohydrate, by difference
  1079: 'dietaryFiber',    // Fiber, total dietary
  2000: 'totalSugars',     // Total Sugars
  1003: 'protein',         // Protein
  1114: 'vitaminD',        // Vitamin D (D2 + D3) mcg
  1087: 'calcium',         // Calcium mg
  1089: 'iron',            // Iron mg
  1092: 'potassium'        // Potassium mg
};

// Search queries tuned for SR Legacy results — maps ingredient name to search term
const SEARCH_OVERRIDES = {
  'apple': 'apples raw with skin',
  'banana': 'bananas raw',
  'plain greek yogurt': 'yogurt greek plain whole milk',
  'rolled oats': 'oats regular quick not fortified dry',
  'low-fat milk': 'milk lowfat fluid 1% milkfat',
  'ground flaxseed': 'seeds flaxseed',
  'chia seeds': 'seeds chia seeds dried',
  'baby spinach': 'spinach raw',
  'cheddar cheese': 'cheese cheddar natural',
  'sharp cheddar cheese': 'cheese cheddar natural',
  'bone broth': 'soup stock chicken home-prepared',
  'lean ground beef': 'beef ground 93% lean meat 7% fat raw',
  'ground beef': 'beef ground 85% lean meat 15% fat raw',
  'ground turkey': 'turkey ground 93% lean 7% fat raw',
  'brown rice': 'rice brown long-grain cooked',
  'mixed greens': 'lettuce green leaf raw',
  'black beans': 'beans black mature seeds canned',
  'carrots': 'carrots raw',
  'arugula': 'arugula raw',
  'feta cheese': 'cheese feta',
  'olive oil': 'oil olive salad or cooking',
  'rotisserie chicken': 'chicken roasting meat only cooked roasted',
  'red lentils': 'lentils raw',
  'sourdough bread': 'bread french or vienna includes sourdough',
  'canned tuna': 'fish tuna light canned in water drained solids',
  'lemon juice': 'lemon juice raw',
  'whole grain bread': 'bread whole-wheat commercially prepared',
  'cottage cheese': 'cheese cottage lowfat 2% milkfat',
  'sweet potatoes': 'sweet potato raw unprepared',
  'cumin': 'spices cumin seed',
  'bone-in chicken thighs': 'chicken broilers or fryers thigh meat and skin raw',
  'broccoli': 'broccoli raw',
  'parmesan cheese': 'cheese parmesan grated',
  'salmon fillet': 'fish salmon atlantic farmed raw',
  'pinto beans': 'beans pinto canned drained solids',
  'sirloin steak': 'beef top sirloin steak separable lean and fat raw',
  'green beans': 'beans snap green raw',
  'ny strip steak': 'beef top loin steak separable lean and fat raw',
  'baby potatoes': 'potatoes flesh and skin raw',
  'mixed berries': 'blueberries raw',
  'eggs': 'egg whole raw fresh',
  'garlic': 'garlic raw',
  'honey': 'honey',
  'kimchi': 'cabbage kimchi',
  'salsa': 'sauce salsa ready-to-serve',
  // Seasonings and condiments
  'butter': 'butter salted',
  'salt': 'salt table',
  'cinnamon': 'spices cinnamon ground',
  'black pepper': 'spices pepper black',
  'white pepper': 'spices pepper white',
  'soy sauce': 'soy sauce made from soy and wheat shoyu',
  'sesame oil': 'oil sesame salad or cooking',
  'vanilla extract': 'vanilla extract',
  'chili powder': 'spices chili powder',
  'garlic powder': 'spices garlic powder',
  'smoked paprika': 'spices paprika',
  'dried oregano': 'spices oregano dried',
  'dried dill': 'spices dill weed dried',
  'fresh ginger': 'ginger root raw',
  'fresh rosemary': 'rosemary fresh',
  'turmeric': 'spices turmeric ground'
};

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function searchFood(query) {
  const url = `${BASE}/foods/search?api_key=${API_KEY}&query=${encodeURIComponent(query)}&pageSize=3&dataType=SR%20Legacy`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Search failed for "${query}": ${resp.status}`);
  return resp.json();
}

async function getFood(fdcId) {
  const url = `${BASE}/food/${fdcId}?api_key=${API_KEY}&format=full`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Get food failed for ${fdcId}: ${resp.status}`);
  return resp.json();
}

function extractNutrients(foodNutrients) {
  const result = {};
  for (const field of Object.values(NUTRIENT_MAP)) result[field] = 0;

  for (const fn of foodNutrients) {
    const nutrient = fn.nutrient || fn;
    const id = nutrient.nutrientId || nutrient.id;
    const field = NUTRIENT_MAP[id];
    if (field) {
      result[field] = fn.amount !== undefined ? fn.amount : (fn.value || 0);
    }
  }
  return result;
}

function extractPortions(foodPortions) {
  if (!foodPortions) return [];
  return foodPortions
    .filter(p => p.gramWeight > 0)
    .map(p => {
      const modifier = (p.modifier || (p.measureUnit && p.measureUnit.name) || '').toLowerCase().trim();
      // Clean up modifier to simpler terms
      let desc = modifier;
      if (desc.includes('cup')) desc = 'cup';
      else if (desc.includes('tbsp') || desc.includes('tablespoon')) desc = 'tbsp';
      else if (desc.includes('tsp') || desc.includes('teaspoon')) desc = 'tsp';
      else if (desc.includes('large')) desc = 'large';
      else if (desc.includes('medium')) desc = 'medium';
      else if (desc.includes('small')) desc = 'small';
      else if (desc.includes('slice')) desc = 'slice';
      else if (desc.includes('oz') || desc.includes('ounce')) desc = 'oz';
      else if (desc.includes('clove')) desc = 'clove';

      return {
        description: desc || modifier,
        gramWeight: Math.round(p.gramWeight * 100) / 100,
        amount: p.amount || 1
      };
    });
}

function formatStaticNutrition(results) {
  const lines = ['const STATIC_NUTRITION = {'];
  const keys = Object.keys(results).sort();
  keys.forEach((key, i) => {
    const entry = results[key];
    const comma = i < keys.length - 1 ? ',' : '';
    const nutrients = JSON.stringify(entry.nutrients);
    const portions = JSON.stringify(entry.portions);
    lines.push(`  '${key}': {`);
    lines.push(`    fdcId: ${entry.fdcId},`);
    lines.push(`    description: ${JSON.stringify(entry.description)},`);
    lines.push(`    nutrients: ${nutrients},`);
    lines.push(`    portions: ${portions}`);
    lines.push(`  }${comma}`);
  });
  lines.push('};');
  return lines.join('\n');
}

// Direct FDC IDs for ingredients where search returns wrong results
// Direct FDC IDs for ingredients where search returns wrong results
const DIRECT_FDC_IDS = {
  'apple': 171688,                // Apples, raw, with skin
  'cheddar cheese': 170899,       // Cheese, cheddar, sharp, sliced
  'sharp cheddar cheese': 170899, // Cheese, cheddar, sharp, sliced
  'ground beef': 168608,          // Beef, grass-fed, ground, raw
  'sweet potatoes': 168482,       // Sweet potato, raw, unprepared
  'canned tuna': 171986,          // Fish, tuna, light, canned in water, drained solids
};

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const fs = await import('fs');
  const path = await import('path');

  // Get all unique ingredient names from meals.js
  const mealsPath = path.resolve('./meals.js');
  const mealsContent = fs.readFileSync(mealsPath, 'utf8');

  // Extract ingredient names from ingredients arrays only
  const ingredientNames = new Set();
  const ingredientBlockRegex = /ingredients:\s*\[([\s\S]*?)\]/g;
  let blockMatch;
  while ((blockMatch = ingredientBlockRegex.exec(mealsContent)) !== null) {
    const block = blockMatch[1];
    const blockNameRegex = /name:\s*"([^"]+)"/g;
    let nameMatch;
    while ((nameMatch = blockNameRegex.exec(block)) !== null) {
      ingredientNames.add(nameMatch[1]);
    }
  }

  const sortedNames = [...ingredientNames].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  console.error(`Found ${sortedNames.length} unique ingredients to look up\n`);

  const results = {};
  let count = 0;
  let added = 0, failed = 0;

  for (const name of sortedNames) {
    count++;
    const key = name.toLowerCase();
    const searchQuery = SEARCH_OVERRIDES[key] || name;

    console.error(`[${count}/${sortedNames.length}] Looking up: "${name}"`);

    try {
      let fdcId, fullFood;

      if (DIRECT_FDC_IDS[key]) {
        fdcId = DIRECT_FDC_IDS[key];
        console.error(`  (using direct FDC ID: ${fdcId})`);
        fullFood = await getFood(fdcId);
        console.error(`  → ${fullFood.description} (fdcId: ${fdcId})`);
      } else {
        const searchResult = await searchFood(searchQuery);
        if (!searchResult.foods || searchResult.foods.length === 0) {
          console.error(`  ⚠ No results found, skipping`);
          failed++;
          continue;
        }
        fdcId = searchResult.foods[0].fdcId;
        console.error(`  → ${searchResult.foods[0].description} (fdcId: ${fdcId})`);
        fullFood = await getFood(fdcId);
      }

      const nutrients = extractNutrients(fullFood.foodNutrients);
      const portions = extractPortions(fullFood.foodPortions);

      // Deduplicate portions by description
      const seenDescs = new Set();
      const uniquePortions = [];
      for (const p of portions) {
        if (!seenDescs.has(p.description)) {
          seenDescs.add(p.description);
          uniquePortions.push(p);
        }
      }

      results[key] = {
        fdcId,
        description: fullFood.description,
        nutrients,
        portions: uniquePortions.slice(0, 4)
      };
      added++;

      // Rate limiting: ~2 requests per ingredient (search + detail), stay well under 3600/hr
      await sleep(200);
    } catch (err) {
      console.error(`  ✗ Error: ${err.message}`);
      failed++;
    }
  }

  console.error(`\nDone! ${added} fetched, ${failed} failed out of ${sortedNames.length} ingredients.`);

  const formattedBlock = formatStaticNutrition(results);

  if (dryRun) {
    console.log(formattedBlock);
    return;
  }

  // Write directly into nutrition.js
  const nutritionPath = path.resolve('./nutrition.js');
  let nutritionContent = fs.readFileSync(nutritionPath, 'utf8');

  const blockRegex = /const STATIC_NUTRITION = \{[\s\S]*?\n\};/;
  if (!blockRegex.test(nutritionContent)) {
    console.error('ERROR: Could not find STATIC_NUTRITION block in nutrition.js');
    process.exit(1);
  }

  nutritionContent = nutritionContent.replace(blockRegex, formattedBlock);
  fs.writeFileSync(nutritionPath, nutritionContent, 'utf8');
  console.error(`Wrote updated STATIC_NUTRITION (${Object.keys(results).length} entries) to ${nutritionPath}`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });

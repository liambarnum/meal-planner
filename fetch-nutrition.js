#!/usr/bin/env node
/**
 * Fetches accurate USDA nutrition data for all meal ingredients.
 * Run: node fetch-nutrition.js
 * Outputs updated STATIC_NUTRITION entries to stdout.
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
  'plain greek yogurt': 'yogurt greek plain whole milk',
  'rolled oats': 'oats regular quick not fortified dry',
  'low-fat milk': 'milk lowfat fluid 1% milkfat',
  'ground flaxseed': 'seeds flaxseed',
  'chia seeds': 'seeds chia seeds dried',
  'baby spinach': 'spinach raw',
  'cheddar cheese': 'cheese cheddar',
  'bone broth': 'soup stock chicken',
  'lean ground beef': 'beef ground 93% lean raw',
  'ground turkey': 'turkey ground 93% lean raw',
  'brown rice': 'rice brown medium-grain cooked',
  'ground beef': 'beef ground 85% lean raw',
  'mixed greens': 'lettuce green leaf raw',
  'black beans': 'beans black canned drained',
  'carrots': 'carrots raw',
  'arugula': 'arugula raw',
  'feta cheese': 'cheese feta',
  'olive oil': 'oil olive',
  'rotisserie chicken': 'chicken roasted meat only',
  'red lentils': 'lentils raw',
  'sourdough bread': 'bread sourdough',
  'canned tuna': 'fish tuna light canned water drained',
  'lemon juice': 'lemon juice raw',
  'whole grain bread': 'bread whole-wheat',
  'cottage cheese': 'cheese cottage lowfat 2%',
  'sharp cheddar cheese': 'cheese cheddar',
  'sweet potatoes': 'sweet potato raw',
  'cumin': 'spices cumin seed ground',
  'bone-in chicken thighs': 'chicken thigh meat skin raw',
  'broccoli': 'broccoli raw',
  'parmesan cheese': 'cheese parmesan grated',
  'salmon fillet': 'fish salmon atlantic raw',
  'pinto beans': 'beans pinto canned drained',
  'sirloin steak': 'beef top sirloin steak raw',
  'green beans': 'beans snap green raw',
  'ny strip steak': 'beef short loin top loin raw',
  'baby potatoes': 'potatoes flesh skin raw',
  'mixed berries': 'berries mixed frozen',
  'kimchi': 'kimchi',
  'salsa': 'salsa ready to serve'
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

async function main() {
  // Get all unique ingredient names from meals.js
  const fs = await import('fs');
  const mealsContent = fs.readFileSync('./meals.js', 'utf8');

  // Extract ingredient names
  const nameRegex = /name:\s*"([^"]+)"/g;
  const ingredientNames = new Set();
  // Only get names inside ingredients arrays
  const ingredientBlockRegex = /ingredients:\s*\[([\s\S]*?)\]/g;
  let blockMatch;
  while ((blockMatch = ingredientBlockRegex.exec(mealsContent)) !== null) {
    let nameMatch;
    const block = blockMatch[1];
    const blockNameRegex = /name:\s*"([^"]+)"/g;
    while ((nameMatch = blockNameRegex.exec(block)) !== null) {
      ingredientNames.add(nameMatch[1]);
    }
  }

  const sortedNames = [...ingredientNames].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  console.error(`Found ${sortedNames.length} unique ingredients to look up\n`);

  const results = {};
  let count = 0;

  for (const name of sortedNames) {
    count++;
    const key = name.toLowerCase();
    const searchQuery = SEARCH_OVERRIDES[key] || name;

    console.error(`[${count}/${sortedNames.length}] Looking up: "${name}" (query: "${searchQuery}")`);

    try {
      const searchResult = await searchFood(searchQuery);
      if (!searchResult.foods || searchResult.foods.length === 0) {
        console.error(`  ⚠ No results found, skipping`);
        continue;
      }

      const topResult = searchResult.foods[0];
      console.error(`  → ${topResult.description} (fdcId: ${topResult.fdcId})`);

      // Get full details with portions
      const fullFood = await getFood(topResult.fdcId);

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
        description: topResult.description,
        nutrients,
        portions: uniquePortions.slice(0, 4) // Keep top 4 most useful
      };

      // Rate limiting: ~2 requests per ingredient (search + detail), stay well under 3600/hr
      await sleep(200);
    } catch (err) {
      console.error(`  ✗ Error: ${err.message}`);
    }
  }

  // Output as JS
  console.log('const STATIC_NUTRITION = ' + JSON.stringify(results, null, 2) + ';');
  console.error(`\nDone! ${Object.keys(results).length}/${sortedNames.length} ingredients fetched successfully.`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });

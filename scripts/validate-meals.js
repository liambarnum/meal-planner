#!/usr/bin/env node
/**
 * Validates meals for realistic portions, correct units, and schema correctness.
 *
 * Usage:
 *   node scripts/validate-meals.js                      # validates ../meals.js
 *   node scripts/validate-meals.js path/to/file.js      # validates a meals.js file
 *   node scripts/validate-meals.js path/to/file.json    # validates a generated-meals.json array
 *
 * Exit code: 0 if no ERRORs (WARNs allowed), 1 if any ERROR.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const VALID_CATEGORIES = new Set(['Breakfast', 'Lunch', 'Snack', 'Dinner', 'Dessert']);
const VALID_SECTIONS = new Set([
  'Produce', 'Dairy', 'Meat and Seafood', 'Pantry and Grains',
  'Canned and Jarred', 'Refrigerated', 'Frozen', 'Seasonings'
]);

const VOLUME_UNITS = new Set([
  'cup', 'cups', 'tbsp', 'tablespoon', 'tablespoons',
  'tsp', 'teaspoon', 'teaspoons', 'ml', 'l', 'liter', 'liters', 'fl'
]);
const WEIGHT_UNITS = new Set([
  'oz', 'ounce', 'ounces', 'lb', 'lbs', 'pound', 'pounds',
  'g', 'gram', 'grams', 'kg'
]);
const COUNT_UNITS = new Set([
  'large', 'medium', 'small', 'whole', 'clove', 'cloves',
  'slice', 'slices', 'can', 'cans', 'breast', 'breasts',
  'fillet', 'fillets', 'thigh', 'thighs', 'head', 'heads',
  'piece', 'pieces', 'strip', 'strips', 'link', 'links', 'stalk', 'stalks'
]);

const PROTEIN_WORDS = new Set([
  'chicken', 'beef', 'pork', 'turkey', 'lamb', 'veal',
  'fish', 'salmon', 'tuna', 'cod', 'tilapia', 'halibut', 'trout', 'mackerel', 'sardines',
  'shrimp', 'prawns', 'scallops', 'crab', 'lobster',
  'tofu', 'tempeh', 'seitan',
  'bacon', 'sausage', 'ham', 'prosciutto',
  'steak', 'sirloin', 'ribeye', 'strip', 'brisket', 'chuck'
]);

// Per-category macro plausibility (WARN only — these are soft ranges)
const MACRO_RANGES = {
  Breakfast: { protein: [8, 45], carbs: [15, 120], fats: [4, 32], fiber: [0, 25] },
  Lunch:     { protein: [18, 60], carbs: [15, 105], fats: [6, 40], fiber: [0, 25] },
  Dinner:    { protein: [18, 60], carbs: [15, 105], fats: [6, 42], fiber: [0, 25] },
  Snack:     { protein: [2, 32], carbs: [3, 55], fats: [1, 22], fiber: [0, 20] },
  Dessert:   { protein: [0, 28], carbs: [8, 65], fats: [0, 22], fiber: [0, 15] }
};

// ─── LOADING ───

function loadMeals(filePath) {
  const absPath = path.resolve(filePath);
  if (!fs.existsSync(absPath)) {
    throw new Error(`File not found: ${absPath}`);
  }
  const content = fs.readFileSync(absPath, 'utf8');

  if (absPath.endsWith('.json')) {
    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed)) throw new Error('JSON file must contain an array of meals');
    return parsed;
  }

  // meals.js — execute in a sandbox and extract the MEALS const
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(content + '\nthis.__MEALS = MEALS;', ctx);
  if (!Array.isArray(ctx.__MEALS)) {
    throw new Error('Expected a top-level `const MEALS = [...]` in the file');
  }
  return ctx.__MEALS;
}

// ─── PARSING HELPERS ───

function parseAmount(amountStr) {
  if (typeof amountStr !== 'string') return { value: null, unit: null };
  const match = amountStr.trim().match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z]+)?/);
  if (!match) return { value: null, unit: null };
  return {
    value: parseFloat(match[1]),
    unit: (match[2] || '').toLowerCase()
  };
}

function unitClass(unit) {
  if (!unit) return 'unknown';
  if (VOLUME_UNITS.has(unit)) return 'volume';
  if (WEIGHT_UNITS.has(unit)) return 'weight';
  if (COUNT_UNITS.has(unit)) return 'count';
  return 'unknown';
}

function amountMentionsWeight(amountStr) {
  const lower = amountStr.toLowerCase();
  for (const u of WEIGHT_UNITS) {
    // word boundary match so "gram" doesn't match "graham"
    if (new RegExp(`\\b${u}\\b`).test(lower)) return true;
  }
  return false;
}

function isProtein(name) {
  const lower = name.toLowerCase();
  if (/\bbroth\b|\bstock\b|\bconsomme\b/.test(lower)) return false;
  const words = lower.split(/[\s,()\-/]+/).filter(Boolean);
  return words.some(w => PROTEIN_WORDS.has(w));
}

function isBrothOrStock(name) {
  return /\bbroth\b|\bstock\b|\bconsomme\b/i.test(name);
}

function isOil(name) {
  return /\boil\b/i.test(name) && !/essential/i.test(name);
}

function isOats(name) {
  return /\boats?\b|\boatmeal\b/i.test(name);
}

function isLiquid(ing) {
  const n = ing.name.toLowerCase();
  if (/milk|broth|stock|water|juice|cream|yogurt|kefir/.test(n)) return true;
  return false;
}

function isRawGrain(name) {
  return /\brice\b|\bquinoa\b|\bbarley\b|\bfarro\b|\bbulgur\b|\bcouscous\b/i.test(name);
}

// ─── RULES ───

function checkSchema(meal, issues) {
  const required = ['id', 'name', 'category', 'description', 'macros', 'ingredients'];
  for (const field of required) {
    if (meal[field] === undefined || meal[field] === null || meal[field] === '') {
      issues.push({ level: 'ERROR', msg: `missing required field: ${field}` });
    }
  }
  if (meal.id && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(meal.id)) {
    issues.push({ level: 'ERROR', msg: `id must be kebab-case: "${meal.id}"` });
  }
  if (meal.category && !VALID_CATEGORIES.has(meal.category)) {
    issues.push({ level: 'ERROR', msg: `invalid category: "${meal.category}"` });
  }
  if (meal.macros) {
    for (const key of ['fats', 'carbs', 'fiber', 'protein']) {
      if (typeof meal.macros[key] !== 'number') {
        issues.push({ level: 'ERROR', msg: `macros.${key} must be a number` });
      }
    }
  }
  if (!Array.isArray(meal.ingredients) || meal.ingredients.length === 0) {
    issues.push({ level: 'ERROR', msg: 'ingredients must be a non-empty array' });
  }
}

function checkIngredients(meal, issues) {
  if (!Array.isArray(meal.ingredients)) return;
  let hasLiquid = false;
  let hasOats = false;
  for (const ing of meal.ingredients) {
    if (!ing.name || !ing.amount || !ing.section) {
      issues.push({ level: 'ERROR', msg: `ingredient missing name/amount/section: ${JSON.stringify(ing)}` });
      continue;
    }
    if (!VALID_SECTIONS.has(ing.section)) {
      issues.push({ level: 'ERROR', msg: `invalid section "${ing.section}" on ${ing.name}` });
    }

    const parsed = parseAmount(ing.amount);
    const cls = unitClass(parsed.unit);

    // Protein must be weight or count, never volume
    if (isProtein(ing.name) && cls === 'volume' && !amountMentionsWeight(ing.amount)) {
      issues.push({
        level: 'ERROR',
        msg: `${ing.name}: proteins must be weight (oz, lb, g) or count — "${ing.amount}" uses a volume unit`
      });
    }

    // Broth / stock sanity
    if (isBrothOrStock(ing.name) && (parsed.unit === 'cup' || parsed.unit === 'cups')) {
      if (parsed.value > 3) {
        issues.push({
          level: 'ERROR',
          msg: `${ing.name}: ${parsed.value} cups is excessive for a single serving (max 3)`
        });
      } else if (parsed.value > 2) {
        issues.push({
          level: 'WARN',
          msg: `${ing.name}: ${parsed.value} cups is high for a single serving (ideal ≤ 2)`
        });
      }
    }

    // Cooking oil sanity
    if (isOil(ing.name) && (parsed.unit === 'tbsp' || parsed.unit === 'tablespoon' || parsed.unit === 'tablespoons')) {
      if (parsed.value > 4) {
        issues.push({
          level: 'ERROR',
          msg: `${ing.name}: ${parsed.value} tbsp is excessive for one serving (max 4)`
        });
      } else if (parsed.value > 3) {
        issues.push({
          level: 'WARN',
          msg: `${ing.name}: ${parsed.value} tbsp is a lot for one serving (ideal ≤ 2)`
        });
      }
    }

    // Dry grain sanity — raw/uncooked grains
    if (isRawGrain(ing.name) && /dry|raw|uncooked/i.test(ing.amount)) {
      if ((parsed.unit === 'cup' || parsed.unit === 'cups') && parsed.value > 0.75) {
        issues.push({
          level: 'WARN',
          msg: `${ing.name}: ${parsed.value} cups dry is a large single serving (ideal ≤ 0.5)`
        });
      }
    }

    if (isOats(ing.name)) hasOats = true;
    if (isLiquid(ing)) hasLiquid = true;
  }

  // Oats without liquid — missing ratio context
  if (hasOats && !hasLiquid) {
    issues.push({
      level: 'WARN',
      msg: 'meal contains oats but no liquid (milk/water) — ratio context is missing'
    });
  }
}

function checkMacros(meal, issues) {
  if (!meal.macros || !meal.category) return;
  const ranges = MACRO_RANGES[meal.category];
  if (!ranges) return;
  for (const key of ['protein', 'carbs', 'fats', 'fiber']) {
    const val = meal.macros[key];
    if (typeof val !== 'number') continue;
    const [lo, hi] = ranges[key];
    if (val < lo || val > hi) {
      issues.push({
        level: 'WARN',
        msg: `macros.${key} = ${val}g is outside typical range for ${meal.category} (${lo}–${hi}g)`
      });
    }
  }
}

function checkUniqueIds(meals) {
  const seen = new Map();
  const duplicates = [];
  for (const meal of meals) {
    if (!meal.id) continue;
    if (seen.has(meal.id)) {
      duplicates.push(meal.id);
    }
    seen.set(meal.id, true);
  }
  return duplicates;
}

// ─── MAIN ───

function validate(meals) {
  const report = [];
  let errorCount = 0;
  let warnCount = 0;

  for (const meal of meals) {
    const issues = [];
    checkSchema(meal, issues);
    checkIngredients(meal, issues);
    checkMacros(meal, issues);

    if (issues.length > 0) {
      report.push({ meal, issues });
      errorCount += issues.filter(i => i.level === 'ERROR').length;
      warnCount += issues.filter(i => i.level === 'WARN').length;
    }
  }

  const dupIds = checkUniqueIds(meals);
  for (const id of dupIds) {
    report.push({ meal: { id, name: '(duplicate)' }, issues: [{ level: 'ERROR', msg: `duplicate meal id: ${id}` }] });
    errorCount++;
  }

  return { report, errorCount, warnCount, total: meals.length };
}

function printReport({ report, errorCount, warnCount, total }) {
  if (report.length === 0) {
    console.log(`✓ ${total} meals — all checks passed`);
    return;
  }

  for (const { meal, issues } of report) {
    const label = meal.id ? `[${meal.id}] ${meal.name || ''}` : meal.name || '(unknown)';
    console.log(`\n${label}`);
    for (const issue of issues) {
      const tag = issue.level === 'ERROR' ? 'ERROR' : 'WARN ';
      console.log(`  ${tag}  ${issue.msg}`);
    }
  }

  console.log(`\n${total} meals checked — ${errorCount} error${errorCount !== 1 ? 's' : ''}, ${warnCount} warning${warnCount !== 1 ? 's' : ''}`);
}

function main() {
  const target = process.argv[2] || path.join(__dirname, '..', 'meals.js');
  let meals;
  try {
    meals = loadMeals(target);
  } catch (err) {
    console.error(`Failed to load ${target}: ${err.message}`);
    process.exit(2);
  }

  const result = validate(meals);
  printReport(result);
  process.exit(result.errorCount > 0 ? 1 : 0);
}

main();

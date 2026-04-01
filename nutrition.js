/* ─── NUTRITION MODULE ─── */
/* USDA FoodData Central integration, nutrition label rendering, warning system */

// USDA FoodData Central API key — free public API, no auth required beyond this key.
// DEMO_KEY allows ~30 req/hr. Users can get their own free key at https://fdc.nal.usda.gov/api-key-signup
// for 1000 req/hr, and set it in the chat panel.
const USDA_API_KEY_DEFAULT = 'DEMO_KEY';

function getUsdaApiKey() {
  return (typeof state !== 'undefined' && state.usdaApiKey) || USDA_API_KEY_DEFAULT;
}

const NUTRITION_FIELDS = [
  'calories', 'totalFat', 'saturatedFat', 'transFat', 'cholesterol',
  'sodium', 'totalCarbs', 'dietaryFiber', 'totalSugars', 'addedSugars',
  'protein', 'vitaminD', 'calcium', 'iron', 'potassium'
];

// USDA nutrient number -> our field name mapping
const USDA_NUTRIENT_MAP = {
  1008: 'calories',    // Energy (kcal)
  208:  'calories',    // Energy (kcal) alternate
  1003: 'protein',
  203:  'protein',
  1004: 'totalFat',
  204:  'totalFat',
  1258: 'saturatedFat',
  606:  'saturatedFat',
  1257: 'transFat',
  605:  'transFat',
  1253: 'cholesterol',
  601:  'cholesterol',
  1093: 'sodium',
  307:  'sodium',
  1005: 'totalCarbs',
  205:  'totalCarbs',
  1079: 'dietaryFiber',
  291:  'dietaryFiber',
  2000: 'totalSugars',
  269:  'totalSugars',
  1235: 'addedSugars',
  539:  'addedSugars',
  1110: 'vitaminD',
  324:  'vitaminD',     // Vitamin D (IU) — convert to mcg: /40
  328:  'vitaminD',     // Vitamin D (mcg)
  1087: 'calcium',
  301:  'calcium',
  1089: 'iron',
  303:  'iron',
  1092: 'potassium',
  306:  'potassium'
};

// Nutrient numbers that report Vitamin D in IU (needs /40 conversion to mcg)
const VITAMIN_D_IU_NUMBERS = [324, 1110];

// FDA Daily Reference Values (for %DV on the label)
const DAILY_VALUES = {
  totalFat: 78,        // g
  saturatedFat: 20,    // g
  cholesterol: 300,    // mg
  sodium: 2300,        // mg
  totalCarbs: 275,     // g
  dietaryFiber: 28,    // g
  totalSugars: null,   // no DV for total sugars
  addedSugars: 50,     // g
  protein: 50,         // g
  vitaminD: 20,        // mcg
  calcium: 1300,       // mg
  iron: 18,            // mg
  potassium: 4700      // mg
};

// Common unit-to-gram conversions for portion parsing fallback
const UNIT_GRAMS = {
  'cup': 240, 'cups': 240,
  'tbsp': 15, 'tablespoon': 15, 'tablespoons': 15,
  'tsp': 5, 'teaspoon': 5, 'teaspoons': 5,
  'oz': 28.35, 'ounce': 28.35, 'ounces': 28.35,
  'lb': 453.6, 'lbs': 453.6, 'pound': 453.6, 'pounds': 453.6,
  'g': 1, 'gram': 1, 'grams': 1,
  'kg': 1000, 'kilogram': 1000,
  'ml': 1, 'milliliter': 1, 'milliliters': 1,
  'l': 1000, 'liter': 1000, 'liters': 1000,
  'slice': 30, 'slices': 30,
  'piece': 30, 'pieces': 30,
  'clove': 3, 'cloves': 3,
  'spear': 16, 'spears': 16,
  'stalk': 60, 'stalks': 60,
  'large': 130, 'medium': 110, 'small': 80
};

// ─── STATIC NUTRITION DATA (per 100g, USDA SR Legacy reference values) ───
// Hard-coded for all known meal ingredients so nutrition labels work offline
// without hitting the USDA API. Values: nutrients per 100g, portions in grams.

const STATIC_NUTRITION = {
  'plain greek yogurt': {
    description: 'Yogurt, Greek, plain, whole milk',
    nutrients: { calories: 97, totalFat: 5, saturatedFat: 3.3, transFat: 0, cholesterol: 13, sodium: 47, totalCarbs: 3.6, dietaryFiber: 0, totalSugars: 3.2, addedSugars: 0, protein: 9, vitaminD: 0, calcium: 110, iron: 0.1, potassium: 141 },
    portions: [{ description: 'cup', gramWeight: 245, amount: 1 }, { description: 'tbsp', gramWeight: 15, amount: 1 }]
  },
  'banana': {
    description: 'Bananas, raw',
    nutrients: { calories: 89, totalFat: 0.3, saturatedFat: 0.1, transFat: 0, cholesterol: 0, sodium: 1, totalCarbs: 22.8, dietaryFiber: 2.6, totalSugars: 12.2, addedSugars: 0, protein: 1.1, vitaminD: 0, calcium: 5, iron: 0.3, potassium: 358 },
    portions: [{ description: 'medium', gramWeight: 118, amount: 1 }, { description: 'large', gramWeight: 136, amount: 1 }]
  },
  'honey': {
    description: 'Honey',
    nutrients: { calories: 304, totalFat: 0, saturatedFat: 0, transFat: 0, cholesterol: 0, sodium: 4, totalCarbs: 82.4, dietaryFiber: 0.2, totalSugars: 82.1, addedSugars: 82.1, protein: 0.3, vitaminD: 0, calcium: 6, iron: 0.4, potassium: 52 },
    portions: [{ description: 'tbsp', gramWeight: 21, amount: 1 }]
  },
  'rolled oats': {
    description: 'Oats, regular and quick, not fortified, dry',
    nutrients: { calories: 379, totalFat: 6.5, saturatedFat: 1.1, transFat: 0, cholesterol: 0, sodium: 6, totalCarbs: 67.7, dietaryFiber: 10.1, totalSugars: 1, addedSugars: 0, protein: 13.2, vitaminD: 0, calcium: 52, iron: 4.3, potassium: 362 },
    portions: [{ description: 'cup', gramWeight: 80, amount: 1 }]
  },
  'low-fat milk': {
    description: 'Milk, lowfat, fluid, 1% milkfat',
    nutrients: { calories: 42, totalFat: 1, saturatedFat: 0.6, transFat: 0, cholesterol: 5, sodium: 44, totalCarbs: 5, dietaryFiber: 0, totalSugars: 5, addedSugars: 0, protein: 3.4, vitaminD: 1.3, calcium: 125, iron: 0, potassium: 150 },
    portions: [{ description: 'cup', gramWeight: 244, amount: 1 }]
  },
  'blueberries': {
    description: 'Blueberries, raw',
    nutrients: { calories: 57, totalFat: 0.3, saturatedFat: 0, transFat: 0, cholesterol: 0, sodium: 1, totalCarbs: 14.5, dietaryFiber: 2.4, totalSugars: 10, addedSugars: 0, protein: 0.7, vitaminD: 0, calcium: 6, iron: 0.3, potassium: 77 },
    portions: [{ description: 'cup', gramWeight: 148, amount: 1 }]
  },
  'apple': {
    description: 'Apples, raw, with skin',
    nutrients: { calories: 52, totalFat: 0.2, saturatedFat: 0, transFat: 0, cholesterol: 0, sodium: 1, totalCarbs: 13.8, dietaryFiber: 2.4, totalSugars: 10.4, addedSugars: 0, protein: 0.3, vitaminD: 0, calcium: 6, iron: 0.1, potassium: 107 },
    portions: [{ description: 'medium', gramWeight: 182, amount: 1 }]
  },
  'ground flaxseed': {
    description: 'Seeds, flaxseed, ground',
    nutrients: { calories: 534, totalFat: 42.2, saturatedFat: 3.7, transFat: 0, cholesterol: 0, sodium: 30, totalCarbs: 28.9, dietaryFiber: 27.3, totalSugars: 1.6, addedSugars: 0, protein: 18.3, vitaminD: 0, calcium: 255, iron: 5.7, potassium: 813 },
    portions: [{ description: 'tbsp', gramWeight: 7, amount: 1 }]
  },
  'chia seeds': {
    description: 'Seeds, chia seeds, dried',
    nutrients: { calories: 486, totalFat: 30.7, saturatedFat: 3.3, transFat: 0, cholesterol: 0, sodium: 16, totalCarbs: 42.1, dietaryFiber: 34.4, totalSugars: 0, addedSugars: 0, protein: 16.5, vitaminD: 0, calcium: 631, iron: 7.7, potassium: 407 },
    portions: [{ description: 'tbsp', gramWeight: 12, amount: 1 }]
  },
  'strawberries': {
    description: 'Strawberries, raw',
    nutrients: { calories: 32, totalFat: 0.3, saturatedFat: 0, transFat: 0, cholesterol: 0, sodium: 1, totalCarbs: 7.7, dietaryFiber: 2, totalSugars: 4.9, addedSugars: 0, protein: 0.7, vitaminD: 0, calcium: 16, iron: 0.4, potassium: 153 },
    portions: [{ description: 'cup', gramWeight: 152, amount: 1 }]
  },
  'raspberries': {
    description: 'Raspberries, raw',
    nutrients: { calories: 52, totalFat: 0.7, saturatedFat: 0, transFat: 0, cholesterol: 0, sodium: 1, totalCarbs: 11.9, dietaryFiber: 6.5, totalSugars: 4.4, addedSugars: 0, protein: 1.2, vitaminD: 0, calcium: 25, iron: 0.7, potassium: 151 },
    portions: [{ description: 'cup', gramWeight: 123, amount: 1 }]
  },
  'mixed berries': {
    description: 'Berries, mixed, raw (average)',
    nutrients: { calories: 45, totalFat: 0.4, saturatedFat: 0, transFat: 0, cholesterol: 0, sodium: 1, totalCarbs: 11, dietaryFiber: 3.6, totalSugars: 6.4, addedSugars: 0, protein: 0.9, vitaminD: 0, calcium: 16, iron: 0.5, potassium: 127 },
    portions: [{ description: 'cup', gramWeight: 140, amount: 1 }]
  },
  'eggs': {
    description: 'Egg, whole, raw',
    nutrients: { calories: 143, totalFat: 9.5, saturatedFat: 3.1, transFat: 0, cholesterol: 372, sodium: 142, totalCarbs: 0.7, dietaryFiber: 0, totalSugars: 0.4, addedSugars: 0, protein: 12.6, vitaminD: 2, calcium: 56, iron: 1.8, potassium: 138 },
    portions: [{ description: 'large', gramWeight: 50, amount: 1 }]
  },
  'baby spinach': {
    description: 'Spinach, baby, raw',
    nutrients: { calories: 23, totalFat: 0.4, saturatedFat: 0.1, transFat: 0, cholesterol: 0, sodium: 79, totalCarbs: 3.6, dietaryFiber: 2.2, totalSugars: 0.4, addedSugars: 0, protein: 2.9, vitaminD: 0, calcium: 99, iron: 2.7, potassium: 558 },
    portions: [{ description: 'cup', gramWeight: 30, amount: 1 }]
  },
  'cheddar cheese': {
    description: 'Cheese, cheddar',
    nutrients: { calories: 403, totalFat: 33.1, saturatedFat: 21.1, transFat: 0, cholesterol: 105, sodium: 621, totalCarbs: 1.3, dietaryFiber: 0, totalSugars: 0.5, addedSugars: 0, protein: 24.9, vitaminD: 0.3, calcium: 721, iron: 0.7, potassium: 98 },
    portions: [{ description: 'oz', gramWeight: 28.35, amount: 1 }]
  },
  'bone broth': {
    description: 'Broth, chicken bone',
    nutrients: { calories: 7, totalFat: 0.2, saturatedFat: 0, transFat: 0, cholesterol: 0, sodium: 200, totalCarbs: 0.4, dietaryFiber: 0, totalSugars: 0, addedSugars: 0, protein: 0.8, vitaminD: 0, calcium: 4, iron: 0.1, potassium: 60 },
    portions: [{ description: 'cup', gramWeight: 240, amount: 1 }]
  },
  'lean ground beef': {
    description: 'Beef, ground, 93% lean meat / 7% fat, raw',
    nutrients: { calories: 152, totalFat: 7.2, saturatedFat: 2.9, transFat: 0.4, cholesterol: 65, sodium: 66, totalCarbs: 0, dietaryFiber: 0, totalSugars: 0, addedSugars: 0, protein: 20.7, vitaminD: 0, calcium: 8, iron: 2.3, potassium: 305 },
    portions: [{ description: 'oz', gramWeight: 28.35, amount: 1 }]
  },
  'ground turkey': {
    description: 'Turkey, ground, 93% lean, raw',
    nutrients: { calories: 150, totalFat: 8, saturatedFat: 2.3, transFat: 0.1, cholesterol: 75, sodium: 72, totalCarbs: 0, dietaryFiber: 0, totalSugars: 0, addedSugars: 0, protein: 19.3, vitaminD: 0.3, calcium: 19, iron: 1.1, potassium: 249 },
    portions: [{ description: 'oz', gramWeight: 28.35, amount: 1 }]
  },
  'brown rice': {
    description: 'Rice, brown, medium-grain, cooked',
    nutrients: { calories: 123, totalFat: 1, saturatedFat: 0.2, transFat: 0, cholesterol: 0, sodium: 1, totalCarbs: 25.6, dietaryFiber: 1.6, totalSugars: 0.4, addedSugars: 0, protein: 2.7, vitaminD: 0, calcium: 3, iron: 0.5, potassium: 86 },
    portions: [{ description: 'cup', gramWeight: 195, amount: 1 }, { description: 'cups cooked', gramWeight: 195, amount: 1 }]
  },
  'kimchi': {
    description: 'Kimchi, fermented vegetables',
    nutrients: { calories: 15, totalFat: 0.5, saturatedFat: 0.1, transFat: 0, cholesterol: 0, sodium: 498, totalCarbs: 2.4, dietaryFiber: 1.6, totalSugars: 1.1, addedSugars: 0, protein: 1.1, vitaminD: 0, calcium: 33, iron: 2.5, potassium: 151 },
    portions: [{ description: 'cup', gramWeight: 150, amount: 1 }]
  },
  'garlic': {
    description: 'Garlic, raw',
    nutrients: { calories: 149, totalFat: 0.5, saturatedFat: 0.1, transFat: 0, cholesterol: 0, sodium: 17, totalCarbs: 33.1, dietaryFiber: 2.1, totalSugars: 1, addedSugars: 0, protein: 6.4, vitaminD: 0, calcium: 181, iron: 1.7, potassium: 401 },
    portions: [{ description: 'clove', gramWeight: 3, amount: 1 }, { description: 'cloves', gramWeight: 3, amount: 1 }]
  },
  'ground beef': {
    description: 'Beef, ground, 85% lean meat / 15% fat, raw',
    nutrients: { calories: 215, totalFat: 15, saturatedFat: 5.8, transFat: 0.8, cholesterol: 73, sodium: 72, totalCarbs: 0, dietaryFiber: 0, totalSugars: 0, addedSugars: 0, protein: 18.6, vitaminD: 0, calcium: 12, iron: 2.1, potassium: 270 },
    portions: [{ description: 'oz', gramWeight: 28.35, amount: 1 }]
  },
  'mixed greens': {
    description: 'Salad greens, mixed',
    nutrients: { calories: 20, totalFat: 0.3, saturatedFat: 0, transFat: 0, cholesterol: 0, sodium: 30, totalCarbs: 3.1, dietaryFiber: 1.8, totalSugars: 0.5, addedSugars: 0, protein: 2, vitaminD: 0, calcium: 60, iron: 1.5, potassium: 290 },
    portions: [{ description: 'cup', gramWeight: 30, amount: 1 }]
  },
  'black beans': {
    description: 'Beans, black, canned, drained',
    nutrients: { calories: 132, totalFat: 0.5, saturatedFat: 0.1, transFat: 0, cholesterol: 0, sodium: 237, totalCarbs: 23.7, dietaryFiber: 8.7, totalSugars: 0.3, addedSugars: 0, protein: 8.9, vitaminD: 0, calcium: 27, iron: 2.1, potassium: 355 },
    portions: [{ description: 'cup', gramWeight: 172, amount: 1 }]
  },
  'salsa': {
    description: 'Salsa, ready to serve',
    nutrients: { calories: 36, totalFat: 0.2, saturatedFat: 0, transFat: 0, cholesterol: 0, sodium: 430, totalCarbs: 7.7, dietaryFiber: 1.5, totalSugars: 4.1, addedSugars: 0, protein: 1.5, vitaminD: 0, calcium: 16, iron: 0.5, potassium: 230 },
    portions: [{ description: 'cup', gramWeight: 260, amount: 1 }]
  },
  'carrots': {
    description: 'Carrots, raw',
    nutrients: { calories: 41, totalFat: 0.2, saturatedFat: 0, transFat: 0, cholesterol: 0, sodium: 69, totalCarbs: 9.6, dietaryFiber: 2.8, totalSugars: 4.7, addedSugars: 0, protein: 0.9, vitaminD: 0, calcium: 33, iron: 0.3, potassium: 320 },
    portions: [{ description: 'large', gramWeight: 72, amount: 1 }, { description: 'medium', gramWeight: 61, amount: 1 }]
  },
  'arugula': {
    description: 'Arugula, raw',
    nutrients: { calories: 25, totalFat: 0.7, saturatedFat: 0.1, transFat: 0, cholesterol: 0, sodium: 27, totalCarbs: 3.7, dietaryFiber: 1.6, totalSugars: 2, addedSugars: 0, protein: 2.6, vitaminD: 0, calcium: 160, iron: 1.5, potassium: 369 },
    portions: [{ description: 'cup', gramWeight: 20, amount: 1 }]
  },
  'feta cheese': {
    description: 'Cheese, feta',
    nutrients: { calories: 264, totalFat: 21.3, saturatedFat: 14.9, transFat: 0, cholesterol: 89, sodium: 917, totalCarbs: 4.1, dietaryFiber: 0, totalSugars: 4.1, addedSugars: 0, protein: 14.2, vitaminD: 0.4, calcium: 493, iron: 0.6, potassium: 62 },
    portions: [{ description: 'oz', gramWeight: 28.35, amount: 1 }]
  },
  'olive oil': {
    description: 'Oil, olive, salad or cooking',
    nutrients: { calories: 884, totalFat: 100, saturatedFat: 13.8, transFat: 0, cholesterol: 0, sodium: 2, totalCarbs: 0, dietaryFiber: 0, totalSugars: 0, addedSugars: 0, protein: 0, vitaminD: 0, calcium: 1, iron: 0.6, potassium: 1 },
    portions: [{ description: 'tbsp', gramWeight: 13.5, amount: 1 }]
  },
  'rotisserie chicken': {
    description: 'Chicken, roasted, meat only',
    nutrients: { calories: 190, totalFat: 7.4, saturatedFat: 2, transFat: 0, cholesterol: 89, sodium: 384, totalCarbs: 0, dietaryFiber: 0, totalSugars: 0, addedSugars: 0, protein: 28.9, vitaminD: 0, calcium: 12, iron: 1, potassium: 243 },
    portions: [{ description: 'cup', gramWeight: 140, amount: 1 }, { description: 'cups shredded', gramWeight: 140, amount: 1 }]
  },
  'red lentils': {
    description: 'Lentils, red, dry',
    nutrients: { calories: 358, totalFat: 1.1, saturatedFat: 0.2, transFat: 0, cholesterol: 0, sodium: 6, totalCarbs: 60.1, dietaryFiber: 10.7, totalSugars: 2, addedSugars: 0, protein: 25.4, vitaminD: 0, calcium: 51, iron: 7.4, potassium: 677 },
    portions: [{ description: 'cup', gramWeight: 192, amount: 1 }, { description: 'cup dry', gramWeight: 192, amount: 1 }]
  },
  'sourdough bread': {
    description: 'Bread, sourdough',
    nutrients: { calories: 274, totalFat: 1.8, saturatedFat: 0.4, transFat: 0, cholesterol: 0, sodium: 536, totalCarbs: 53.1, dietaryFiber: 2.4, totalSugars: 3.5, addedSugars: 0, protein: 9, vitaminD: 0, calcium: 24, iron: 3.2, potassium: 117 },
    portions: [{ description: 'slice', gramWeight: 50, amount: 1 }, { description: 'slices', gramWeight: 50, amount: 1 }]
  },
  'canned tuna': {
    description: 'Fish, tuna, light, canned in water, drained',
    nutrients: { calories: 86, totalFat: 0.8, saturatedFat: 0.2, transFat: 0, cholesterol: 42, sodium: 247, totalCarbs: 0, dietaryFiber: 0, totalSugars: 0, addedSugars: 0, protein: 19.4, vitaminD: 1.7, calcium: 11, iron: 1.3, potassium: 237 },
    portions: [{ description: 'can', gramWeight: 142, amount: 1 }, { description: 'cans', gramWeight: 142, amount: 1 }, { description: 'oz', gramWeight: 28.35, amount: 1 }]
  },
  'lemon juice': {
    description: 'Lemon juice, raw',
    nutrients: { calories: 22, totalFat: 0.2, saturatedFat: 0, transFat: 0, cholesterol: 0, sodium: 1, totalCarbs: 6.9, dietaryFiber: 0.3, totalSugars: 2.5, addedSugars: 0, protein: 0.4, vitaminD: 0, calcium: 6, iron: 0.1, potassium: 103 },
    portions: [{ description: 'tbsp', gramWeight: 15, amount: 1 }]
  },
  'whole grain bread': {
    description: 'Bread, whole-wheat',
    nutrients: { calories: 252, totalFat: 3.5, saturatedFat: 0.7, transFat: 0, cholesterol: 0, sodium: 450, totalCarbs: 43.3, dietaryFiber: 6, totalSugars: 5.6, addedSugars: 3, protein: 10.7, vitaminD: 0, calcium: 60, iron: 2.5, potassium: 230 },
    portions: [{ description: 'slice', gramWeight: 43, amount: 1 }, { description: 'slices', gramWeight: 43, amount: 1 }]
  },
  'cottage cheese': {
    description: 'Cheese, cottage, lowfat, 2% milkfat',
    nutrients: { calories: 81, totalFat: 2.3, saturatedFat: 1.5, transFat: 0, cholesterol: 11, sodium: 330, totalCarbs: 3.7, dietaryFiber: 0, totalSugars: 3.7, addedSugars: 0, protein: 11.8, vitaminD: 0, calcium: 83, iron: 0.1, potassium: 84 },
    portions: [{ description: 'cup', gramWeight: 226, amount: 1 }]
  },
  'pear': {
    description: 'Pears, raw',
    nutrients: { calories: 57, totalFat: 0.1, saturatedFat: 0, transFat: 0, cholesterol: 0, sodium: 1, totalCarbs: 15.2, dietaryFiber: 3.1, totalSugars: 9.8, addedSugars: 0, protein: 0.4, vitaminD: 0, calcium: 9, iron: 0.2, potassium: 116 },
    portions: [{ description: 'medium', gramWeight: 178, amount: 1 }]
  },
  'sharp cheddar cheese': {
    description: 'Cheese, cheddar, sharp',
    nutrients: { calories: 403, totalFat: 33.1, saturatedFat: 21.1, transFat: 0, cholesterol: 105, sodium: 621, totalCarbs: 1.3, dietaryFiber: 0, totalSugars: 0.5, addedSugars: 0, protein: 24.9, vitaminD: 0.3, calcium: 721, iron: 0.7, potassium: 98 },
    portions: [{ description: 'oz', gramWeight: 28.35, amount: 1 }]
  },
  'sweet potatoes': {
    description: 'Sweet potato, raw',
    nutrients: { calories: 86, totalFat: 0.1, saturatedFat: 0, transFat: 0, cholesterol: 0, sodium: 55, totalCarbs: 20.1, dietaryFiber: 3, totalSugars: 4.2, addedSugars: 0, protein: 1.6, vitaminD: 0, calcium: 30, iron: 0.6, potassium: 337 },
    portions: [{ description: 'medium', gramWeight: 114, amount: 1 }]
  },
  'cumin': {
    description: 'Spices, cumin seed, ground',
    nutrients: { calories: 375, totalFat: 22.3, saturatedFat: 1.5, transFat: 0, cholesterol: 0, sodium: 168, totalCarbs: 44.2, dietaryFiber: 10.5, totalSugars: 2.3, addedSugars: 0, protein: 17.8, vitaminD: 0, calcium: 931, iron: 66.4, potassium: 1788 },
    portions: [{ description: 'tsp', gramWeight: 2.1, amount: 1 }]
  },
  'bone-in chicken thighs': {
    description: 'Chicken, thigh, meat and skin, raw',
    nutrients: { calories: 209, totalFat: 10.9, saturatedFat: 3, transFat: 0, cholesterol: 135, sodium: 84, totalCarbs: 0, dietaryFiber: 0, totalSugars: 0, addedSugars: 0, protein: 26, vitaminD: 0.2, calcium: 9, iron: 0.9, potassium: 222 },
    portions: [{ description: 'large', gramWeight: 180, amount: 1 }]
  },
  'broccoli': {
    description: 'Broccoli, raw',
    nutrients: { calories: 34, totalFat: 0.4, saturatedFat: 0.1, transFat: 0, cholesterol: 0, sodium: 33, totalCarbs: 6.6, dietaryFiber: 2.6, totalSugars: 1.7, addedSugars: 0, protein: 2.8, vitaminD: 0, calcium: 47, iron: 0.7, potassium: 316 },
    portions: [{ description: 'cup', gramWeight: 91, amount: 1 }, { description: 'large head', gramWeight: 280, amount: 1 }]
  },
  'parmesan cheese': {
    description: 'Cheese, parmesan, grated',
    nutrients: { calories: 392, totalFat: 25.8, saturatedFat: 17.1, transFat: 0, cholesterol: 68, sodium: 1529, totalCarbs: 3.2, dietaryFiber: 0, totalSugars: 0.8, addedSugars: 0, protein: 35.8, vitaminD: 0.5, calcium: 1184, iron: 0.8, potassium: 92 },
    portions: [{ description: 'oz', gramWeight: 28.35, amount: 1 }]
  },
  'salmon fillet': {
    description: 'Fish, salmon, Atlantic, raw',
    nutrients: { calories: 208, totalFat: 13.4, saturatedFat: 3.1, transFat: 0, cholesterol: 55, sodium: 59, totalCarbs: 0, dietaryFiber: 0, totalSugars: 0, addedSugars: 0, protein: 20.4, vitaminD: 11, calcium: 9, iron: 0.3, potassium: 363 },
    portions: [{ description: 'oz', gramWeight: 28.35, amount: 1 }]
  },
  'pinto beans': {
    description: 'Beans, pinto, canned, drained',
    nutrients: { calories: 120, totalFat: 0.5, saturatedFat: 0.1, transFat: 0, cholesterol: 0, sodium: 294, totalCarbs: 21.3, dietaryFiber: 5.5, totalSugars: 0.4, addedSugars: 0, protein: 7.7, vitaminD: 0, calcium: 53, iron: 1.9, potassium: 290 },
    portions: [{ description: 'cup', gramWeight: 171, amount: 1 }]
  },
  'sirloin steak': {
    description: 'Beef, top sirloin, steak, raw',
    nutrients: { calories: 183, totalFat: 8.7, saturatedFat: 3.4, transFat: 0, cholesterol: 75, sodium: 56, totalCarbs: 0, dietaryFiber: 0, totalSugars: 0, addedSugars: 0, protein: 24.6, vitaminD: 0, calcium: 14, iron: 2.6, potassium: 342 },
    portions: [{ description: 'oz', gramWeight: 28.35, amount: 1 }]
  },
  'green beans': {
    description: 'Beans, snap, green, raw',
    nutrients: { calories: 31, totalFat: 0.2, saturatedFat: 0, transFat: 0, cholesterol: 0, sodium: 6, totalCarbs: 7, dietaryFiber: 3.4, totalSugars: 3.3, addedSugars: 0, protein: 1.8, vitaminD: 0, calcium: 37, iron: 1, potassium: 209 },
    portions: [{ description: 'cup', gramWeight: 100, amount: 1 }]
  },
  'ny strip steak': {
    description: 'Beef, short loin, top loin steak, raw',
    nutrients: { calories: 205, totalFat: 11.4, saturatedFat: 4.5, transFat: 0, cholesterol: 72, sodium: 54, totalCarbs: 0, dietaryFiber: 0, totalSugars: 0, addedSugars: 0, protein: 23.7, vitaminD: 0, calcium: 11, iron: 2.3, potassium: 315 },
    portions: [{ description: 'oz', gramWeight: 28.35, amount: 1 }]
  },
  'baby potatoes': {
    description: 'Potatoes, flesh and skin, raw',
    nutrients: { calories: 77, totalFat: 0.1, saturatedFat: 0, transFat: 0, cholesterol: 0, sodium: 6, totalCarbs: 17.5, dietaryFiber: 2.2, totalSugars: 0.8, addedSugars: 0, protein: 2, vitaminD: 0, calcium: 12, iron: 0.8, potassium: 425 },
    portions: [{ description: 'cup', gramWeight: 150, amount: 1 }]
  }
};

// Seed localStorage caches from static data for all known meal ingredients
function seedStaticNutritionData(meals) {
  let seeded = 0;
  const seen = new Set();

  for (const meal of meals) {
    for (const ing of (meal.ingredients || [])) {
      const key = ing.name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);

      // Skip if already linked
      if (getIngredientMapping(ing.name)) continue;

      const staticEntry = STATIC_NUTRITION[key];
      if (!staticEntry) continue;

      // Build cache entry
      const fdcId = 'static-' + key.replace(/\s+/g, '-');
      const entry = {
        fdcId,
        description: staticEntry.description,
        dataType: 'Static (USDA SR Legacy reference)',
        fetchedAt: new Date().toISOString(),
        nutrients: { ...staticEntry.nutrients },
        portions: staticEntry.portions || [],
        missingFields: []
      };
      setCachedNutrient(fdcId, entry);

      // Compute serving grams from the ingredient's amount
      const parsed = parseAmount(ing.amount);
      const { grams } = convertToGrams(parsed, staticEntry.portions);
      setIngredientMapping(ing.name, fdcId, grams);
      seeded++;
    }
  }
  if (seeded > 0) {
    console.log(`Seeded ${seeded} ingredients from static nutrition data`);
  }
  return seeded;
}

// ─── NUTRITION CACHE (localStorage) ───

function loadNutritionCache() {
  try {
    const raw = localStorage.getItem('nutritionCache');
    if (raw) return JSON.parse(raw);
  } catch (e) { /* ignore */ }
  return { version: 1, ingredients: {} };
}

function saveNutritionCache(cache) {
  localStorage.setItem('nutritionCache', JSON.stringify(cache));
}

function getCachedNutrient(fdcId) {
  const cache = loadNutritionCache();
  const entry = cache.ingredients[String(fdcId)];
  if (!entry) return null;
  // Expire after 30 days
  const age = Date.now() - new Date(entry.fetchedAt).getTime();
  if (age > 30 * 24 * 60 * 60 * 1000) return null;
  return entry;
}

function setCachedNutrient(fdcId, data) {
  const cache = loadNutritionCache();
  cache.ingredients[String(fdcId)] = data;
  saveNutritionCache(cache);
}

// ─── WARNING ACKNOWLEDGMENT CACHE ───

function loadWarningAcks() {
  try {
    const raw = localStorage.getItem('nutritionWarningAcks');
    if (raw) return JSON.parse(raw);
  } catch (e) { /* ignore */ }
  return { version: 1, acknowledged: {} };
}

function saveWarningAcks(acks) {
  localStorage.setItem('nutritionWarningAcks', JSON.stringify(acks));
}

function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + ch;
    hash |= 0;
  }
  return String(hash);
}

function computeWarningHash(ingredientName, nutritionData) {
  const key = ingredientName.toLowerCase() + '|' + JSON.stringify(nutritionData || {});
  return simpleHash(key);
}

function isWarningAcknowledged(mealId, ingredientName, nutritionData) {
  const acks = loadWarningAcks();
  const key = `${mealId}:${ingredientName.toLowerCase()}`;
  const stored = acks.acknowledged[key];
  if (!stored) return false;
  return stored === computeWarningHash(ingredientName, nutritionData);
}

function acknowledgeWarnings(mealId, warnings) {
  const acks = loadWarningAcks();
  for (const w of warnings) {
    const key = `${mealId}:${w.ingredientName.toLowerCase()}`;
    acks.acknowledged[key] = computeWarningHash(w.ingredientName, w.nutritionData);
  }
  saveWarningAcks(acks);
}

// ─── GLOBAL INGREDIENT MAP ───

function loadIngredientMap() {
  try {
    const raw = localStorage.getItem('nutritionIngredientMap');
    if (raw) return JSON.parse(raw);
  } catch (e) { /* ignore */ }
  return {};
}

function saveIngredientMap(map) {
  localStorage.setItem('nutritionIngredientMap', JSON.stringify(map));
}

function getIngredientMapping(ingredientName) {
  const map = loadIngredientMap();
  return map[ingredientName.toLowerCase()] || null;
}

function setIngredientMapping(ingredientName, fdcId, servingGrams) {
  const map = loadIngredientMap();
  map[ingredientName.toLowerCase()] = { fdcId, servingGrams };
  saveIngredientMap(map);
}

// ─── USDA API CLIENT ───

async function searchUSDA(query, apiKey, dataTypes) {
  const types = dataTypes || ['Foundation', 'SR Legacy'];
  const key = apiKey || getUsdaApiKey();
  const url = 'https://api.nal.usda.gov/fdc/v1/foods/search?api_key=' + encodeURIComponent(key);
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: query,
      dataType: types,
      pageSize: 5,
      sortBy: 'dataType.keyword'
    })
  });
  if (!resp.ok) {
    if (resp.status === 429) {
      throw new Error('RATE_LIMITED');
    }
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error?.message || `USDA API error ${resp.status}`);
  }
  const data = await resp.json();
  return (data.foods || []).map(f => ({
    fdcId: f.fdcId,
    description: f.description,
    dataType: f.dataType,
    nutrients: f.foodNutrients || []
  }));
}

async function fetchNutrientsByFdcId(fdcId, apiKey) {
  // Check cache first
  const cached = getCachedNutrient(fdcId);
  if (cached) return cached;

  const key = apiKey || getUsdaApiKey();
  const url = `https://api.nal.usda.gov/fdc/v1/food/${fdcId}?api_key=${encodeURIComponent(key)}`;
  const resp = await fetch(url);
  if (!resp.ok) {
    // Non-fatal: return null so caller can skip this ingredient
    console.warn(`USDA detail fetch failed for fdcId ${fdcId}: ${resp.status}`);
    return null;
  }
  const data = await resp.json();

  // Extract nutrients
  const nutrients = {};
  NUTRITION_FIELDS.forEach(f => { nutrients[f] = null; });

  for (const fn of (data.foodNutrients || [])) {
    const num = fn.nutrient?.number ? parseInt(fn.nutrient.number) : (fn.number || fn.nutrientNumber);
    const field = USDA_NUTRIENT_MAP[num];
    if (field && nutrients[field] === null) {
      let value = fn.amount ?? fn.value ?? null;
      if (value !== null && VITAMIN_D_IU_NUMBERS.includes(num)) {
        value = value / 40; // Convert IU to mcg
      }
      nutrients[field] = value;
    }
  }

  // Extract portions
  const portions = (data.foodPortions || []).map(p => ({
    description: (p.portionDescription || p.modifier || p.measureUnit?.name || '').toLowerCase(),
    gramWeight: p.gramWeight || 0,
    amount: p.amount || 1
  })).filter(p => p.gramWeight > 0);

  // Determine missing fields (exclude transFat and addedSugars — handled by disclaimer)
  const disclaimerFields = ['transFat', 'addedSugars'];
  const missingFields = NUTRITION_FIELDS.filter(f =>
    !disclaimerFields.includes(f) && nutrients[f] === null
  );

  const entry = {
    fdcId,
    description: data.description || '',
    dataType: data.dataType || '',
    fetchedAt: new Date().toISOString(),
    nutrients,
    portions,
    missingFields
  };

  setCachedNutrient(fdcId, entry);
  return entry;
}

// ─── PORTION PARSING ───

function parseFraction(str) {
  // Handle unicode fractions
  const unicodeFractions = { '¼': 0.25, '½': 0.5, '¾': 0.75, '⅓': 0.333, '⅔': 0.667, '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875 };
  for (const [ch, val] of Object.entries(unicodeFractions)) {
    if (str.includes(ch)) {
      const rest = str.replace(ch, '').trim();
      return (rest ? parseFloat(rest) : 0) + val;
    }
  }
  // Handle "1/2" style fractions
  if (str.includes('/')) {
    const parts = str.split('/');
    if (parts.length === 2) {
      const num = parseFloat(parts[0]);
      const den = parseFloat(parts[1]);
      if (!isNaN(num) && !isNaN(den) && den !== 0) return num / den;
    }
  }
  const n = parseFloat(str);
  return isNaN(n) ? 1 : n;
}

function parseAmount(amountStr) {
  if (!amountStr) return { quantity: 1, unit: '' };

  const str = amountStr.trim().toLowerCase();
  // Match patterns like "1 cup", "1/2 cup", "1.5 oz", "6 spears", "1 medium", "2 large"
  const match = str.match(/^([\d\s\/¼½¾⅓⅔⅛⅜⅝⅞.]+)\s*(.*)$/);
  if (!match) return { quantity: 1, unit: str };

  const quantityStr = match[1].trim();
  let unit = match[2].trim();

  // Handle compound like "1 1/2" -> split on space
  let quantity;
  const spaceParts = quantityStr.split(/\s+/);
  if (spaceParts.length === 2) {
    quantity = parseFraction(spaceParts[0]) + parseFraction(spaceParts[1]);
  } else {
    quantity = parseFraction(quantityStr);
  }

  return { quantity, unit };
}

function convertToGrams(parsedAmount, portions) {
  const { quantity, unit } = parsedAmount;
  let estimated = false;

  // Try matching USDA portions first
  if (portions && portions.length > 0) {
    for (const p of portions) {
      if (p.description && unit && (p.description.includes(unit) || unit.includes(p.description))) {
        return { grams: quantity * (p.gramWeight / p.amount), estimated: false };
      }
    }
  }

  // Fallback to our conversion table
  if (unit && UNIT_GRAMS[unit]) {
    return { grams: quantity * UNIT_GRAMS[unit], estimated: true };
  }

  // Last resort: assume 100g per unit
  return { grams: quantity * 100, estimated: true };
}

// ─── MEAL NUTRITION COMPUTATION ───

function computeMealNutrition(meal) {
  const totals = {};
  NUTRITION_FIELDS.forEach(f => { totals[f] = 0; });
  let totalGrams = 0;
  const warnings = [];
  let hasAnyNutritionData = false;

  for (const ing of (meal.ingredients || [])) {
    const mapping = getIngredientMapping(ing.name);
    if (!mapping) {
      warnings.push({
        ingredientName: ing.name,
        type: 'no-usda-data',
        fields: [],
        source: 'none',
        message: `No USDA data linked for "${ing.name}". Use the AI assistant to look up and assign an FDC ID.`,
        nutritionData: null
      });
      continue;
    }

    const cached = getCachedNutrient(mapping.fdcId);
    if (!cached) {
      warnings.push({
        ingredientName: ing.name,
        type: 'not-fetched',
        fields: [],
        source: 'none',
        message: `Nutrition data for "${ing.name}" has not been fetched yet. Open the nutrition label to trigger a fetch.`,
        nutritionData: null
      });
      continue;
    }

    hasAnyNutritionData = true;
    const parsed = parseAmount(ing.amount);
    const { grams, estimated } = convertToGrams(parsed, cached.portions);
    const scale = grams / 100; // USDA data is per 100g
    totalGrams += grams;

    for (const field of NUTRITION_FIELDS) {
      if (cached.nutrients[field] !== null) {
        totals[field] += cached.nutrients[field] * scale;
      }
    }

    // Build warnings (exclude transFat and addedSugars — they get a general disclaimer)
    const disclaimerFields = ['transFat', 'addedSugars'];
    const missing = (cached.missingFields || []).filter(f => !disclaimerFields.includes(f));

    if (missing.length > 0 || estimated) {
      const parts = [];
      if (missing.length > 0) parts.push(`Missing fields from USDA: ${missing.join(', ')}`);
      if (estimated) parts.push('Serving size was estimated using standard conversions (not USDA portion data)');
      warnings.push({
        ingredientName: ing.name,
        type: missing.length > 0 ? 'missing-fields' : 'portion-estimated',
        fields: missing,
        source: cached.dataType || 'USDA',
        message: parts.join('. '),
        nutritionData: cached.nutrients
      });
    }
  }

  // Round values
  for (const field of NUTRITION_FIELDS) {
    totals[field] = Math.round(totals[field] * 10) / 10;
  }

  return { totals, warnings, servingSizeGrams: Math.round(totalGrams), hasAnyNutritionData };
}

// ─── WARNING HELPERS ───

function getMealWarnings(meal) {
  const { warnings } = computeMealNutrition(meal);
  return warnings;
}

function hasUnacknowledgedWarnings(meal) {
  const warnings = getMealWarnings(meal);
  if (warnings.length === 0) return false;
  return warnings.some(w => !isWarningAcknowledged(meal.id, w.ingredientName, w.nutritionData));
}

// ─── NUTRITION LABEL RENDERING ───

function formatNutrientValue(field, value) {
  if (value === null || value === undefined) return '---';
  if (field === 'calories') return String(Math.round(value));
  if (['cholesterol', 'sodium', 'calcium', 'iron', 'potassium'].includes(field)) {
    return Math.round(value) + 'mg';
  }
  if (field === 'vitaminD') return Math.round(value * 10) / 10 + 'mcg';
  return Math.round(value) + 'g';
}

function calcDV(field, value) {
  const dv = DAILY_VALUES[field];
  if (!dv || value === null || value === undefined) return null;
  return Math.round((value / dv) * 100);
}

function renderNutritionLabel(meal, options = {}) {
  const { totals, warnings, servingSizeGrams, hasAnyNutritionData } = computeMealNutrition(meal);

  const unackWarnings = warnings.filter(w =>
    !isWarningAcknowledged(meal.id, w.ingredientName, w.nutritionData)
  );

  function row(label, field, indent, bold, thickLine) {
    const val = totals[field];
    const display = formatNutrientValue(field, val);
    const dv = calcDV(field, val);
    const dvStr = dv !== null ? `<span class="nf-dv">${dv}%</span>` : '';
    const cls = [
      indent ? 'nf-indent' : '',
      bold ? 'nf-bold' : '',
      thickLine ? 'nf-thick-top' : ''
    ].filter(Boolean).join(' ');
    return `<div class="nf-row ${cls}"><span>${label} ${display}</span>${dvStr}</div>`;
  }

  const labelHTML = `
    <div class="nutrition-label">
      <div class="nf-title">Nutrition Facts</div>
      <div class="nf-thick-bar"></div>
      <div class="nf-serving">
        <div class="nf-serving-size"><span class="nf-bold">Serving size</span> 1 meal${servingSizeGrams ? ' (' + servingSizeGrams + 'g)' : ''}</div>
      </div>
      <div class="nf-thick-bar"></div>
      <div class="nf-calories-row">
        <div class="nf-calories-label">Calories</div>
        <div class="nf-calories-value">${totals.calories !== null ? Math.round(totals.calories) : '---'}</div>
      </div>
      <div class="nf-medium-bar"></div>
      <div class="nf-dv-header"><span class="nf-dv">% Daily Value*</span></div>
      <div class="nf-thin-line"></div>
      ${row('Total Fat', 'totalFat', false, true, false)}
      <div class="nf-thin-line"></div>
      ${row('Saturated Fat', 'saturatedFat', true, false, false)}
      <div class="nf-thin-line"></div>
      ${row('Trans Fat', 'transFat', true, false, false)}
      <div class="nf-thin-line"></div>
      ${row('Cholesterol', 'cholesterol', false, true, false)}
      <div class="nf-thin-line"></div>
      ${row('Sodium', 'sodium', false, true, false)}
      <div class="nf-thin-line"></div>
      ${row('Total Carbohydrate', 'totalCarbs', false, true, false)}
      <div class="nf-thin-line"></div>
      ${row('Dietary Fiber', 'dietaryFiber', true, false, false)}
      <div class="nf-thin-line"></div>
      ${row('Total Sugars', 'totalSugars', true, false, false)}
      <div class="nf-thin-line"></div>
      ${row('Incl. Added Sugars', 'addedSugars', true, false, false)}
      <div class="nf-thin-line"></div>
      ${row('Protein', 'protein', false, true, false)}
      <div class="nf-thick-bar"></div>
      ${row('Vitamin D', 'vitaminD', false, false, false)}
      <div class="nf-thin-line"></div>
      ${row('Calcium', 'calcium', false, false, false)}
      <div class="nf-thin-line"></div>
      ${row('Iron', 'iron', false, false, false)}
      <div class="nf-thin-line"></div>
      ${row('Potassium', 'potassium', false, false, false)}
      <div class="nf-medium-bar"></div>
      <div class="nf-footnote">* The % Daily Value (DV) tells you how much a nutrient in a serving of food contributes to a daily diet. 2,000 calories a day is used for general nutrition advice.</div>
      <div class="nf-disclaimer">
        <div class="nf-disclaimer-title">General Disclaimer</div>
        <div class="nf-disclaimer-text">Trans Fat and Added Sugars values may not be available from the USDA Foundation Foods or SR Legacy databases. When shown as "---", these values were not reported by USDA for one or more ingredients. Branded food data or product labels may provide more accurate values for these fields.</div>
      </div>
    </div>
  `;

  let warningsHTML = '';
  if (unackWarnings.length > 0) {
    const warningItems = unackWarnings.map(w => `
      <div class="nf-warning-item">
        <span class="nf-warning-icon">&#9888;</span>
        <div>
          <div class="nf-warning-name">${esc(w.ingredientName)}</div>
          <div class="nf-warning-msg">${esc(w.message)}</div>
          ${w.source !== 'none' ? `<div class="nf-warning-source">Source: ${esc(w.source)}</div>` : ''}
        </div>
      </div>
    `).join('');

    warningsHTML = `
      <div class="nf-warnings">
        <div class="nf-warnings-title">Data Warnings</div>
        ${warningItems}
        <div class="nf-warnings-note">You can manually enter correct nutrition info via the AI Assistant chat. Tell it the ingredient name and correct values, and it will update the data.</div>
        <button class="nf-ack-btn" id="nf-acknowledge-btn">I Understand</button>
      </div>
    `;
  }

  if (!hasAnyNutritionData) {
    if (options && options.loading) {
      return `
        <div class="nf-no-data">
          <div class="nf-no-data-icon">&#9888;</div>
          <div class="nf-no-data-title">Loading Nutrition Data...</div>
          <div class="nf-no-data-text">Searching USDA FoodData Central for ingredient data. This may take a moment on first load.</div>
        </div>
      `;
    }
    return `
      <div class="nf-no-data">
        <div class="nf-no-data-icon">&#9888;</div>
        <div class="nf-no-data-title">No Nutrition Data Available</div>
        <div class="nf-no-data-text">Could not retrieve data from USDA FoodData Central. The API may be rate-limited (30 requests/hour). Data will be fetched automatically on your next visit.</div>
      </div>
    `;
  }

  return labelHTML + warningsHTML;
}

function pickBestResult(results) {
  // Prefer SR Legacy (more reliable with DEMO_KEY), then Foundation
  const srLegacy = results.find(r => r.dataType === 'SR Legacy');
  if (srLegacy) return srLegacy;
  return results[0];
}

function buildCacheFromSearchNutrients(food) {
  // Build a cache entry from the inline nutrients in search results
  // (less complete than detail endpoint, but works when detail returns 404)
  const nutrients = {};
  NUTRITION_FIELDS.forEach(f => { nutrients[f] = null; });

  for (const fn of (food.nutrients || [])) {
    const num = fn.nutrientNumber || fn.number;
    const field = USDA_NUTRIENT_MAP[num];
    if (field && nutrients[field] === null) {
      let value = fn.value ?? null;
      if (value !== null && VITAMIN_D_IU_NUMBERS.includes(num)) {
        value = value / 40;
      }
      nutrients[field] = value;
    }
  }

  const disclaimerFields = ['transFat', 'addedSugars'];
  const missingFields = NUTRITION_FIELDS.filter(f =>
    !disclaimerFields.includes(f) && nutrients[f] === null
  );

  return {
    fdcId: food.fdcId,
    description: food.description || '',
    dataType: food.dataType || '',
    fetchedAt: new Date().toISOString(),
    nutrients,
    portions: [], // search results don't include portions
    missingFields
  };
}

async function autoLinkIngredients(ingredients) {
  let linked = 0;
  for (const ing of ingredients) {
    const existing = getIngredientMapping(ing.name);
    if (existing) {
      // Already linked — just make sure we have cached nutrition data
      const cached = getCachedNutrient(existing.fdcId);
      if (!cached) {
        try {
          const result = await fetchNutrientsByFdcId(existing.fdcId);
          if (!result) {
            // Detail fetch failed (404) — try to re-search and use inline data
            const results = await searchUSDA(ing.name);
            if (results.length > 0) {
              const best = pickBestResult(results);
              const entry = buildCacheFromSearchNutrients(best);
              setCachedNutrient(best.fdcId, entry);
              setIngredientMapping(ing.name, best.fdcId, existing.servingGrams);
            }
          }
        } catch (e) { /* will show warning */ }
      }
      linked++;
      continue;
    }

    // Search USDA for this ingredient
    try {
      const results = await searchUSDA(ing.name);
      if (results.length > 0) {
        const best = pickBestResult(results);
        // Try detail fetch first for full data
        const detailed = await fetchNutrientsByFdcId(best.fdcId);
        if (!detailed) {
          // Detail failed — use inline nutrients from search
          const entry = buildCacheFromSearchNutrients(best);
          setCachedNutrient(best.fdcId, entry);
        }
        // Parse the amount to estimate serving grams
        const parsed = parseAmount(ing.amount);
        const cached = getCachedNutrient(best.fdcId);
        const { grams } = convertToGrams(parsed, cached ? cached.portions : []);
        setIngredientMapping(ing.name, best.fdcId, grams);
        linked++;
      }
    } catch (e) {
      // Rate limited or network error — stop trying for now
      console.warn(`USDA lookup failed for "${ing.name}":`, e.message);
      if (e.message && (e.message.includes('RATE_LIMITED') || e.message.includes('429') || e.message.includes('OVER_RATE_LIMIT') || e.message.includes('rate limit'))) break;
    }
  }
  return linked;
}

async function openNutritionModal(meal) {
  const container = document.getElementById('nutrition-label-container');
  document.getElementById('nutrition-modal-meal-name').textContent = meal.name;
  document.getElementById('nutrition-overlay').classList.add('open');

  // Show initial state (may be "loading" or partial data)
  container.innerHTML = renderNutritionLabel(meal, { loading: true });
  wireAckButton(container, meal);

  // Auto-link any unlinked ingredients
  const unlinked = (meal.ingredients || []).filter(ing => !getIngredientMapping(ing.name));
  if (unlinked.length > 0) {
    await autoLinkIngredients(meal.ingredients);
    // Re-render with newly fetched data
    container.innerHTML = renderNutritionLabel(meal, { loading: false });
    wireAckButton(container, meal);
    // Update badges on the planner
    if (typeof renderPlanner === 'function') renderPlanner();
    if (typeof renderDayTabs === 'function') renderDayTabs();
  }
}

function wireAckButton(container, meal) {
  const ackBtn = document.getElementById('nf-acknowledge-btn');
  if (ackBtn) {
    ackBtn.addEventListener('click', () => {
      const warnings = getMealWarnings(meal);
      acknowledgeWarnings(meal.id, warnings);
      container.innerHTML = renderNutritionLabel(meal);
      if (typeof renderPlanner === 'function') renderPlanner();
      if (typeof renderDayTabs === 'function') renderDayTabs();
    });
  }
}

// Background auto-link: runs on app init to pre-fetch USDA data for all ingredients
async function initNutritionData(meals) {
  // Seed from static data first (instant, no API calls)
  seedStaticNutritionData(meals);

  // Collect all unique ingredient names that aren't linked yet
  const seen = new Set();
  const unlinkedIngredients = [];
  for (const meal of meals) {
    for (const ing of (meal.ingredients || [])) {
      const key = ing.name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      if (!getIngredientMapping(ing.name)) {
        unlinkedIngredients.push(ing);
      }
    }
  }

  if (unlinkedIngredients.length === 0) return;

  // Link in batches with a small delay to avoid rate limits
  for (let i = 0; i < unlinkedIngredients.length; i++) {
    const ing = unlinkedIngredients[i];
    if (getIngredientMapping(ing.name)) continue; // linked by another meal's lookup

    try {
      const results = await searchUSDA(ing.name);
      if (results.length > 0) {
        const best = pickBestResult(results);
        const detailed = await fetchNutrientsByFdcId(best.fdcId);
        if (!detailed) {
          const entry = buildCacheFromSearchNutrients(best);
          setCachedNutrient(best.fdcId, entry);
        }
        const parsed = parseAmount(ing.amount);
        const cached = getCachedNutrient(best.fdcId);
        const { grams } = convertToGrams(parsed, cached ? cached.portions : []);
        setIngredientMapping(ing.name, best.fdcId, grams);
      }
    } catch (e) {
      console.warn(`Background USDA lookup failed for "${ing.name}":`, e.message);
      if (e.message && (e.message.includes('RATE_LIMITED') || e.message.includes('429') || e.message.includes('OVER_RATE_LIMIT') || e.message.includes('rate limit'))) {
        console.warn('USDA rate limited, pausing background lookups');
        break;
      }
    }

    // Small delay between requests to be polite to the API
    if (i < unlinkedIngredients.length - 1) {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  // Re-render to update badges
  if (typeof renderPlanner === 'function') renderPlanner();
  if (typeof renderDayTabs === 'function') renderDayTabs();
}

function closeNutritionModal() {
  document.getElementById('nutrition-overlay').classList.remove('open');
}

function bindNutritionModal() {
  document.getElementById('nutrition-close-btn').addEventListener('click', closeNutritionModal);
  document.getElementById('nutrition-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeNutritionModal();
  });
}

// ─── HELPERS ───

function esc(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

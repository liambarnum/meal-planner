/* ─── NUTRITION MODULE ─── */
/* Static nutrition data and FDA-format label rendering */

const NUTRITION_FIELDS = [
  'calories', 'totalFat', 'saturatedFat', 'transFat', 'cholesterol',
  'sodium', 'totalCarbs', 'dietaryFiber', 'totalSugars', 'addedSugars',
  'protein', 'vitaminD', 'calcium', 'iron', 'potassium'
];

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
// Hard-coded for all known meal ingredients so nutrition labels work offline.

const STATIC_NUTRITION = {
  'apple': {
    fdcId: 171688,
    description: "Apples, raw, with skin (Includes foods for USDA's Food Distribution Program)",
    nutrients: {"protein":0.26,"totalFat":0.17,"totalCarbs":13.81,"calories":52,"dietaryFiber":2.4,"calcium":6,"iron":0.12,"potassium":107,"sodium":1,"vitaminD":0,"cholesterol":0,"transFat":0,"saturatedFat":0.028,"totalSugars":10.39},
    portions: [{"description":"cup","gramWeight":109,"amount":1},{"description":"medium","gramWeight":182,"amount":1},{"description":"small","gramWeight":149,"amount":1},{"description":"nlea serving","gramWeight":242,"amount":1}]
  },
  'arugula': {
    fdcId: 169387,
    description: "Arugula, raw",
    nutrients: {"protein":2.58,"totalFat":0.66,"totalCarbs":3.65,"calories":25,"dietaryFiber":1.6,"calcium":160,"iron":1.46,"potassium":369,"sodium":27,"vitaminD":0,"cholesterol":0,"transFat":0,"saturatedFat":0.086,"totalSugars":2.05},
    portions: [{"description":"cup","gramWeight":10,"amount":0.5},{"description":"leaf","gramWeight":2,"amount":1}]
  },
  'baby potatoes': {
    fdcId: 170026,
    description: "Potatoes, flesh and skin, raw",
    nutrients: {"protein":2.05,"totalFat":0.09,"totalCarbs":17.49,"calories":77,"dietaryFiber":2.1,"calcium":12,"iron":0.81,"potassium":425,"sodium":6,"vitaminD":0,"cholesterol":0,"transFat":0,"saturatedFat":0.025,"totalSugars":0.82},
    portions: [{"description":"small","gramWeight":170,"amount":1},{"description":"cup","gramWeight":75,"amount":0.5},{"description":"large","gramWeight":369,"amount":1},{"description":"medium","gramWeight":213,"amount":1}]
  },
  'baby spinach': {
    fdcId: 168462,
    description: "Spinach, raw",
    nutrients: {"protein":2.86,"totalFat":0.39,"totalCarbs":3.63,"calories":23,"dietaryFiber":2.2,"calcium":99,"iron":2.71,"potassium":558,"sodium":79,"vitaminD":0,"cholesterol":0,"transFat":0,"saturatedFat":0.063,"totalSugars":0.42},
    portions: [{"description":"bunch","gramWeight":340,"amount":1},{"description":"leaf","gramWeight":10,"amount":1},{"description":"cup","gramWeight":30,"amount":1},{"description":"oz","gramWeight":284,"amount":1}]
  },
  'banana': {
    fdcId: 173944,
    description: "Bananas, raw",
    nutrients: {"protein":1.09,"totalFat":0.33,"totalCarbs":22.84,"calories":89,"dietaryFiber":2.6,"calcium":5,"iron":0.26,"potassium":358,"sodium":1,"vitaminD":0,"cholesterol":0,"transFat":0,"saturatedFat":0.112,"totalSugars":12.23},
    portions: [{"description":"nlea serving","gramWeight":126,"amount":1},{"description":"large","gramWeight":152,"amount":1},{"description":"cup","gramWeight":150,"amount":1},{"description":"small","gramWeight":101,"amount":1}]
  },
  'black beans': {
    fdcId: 175188,
    description: "Beans, black turtle, mature seeds, canned",
    nutrients: {"protein":6.03,"totalFat":0.29,"totalCarbs":16.55,"calories":91,"dietaryFiber":6.9,"calcium":35,"iron":1.9,"potassium":308,"sodium":384,"vitaminD":0,"cholesterol":0,"transFat":0,"saturatedFat":0.075,"totalSugars":0.23},
    portions: [{"description":"cup","gramWeight":240,"amount":1}]
  },
  'black pepper': {
    fdcId: 170931,
    description: "Spices, pepper, black",
    nutrients: {"protein":10.39,"totalFat":3.26,"totalCarbs":63.95,"calories":251,"dietaryFiber":25.3,"calcium":443,"iron":9.71,"potassium":1329,"sodium":20,"vitaminD":0,"cholesterol":0,"transFat":0,"saturatedFat":1.392,"totalSugars":0.64},
    portions: [{"description":"tbsp","gramWeight":6.9,"amount":1},{"description":"dash","gramWeight":0.1,"amount":1},{"description":"tsp","gramWeight":2.3,"amount":1}]
  },
  'blueberries': {
    fdcId: 171711,
    description: "Blueberries, raw",
    nutrients: {"protein":0.74,"totalFat":0.33,"totalCarbs":14.49,"calories":57,"dietaryFiber":2.4,"calcium":6,"iron":0.28,"potassium":77,"sodium":1,"vitaminD":0,"cholesterol":0,"transFat":0,"saturatedFat":0.028,"totalSugars":9.96},
    portions: [{"description":"cup","gramWeight":148,"amount":1},{"description":"berries","gramWeight":68,"amount":50}]
  },
  'bone broth': {
    fdcId: 172884,
    description: "Soup, stock, chicken, home-prepared",
    nutrients: {"protein":2.52,"totalFat":1.2,"totalCarbs":3.53,"calories":36,"dietaryFiber":0,"calcium":3,"iron":0.21,"potassium":105,"sodium":143,"vitaminD":0,"cholesterol":3,"transFat":0,"saturatedFat":0.321,"totalSugars":1.58},
    portions: [{"description":"cup","gramWeight":240,"amount":1}]
  },
  'bone-in chicken thighs': {
    fdcId: 172385,
    description: "Chicken, broilers or fryers, thigh, meat and skin, raw",
    nutrients: {"protein":16.52,"totalFat":16.61,"totalCarbs":0.25,"calories":221,"dietaryFiber":0,"calcium":7,"iron":0.68,"potassium":204,"sodium":81,"vitaminD":0.1,"cholesterol":98,"transFat":0.085,"saturatedFat":4.524,"totalSugars":0},
    portions: [{"description":"oz","gramWeight":113,"amount":4},{"description":"thigh with skin","gramWeight":193,"amount":1}]
  },
  'broccoli': {
    fdcId: 170379,
    description: "Broccoli, raw",
    nutrients: {"protein":2.82,"totalFat":0.37,"totalCarbs":6.64,"calories":34,"dietaryFiber":2.6,"calcium":47,"iron":0.73,"potassium":316,"sodium":33,"vitaminD":0,"cholesterol":0,"transFat":0,"saturatedFat":0.114,"totalSugars":1.7},
    portions: [{"description":"bunch","gramWeight":608,"amount":1},{"description":"cup","gramWeight":44,"amount":0.5},{"description":"stalk","gramWeight":151,"amount":1},{"description":"spear (about 5\" long)","gramWeight":31,"amount":1}]
  },
  'brown rice': {
    fdcId: 169704,
    description: "Rice, brown, long-grain, cooked (Includes foods for USDA's Food Distribution Program)",
    nutrients: {"protein":2.74,"totalFat":0.97,"totalCarbs":25.58,"calories":123,"dietaryFiber":1.6,"calcium":3,"iron":0.56,"potassium":86,"sodium":4,"vitaminD":0,"cholesterol":0,"transFat":0,"saturatedFat":0.26,"totalSugars":0.24},
    portions: [{"description":"cup","gramWeight":202,"amount":1}]
  },
  'butter': {
    fdcId: 173410,
    description: "Butter, salted",
    nutrients: {"protein":0.85,"totalFat":81.11,"totalCarbs":0.06,"calories":717,"dietaryFiber":0,"calcium":24,"iron":0.02,"potassium":24,"sodium":643,"vitaminD":0,"cholesterol":215,"transFat":3.278,"saturatedFat":51.368,"totalSugars":0.06},
    portions: [{"description":"pat (1\" sq, 1/3\" high)","gramWeight":5,"amount":1},{"description":"stick","gramWeight":113,"amount":1},{"description":"cup","gramWeight":227,"amount":1},{"description":"tbsp","gramWeight":14.2,"amount":1}]
  },
  'canned tuna': {
    fdcId: 171986,
    description: "Fish, tuna, light, canned in water, without salt, drained solids",
    nutrients: {"protein":25.51,"totalFat":0.82,"totalCarbs":0,"calories":116,"dietaryFiber":0,"calcium":11,"iron":1.53,"potassium":237,"sodium":50,"vitaminD":0,"cholesterol":30,"transFat":0,"saturatedFat":0.234,"totalSugars":0},
    portions: [{"description":"oz","gramWeight":85,"amount":3},{"description":"can","gramWeight":165,"amount":1}]
  },
  'carrots': {
    fdcId: 170393,
    description: "Carrots, raw",
    nutrients: {"protein":0.93,"totalFat":0.24,"totalCarbs":9.58,"calories":41,"dietaryFiber":2.8,"calcium":33,"iron":0.3,"potassium":320,"sodium":69,"vitaminD":0,"cholesterol":0,"transFat":0,"saturatedFat":0.032,"totalSugars":4.74},
    portions: [{"description":"cup","gramWeight":110,"amount":1},{"description":"slice","gramWeight":3,"amount":1},{"description":"large","gramWeight":7,"amount":1},{"description":"small","gramWeight":50,"amount":1}]
  },
  'cheddar cheese': {
    fdcId: 170899,
    description: "Cheese, cheddar, sharp, sliced",
    nutrients: {"protein":24.25,"totalFat":33.82,"totalCarbs":2.13,"calories":410,"dietaryFiber":0,"calcium":711,"iron":0.16,"potassium":76,"sodium":644,"vitaminD":1,"cholesterol":99,"transFat":1.179,"saturatedFat":19.368,"totalSugars":0.27},
    portions: [{"description":"slice","gramWeight":28,"amount":1}]
  },
  'chia seeds': {
    fdcId: 170554,
    description: "Seeds, chia seeds, dried",
    nutrients: {"protein":16.54,"totalFat":30.74,"totalCarbs":42.12,"calories":486,"dietaryFiber":34.4,"calcium":631,"iron":7.72,"potassium":407,"sodium":16,"vitaminD":0,"cholesterol":0,"transFat":0.14,"saturatedFat":3.33,"totalSugars":0},
    portions: [{"description":"oz","gramWeight":28.35,"amount":1}]
  },
  'chili powder': {
    fdcId: 171319,
    description: "Spices, chili powder",
    nutrients: {"protein":13.46,"totalFat":14.28,"totalCarbs":49.7,"calories":282,"dietaryFiber":34.8,"calcium":330,"iron":17.3,"potassium":1950,"sodium":2867,"vitaminD":0,"cholesterol":0,"transFat":0,"saturatedFat":2.462,"totalSugars":7.19},
    portions: [{"description":"tbsp","gramWeight":8,"amount":1},{"description":"tsp","gramWeight":2.7,"amount":1}]
  },
  'cinnamon': {
    fdcId: 171320,
    description: "Spices, cinnamon, ground",
    nutrients: {"protein":3.99,"totalFat":1.24,"totalCarbs":80.59,"calories":247,"dietaryFiber":53.1,"calcium":1002,"iron":8.32,"potassium":431,"sodium":10,"vitaminD":0,"cholesterol":0,"transFat":0,"saturatedFat":0.345,"totalSugars":2.17},
    portions: [{"description":"tsp","gramWeight":2.6,"amount":1},{"description":"tbsp","gramWeight":7.8,"amount":1}]
  },
  'cottage cheese': {
    fdcId: 172182,
    description: "Cheese, cottage, lowfat, 2% milkfat",
    nutrients: {"protein":10.45,"totalFat":2.27,"totalCarbs":4.76,"calories":81,"dietaryFiber":0,"calcium":111,"iron":0.13,"potassium":125,"sodium":308,"vitaminD":0,"cholesterol":12,"transFat":0.067,"saturatedFat":1.235,"totalSugars":4},
    portions: [{"description":"cup","gramWeight":226,"amount":1},{"description":"oz","gramWeight":113,"amount":4}]
  },
  'cumin': {
    fdcId: 170923,
    description: "Spices, cumin seed",
    nutrients: {"protein":17.81,"totalFat":22.27,"totalCarbs":44.24,"calories":375,"dietaryFiber":10.5,"calcium":931,"iron":66.36,"potassium":1788,"sodium":168,"vitaminD":0,"cholesterol":0,"transFat":0,"saturatedFat":1.535,"totalSugars":2.25},
    portions: [{"description":"tsp","gramWeight":2.1,"amount":1},{"description":"tbsp","gramWeight":6,"amount":1}]
  },
  'dried dill': {
    fdcId: 171322,
    description: "Spices, dill weed, dried",
    nutrients: {"protein":19.96,"totalFat":4.36,"totalCarbs":55.82,"calories":253,"dietaryFiber":13.6,"calcium":1784,"iron":48.78,"potassium":3308,"sodium":208,"vitaminD":0,"cholesterol":0,"transFat":0,"saturatedFat":0.234,"totalSugars":0},
    portions: [{"description":"tsp","gramWeight":1,"amount":1},{"description":"tbsp","gramWeight":3.1,"amount":1}]
  },
  'dried oregano': {
    fdcId: 171328,
    description: "Spices, oregano, dried",
    nutrients: {"protein":9,"totalFat":4.28,"totalCarbs":68.92,"calories":265,"dietaryFiber":42.5,"calcium":1597,"iron":36.8,"potassium":1260,"sodium":25,"vitaminD":0,"cholesterol":0,"transFat":0,"saturatedFat":1.551,"totalSugars":4.09},
    portions: [{"description":"tsp","gramWeight":1,"amount":1}]
  },
  'eggs': {
    fdcId: 171287,
    description: "Egg, whole, raw, fresh",
    nutrients: {"protein":12.56,"totalFat":9.51,"totalCarbs":0.72,"calories":143,"dietaryFiber":0,"calcium":56,"iron":1.75,"potassium":138,"sodium":142,"vitaminD":2,"cholesterol":372,"transFat":0.038,"saturatedFat":3.126,"totalSugars":0.37},
    portions: [{"description":"cup","gramWeight":243,"amount":1},{"description":"medium","gramWeight":44,"amount":1},{"description":"large","gramWeight":56,"amount":1},{"description":"small","gramWeight":38,"amount":1}]
  },
  'feta cheese': {
    fdcId: 173420,
    description: "Cheese, feta",
    nutrients: {"protein":14.21,"totalFat":21.49,"totalCarbs":3.88,"calories":265,"dietaryFiber":0,"calcium":493,"iron":0.65,"potassium":62,"sodium":1139,"vitaminD":0.4,"cholesterol":89,"transFat":0,"saturatedFat":13.3,"totalSugars":0},
    portions: [{"description":"cup","gramWeight":150,"amount":1},{"description":"oz","gramWeight":28.35,"amount":1},{"description":"cubic inch","gramWeight":17,"amount":1}]
  },
  'fresh ginger': {
    fdcId: 169231,
    description: "Ginger root, raw",
    nutrients: {"protein":1.82,"totalFat":0.75,"totalCarbs":17.77,"calories":80,"dietaryFiber":2,"calcium":16,"iron":0.6,"potassium":415,"sodium":13,"vitaminD":0,"cholesterol":0,"transFat":0,"saturatedFat":0.203,"totalSugars":1.7},
    portions: [{"description":"slice","gramWeight":11,"amount":5},{"description":"cup","gramWeight":24,"amount":0.25},{"description":"tsp","gramWeight":2,"amount":1}]
  },
  'fresh rosemary': {
    fdcId: 173473,
    description: "Rosemary, fresh",
    nutrients: {"protein":3.31,"totalFat":5.86,"totalCarbs":20.7,"calories":131,"dietaryFiber":14.1,"calcium":317,"iron":6.65,"potassium":668,"sodium":26,"vitaminD":0,"cholesterol":0,"transFat":0,"saturatedFat":2.838,"totalSugars":0},
    portions: [{"description":"tbsp","gramWeight":1.7,"amount":1},{"description":"tsp","gramWeight":0.7,"amount":1}]
  },
  'garlic': {
    fdcId: 169230,
    description: "Garlic, raw",
    nutrients: {"protein":6.36,"totalFat":0.5,"totalCarbs":33.06,"calories":149,"dietaryFiber":2.1,"calcium":181,"iron":1.7,"potassium":401,"sodium":17,"vitaminD":0,"cholesterol":0,"transFat":0,"saturatedFat":0.089,"totalSugars":1},
    portions: [{"description":"tsp","gramWeight":2.8,"amount":1},{"description":"clove","gramWeight":3,"amount":1},{"description":"cup","gramWeight":136,"amount":1}]
  },
  'garlic powder': {
    fdcId: 171325,
    description: "Spices, garlic powder",
    nutrients: {"protein":16.55,"totalFat":0.73,"totalCarbs":72.73,"calories":331,"dietaryFiber":9,"calcium":79,"iron":5.65,"potassium":1193,"sodium":60,"vitaminD":0,"cholesterol":0,"transFat":0,"saturatedFat":0.249,"totalSugars":2.43},
    portions: [{"description":"tbsp","gramWeight":9.7,"amount":1},{"description":"tsp","gramWeight":3.1,"amount":1}]
  },
  'green beans': {
    fdcId: 169961,
    description: "Beans, snap, green, raw",
    nutrients: {"protein":1.83,"totalFat":0.22,"totalCarbs":6.97,"calories":31,"dietaryFiber":2.7,"calcium":37,"iron":1.03,"potassium":211,"sodium":6,"vitaminD":0,"cholesterol":0,"transFat":0,"saturatedFat":0.05,"totalSugars":3.26},
    portions: [{"description":"beans (4\" long)","gramWeight":55,"amount":10},{"description":"cup","gramWeight":100,"amount":1}]
  },
  'ground beef': {
    fdcId: 168608,
    description: "Beef, grass-fed, ground, raw",
    nutrients: {"protein":19.42,"totalFat":12.73,"totalCarbs":0,"calories":198,"dietaryFiber":0,"calcium":12,"iron":1.99,"potassium":289,"sodium":68,"vitaminD":0,"cholesterol":62,"transFat":0.751,"saturatedFat":5.335,"totalSugars":0},
    portions: [{"description":"serving","gramWeight":85,"amount":1},{"description":"oz","gramWeight":113,"amount":4}]
  },
  'ground flaxseed': {
    fdcId: 169414,
    description: "Seeds, flaxseed",
    nutrients: {"protein":18.29,"totalFat":42.16,"totalCarbs":28.88,"calories":534,"dietaryFiber":27.3,"calcium":255,"iron":5.73,"potassium":813,"sodium":30,"vitaminD":0,"cholesterol":0,"transFat":0,"saturatedFat":3.663,"totalSugars":1.55},
    portions: [{"description":"tsp","gramWeight":2.5,"amount":1},{"description":"tbsp","gramWeight":7,"amount":1},{"description":"cup","gramWeight":168,"amount":1}]
  },
  'ground turkey': {
    fdcId: 172850,
    description: "Turkey, ground, 93% lean, 7% fat, raw",
    nutrients: {"protein":18.73,"totalFat":8.34,"totalCarbs":0,"calories":150,"dietaryFiber":0,"calcium":21,"iron":1.17,"potassium":213,"sodium":69,"vitaminD":0.4,"cholesterol":74,"transFat":0.112,"saturatedFat":2.17,"totalSugars":0},
    portions: [{"description":"oz","gramWeight":85,"amount":1},{"description":"lb","gramWeight":453,"amount":1}]
  },
  'honey': {
    fdcId: 169640,
    description: "Honey",
    nutrients: {"protein":0.3,"totalFat":0,"totalCarbs":82.4,"calories":304,"dietaryFiber":0.2,"calcium":6,"iron":0.42,"potassium":52,"sodium":4,"vitaminD":0,"cholesterol":0,"transFat":0,"saturatedFat":0,"totalSugars":82.12},
    portions: [{"description":"cup","gramWeight":339,"amount":1},{"description":"tbsp","gramWeight":21,"amount":1},{"description":"oz","gramWeight":14,"amount":1}]
  },
  'kimchi': {
    fdcId: 170392,
    description: "Cabbage, kimchi",
    nutrients: {"protein":1.1,"totalFat":0.5,"totalCarbs":2.4,"calories":15,"dietaryFiber":1.6,"calcium":33,"iron":2.5,"potassium":151,"sodium":498,"vitaminD":0,"cholesterol":0,"transFat":0,"saturatedFat":0.067,"totalSugars":1.06},
    portions: [{"description":"cup","gramWeight":150,"amount":1}]
  },
  'lean ground beef': {
    fdcId: 173110,
    description: "Beef, ground, 93% lean meat / 7% fat, raw",
    nutrients: {"protein":20.85,"totalFat":7,"totalCarbs":0,"calories":152,"dietaryFiber":0,"calcium":10,"iron":2.33,"potassium":336,"sodium":66,"vitaminD":0.1,"cholesterol":63,"transFat":0.348,"saturatedFat":2.878,"totalSugars":0},
    portions: [{"description":"oz","gramWeight":113,"amount":4}]
  },
  'lemon juice': {
    fdcId: 167747,
    description: "Lemon juice, raw",
    nutrients: {"protein":0.35,"totalFat":0.24,"totalCarbs":6.9,"calories":22,"dietaryFiber":0.3,"calcium":6,"iron":0.08,"potassium":103,"sodium":1,"vitaminD":0,"cholesterol":0,"transFat":0,"saturatedFat":0.04,"totalSugars":2.52},
    portions: [{"description":"wedge yields","gramWeight":5.9,"amount":1},{"description":"lemon yields","gramWeight":48,"amount":1},{"description":"cup","gramWeight":244,"amount":1},{"description":"oz","gramWeight":30.5,"amount":1}]
  },
  'low-fat milk': {
    fdcId: 170872,
    description: "Milk, lowfat, fluid, 1% milkfat, with added vitamin A and vitamin D",
    nutrients: {"protein":3.37,"totalFat":0.97,"totalCarbs":4.99,"calories":42,"dietaryFiber":0,"calcium":125,"iron":0.03,"potassium":150,"sodium":44,"vitaminD":1.2,"cholesterol":5,"transFat":0,"saturatedFat":0.633,"totalSugars":5.2},
    portions: [{"description":"oz","gramWeight":30.5,"amount":1},{"description":"quart","gramWeight":976,"amount":1},{"description":"cup","gramWeight":244,"amount":1}]
  },
  'mixed berries': {
    fdcId: 171711,
    description: "Blueberries, raw",
    nutrients: {"protein":0.74,"totalFat":0.33,"totalCarbs":14.49,"calories":57,"dietaryFiber":2.4,"calcium":6,"iron":0.28,"potassium":77,"sodium":1,"vitaminD":0,"cholesterol":0,"transFat":0,"saturatedFat":0.028,"totalSugars":9.96},
    portions: [{"description":"cup","gramWeight":148,"amount":1},{"description":"berries","gramWeight":68,"amount":50}]
  },
  'mixed greens': {
    fdcId: 169249,
    description: "Lettuce, green leaf, raw",
    nutrients: {"protein":1.36,"totalFat":0.15,"totalCarbs":2.87,"calories":15,"dietaryFiber":1.3,"calcium":36,"iron":0.86,"potassium":194,"sodium":28,"vitaminD":0,"cholesterol":0,"transFat":0,"saturatedFat":0.02,"totalSugars":0.78},
    portions: [{"description":"head","gramWeight":360,"amount":1},{"description":"leaf inner","gramWeight":4.8,"amount":1},{"description":"leaf outer","gramWeight":24,"amount":1},{"description":"cup","gramWeight":36,"amount":1}]
  },
  'ny strip steak': {
    fdcId: 168721,
    description: "Beef, short loin, top loin, steak, separable lean and fat, trimmed to 1/8\" fat, prime, raw",
    nutrients: {"protein":19,"totalFat":22.17,"totalCarbs":0,"calories":281,"dietaryFiber":0,"calcium":6,"iron":1.58,"potassium":295,"sodium":53,"vitaminD":0,"cholesterol":67,"transFat":0,"saturatedFat":9.08,"totalSugars":0},
    portions: [{"description":"oz","gramWeight":113,"amount":4},{"description":"steak, excluding refuse (yield from 1 raw steak, with refuse, weighing 242 g)","gramWeight":227,"amount":1}]
  },
  'olive oil': {
    fdcId: 171413,
    description: "Oil, olive, salad or cooking",
    nutrients: {"protein":0,"totalFat":100,"totalCarbs":0,"calories":884,"dietaryFiber":0,"calcium":1,"iron":0.56,"potassium":1,"sodium":2,"vitaminD":0,"cholesterol":0,"transFat":0,"saturatedFat":13.808,"totalSugars":0},
    portions: [{"description":"tbsp","gramWeight":13.5,"amount":1},{"description":"tsp","gramWeight":4.5,"amount":1},{"description":"cup","gramWeight":216,"amount":1}]
  },
  'parmesan cheese': {
    fdcId: 171247,
    description: "Cheese, parmesan, grated",
    nutrients: {"protein":28.42,"totalFat":27.84,"totalCarbs":13.91,"calories":420,"dietaryFiber":0,"calcium":853,"iron":0.49,"potassium":180,"sodium":1804,"vitaminD":0.5,"cholesterol":86,"transFat":0.876,"saturatedFat":15.371,"totalSugars":0.07},
    portions: [{"description":"oz","gramWeight":28.35,"amount":1},{"description":"cup","gramWeight":100,"amount":1},{"description":"tbsp","gramWeight":5,"amount":1}]
  },
  'pear': {
    fdcId: 169118,
    description: "Pears, raw",
    nutrients: {"protein":0.36,"totalFat":0.14,"totalCarbs":15.23,"calories":57,"dietaryFiber":3.1,"calcium":9,"iron":0.18,"potassium":116,"sodium":1,"vitaminD":0,"cholesterol":0,"transFat":0,"saturatedFat":0.022,"totalSugars":9.75},
    portions: [{"description":"medium","gramWeight":178,"amount":1},{"description":"large","gramWeight":230,"amount":1},{"description":"nlea serving","gramWeight":166,"amount":1},{"description":"cup","gramWeight":161,"amount":1}]
  },
  'pinto beans': {
    fdcId: 174286,
    description: "Beans, pinto, canned, drained solids",
    nutrients: {"protein":6.99,"totalFat":0.9,"totalCarbs":20.22,"calories":114,"dietaryFiber":5.5,"calcium":63,"iron":1.33,"potassium":274,"sodium":239,"vitaminD":0,"cholesterol":0,"transFat":0,"saturatedFat":0.158,"totalSugars":0.54},
    portions: [{"description":"can drained solids","gramWeight":277,"amount":1}]
  },
  'plain greek yogurt': {
    fdcId: 171304,
    description: "Yogurt, Greek, plain, whole milk",
    nutrients: {"protein":9,"totalFat":5,"totalCarbs":3.98,"calories":97,"dietaryFiber":0,"calcium":100,"iron":0,"potassium":141,"sodium":35,"vitaminD":0,"cholesterol":13,"transFat":0,"saturatedFat":2.395,"totalSugars":4},
    portions: []
  },
  'raspberries': {
    fdcId: 167755,
    description: "Raspberries, raw",
    nutrients: {"protein":1.2,"totalFat":0.65,"totalCarbs":11.94,"calories":52,"dietaryFiber":6.5,"calcium":25,"iron":0.69,"potassium":151,"sodium":1,"vitaminD":0,"cholesterol":0,"transFat":0,"saturatedFat":0.019,"totalSugars":4.42},
    portions: [{"description":"pint as purchased, yields","gramWeight":312,"amount":1},{"description":"raspberries","gramWeight":19,"amount":10},{"description":"cup","gramWeight":123,"amount":1}]
  },
  'red lentils': {
    fdcId: 172420,
    description: "Lentils, raw",
    nutrients: {"protein":24.63,"totalFat":1.06,"totalCarbs":63.35,"calories":352,"dietaryFiber":10.7,"calcium":35,"iron":6.51,"potassium":677,"sodium":6,"vitaminD":0,"cholesterol":0,"transFat":0,"saturatedFat":0.154,"totalSugars":2.03},
    portions: [{"description":"tbsp","gramWeight":12,"amount":1},{"description":"cup","gramWeight":192,"amount":1}]
  },
  'rolled oats': {
    fdcId: 173904,
    description: "Cereals, oats, regular and quick, not fortified, dry",
    nutrients: {"protein":13.15,"totalFat":6.52,"totalCarbs":67.7,"calories":379,"dietaryFiber":10.1,"calcium":52,"iron":4.25,"potassium":362,"sodium":6,"vitaminD":0,"cholesterol":0,"transFat":0,"saturatedFat":1.11,"totalSugars":0.99},
    portions: [{"description":"cup","gramWeight":81,"amount":1}]
  },
  'rotisserie chicken': {
    fdcId: 172395,
    description: "Chicken, roasting, meat only, cooked, roasted",
    nutrients: {"protein":25.01,"totalFat":6.63,"totalCarbs":0,"calories":167,"dietaryFiber":0,"calcium":12,"iron":1.21,"potassium":229,"sodium":75,"vitaminD":0,"cholesterol":75,"transFat":0,"saturatedFat":1.81,"totalSugars":0},
    portions: [{"description":"cup","gramWeight":140,"amount":1},{"description":"unit (yield from 1 lb ready-to-cook chicken)","gramWeight":171,"amount":1}]
  },
  'salmon fillet': {
    fdcId: 175167,
    description: "Fish, salmon, Atlantic, farmed, raw",
    nutrients: {"protein":20.42,"totalFat":13.42,"totalCarbs":0,"calories":208,"dietaryFiber":0,"calcium":9,"iron":0.34,"potassium":363,"sodium":59,"vitaminD":11,"cholesterol":55,"transFat":0,"saturatedFat":3.05,"totalSugars":0},
    portions: [{"description":"oz","gramWeight":85,"amount":3},{"description":"fillet","gramWeight":198,"amount":0.5}]
  },
  'salsa': {
    fdcId: 174524,
    description: "Sauce, salsa, ready-to-serve",
    nutrients: {"protein":1.52,"totalFat":0.17,"totalCarbs":6.64,"calories":29,"dietaryFiber":1.9,"calcium":30,"iron":0.42,"potassium":275,"sodium":711,"vitaminD":0,"cholesterol":0,"transFat":0,"saturatedFat":0.021,"totalSugars":4.01},
    portions: [{"description":"tbsp","gramWeight":36,"amount":2},{"description":"cup","gramWeight":259,"amount":1}]
  },
  'salt': {
    fdcId: 173468,
    description: "Salt, table",
    nutrients: {"protein":0,"totalFat":0,"totalCarbs":0,"calories":0,"dietaryFiber":0,"calcium":24,"iron":0.33,"potassium":8,"sodium":38758,"vitaminD":0,"cholesterol":0,"transFat":0,"saturatedFat":0,"totalSugars":0},
    portions: [{"description":"cup","gramWeight":292,"amount":1},{"description":"tsp","gramWeight":6,"amount":1},{"description":"tbsp","gramWeight":18,"amount":1},{"description":"dash","gramWeight":0.4,"amount":1}]
  },
  'sesame oil': {
    fdcId: 171016,
    description: "Oil, sesame, salad or cooking",
    nutrients: {"protein":0,"totalFat":100,"totalCarbs":0,"calories":884,"dietaryFiber":0,"calcium":0,"iron":0,"potassium":0,"sodium":0,"vitaminD":0,"cholesterol":0,"transFat":0,"saturatedFat":14.2,"totalSugars":0},
    portions: [{"description":"tbsp","gramWeight":13.6,"amount":1},{"description":"tsp","gramWeight":4.5,"amount":1},{"description":"cup","gramWeight":218,"amount":1}]
  },
  'sharp cheddar cheese': {
    fdcId: 170899,
    description: "Cheese, cheddar, sharp, sliced",
    nutrients: {"protein":24.25,"totalFat":33.82,"totalCarbs":2.13,"calories":410,"dietaryFiber":0,"calcium":711,"iron":0.16,"potassium":76,"sodium":644,"vitaminD":1,"cholesterol":99,"transFat":1.179,"saturatedFat":19.368,"totalSugars":0.27},
    portions: [{"description":"slice","gramWeight":28,"amount":1}]
  },
  'sirloin steak': {
    fdcId: 168728,
    description: "Beef, top sirloin, steak, separable lean and fat, trimmed to 1/8\" fat, choice, raw",
    nutrients: {"protein":19.92,"totalFat":14.28,"totalCarbs":0,"calories":214,"dietaryFiber":0,"calcium":25,"iron":1.46,"potassium":309,"sodium":51,"vitaminD":0,"cholesterol":78,"transFat":0,"saturatedFat":5.763,"totalSugars":0},
    portions: [{"description":"lb","gramWeight":453.6,"amount":1},{"description":"oz","gramWeight":113,"amount":4}]
  },
  'smoked paprika': {
    fdcId: 171329,
    description: "Spices, paprika",
    nutrients: {"protein":14.14,"totalFat":12.89,"totalCarbs":53.99,"calories":282,"dietaryFiber":34.9,"calcium":229,"iron":21.14,"potassium":2280,"sodium":68,"vitaminD":0,"cholesterol":0,"transFat":0,"saturatedFat":2.14,"totalSugars":10.34},
    portions: [{"description":"tbsp","gramWeight":6.8,"amount":1},{"description":"tsp","gramWeight":2.3,"amount":1}]
  },
  'sourdough bread': {
    fdcId: 172675,
    description: "Bread, french or vienna (includes sourdough)",
    nutrients: {"protein":10.75,"totalFat":2.42,"totalCarbs":51.88,"calories":272,"dietaryFiber":2.2,"calcium":52,"iron":3.91,"potassium":117,"sodium":602,"vitaminD":0,"cholesterol":0,"transFat":0.005,"saturatedFat":0.529,"totalSugars":4.62},
    portions: [{"description":"oz","gramWeight":28.35,"amount":1},{"description":"slice","gramWeight":139,"amount":1}]
  },
  'soy sauce': {
    fdcId: 174277,
    description: "Soy sauce made from soy and wheat (shoyu)",
    nutrients: {"protein":8.14,"totalFat":0.57,"totalCarbs":4.93,"calories":53,"dietaryFiber":0.8,"calcium":33,"iron":1.45,"potassium":435,"sodium":5493,"vitaminD":0,"cholesterol":0,"transFat":0,"saturatedFat":0.073,"totalSugars":0.4},
    portions: [{"description":"individual packet","gramWeight":8.9,"amount":1},{"description":"tbsp","gramWeight":16,"amount":1},{"description":"tsp","gramWeight":5.3,"amount":1},{"description":"cup","gramWeight":255,"amount":1}]
  },
  'strawberries': {
    fdcId: 167762,
    description: "Strawberries, raw",
    nutrients: {"protein":0.67,"totalFat":0.3,"totalCarbs":7.68,"calories":32,"dietaryFiber":2,"calcium":16,"iron":0.41,"potassium":153,"sodium":1,"vitaminD":0,"cholesterol":0,"transFat":0,"saturatedFat":0.015,"totalSugars":4.89},
    portions: [{"description":"cup","gramWeight":232,"amount":1},{"description":"large","gramWeight":18,"amount":1},{"description":"pint as purchased, yields","gramWeight":357,"amount":1},{"description":"medium","gramWeight":12,"amount":1}]
  },
  'sweet potatoes': {
    fdcId: 168482,
    description: "Sweet potato, raw, unprepared (Includes foods for USDA's Food Distribution Program)",
    nutrients: {"protein":1.57,"totalFat":0.05,"totalCarbs":20.12,"calories":86,"dietaryFiber":3,"calcium":30,"iron":0.61,"potassium":337,"sodium":55,"vitaminD":0,"cholesterol":0,"transFat":0,"saturatedFat":0.018,"totalSugars":4.18},
    portions: [{"description":"cup","gramWeight":133,"amount":1},{"description":"sweetpotato, 5\" long","gramWeight":130,"amount":1}]
  },
  'turmeric': {
    fdcId: 172231,
    description: "Spices, turmeric, ground",
    nutrients: {"protein":9.68,"totalFat":3.25,"totalCarbs":67.14,"calories":312,"dietaryFiber":22.7,"calcium":168,"iron":55,"potassium":2080,"sodium":27,"vitaminD":0,"cholesterol":0,"transFat":0.056,"saturatedFat":1.838,"totalSugars":3.21},
    portions: [{"description":"tsp","gramWeight":3,"amount":1},{"description":"tbsp","gramWeight":9.4,"amount":1}]
  },
  'vanilla extract': {
    fdcId: 173471,
    description: "Vanilla extract",
    nutrients: {"protein":0.06,"totalFat":0.06,"totalCarbs":12.65,"calories":288,"dietaryFiber":0,"calcium":11,"iron":0.12,"potassium":148,"sodium":9,"vitaminD":0,"cholesterol":0,"transFat":0,"saturatedFat":0.01,"totalSugars":12.65},
    portions: [{"description":"tsp","gramWeight":4.2,"amount":1},{"description":"cup","gramWeight":208,"amount":1},{"description":"tbsp","gramWeight":13,"amount":1}]
  },
  'white pepper': {
    fdcId: 170933,
    description: "Spices, pepper, white",
    nutrients: {"protein":10.4,"totalFat":2.12,"totalCarbs":68.61,"calories":296,"dietaryFiber":26.2,"calcium":265,"iron":14.31,"potassium":73,"sodium":5,"vitaminD":0,"cholesterol":0,"transFat":0,"saturatedFat":0.626,"totalSugars":0},
    portions: [{"description":"tbsp","gramWeight":7.1,"amount":1},{"description":"tsp","gramWeight":2.4,"amount":1}]
  },
  'whole grain bread': {
    fdcId: 172688,
    description: "Bread, whole-wheat, commercially prepared",
    nutrients: {"protein":12.45,"totalFat":3.5,"totalCarbs":42.71,"calories":252,"dietaryFiber":6,"calcium":161,"iron":2.47,"potassium":254,"sodium":455,"vitaminD":0,"cholesterol":0,"transFat":0.02,"saturatedFat":0.722,"totalSugars":4.34},
    portions: [{"description":"oz","gramWeight":28.35,"amount":1},{"description":"slice","gramWeight":32,"amount":1}]
  }
};

// ─── PORTION PARSING ───

function parseFraction(str) {
  const unicodeFractions = { '¼': 0.25, '½': 0.5, '¾': 0.75, '⅓': 0.333, '⅔': 0.667, '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875 };
  for (const [ch, val] of Object.entries(unicodeFractions)) {
    if (str.includes(ch)) {
      const rest = str.replace(ch, '').trim();
      return (rest ? parseFloat(rest) : 0) + val;
    }
  }
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
  const match = str.match(/^([\d\s\/¼½¾⅓⅔⅛⅜⅝⅞.]+)\s*(.*)$/);
  if (!match) return { quantity: 1, unit: str };
  const quantityStr = match[1].trim();
  let unit = match[2].trim();
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

  // Try matching portions first
  if (portions && portions.length > 0) {
    for (const p of portions) {
      if (p.description && unit && (p.description.includes(unit) || unit.includes(p.description))) {
        return { grams: quantity * (p.gramWeight / p.amount) };
      }
    }
  }

  // Fallback to conversion table
  if (unit && UNIT_GRAMS[unit]) {
    return { grams: quantity * UNIT_GRAMS[unit] };
  }

  // Last resort: assume 100g per unit
  return { grams: quantity * 100 };
}

// ─── INGREDIENT NUTRITION HELPERS ───

function hasNutritionData(ingredientName) {
  return !!STATIC_NUTRITION[ingredientName.toLowerCase()];
}

function computeIngredientNutrition(ing) {
  const key = ing.name.toLowerCase();
  const staticEntry = STATIC_NUTRITION[key];
  if (!staticEntry) return null;
  const parsed = parseAmount(ing.amount);
  const { grams } = convertToGrams(parsed, staticEntry.portions);
  const scale = grams / 100;
  return {
    calories: Math.round(staticEntry.nutrients.calories * scale),
    protein: Math.round(staticEntry.nutrients.protein * scale),
    fat: Math.round(staticEntry.nutrients.totalFat * scale),
    carbs: Math.round(staticEntry.nutrients.totalCarbs * scale)
  };
}

// ─── MEAL NUTRITION COMPUTATION ───

function computeMealNutrition(meal) {
  const totals = {};
  NUTRITION_FIELDS.forEach(f => { totals[f] = 0; });
  let totalGrams = 0;
  let hasAnyNutritionData = false;

  for (const ing of (meal.ingredients || [])) {
    const key = ing.name.toLowerCase();
    const staticEntry = STATIC_NUTRITION[key];
    if (!staticEntry) continue;

    hasAnyNutritionData = true;
    const parsed = parseAmount(ing.amount);
    const { grams } = convertToGrams(parsed, staticEntry.portions);
    const scale = grams / 100; // static data is per 100g
    totalGrams += grams;

    for (const field of NUTRITION_FIELDS) {
      if (staticEntry.nutrients[field] !== null && staticEntry.nutrients[field] !== undefined) {
        totals[field] += staticEntry.nutrients[field] * scale;
      }
    }
  }

  // Round values
  for (const field of NUTRITION_FIELDS) {
    totals[field] = Math.round(totals[field] * 10) / 10;
  }

  return { totals, servingSizeGrams: Math.round(totalGrams), hasAnyNutritionData };
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

function buildLabelHTML(totals, servingSizeGrams, servingLine, sourceInfo) {
  function row(label, field, indent, bold) {
    const val = totals[field];
    const display = formatNutrientValue(field, val);
    const dv = calcDV(field, val);
    const dvStr = dv !== null ? `<span class="nf-dv">${dv}%</span>` : '';
    const cls = [indent ? 'nf-indent' : '', bold ? 'nf-bold' : ''].filter(Boolean).join(' ');
    return `<div class="nf-row ${cls}"><span>${label} ${display}</span>${dvStr}</div>`;
  }

  return `
    <div class="nutrition-label">
      <div class="nf-title">Nutrition Facts</div>
      <div class="nf-thick-bar"></div>
      <div class="nf-serving">
        <div class="nf-serving-size">${servingLine}</div>
      </div>
      <div class="nf-thick-bar"></div>
      <div class="nf-calories-row">
        <div class="nf-calories-label">Calories</div>
        <div class="nf-calories-value">${totals.calories !== null ? Math.round(totals.calories) : '---'}</div>
      </div>
      <div class="nf-medium-bar"></div>
      <div class="nf-dv-header"><span class="nf-dv">% Daily Value*</span></div>
      <div class="nf-thin-line"></div>
      ${row('Total Fat', 'totalFat', false, true)}
      <div class="nf-thin-line"></div>
      ${row('Saturated Fat', 'saturatedFat', true, false)}
      <div class="nf-thin-line"></div>
      ${row('Trans Fat', 'transFat', true, false)}
      <div class="nf-thin-line"></div>
      ${row('Cholesterol', 'cholesterol', false, true)}
      <div class="nf-thin-line"></div>
      ${row('Sodium', 'sodium', false, true)}
      <div class="nf-thin-line"></div>
      ${row('Total Carbohydrate', 'totalCarbs', false, true)}
      <div class="nf-thin-line"></div>
      ${row('Dietary Fiber', 'dietaryFiber', true, false)}
      <div class="nf-thin-line"></div>
      ${row('Total Sugars', 'totalSugars', true, false)}
      <div class="nf-thin-line"></div>
      ${row('Incl. Added Sugars', 'addedSugars', true, false)}
      <div class="nf-thin-line"></div>
      ${row('Protein', 'protein', false, true)}
      <div class="nf-thick-bar"></div>
      ${row('Vitamin D', 'vitaminD', false, false)}
      <div class="nf-thin-line"></div>
      ${row('Calcium', 'calcium', false, false)}
      <div class="nf-thin-line"></div>
      ${row('Iron', 'iron', false, false)}
      <div class="nf-thin-line"></div>
      ${row('Potassium', 'potassium', false, false)}
      <div class="nf-medium-bar"></div>
      <div class="nf-footnote">* The % Daily Value (DV) tells you how much a nutrient in a serving of food contributes to a daily diet. 2,000 calories a day is used for general nutrition advice.</div>
      ${sourceInfo && sourceInfo.fdcId
        ? `<div class="nf-source">Source: <a href="https://fdc.nal.usda.gov/food-details/${sourceInfo.fdcId}/nutrients" target="_blank" rel="noopener">USDA FoodData Central</a> &mdash; ${sourceInfo.description || ''}</div>`
        : `<div class="nf-source">Source: USDA FoodData Central (SR Legacy)</div>`}
    </div>
  `;
}

function renderNutritionLabel(meal) {
  const { totals, servingSizeGrams, hasAnyNutritionData } = computeMealNutrition(meal);
  if (!hasAnyNutritionData) {
    return `<div class="nf-no-data"><div class="nf-no-data-title">No Nutrition Data Available</div><div class="nf-no-data-text">Nutrition data is not available for this meal's ingredients.</div></div>`;
  }
  const servingLine = `<span class="nf-bold">Serving size</span> 1 meal${servingSizeGrams ? ' (' + servingSizeGrams + 'g)' : ''}`;
  return buildLabelHTML(totals, servingSizeGrams, servingLine);
}

function computeDayNutrition(meals) {
  const dayTotals = {};
  NUTRITION_FIELDS.forEach(f => { dayTotals[f] = 0; });
  let totalGrams = 0;
  let hasAny = false;

  for (const meal of meals) {
    const { totals, servingSizeGrams, hasAnyNutritionData } = computeMealNutrition(meal);
    if (hasAnyNutritionData) hasAny = true;
    totalGrams += servingSizeGrams;
    for (const f of NUTRITION_FIELDS) dayTotals[f] += totals[f];
  }

  for (const f of NUTRITION_FIELDS) dayTotals[f] = Math.round(dayTotals[f] * 10) / 10;
  return { totals: dayTotals, servingSizeGrams: Math.round(totalGrams), hasAnyNutritionData: hasAny };
}

function renderDayNutritionLabel(meals, dayLabel) {
  const { totals, servingSizeGrams, hasAnyNutritionData } = computeDayNutrition(meals);
  if (!hasAnyNutritionData) {
    return `<div class="nf-no-data"><div class="nf-no-data-title">No Nutrition Data Available</div><div class="nf-no-data-text">No meals assigned for this day.</div></div>`;
  }
  const servingLine = `<span class="nf-bold">Daily total</span> ${meals.length} meal${meals.length !== 1 ? 's' : ''}${servingSizeGrams ? ' (' + servingSizeGrams + 'g)' : ''}`;
  return buildLabelHTML(totals, servingSizeGrams, servingLine);
}

function openNutritionModal(meal) {
  const container = document.getElementById('nutrition-label-container');
  document.getElementById('nutrition-modal-meal-name').textContent = meal.name;
  document.getElementById('nutrition-overlay').classList.add('open');
  container.innerHTML = renderNutritionLabel(meal);
}

function openDayNutritionModal(meals, dayLabel) {
  const container = document.getElementById('nutrition-label-container');
  document.getElementById('nutrition-modal-meal-name').textContent = dayLabel;
  document.getElementById('nutrition-overlay').classList.add('open');
  container.innerHTML = renderDayNutritionLabel(meals, dayLabel);
}

function renderIngredientNutritionLabel(ing) {
  const key = ing.name.toLowerCase();
  const staticEntry = STATIC_NUTRITION[key];
  if (!staticEntry) {
    return `<div class="nf-no-data"><div class="nf-no-data-title">No Nutrition Data Available</div><div class="nf-no-data-text">Nutrition data is not available for this ingredient.</div></div>`;
  }
  const parsed = parseAmount(ing.amount);
  const { grams } = convertToGrams(parsed, staticEntry.portions);
  const scale = grams / 100;
  const totals = {};
  for (const field of NUTRITION_FIELDS) {
    const v = staticEntry.nutrients[field];
    totals[field] = (v !== null && v !== undefined) ? Math.round(v * scale * 10) / 10 : 0;
  }
  const servingLine = `<span class="nf-bold">Serving size</span> ${ing.amount}${grams ? ' (' + Math.round(grams) + 'g)' : ''}`;
  return buildLabelHTML(totals, Math.round(grams), servingLine, { fdcId: staticEntry.fdcId, description: staticEntry.description });
}

function openIngredientNutritionModal(ing) {
  const container = document.getElementById('nutrition-label-container');
  document.getElementById('nutrition-modal-meal-name').textContent = ing.name;
  document.getElementById('nutrition-overlay').classList.add('open');
  container.innerHTML = renderIngredientNutritionLabel(ing);
}

function closeNutritionModal() {
  document.getElementById('nutrition-overlay').classList.remove('open');
}


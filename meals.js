/**
 * Meal Data File
 * ==============
 * Edit this file to add, remove, or modify meals.
 * Do NOT touch app.js — all meal content lives here.
 *
 * Each meal object has the following structure:
 * {
 *   id: "unique-string-id",
 *   name: "Meal Name",
 *   description: "Short description of the meal.",
 *   category: "Breakfast" | "Lunch" | "Snack" | "Dinner" | "Dessert",
 *   macros: {
 *     fats: 0,       // grams
 *     carbs: 0,      // grams
 *     fiber: 0,      // grams
 *     protein: 0     // grams
 *   },
 *   ingredients: [
 *     { name: "Ingredient Name", amount: "1 cup", section: "Produce" }
 *   ]
 * }
 *
 * Valid sections for ingredients:
 *   "Produce", "Dairy", "Meat and Seafood", "Pantry and Grains",
 *   "Canned and Jarred", "Refrigerated", "Frozen"
 *
 * To add a new meal: copy an existing entry below, give it a unique id,
 * fill in all fields, and add it to the MEALS array.
 */

const MEALS = [
  // ─── BREAKFAST ───
  {
    id: "banana-greek-yogurt-bowl",
    name: "Banana Greek Yogurt Bowl",
    description: "Creamy Greek yogurt topped with fresh banana slices and a drizzle of honey.",
    category: "Breakfast",
    macros: { fats: 5, carbs: 75, fiber: 6, protein: 22 },
    ingredients: [
      { name: "Plain Greek yogurt", amount: "1 cup", section: "Dairy", detail: "Non-fat vanilla Greek yogurt (e.g. Fage 0%, Chobani)" },
      { name: "Banana", amount: "2 medium", section: "Produce", detail: "Ripe yellow bananas with a few brown spots for sweetness" },
      { name: "Honey", amount: "1 tbsp", section: "Pantry and Grains", detail: "Raw wildflower honey or any pure honey" }
    ]
  },
  {
    id: "overnight-oats-blueberries",
    name: "Overnight Oats with Blueberries",
    description: "Hearty rolled oats soaked overnight in milk and topped with fresh blueberries.",
    category: "Breakfast",
    macros: { fats: 10, carbs: 105, fiber: 14, protein: 25 },
    ingredients: [
      { name: "Rolled oats", amount: "1.5 cups", section: "Pantry and Grains", detail: "Old-fashioned rolled oats (not instant or steel-cut)" },
      { name: "Low-fat milk", amount: "1.5 cups", section: "Dairy", detail: "1% low-fat milk or unsweetened oat milk" },
      { name: "Blueberries", amount: "1 cup", section: "Produce", detail: "Fresh or frozen wild blueberries" }
    ]
  },
  {
    id: "oat-apple-porridge-flaxseed",
    name: "Oat and Apple Porridge with Flaxseed",
    description: "Warm oat porridge with diced apple and ground flaxseed for extra fiber and omega-3s.",
    category: "Breakfast",
    macros: { fats: 12, carbs: 100, fiber: 16, protein: 26 },
    ingredients: [
      { name: "Rolled oats", amount: "1.5 cups", section: "Pantry and Grains", detail: "Old-fashioned rolled oats (not instant or steel-cut)" },
      { name: "Low-fat milk", amount: "1.5 cups", section: "Dairy", detail: "1% low-fat milk or unsweetened oat milk" },
      { name: "Apple", amount: "1 medium", section: "Produce", detail: "Honeycrisp or Fuji apple, diced with skin on" },
      { name: "Ground flaxseed", amount: "1.5 tbsp", section: "Pantry and Grains", detail: "Pre-ground golden or brown flaxseed meal (e.g. Bob's Red Mill)" }
    ]
  },
  {
    id: "mixed-berry-chia-pudding",
    name: "Mixed Berry Chia Pudding",
    description: "Chia seeds soaked in milk topped with a mix of strawberries, raspberries, and blueberries.",
    category: "Breakfast",
    macros: { fats: 12, carbs: 42, fiber: 18, protein: 12 },
    ingredients: [
      { name: "Chia seeds", amount: "3 tbsp", section: "Pantry and Grains", detail: "Black or white chia seeds — both work equally" },
      { name: "Low-fat milk", amount: "1 cup", section: "Dairy", detail: "1% low-fat milk or unsweetened oat milk" },
      { name: "Strawberries", amount: "0.5 cup", section: "Produce", detail: "Fresh strawberries, hulled and sliced" },
      { name: "Raspberries", amount: "0.5 cup", section: "Produce", detail: "Fresh red raspberries" },
      { name: "Blueberries", amount: "0.5 cup", section: "Produce", detail: "Fresh or frozen wild blueberries" }
    ]
  },
  {
    id: "greek-yogurt-berries-flaxseed",
    name: "Greek Yogurt with Mixed Berries and Flaxseed",
    description: "Thick Greek yogurt layered with mixed berries and a sprinkle of ground flaxseed.",
    category: "Breakfast",
    macros: { fats: 11, carbs: 35, fiber: 8, protein: 33 },
    ingredients: [
      { name: "Plain Greek yogurt", amount: "1.5 cups", section: "Dairy", detail: "Non-fat vanilla Greek yogurt (e.g. Fage 0%, Chobani)" },
      { name: "Mixed berries", amount: "1 cup", section: "Produce", detail: "Fresh or frozen blend of strawberries, blueberries, and raspberries" },
      { name: "Ground flaxseed", amount: "1.5 tbsp", section: "Pantry and Grains", detail: "Pre-ground golden or brown flaxseed meal (e.g. Bob's Red Mill)" }
    ]
  },
  {
    id: "scrambled-eggs-spinach-cheddar",
    name: "Scrambled Eggs with Spinach and Cheddar",
    description: "Fluffy scrambled eggs with wilted baby spinach and melted cheddar cheese.",
    category: "Breakfast",
    macros: { fats: 22, carbs: 4, fiber: 2, protein: 28 },
    ingredients: [
      { name: "Eggs", amount: "3 large", section: "Dairy", detail: "Large pasture-raised eggs" },
      { name: "Baby spinach", amount: "2 cups", section: "Produce", detail: "Pre-washed baby spinach leaves" },
      { name: "Cheddar cheese", amount: "1 oz", section: "Dairy", detail: "Sharp cheddar, shredded (e.g. Tillamook)" }
    ]
  },

  // ─── LUNCH ───
  {
    id: "egg-drop-soup-ground-beef",
    name: "Egg Drop Soup with Ground Beef",
    description: "Rich bone broth soup with whisked eggs, seasoned ground beef, and wilted spinach.",
    category: "Lunch",
    macros: { fats: 18, carbs: 4, fiber: 2, protein: 45 },
    ingredients: [
      { name: "Bone broth", amount: "4 cups", section: "Canned and Jarred", detail: "Chicken bone broth (e.g. Kettle & Fire, Pacific Foods)" },
      { name: "Eggs", amount: "3 large", section: "Dairy", detail: "Large pasture-raised eggs" },
      { name: "Lean ground beef", amount: "5 oz", section: "Meat and Seafood", detail: "93/7 lean ground beef" },
      { name: "Baby spinach", amount: "2 cups", section: "Produce", detail: "Pre-washed baby spinach leaves" }
    ]
  },
  {
    id: "turkey-kimchi-rice-bowl",
    name: "Ground Turkey and Kimchi Rice Bowl",
    description: "Seasoned ground turkey over brown rice with tangy kimchi and garlic.",
    category: "Lunch",
    macros: { fats: 14, carbs: 58, fiber: 4, protein: 42 },
    ingredients: [
      { name: "Ground turkey", amount: "6 oz", section: "Meat and Seafood", detail: "93/7 lean ground turkey" },
      { name: "Brown rice", amount: "1.5 cups cooked", section: "Pantry and Grains", detail: "Medium-grain brown rice, cooked and cooled slightly" },
      { name: "Kimchi", amount: "0.5 cup", section: "Refrigerated", detail: "Traditional napa cabbage kimchi (e.g. Mother In Law's)" },
      { name: "Garlic", amount: "2 cloves", section: "Produce", detail: "Fresh garlic cloves, minced" }
    ]
  },
  {
    id: "black-bean-beef-taco-bowl",
    name: "Black Bean and Beef Taco Bowl",
    description: "Taco-seasoned ground beef with black beans, greens, salsa, and melted cheddar.",
    category: "Lunch",
    macros: { fats: 22, carbs: 38, fiber: 12, protein: 44 },
    ingredients: [
      { name: "Ground beef", amount: "6 oz", section: "Meat and Seafood", detail: "90/10 ground beef" },
      { name: "Mixed greens", amount: "2 cups", section: "Produce", detail: "Spring mix or mesclun blend" },
      { name: "Black beans", amount: "0.75 cup", section: "Canned and Jarred", detail: "Canned black beans, drained and rinsed (e.g. Goya, Bush's)" },
      { name: "Salsa", amount: "0.5 cup", section: "Canned and Jarred", detail: "Medium chunky salsa (e.g. Pace, Frontera)" },
      { name: "Cheddar cheese", amount: "1 oz", section: "Dairy", detail: "Sharp cheddar, shredded (e.g. Tillamook)" }
    ]
  },
  {
    id: "beef-roasted-carrot-feta-bowl",
    name: "Ground Beef and Roasted Carrot Bowl with Feta",
    description: "Savory ground beef and roasted carrots over arugula with crumbled feta and olive oil.",
    category: "Lunch",
    macros: { fats: 30, carbs: 22, fiber: 6, protein: 40 },
    ingredients: [
      { name: "Ground beef", amount: "6 oz", section: "Meat and Seafood", detail: "90/10 ground beef" },
      { name: "Carrots", amount: "2 large", section: "Produce", detail: "Large whole carrots, peeled and cut into 1-inch pieces" },
      { name: "Arugula", amount: "2 cups", section: "Produce", detail: "Baby arugula, peppery and fresh" },
      { name: "Feta cheese", amount: "1.5 oz", section: "Dairy", detail: "Crumbled traditional feta (sheep's milk preferred)" },
      { name: "Olive oil", amount: "1 tbsp", section: "Pantry and Grains", detail: "Extra virgin olive oil" }
    ]
  },
  {
    id: "chicken-red-lentil-soup-sourdough",
    name: "Chicken and Red Lentil Soup with Sourdough",
    description: "Hearty soup with shredded rotisserie chicken, red lentils, and garlic served with sourdough.",
    category: "Lunch",
    macros: { fats: 10, carbs: 72, fiber: 14, protein: 55 },
    ingredients: [
      { name: "Rotisserie chicken", amount: "2 cups shredded", section: "Meat and Seafood", detail: "Store-bought rotisserie chicken, skin removed, meat shredded" },
      { name: "Bone broth", amount: "4 cups", section: "Canned and Jarred", detail: "Chicken bone broth (e.g. Kettle & Fire, Pacific Foods)" },
      { name: "Red lentils", amount: "0.75 cup dry", section: "Pantry and Grains", detail: "Split red lentils — cook in about 15 min, no soaking needed" },
      { name: "Garlic", amount: "3 cloves", section: "Produce", detail: "Fresh garlic cloves, minced" },
      { name: "Sourdough bread", amount: "2 slices", section: "Pantry and Grains", detail: "Thick-cut artisan sourdough bread" }
    ]
  },
  {
    id: "tuna-melt-bowl",
    name: "Tuna Melt Bowl",
    description: "Protein-packed tuna mixed with Greek yogurt and lemon over greens with melted cheddar and toast.",
    category: "Lunch",
    macros: { fats: 16, carbs: 30, fiber: 4, protein: 55 },
    ingredients: [
      { name: "Canned tuna", amount: "2 cans (5 oz each)", section: "Canned and Jarred", detail: "Chunk light tuna in water, drained (e.g. Wild Planet, Starkist)" },
      { name: "Plain Greek yogurt", amount: "3 tbsp", section: "Dairy", detail: "Non-fat vanilla Greek yogurt — used as a lighter mayo substitute" },
      { name: "Lemon juice", amount: "1 tbsp", section: "Produce", detail: "Fresh-squeezed lemon juice" },
      { name: "Mixed greens", amount: "2 cups", section: "Produce", detail: "Spring mix or mesclun blend" },
      { name: "Cheddar cheese", amount: "1 oz", section: "Dairy", detail: "Sharp cheddar, shredded (e.g. Tillamook)" },
      { name: "Whole grain bread", amount: "2 slices", section: "Pantry and Grains", detail: "100% whole wheat bread (e.g. Dave's Killer Bread)" }
    ]
  },

  // ─── SNACK ───
  {
    id: "cottage-cheese-sliced-apple",
    name: "Cottage Cheese with Sliced Apple",
    description: "Creamy cottage cheese paired with crisp apple slices.",
    category: "Snack",
    macros: { fats: 5, carbs: 30, fiber: 4, protein: 28 },
    ingredients: [
      { name: "Cottage cheese", amount: "1 cup", section: "Dairy", detail: "2% low-fat cottage cheese (e.g. Good Culture, Daisy)" },
      { name: "Apple", amount: "1 medium", section: "Produce", detail: "Honeycrisp or Fuji apple, sliced with skin on" }
    ]
  },
  {
    id: "cottage-cheese-flaxseed",
    name: "Cottage Cheese with Ground Flaxseed",
    description: "Cottage cheese topped with ground flaxseed for a fiber and omega-3 boost.",
    category: "Snack",
    macros: { fats: 10, carbs: 8, fiber: 5, protein: 30 },
    ingredients: [
      { name: "Cottage cheese", amount: "1 cup", section: "Dairy", detail: "2% low-fat cottage cheese (e.g. Good Culture, Daisy)" },
      { name: "Ground flaxseed", amount: "1.5 tbsp", section: "Pantry and Grains", detail: "Pre-ground golden or brown flaxseed meal (e.g. Bob's Red Mill)" }
    ]
  },
  {
    id: "chia-pudding-raspberries",
    name: "Chia Pudding with Raspberries",
    description: "Thick chia pudding made with milk and topped with fresh raspberries.",
    category: "Snack",
    macros: { fats: 12, carbs: 28, fiber: 18, protein: 10 },
    ingredients: [
      { name: "Chia seeds", amount: "3 tbsp", section: "Pantry and Grains", detail: "Black or white chia seeds — both work equally" },
      { name: "Low-fat milk", amount: "1 cup", section: "Dairy", detail: "1% low-fat milk or unsweetened oat milk" },
      { name: "Raspberries", amount: "1 cup", section: "Produce", detail: "Fresh red raspberries" }
    ]
  },
  {
    id: "cottage-cheese-flaxseed-pear",
    name: "Cottage Cheese with Flaxseed and Sliced Pear",
    description: "Cottage cheese with ground flaxseed and sweet pear slices.",
    category: "Snack",
    macros: { fats: 8, carbs: 32, fiber: 7, protein: 29 },
    ingredients: [
      { name: "Cottage cheese", amount: "1 cup", section: "Dairy", detail: "2% low-fat cottage cheese (e.g. Good Culture, Daisy)" },
      { name: "Ground flaxseed", amount: "1 tbsp", section: "Pantry and Grains", detail: "Pre-ground golden or brown flaxseed meal (e.g. Bob's Red Mill)" },
      { name: "Pear", amount: "1 medium", section: "Produce", detail: "Ripe Bartlett or Anjou pear, sliced with skin on" }
    ]
  },
  {
    id: "apple-sharp-cheddar",
    name: "Apple with Sharp Cheddar",
    description: "Classic pairing of crisp apple slices with sharp cheddar cheese.",
    category: "Snack",
    macros: { fats: 14, carbs: 25, fiber: 4, protein: 11 },
    ingredients: [
      { name: "Apple", amount: "1 medium", section: "Produce", detail: "Honeycrisp or Granny Smith apple, sliced" },
      { name: "Sharp cheddar cheese", amount: "1.5 oz", section: "Dairy", detail: "Extra sharp cheddar, sliced or cubed (e.g. Tillamook, Cabot)" }
    ]
  },
  {
    id: "banana-cottage-cheese",
    name: "Banana with Cottage Cheese",
    description: "Sliced banana served with a bowl of cottage cheese for a quick protein-rich snack.",
    category: "Snack",
    macros: { fats: 5, carbs: 35, fiber: 4, protein: 30 },
    ingredients: [
      { name: "Banana", amount: "1 large", section: "Produce", detail: "Ripe yellow banana with a few brown spots for sweetness" },
      { name: "Cottage cheese", amount: "1 cup", section: "Dairy", detail: "2% low-fat cottage cheese (e.g. Good Culture, Daisy)" }
    ]
  },

  // ─── DINNER ───
  {
    id: "loaded-sweet-potato-beef-cheddar",
    name: "Loaded Baked Sweet Potatoes with Ground Beef and Cheddar",
    description: "Baked sweet potatoes stuffed with cumin-seasoned ground beef and melted cheddar.",
    category: "Dinner",
    macros: { fats: 24, carbs: 58, fiber: 10, protein: 42 },
    ingredients: [
      { name: "Sweet potatoes", amount: "2 medium", section: "Produce", detail: "Orange-fleshed sweet potatoes (garnet or jewel variety)" },
      { name: "Ground beef", amount: "6 oz", section: "Meat and Seafood", detail: "90/10 ground beef" },
      { name: "Cheddar cheese", amount: "1.5 oz", section: "Dairy", detail: "Sharp cheddar, shredded (e.g. Tillamook)" },
      { name: "Garlic", amount: "2 cloves", section: "Produce", detail: "Fresh garlic cloves, minced" },
      { name: "Cumin", amount: "1 tsp", section: "Pantry and Grains", detail: "Ground cumin" }
    ]
  },
  {
    id: "crispy-chicken-thighs-broccoli-parmesan",
    name: "Crispy Chicken Thighs with Roasted Broccoli and Parmesan",
    description: "Crispy skin-on chicken thighs alongside roasted broccoli topped with shaved Parmesan.",
    category: "Dinner",
    macros: { fats: 36, carbs: 16, fiber: 8, protein: 52 },
    ingredients: [
      { name: "Bone-in chicken thighs", amount: "2 large", section: "Meat and Seafood", detail: "Bone-in, skin-on chicken thighs — pat dry for crispy skin" },
      { name: "Broccoli", amount: "1 large head", section: "Produce", detail: "Fresh broccoli crown, cut into bite-sized florets" },
      { name: "Parmesan cheese", amount: "1 oz", section: "Dairy", detail: "Parmigiano-Reggiano, shaved or finely grated" },
      { name: "Olive oil", amount: "2 tbsp", section: "Pantry and Grains", detail: "Extra virgin olive oil" }
    ]
  },
  {
    id: "garlic-salmon-broccoli-feta",
    name: "Garlic Salmon with Roasted Broccoli and Feta",
    description: "Garlic-rubbed salmon fillet with roasted broccoli and crumbled feta cheese.",
    category: "Dinner",
    macros: { fats: 34, carbs: 16, fiber: 8, protein: 50 },
    ingredients: [
      { name: "Salmon fillet", amount: "8 oz", section: "Meat and Seafood", detail: "Wild-caught Atlantic salmon fillet, skin-on" },
      { name: "Broccoli", amount: "1 large head", section: "Produce", detail: "Fresh broccoli crown, cut into bite-sized florets" },
      { name: "Feta cheese", amount: "1.5 oz", section: "Dairy", detail: "Crumbled traditional feta (sheep's milk preferred)" },
      { name: "Garlic", amount: "3 cloves", section: "Produce", detail: "Fresh garlic cloves, minced" },
      { name: "Olive oil", amount: "2 tbsp", section: "Pantry and Grains", detail: "Extra virgin olive oil" }
    ]
  },
  {
    id: "pinto-bean-turkey-cheddar-rice",
    name: "Pinto Bean and Ground Turkey Skillet with Cheddar over Brown Rice",
    description: "Ground turkey and pinto beans seasoned with cumin and garlic, topped with cheddar over brown rice.",
    category: "Dinner",
    macros: { fats: 20, carbs: 62, fiber: 12, protein: 50 },
    ingredients: [
      { name: "Ground turkey", amount: "6 oz", section: "Meat and Seafood", detail: "93/7 lean ground turkey" },
      { name: "Pinto beans", amount: "0.75 cup", section: "Canned and Jarred", detail: "Canned pinto beans, drained and rinsed" },
      { name: "Cheddar cheese", amount: "1.5 oz", section: "Dairy", detail: "Sharp cheddar, shredded (e.g. Tillamook)" },
      { name: "Brown rice", amount: "1.5 cups cooked", section: "Pantry and Grains", detail: "Medium-grain brown rice, cooked and cooled slightly" },
      { name: "Garlic", amount: "2 cloves", section: "Produce", detail: "Fresh garlic cloves, minced" },
      { name: "Cumin", amount: "1 tsp", section: "Pantry and Grains", detail: "Ground cumin" }
    ]
  },
  {
    id: "steak-sweet-potato-green-beans",
    name: "Steak with Roasted Sweet Potato and Green Beans",
    description: "Seared sirloin steak served with roasted sweet potatoes and tender green beans.",
    category: "Dinner",
    macros: { fats: 26, carbs: 55, fiber: 12, protein: 52 },
    ingredients: [
      { name: "Sirloin steak", amount: "8 oz", section: "Meat and Seafood", detail: "USDA Choice top sirloin, 1-inch thick" },
      { name: "Sweet potatoes", amount: "2 medium", section: "Produce", detail: "Orange-fleshed sweet potatoes, cubed for roasting" },
      { name: "Green beans", amount: "2 cups", section: "Produce", detail: "Fresh green beans, trimmed" },
      { name: "Olive oil", amount: "2 tbsp", section: "Pantry and Grains", detail: "Extra virgin olive oil" }
    ]
  },
  {
    id: "steak-baby-potatoes-green-beans",
    name: "Steak with Roasted Baby Potatoes and Green Beans",
    description: "Grilled NY strip steak with crispy roasted baby potatoes and green beans.",
    category: "Dinner",
    macros: { fats: 28, carbs: 48, fiber: 8, protein: 56 },
    ingredients: [
      { name: "NY strip steak", amount: "9 oz", section: "Meat and Seafood", detail: "USDA Choice NY strip, 1.25-inch thick" },
      { name: "Baby potatoes", amount: "2 cups", section: "Produce", detail: "Mixed baby potatoes (red, yellow, purple), halved" },
      { name: "Green beans", amount: "2 cups", section: "Produce", detail: "Fresh green beans, trimmed" },
      { name: "Olive oil", amount: "2 tbsp", section: "Pantry and Grains", detail: "Extra virgin olive oil" }
    ]
  },

  // ─── DESSERT (EVENING SNACK) ───
  {
    id: "greek-yogurt-honey",
    name: "Greek Yogurt with Honey",
    description: "Simple and satisfying Greek yogurt drizzled with honey as an evening treat.",
    category: "Dessert",
    macros: { fats: 5, carbs: 26, fiber: 0, protein: 20 },
    ingredients: [
      { name: "Plain Greek yogurt", amount: "1 cup", section: "Dairy", detail: "Non-fat vanilla Greek yogurt (e.g. Fage 0%, Chobani)" },
      { name: "Honey", amount: "1 tbsp", section: "Pantry and Grains", detail: "Raw wildflower honey or any pure honey" }
    ]
  }
];

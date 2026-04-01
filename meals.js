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
 * To add a new meal: copy a placeholder entry below, give it a unique id,
 * fill in all fields, and add it to the MEALS array.
 */

const MEALS = [
  // ─── BREAKFAST PLACEHOLDERS ───
  {
    id: "breakfast-placeholder-1",
    name: "Placeholder Breakfast 1",
    description: "Replace with your first breakfast recipe.",
    category: "Breakfast",
    macros: { fats: 10, carbs: 30, fiber: 8, protein: 15 },
    ingredients: [
      { name: "Oats", amount: "1 cup", section: "Pantry and Grains" },
      { name: "Banana", amount: "1 medium", section: "Produce" },
      { name: "Almond milk", amount: "1 cup", section: "Refrigerated" }
    ]
  },
  {
    id: "breakfast-placeholder-2",
    name: "Placeholder Breakfast 2",
    description: "Replace with your second breakfast recipe.",
    category: "Breakfast",
    macros: { fats: 12, carbs: 25, fiber: 6, protein: 20 },
    ingredients: [
      { name: "Eggs", amount: "2 large", section: "Dairy" },
      { name: "Spinach", amount: "1 cup", section: "Produce" },
      { name: "Whole wheat toast", amount: "1 slice", section: "Pantry and Grains" }
    ]
  },

  // ─── LUNCH PLACEHOLDERS ───
  {
    id: "lunch-placeholder-1",
    name: "Placeholder Lunch 1",
    description: "Replace with your first lunch recipe.",
    category: "Lunch",
    macros: { fats: 14, carbs: 35, fiber: 10, protein: 25 },
    ingredients: [
      { name: "Mixed greens", amount: "2 cups", section: "Produce" },
      { name: "Chickpeas", amount: "1/2 cup", section: "Canned and Jarred" },
      { name: "Olive oil", amount: "1 tbsp", section: "Pantry and Grains" }
    ]
  },
  {
    id: "lunch-placeholder-2",
    name: "Placeholder Lunch 2",
    description: "Replace with your second lunch recipe.",
    category: "Lunch",
    macros: { fats: 16, carbs: 40, fiber: 9, protein: 30 },
    ingredients: [
      { name: "Chicken breast", amount: "6 oz", section: "Meat and Seafood" },
      { name: "Brown rice", amount: "1 cup", section: "Pantry and Grains" },
      { name: "Broccoli", amount: "1 cup", section: "Produce" }
    ]
  },

  // ─── SNACK PLACEHOLDERS ───
  {
    id: "snack-placeholder-1",
    name: "Placeholder Snack 1",
    description: "Replace with your first snack.",
    category: "Snack",
    macros: { fats: 8, carbs: 15, fiber: 4, protein: 6 },
    ingredients: [
      { name: "Greek yogurt", amount: "1/2 cup", section: "Dairy" },
      { name: "Blueberries", amount: "1/4 cup", section: "Produce" }
    ]
  },
  {
    id: "snack-placeholder-2",
    name: "Placeholder Snack 2",
    description: "Replace with your second snack.",
    category: "Snack",
    macros: { fats: 12, carbs: 10, fiber: 3, protein: 5 },
    ingredients: [
      { name: "Almonds", amount: "1/4 cup", section: "Pantry and Grains" },
      { name: "Apple", amount: "1 medium", section: "Produce" }
    ]
  },

  // ─── DINNER PLACEHOLDERS ───
  {
    id: "dinner-placeholder-1",
    name: "Placeholder Dinner 1",
    description: "Replace with your first dinner recipe.",
    category: "Dinner",
    macros: { fats: 18, carbs: 40, fiber: 12, protein: 35 },
    ingredients: [
      { name: "Salmon fillet", amount: "6 oz", section: "Meat and Seafood" },
      { name: "Sweet potato", amount: "1 medium", section: "Produce" },
      { name: "Asparagus", amount: "6 spears", section: "Produce" }
    ]
  },
  {
    id: "dinner-placeholder-2",
    name: "Placeholder Dinner 2",
    description: "Replace with your second dinner recipe.",
    category: "Dinner",
    macros: { fats: 15, carbs: 45, fiber: 11, protein: 28 },
    ingredients: [
      { name: "Ground turkey", amount: "5 oz", section: "Meat and Seafood" },
      { name: "Black beans", amount: "1/2 cup", section: "Canned and Jarred" },
      { name: "Bell pepper", amount: "1 large", section: "Produce" }
    ]
  },

  // ─── DESSERT PLACEHOLDERS ───
  {
    id: "dessert-placeholder-1",
    name: "Placeholder Dessert 1",
    description: "Replace with your first dessert recipe.",
    category: "Dessert",
    macros: { fats: 6, carbs: 20, fiber: 5, protein: 4 },
    ingredients: [
      { name: "Dark chocolate", amount: "1 oz", section: "Pantry and Grains" },
      { name: "Strawberries", amount: "1/2 cup", section: "Produce" }
    ]
  },
  {
    id: "dessert-placeholder-2",
    name: "Placeholder Dessert 2",
    description: "Replace with your second dessert recipe.",
    category: "Dessert",
    macros: { fats: 8, carbs: 22, fiber: 4, protein: 6 },
    ingredients: [
      { name: "Frozen banana", amount: "1 medium", section: "Frozen" },
      { name: "Cocoa powder", amount: "1 tbsp", section: "Pantry and Grains" },
      { name: "Peanut butter", amount: "1 tbsp", section: "Pantry and Grains" }
    ]
  }
];

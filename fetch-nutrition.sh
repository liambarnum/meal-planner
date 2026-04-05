#!/bin/bash
# Fetches USDA nutrition data for all meal ingredients and outputs JS
API_KEY="9hOC3zECxuVSP4ZTbxIty0k0gi9PsuUXdEgUR26h"
BASE="https://api.nal.usda.gov/fdc/v1"

# Extract unique ingredient names from meals.js
INGREDIENTS=$(python3 -c "
import re
with open('meals.js') as f:
    content = f.read()
blocks = re.findall(r'ingredients:\s*\[(.*?)\]', content, re.DOTALL)
names = set()
for block in blocks:
    for m in re.finditer(r'name:\s*\"([^\"]+)\"', block):
        names.add(m.group(1))
for n in sorted(names, key=str.lower):
    print(n)
")

# Search override map
declare -A OVERRIDES
OVERRIDES["plain greek yogurt"]="yogurt greek plain whole milk"
OVERRIDES["rolled oats"]="oats regular quick not fortified dry"
OVERRIDES["low-fat milk"]="milk lowfat fluid 1% milkfat"
OVERRIDES["ground flaxseed"]="seeds flaxseed"
OVERRIDES["chia seeds"]="seeds chia seeds dried"
OVERRIDES["baby spinach"]="spinach raw"
OVERRIDES["cheddar cheese"]="cheese cheddar"
OVERRIDES["bone broth"]="soup stock chicken"
OVERRIDES["lean ground beef"]="beef ground 93% lean raw"
OVERRIDES["ground turkey"]="turkey ground 93% lean raw"
OVERRIDES["brown rice"]="rice brown medium-grain cooked"
OVERRIDES["ground beef"]="beef ground 85% lean raw"
OVERRIDES["mixed greens"]="lettuce green leaf raw"
OVERRIDES["black beans"]="beans black canned drained"
OVERRIDES["carrots"]="carrots raw"
OVERRIDES["arugula"]="arugula raw"
OVERRIDES["feta cheese"]="cheese feta"
OVERRIDES["olive oil"]="oil olive"
OVERRIDES["rotisserie chicken"]="chicken roasted meat only"
OVERRIDES["red lentils"]="lentils raw"
OVERRIDES["sourdough bread"]="bread sourdough"
OVERRIDES["canned tuna"]="fish tuna light canned water drained"
OVERRIDES["lemon juice"]="lemon juice raw"
OVERRIDES["whole grain bread"]="bread whole-wheat"
OVERRIDES["cottage cheese"]="cheese cottage lowfat 2%"
OVERRIDES["sharp cheddar cheese"]="cheese cheddar"
OVERRIDES["sweet potatoes"]="sweet potato raw"
OVERRIDES["cumin"]="spices cumin seed ground"
OVERRIDES["bone-in chicken thighs"]="chicken thigh meat skin raw"
OVERRIDES["broccoli"]="broccoli raw"
OVERRIDES["parmesan cheese"]="cheese parmesan grated"
OVERRIDES["salmon fillet"]="fish salmon atlantic raw"
OVERRIDES["pinto beans"]="beans pinto canned drained"
OVERRIDES["sirloin steak"]="beef top sirloin steak raw"
OVERRIDES["green beans"]="beans snap green raw"
OVERRIDES["ny strip steak"]="beef short loin top loin raw"
OVERRIDES["baby potatoes"]="potatoes flesh skin raw"
OVERRIDES["mixed berries"]="berries mixed frozen"
OVERRIDES["kimchi"]="kimchi"
OVERRIDES["salsa"]="salsa ready to serve"

TOTAL=$(echo "$INGREDIENTS" | wc -l | tr -d ' ')
COUNT=0

# Collect all results as JSON fragments
RESULTS_FILE=$(mktemp)
echo "{" > "$RESULTS_FILE"
FIRST=true

while IFS= read -r name; do
  COUNT=$((COUNT + 1))
  key=$(echo "$name" | tr '[:upper:]' '[:lower:]')
  query="${OVERRIDES[$key]:-$name}"

  echo "[$COUNT/$TOTAL] $name -> query: $query" >&2

  # Search
  search_json=$(curl -s "$BASE/foods/search?api_key=$API_KEY&query=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$query'))")&pageSize=1&dataType=SR%20Legacy")

  fdc_id=$(echo "$search_json" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['foods'][0]['fdcId'] if d.get('foods') else '')" 2>/dev/null)

  if [ -z "$fdc_id" ]; then
    echo "  ⚠ No results" >&2
    continue
  fi

  desc=$(echo "$search_json" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['foods'][0]['description'])" 2>/dev/null)
  echo "  → $desc (fdcId: $fdc_id)" >&2

  # Get full food detail
  food_json=$(curl -s "$BASE/food/$fdc_id?api_key=$API_KEY&format=full")

  # Extract nutrients and portions with python
  entry=$(echo "$food_json" | python3 -c "
import json, sys
data = json.load(sys.stdin)

NUTRIENT_MAP = {
    1008: 'calories', 1004: 'totalFat', 1258: 'saturatedFat', 1257: 'transFat',
    1253: 'cholesterol', 1093: 'sodium', 1005: 'totalCarbs', 1079: 'dietaryFiber',
    2000: 'totalSugars', 1003: 'protein', 1114: 'vitaminD', 1087: 'calcium',
    1089: 'iron', 1092: 'potassium'
}

nutrients = {v: 0 for v in NUTRIENT_MAP.values()}
nutrients['addedSugars'] = 0

for fn in data.get('foodNutrients', []):
    n = fn.get('nutrient', {})
    nid = n.get('id', 0)
    field = NUTRIENT_MAP.get(nid)
    if field:
        nutrients[field] = fn.get('amount', 0) or 0

portions = []
seen = set()
for p in data.get('foodPortions', []):
    gw = p.get('gramWeight', 0)
    if gw <= 0:
        continue
    mod = (p.get('modifier') or '').lower().strip()
    desc = mod
    if 'cup' in desc: desc = 'cup'
    elif 'tbsp' in desc or 'tablespoon' in desc: desc = 'tbsp'
    elif 'tsp' in desc or 'teaspoon' in desc: desc = 'tsp'
    elif 'large' in desc: desc = 'large'
    elif 'medium' in desc: desc = 'medium'
    elif 'small' in desc: desc = 'small'
    elif 'slice' in desc: desc = 'slice'
    elif 'clove' in desc: desc = 'clove'
    if desc not in seen:
        seen.add(desc)
        portions.append({'description': desc, 'gramWeight': round(gw, 2), 'amount': p.get('amount', 1)})
    if len(portions) >= 4:
        break

result = {
    'description': data.get('description', ''),
    'nutrients': nutrients,
    'portions': portions
}
print(json.dumps(result))
" 2>/dev/null)

  if [ -n "$entry" ]; then
    if [ "$FIRST" = true ]; then
      FIRST=false
    else
      echo "," >> "$RESULTS_FILE"
    fi
    echo "  \"$key\": $entry" >> "$RESULTS_FILE"
  fi

  sleep 0.2
done <<< "$INGREDIENTS"

echo "" >> "$RESULTS_FILE"
echo "}" >> "$RESULTS_FILE"

# Format as JS
echo "// Auto-generated from USDA FoodData Central API (SR Legacy)"
echo "// Generated on $(date -u +%Y-%m-%d)"
echo ""
python3 -c "
import json
with open('$RESULTS_FILE') as f:
    data = json.load(f)
print('const STATIC_NUTRITION = ' + json.dumps(data, indent=2) + ';')
"

rm -f "$RESULTS_FILE"
echo "" >&2
echo "Done! Fetched data for $COUNT ingredients." >&2

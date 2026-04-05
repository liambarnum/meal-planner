#!/usr/bin/env python3
"""
Fetches USDA FoodData Central nutrition data for all meal ingredients.
Run: python3 fetch-nutrition.py > /tmp/nutrition-output.js
"""

import json
import re
import sys
import time
import urllib.request
import urllib.parse

API_KEY = '9hOC3zECxuVSP4ZTbxIty0k0gi9PsuUXdEgUR26h'
BASE = 'https://api.nal.usda.gov/fdc/v1'

NUTRIENT_MAP = {
    1008: 'calories',
    1004: 'totalFat',
    1258: 'saturatedFat',
    1257: 'transFat',
    1253: 'cholesterol',
    1093: 'sodium',
    1005: 'totalCarbs',
    1079: 'dietaryFiber',
    2000: 'totalSugars',
    1003: 'protein',
    1114: 'vitaminD',
    1087: 'calcium',
    1089: 'iron',
    1092: 'potassium',
}

SEARCH_OVERRIDES = {
    'apple': 'apples raw gala with skin',
    'banana': 'bananas raw',
    'eggs': 'egg whole raw fresh',
    'plain greek yogurt': 'yogurt greek plain whole milk',
    'rolled oats': 'oats regular quick not fortified dry',
    'low-fat milk': 'milk lowfat fluid 1% milkfat',
    'ground flaxseed': 'seeds flaxseed',
    'chia seeds': 'seeds chia seeds dried',
    'baby spinach': 'spinach raw',
    'cheddar cheese': 'cheese cheddar',
    'sharp cheddar cheese': 'cheese cheddar sharp',
    'bone broth': 'soup stock chicken home-prepared',
    'lean ground beef': 'beef ground 93% lean meat 7% fat raw',
    'ground turkey': 'turkey ground 93% lean 7% fat raw',
    'brown rice': 'rice brown long-grain cooked',
    'ground beef': 'beef ground 85% lean 15% fat raw',
    'mixed greens': 'lettuce green leaf raw',
    'black beans': 'beans black mature canned',
    'carrots': 'carrots raw',
    'arugula': 'arugula raw',
    'feta cheese': 'cheese feta',
    'olive oil': 'oil olive salad or cooking',
    'rotisserie chicken': 'chicken roasting meat only cooked roasted',
    'red lentils': 'lentils raw',
    'sourdough bread': 'bread french or vienna includes sourdough',
    'canned tuna': 'fish tuna light canned water drained',
    'lemon juice': 'lemon juice raw',
    'whole grain bread': 'bread whole-wheat commercially prepared',
    'cottage cheese': 'cheese cottage lowfat 2% milkfat',
    'sweet potatoes': 'sweet potato raw',
    'cumin': 'spices cumin seed',
    'bone-in chicken thighs': 'chicken broilers fryers thigh meat skin raw',
    'broccoli': 'broccoli raw',
    'parmesan cheese': 'cheese parmesan grated',
    'salmon fillet': 'fish salmon atlantic farmed raw',
    'pinto beans': 'beans pinto canned drained solids',
    'sirloin steak': 'beef top sirloin steak separable lean raw',
    'green beans': 'beans snap green raw',
    'ny strip steak': 'beef top loin steak boneless separable lean raw',
    'baby potatoes': 'potatoes flesh and skin raw',
    'mixed berries': 'strawberries raw',
    'kimchi': 'cabbage kimchi',
    'salsa': 'sauce salsa ready-to-serve',
    'ingredient name': '__SKIP__',
}


def api_get(url):
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode('utf-8'))


def search_food(query):
    url = '{}/foods/search?api_key={}&query={}&pageSize=1&dataType=SR%20Legacy'.format(
        BASE, API_KEY, urllib.parse.quote(query))
    return api_get(url)


def get_food(fdc_id):
    url = '{}/food/{}?api_key={}&format=full'.format(BASE, fdc_id, API_KEY)
    return api_get(url)


def extract_nutrients(food_nutrients):
    result = {v: 0 for v in NUTRIENT_MAP.values()}
    result['addedSugars'] = 0
    for fn in food_nutrients:
        n = fn.get('nutrient', {})
        nid = n.get('id', 0)
        field = NUTRIENT_MAP.get(nid)
        if field:
            result[field] = fn.get('amount', 0) or 0
    return result


def simplify_modifier(mod):
    mod = mod.lower().strip()
    if 'cup' in mod:
        return 'cup'
    if 'tbsp' in mod or 'tablespoon' in mod:
        return 'tbsp'
    if 'tsp' in mod or 'teaspoon' in mod:
        return 'tsp'
    if 'large' in mod:
        return 'large'
    if 'medium' in mod:
        return 'medium'
    if 'small' in mod:
        return 'small'
    if 'slice' in mod:
        return 'slice'
    if 'clove' in mod:
        return 'clove'
    if 'oz' in mod or 'ounce' in mod:
        return 'oz'
    return mod


def extract_portions(food_portions):
    if not food_portions:
        return []
    portions = []
    seen = set()
    for p in food_portions:
        gw = p.get('gramWeight', 0)
        if gw <= 0:
            continue
        mod = p.get('modifier', '') or ''
        desc = simplify_modifier(mod)
        if desc and desc not in seen:
            seen.add(desc)
            portions.append({
                'description': desc,
                'gramWeight': round(gw, 2),
                'amount': p.get('amount', 1),
            })
        if len(portions) >= 4:
            break
    return portions


def get_ingredient_names():
    with open('meals.js', 'r') as f:
        content = f.read()
    names = set()
    for block in re.finditer(r'ingredients:\s*\[(.*?)\]', content, re.DOTALL):
        for m in re.finditer(r'name:\s*"([^"]+)"', block.group(1)):
            names.add(m.group(1))
    return sorted(names, key=str.lower)


def main():
    names = get_ingredient_names()
    total = len(names)
    print('Found {} unique ingredients'.format(total), file=sys.stderr)

    results = {}
    for i, name in enumerate(names, 1):
        key = name.lower()
        query = SEARCH_OVERRIDES.get(key, name)
        if query == '__SKIP__':
            print('[{}/{}] {} -> SKIPPED'.format(i, total, name), file=sys.stderr)
            continue
        print('[{}/{}] {} -> "{}"'.format(i, total, name, query), file=sys.stderr)

        try:
            search_result = search_food(query)
            foods = search_result.get('foods', [])
            if not foods:
                print('  ⚠ No results', file=sys.stderr)
                continue

            top = foods[0]
            fdc_id = top['fdcId']
            desc = top['description']
            print('  → {} (fdcId: {})'.format(desc, fdc_id), file=sys.stderr)

            full = get_food(fdc_id)
            nutrients = extract_nutrients(full.get('foodNutrients', []))
            portions = extract_portions(full.get('foodPortions', []))

            results[key] = {
                'description': desc,
                'nutrients': nutrients,
                'portions': portions,
            }

            time.sleep(0.25)
        except Exception as e:
            print('  ✗ Error: {}'.format(e), file=sys.stderr)

    # Output JS
    print('const STATIC_NUTRITION = ' + json.dumps(results, indent=2) + ';')
    print('\nDone! {}/{} fetched.'.format(len(results), total), file=sys.stderr)


if __name__ == '__main__':
    main()

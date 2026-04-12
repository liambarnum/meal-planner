/* ─── STATE ─── */
const SLOTS = ['Breakfast', 'Lunch', 'Snack', 'Dinner', 'Dessert'];
const SECTIONS = ['Produce', 'Dairy', 'Meat and Seafood', 'Pantry and Grains', 'Canned and Jarred', 'Refrigerated', 'Frozen'];
const MACRO_TARGETS = { fats: 65, carbs: 300, fiber: 30, protein: 120 }; // grams per day
const DAY_ABBRS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

let state = {
  currentPage: 'planner',
  currentDay: 'All',        // 'All' or ISO date string like '2026-03-31'
  assignments: {},           // { "2026-03-31-Breakfast": "meal-id", ... }
  checkedItems: {},
  apiKey: '',
  masterMeals: [],
  chatHistory: [],
  dateRangeStart: null,      // ISO date string
  dateRangeLength: 7,        // number of days
  allergens: [],             // e.g. ['Peanuts', 'Shellfish']
  dietGoals: '',             // free-text diet description
  ingredientTiers: {},       // { "banana": "S", "eggs": "A", ... }
  customIngredients: []      // user-added ingredient names not yet tied to any meal
};

/* ─── DATE HELPERS ─── */
function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function parseDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function dateToISO(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

function addDays(iso, n) {
  const d = parseDate(iso);
  d.setDate(d.getDate() + n);
  return dateToISO(d);
}

function formatDateShort(iso) {
  const d = parseDate(iso);
  return `${DAY_ABBRS[d.getDay()]} ${d.getMonth()+1}/${d.getDate()}`;
}

function formatDateFull(iso) {
  const d = parseDate(iso);
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  return `${DAY_FULL[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`;
}

function getDateRange() {
  const dates = [];
  for (let i = 0; i < state.dateRangeLength; i++) {
    dates.push(addDays(state.dateRangeStart, i));
  }
  return dates;
}

/* ─── INIT ─── */
function init() {
  loadState();
  if (!state.dateRangeStart) {
    state.dateRangeStart = todayISO();
  }
  state.masterMeals = JSON.parse(JSON.stringify(MEALS));
  mergeSavedMeals();
  renderDayTabs();
  renderPlanner();
  bindNav();
  bindModal();
  bindChat();
  bindCalendar();
  bindClear();
  bindNutritionModal();
  bindNutritionDelegation();
  bindDeleteModal();
  registerSW();
}

function loadState() {
  try {
    const saved = localStorage.getItem('mealPlannerState');
    if (saved) {
      const parsed = JSON.parse(saved);
      state.assignments = parsed.assignments || {};
      state.checkedItems = parsed.checkedItems || {};
      state.apiKey = parsed.apiKey || '';
      
      state.chatHistory = parsed.chatHistory || [];
      state.dateRangeStart = parsed.dateRangeStart || null;
      state.dateRangeLength = parsed.dateRangeLength || 7;
      state.allergens = parsed.allergens || [];
      state.dietGoals = parsed.dietGoals || '';
      state.ingredientTiers = parsed.ingredientTiers || {};
      state.customIngredients = parsed.customIngredients || [];
      if (parsed.customMeals) state._savedCustomMeals = parsed.customMeals;
    }
  } catch (e) { /* start fresh */ }
}

function mergeSavedMeals() {
  if (!state._savedCustomMeals) return;
  const existingIds = new Set(state.masterMeals.map(m => m.id));
  for (const meal of state._savedCustomMeals) {
    if (existingIds.has(meal.id)) {
      const idx = state.masterMeals.findIndex(m => m.id === meal.id);
      state.masterMeals[idx] = meal;
    } else {
      state.masterMeals.push(meal);
    }
  }
  delete state._savedCustomMeals;
}

function saveState() {
  const defaultIds = new Set(MEALS.map(m => m.id));
  const customMeals = state.masterMeals.filter(m => {
    if (!defaultIds.has(m.id)) return true;
    return JSON.stringify(m) !== JSON.stringify(MEALS.find(d => d.id === m.id));
  });

  localStorage.setItem('mealPlannerState', JSON.stringify({
    assignments: state.assignments,
    checkedItems: state.checkedItems,
    apiKey: state.apiKey,

    chatHistory: state.chatHistory,
    customMeals: customMeals,
    dateRangeStart: state.dateRangeStart,
    dateRangeLength: state.dateRangeLength,
    allergens: state.allergens,
    dietGoals: state.dietGoals,
    ingredientTiers: state.ingredientTiers,
    customIngredients: state.customIngredients
  }));
}

function getMeal(id) {
  return state.masterMeals.find(m => m.id === id);
}

/* ─── SERVICE WORKER ─── */
function registerSW() {
  if (!('serviceWorker' in navigator)) return;

  navigator.serviceWorker.register('service-worker.js').then(reg => {
    setInterval(() => reg.update(), 60000);
    const onUpdate = () => showUpdateBanner();
    if (reg.waiting) { onUpdate(); return; }
    reg.addEventListener('updatefound', () => {
      const newWorker = reg.installing;
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          onUpdate();
        }
      });
    });
  }).catch(() => {});

  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) { refreshing = true; window.location.reload(); }
  });
}

function showUpdateBanner() {
  if (document.getElementById('update-banner')) return;
  const banner = document.createElement('div');
  banner.id = 'update-banner';
  banner.style.cssText = `
    position: fixed; top: 0; left: 0; right: 0; z-index: 999;
    background: var(--gold); color: var(--bg); text-align: center;
    padding: 10px 20px; font-family: var(--font-body); font-size: 0.9rem;
    font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 12px;
  `;
  banner.innerHTML = `
    <span>A new version is available!</span>
    <button id="update-btn" style="background: var(--bg); color: var(--gold); border: none; border-radius: 6px;
      padding: 6px 14px; font-family: var(--font-body); font-size: 0.82rem; font-weight: 600; cursor: pointer;">Update now</button>
  `;
  document.body.prepend(banner);
  document.getElementById('update-btn').addEventListener('click', () => {
    navigator.serviceWorker.getRegistration().then(r => { if (r && r.waiting) r.waiting.postMessage('skipWaiting'); });
  });
}

/* ─── NAVIGATION ─── */
function bindNav() {
  const pages = ['planner', 'grocery', 'preferences'];
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      state.currentPage = tab.dataset.page;
      pages.forEach(p => {
        document.getElementById('page-' + p).style.display = state.currentPage === p ? '' : 'none';
      });
      if (state.currentPage === 'grocery') renderGrocery();
      if (state.currentPage === 'preferences') renderPreferences();
    });
  });
}

/* ─── DAY TABS ─── */
function renderDayTabs() {
  const container = document.getElementById('day-tabs-list');
  container.innerHTML = '';
  const dates = getDateRange();

  // All tab
  const allBtn = document.createElement('button');
  allBtn.className = 'day-tab today' + (state.currentDay === 'All' ? ' active' : '');
  allBtn.textContent = 'All';
  allBtn.addEventListener('click', () => {
    state.currentDay = 'All';
    renderDayTabs();
    renderPlanner();
  });
  container.appendChild(allBtn);

  // Date tabs
  dates.forEach(iso => {
    const btn = document.createElement('button');
    btn.className = 'day-tab' + (state.currentDay === iso ? ' active' : '');
    btn.textContent = formatDateShort(iso);
    btn.addEventListener('click', () => {
      state.currentDay = iso;
      renderDayTabs();
      renderPlanner();
    });
    container.appendChild(btn);
  });

  // Update clear button visibility
  const clearBtn = document.getElementById('clear-btn');
  const hasAssignments = dates.some(iso => SLOTS.some(s => state.assignments[`${iso}-${s}`]));
  clearBtn.style.display = hasAssignments ? '' : 'none';
}

/* ─── PLANNER RENDERING ─── */
function renderPlanner() {
  const content = document.getElementById('planner-content');
  if (state.currentDay === 'All') {
    renderAllMeals(content);
  } else {
    renderDayView(content, state.currentDay);
  }
}

function renderAllMeals(container) {
  container.innerHTML = '';
  const categories = ['Breakfast', 'Lunch', 'Snack', 'Dinner', 'Dessert'];
  categories.forEach(cat => {
    const meals = state.masterMeals.filter(m => m.category === cat);
    if (meals.length === 0) return;

    const section = document.createElement('div');
    section.className = 'category-section';

    const header = document.createElement('div');
    header.className = 'category-header';
    header.innerHTML = `<span class="category-toggle-icon">&#9660;</span> ${esc(cat)} <span class="category-count">(${meals.length})</span>`;

    const body = document.createElement('div');
    body.className = 'category-body';
    meals.forEach(meal => body.appendChild(createMealCard(meal)));

    header.addEventListener('click', () => {
      const collapsed = body.classList.toggle('category-collapsed');
      header.querySelector('.category-toggle-icon').textContent = collapsed ? '\u25B6' : '\u25BC';
    });

    section.appendChild(header);
    section.appendChild(body);
    container.appendChild(section);
  });
}

function renderIngredientsList(meal) {
  return `
    <div class="ingredients-toggle">
      <button class="ingredients-toggle-btn">
        <span class="ingredients-toggle-icon">&#9654;</span> Ingredients (${meal.ingredients.length})
      </button>
    </div>
    <div class="ingredients-list ingredients-hidden">
      ${(meal.ingredients || []).map(ing => {
        const has = hasNutritionData(ing.name);
        const badge = has
          ? `<button class="ingredient-nf-badge" data-meal-id="${esc(meal.id)}" data-ingredient="${esc(ing.name)}" title="View Nutrition Facts">NF</button>`
          : `<span class="ingredient-no-nutrition" title="No nutritional info available">&#9888;</span>`;
        return `
        <div class="ingredient-row">
          <span class="ingredient-amount">${esc(ing.amount)}</span>
          <span class="ingredient-info">
            <span class="ingredient-name">${esc(ing.name)} ${badge}</span>
            ${ing.detail ? `<span class="ingredient-detail">${esc(ing.detail)}</span>` : ''}
          </span>
        </div>`;
      }).join('')}
    </div>
  `;
}

function bindIngredientsToggle(el) {
  const btn = el.querySelector('.ingredients-toggle-btn');
  if (!btn) return;
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const list = el.querySelector('.ingredients-list');
    const icon = btn.querySelector('.ingredients-toggle-icon');
    const isHidden = list.classList.contains('ingredients-hidden');
    if (isHidden) {
      list.classList.remove('ingredients-hidden');
      icon.textContent = '\u25BC';
    } else {
      list.classList.add('ingredients-hidden');
      icon.textContent = '\u25B6';
    }
  });
}

function createMealCard(meal) {
  const card = document.createElement('div');
  card.className = 'meal-card';
  card.innerHTML = `
    <div class="meal-card-top">
      <div>
        <div class="meal-card-name">${esc(meal.name)}</div>
        <div class="meal-card-desc">${esc(meal.description)}</div>
      </div>
      <button class="meal-delete-btn" data-meal-id="${esc(meal.id)}" title="Delete meal">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
        </svg>
      </button>
    </div>
    <div class="meal-card-actions">
      <div class="macro-badge">
        <span>F: ${meal.macros.fats}g</span>
        <span>C: ${meal.macros.carbs}g</span>
        <span class="fiber">Fb: ${meal.macros.fiber}g</span>
        <span>P: ${meal.macros.protein}g</span>
      </div>
      <button class="nutrition-badge" data-meal-id="${esc(meal.id)}" title="View Nutrition Facts">NF</button>
    </div>
    ${renderIngredientsList(meal)}
  `;
  bindIngredientsToggle(card);
  card.addEventListener('click', (e) => {
    if (e.target.closest('.meal-delete-btn')) return;
    if (e.target.closest('.nutrition-badge')) return;
    if (e.target.closest('.ingredients-toggle') || e.target.closest('.ingredients-list')) return;
    openModal(meal.id);
  });
  return card;
}

function renderDayView(container, dateISO) {
  container.innerHTML = '';

  // Day summary
  const totals = { fats: 0, carbs: 0, fiber: 0, protein: 0 };
  SLOTS.forEach(slot => {
    const key = `${dateISO}-${slot}`;
    const meal = getMeal(state.assignments[key]);
    if (meal) {
      totals.fats += meal.macros.fats;
      totals.carbs += meal.macros.carbs;
      totals.fiber += meal.macros.fiber;
      totals.protein += meal.macros.protein;
    }
  });

  const macroBars = ['fats', 'carbs', 'fiber', 'protein'].map(key => {
    const pct = Math.min(100, Math.round((totals[key] / MACRO_TARGETS[key]) * 100));
    const label = key.charAt(0).toUpperCase() + key.slice(1);
    return `
      <div class="macro-bar-container">
        <div class="macro-bar-label" data-macro="${key}">${label}: ${totals[key]}g / ${MACRO_TARGETS[key]}g (${pct}%)</div>
        <div class="macro-bar-track">
          <div class="macro-bar-fill macro-bar-${key}" style="width: ${pct}%"></div>
        </div>
      </div>`;
  }).join('');

  const summary = document.createElement('div');
  summary.className = 'day-summary';
  summary.innerHTML = `
    <div class="day-summary-header">
      <div class="day-summary-title">${formatDateFull(dateISO)}</div>
      <button class="nutrition-badge day-nf-badge" data-date="${dateISO}" title="View Daily Nutrition Facts">NF</button>
    </div>
    <div class="day-macros">
      <span>Fats: ${totals.fats}g</span>
      <span>Carbs: ${totals.carbs}g</span>
      <span>Fiber: ${totals.fiber}g</span>
      <span>Protein: ${totals.protein}g</span>
    </div>
    <div class="macro-bars">${macroBars}</div>
  `;

  container.appendChild(summary);

  // Meal slots
  SLOTS.forEach(slot => {
    const key = `${dateISO}-${slot}`;
    const mealId = state.assignments[key];
    const meal = getMeal(mealId);
    const slotEl = document.createElement('div');
    slotEl.className = 'meal-slot';
    slotEl.dataset.slot = slot;

    if (meal) {
      slotEl.innerHTML = `
        <div class="slot-label">${slot}</div>
        <div class="slot-filled">
          <div class="slot-meal-name">${esc(meal.name)}</div>
          <div class="slot-meal-desc">${esc(meal.description)}</div>
          <div class="meal-card-actions">
            <div class="macro-badge">
              <span>F: ${meal.macros.fats}g</span>
              <span>C: ${meal.macros.carbs}g</span>
              <span class="fiber">Fb: ${meal.macros.fiber}g</span>
              <span>P: ${meal.macros.protein}g</span>
            </div>
            <button class="nutrition-badge" data-meal-id="${esc(meal.id)}" title="View Nutrition Facts">NF</button>
          </div>
          ${renderIngredientsList(meal)}
          <button class="slot-remove" title="Remove meal">&times;</button>
        </div>
      `;
      bindIngredientsToggle(slotEl);
      slotEl.querySelector('.slot-remove').addEventListener('click', (e) => {
        e.stopPropagation();
        delete state.assignments[key];
        saveState();
        renderDayTabs();
        renderPlanner();
      });
    } else {
      slotEl.innerHTML = `
        <div class="slot-label">${slot}</div>
        <div class="slot-empty">+ Tap to assign a meal</div>
      `;
      slotEl.querySelector('.slot-empty').addEventListener('click', () => {
        openModal(null, dateISO, slot);
      });
    }

    container.appendChild(slotEl);
  });
}

/* ─── ASSIGNMENT MODAL ─── */
let modalMealId = null;

function bindModal() {
  document.getElementById('modal-cancel').addEventListener('click', closeModal);
  document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal();
  });
  document.getElementById('modal-confirm').addEventListener('click', () => {
    const dateISO = document.getElementById('modal-day').value;
    const slot = document.getElementById('modal-slot').value;
    if (modalMealId && dateISO) {
      state.assignments[`${dateISO}-${slot}`] = modalMealId;
      saveState();
      state.currentDay = dateISO;
      renderDayTabs();
      renderPlanner();
    }
    closeModal();
  });
}

function populateModalDays() {
  const select = document.getElementById('modal-day');
  select.innerHTML = '';
  getDateRange().forEach(iso => {
    const opt = document.createElement('option');
    opt.value = iso;
    opt.textContent = formatDateFull(iso);
    select.appendChild(opt);
  });
}

function openModal(mealId, preDate, preSlot) {
  modalMealId = mealId;
  populateModalDays();

  if (mealId) {
    const meal = getMeal(mealId);
    document.getElementById('modal-title').textContent = `Assign: ${meal ? meal.name : 'Meal'}`;
  } else {
    document.getElementById('modal-title').textContent = 'Select a meal first from the All tab';
  }

  if (preDate) document.getElementById('modal-day').value = preDate;
  if (preSlot) document.getElementById('modal-slot').value = preSlot;

  if (!mealId) {
    state.currentDay = 'All';
    renderDayTabs();
    renderPlanner();
    return;
  }

  document.getElementById('modal-overlay').classList.add('open');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
  modalMealId = null;
}

/* ─── CALENDAR PICKER ─── */
function bindCalendar() {
  document.getElementById('calendar-btn').addEventListener('click', openCalendar);
  document.getElementById('calendar-cancel').addEventListener('click', closeCalendar);
  document.getElementById('calendar-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeCalendar();
  });
  document.getElementById('calendar-apply').addEventListener('click', () => {
    const startVal = document.getElementById('calendar-start').value;
    const endVal = document.getElementById('calendar-end').value;
    if (startVal && endVal) {
      const start = parseDate(startVal);
      const end = parseDate(endVal);
      if (end >= start) {
        const diffDays = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
        state.dateRangeStart = startVal;
        state.dateRangeLength = Math.max(1, Math.min(diffDays, 90)); // cap at 90 days
        state.currentDay = 'All';
        saveState();
        renderDayTabs();
        renderPlanner();
        closeCalendar();
      }
    }
  });

  // Quick presets
  document.getElementById('cal-preset-week').addEventListener('click', () => applyPreset(7));
  document.getElementById('cal-preset-2week').addEventListener('click', () => applyPreset(14));
  document.getElementById('cal-preset-month').addEventListener('click', () => applyPreset(30));
}

function applyPreset(days) {
  const startInput = document.getElementById('calendar-start');
  const endInput = document.getElementById('calendar-end');
  const start = todayISO();
  startInput.value = start;
  endInput.value = addDays(start, days - 1);
}

function openCalendar() {
  const startInput = document.getElementById('calendar-start');
  const endInput = document.getElementById('calendar-end');
  startInput.value = state.dateRangeStart;
  endInput.value = addDays(state.dateRangeStart, state.dateRangeLength - 1);
  document.getElementById('calendar-overlay').classList.add('open');
}

function closeCalendar() {
  document.getElementById('calendar-overlay').classList.remove('open');
}

/* ─── CLEAR MEALS ─── */
function bindClear() {
  document.getElementById('clear-btn').addEventListener('click', openClearModal);
  document.getElementById('clear-cancel').addEventListener('click', closeClearModal);
  document.getElementById('clear-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeClearModal();
  });
  document.getElementById('clear-confirm').addEventListener('click', executeClear);
}

function openClearModal() {
  const container = document.getElementById('clear-date-list');
  container.innerHTML = '';
  const dates = getDateRange();

  // "Select All" checkbox
  const selectAllRow = document.createElement('label');
  selectAllRow.className = 'clear-date-row select-all';
  selectAllRow.innerHTML = `
    <input type="checkbox" id="clear-select-all" checked>
    <span>Select All</span>
  `;
  container.appendChild(selectAllRow);

  dates.forEach(iso => {
    const hasAssignment = SLOTS.some(s => state.assignments[`${iso}-${s}`]);
    const row = document.createElement('label');
    row.className = 'clear-date-row';
    row.innerHTML = `
      <input type="checkbox" value="${iso}" class="clear-date-cb" ${hasAssignment ? 'checked' : ''} ${!hasAssignment ? 'disabled' : ''}>
      <span class="${!hasAssignment ? 'muted' : ''}">${formatDateShort(iso)} — ${hasAssignment ? countMealsForDate(iso) + ' meal(s)' : 'empty'}</span>
    `;
    container.appendChild(row);
  });

  // Wire up "Select All"
  document.getElementById('clear-select-all').addEventListener('change', (e) => {
    container.querySelectorAll('.clear-date-cb:not(:disabled)').forEach(cb => {
      cb.checked = e.target.checked;
    });
  });

  document.getElementById('clear-overlay').classList.add('open');
}

function countMealsForDate(iso) {
  return SLOTS.filter(s => state.assignments[`${iso}-${s}`]).length;
}

function closeClearModal() {
  document.getElementById('clear-overlay').classList.remove('open');
}

function executeClear() {
  const checkboxes = document.querySelectorAll('.clear-date-cb:checked');
  checkboxes.forEach(cb => {
    const iso = cb.value;
    SLOTS.forEach(slot => {
      delete state.assignments[`${iso}-${slot}`];
    });
  });
  saveState();
  closeClearModal();
  renderDayTabs();
  renderPlanner();
}

/* ─── GROCERY LIST ─── */
let grocerySection = 'Produce';

function renderGrocery() {
  const content = document.getElementById('grocery-content');
  content.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'grocery-header';
  header.innerHTML = `
    <div class="grocery-title">Grocery List</div>
    <button class="btn-refresh" id="grocery-refresh">&#8635; Refresh</button>
  `;
  content.appendChild(header);

  header.querySelector('#grocery-refresh').addEventListener('click', () => {
    state.checkedItems = {};
    saveState();
    renderGrocery();
  });

  // Build ingredient map from assigned meals in current date range
  const ingredientMap = {};
  const dates = getDateRange();
  for (const iso of dates) {
    for (const slot of SLOTS) {
      const mealId = state.assignments[`${iso}-${slot}`];
      if (!mealId) continue;
      const meal = getMeal(mealId);
      if (!meal) continue;
      for (const ing of meal.ingredients) {
        const section = ing.section || 'Pantry and Grains';
        if (!ingredientMap[section]) ingredientMap[section] = {};
        const ingKey = ing.name.toLowerCase();
        if (!ingredientMap[section][ingKey]) {
          ingredientMap[section][ingKey] = { name: ing.name, amounts: [] };
        }
        ingredientMap[section][ingKey].amounts.push(ing.amount);
      }
    }
  }

  // Section tabs
  const tabsContainer = document.createElement('div');
  tabsContainer.className = 'grocery-section-tabs';
  SECTIONS.forEach(sec => {
    const btn = document.createElement('button');
    btn.className = 'grocery-section-tab' + (sec === grocerySection ? ' active' : '');
    btn.textContent = sec;
    const count = ingredientMap[sec] ? Object.keys(ingredientMap[sec]).length : 0;
    if (count > 0) btn.textContent += ` (${count})`;
    btn.addEventListener('click', () => {
      grocerySection = sec;
      renderGrocery();
    });
    tabsContainer.appendChild(btn);
  });
  content.appendChild(tabsContainer);

  // Ingredient list
  const items = ingredientMap[grocerySection];
  if (!items || Object.keys(items).length === 0) {
    const empty = document.createElement('div');
    empty.className = 'grocery-empty';
    empty.textContent = Object.values(state.assignments).length === 0
      ? 'Assign meals to day slots to generate your grocery list.'
      : 'No items in this section.';
    content.appendChild(empty);
    return;
  }

  const list = document.createElement('div');
  for (const [ingKey, data] of Object.entries(items).sort((a, b) => a[1].name.localeCompare(b[1].name))) {
    const checked = !!state.checkedItems[`${grocerySection}-${ingKey}`];
    const item = document.createElement('div');
    item.className = 'grocery-item' + (checked ? ' checked' : '');
    const amountText = [...new Set(data.amounts)].join(', ');
    item.innerHTML = `
      <div class="grocery-checkbox${checked ? ' checked' : ''}"></div>
      <div class="grocery-item-name">${esc(data.name)}</div>
      <div class="grocery-item-amount">${esc(amountText)}</div>
    `;
    item.addEventListener('click', () => {
      const key = `${grocerySection}-${ingKey}`;
      state.checkedItems[key] = !state.checkedItems[key];
      if (!state.checkedItems[key]) delete state.checkedItems[key];
      saveState();
      renderGrocery();
    });
    list.appendChild(item);
  }
  content.appendChild(list);
}

/* ─── AI CHAT ─── */
function bindChat() {
  const fab = document.getElementById('chat-fab');
  const panel = document.getElementById('chat-panel');
  const input = document.getElementById('chat-input');
  const sendBtn = document.getElementById('chat-send');
  const apiKeyInput = document.getElementById('chat-api-key');

  if (state.apiKey) apiKeyInput.value = state.apiKey;
  renderChatMessages();

  apiKeyInput.addEventListener('change', () => {
    state.apiKey = apiKeyInput.value.trim();
    saveState();
  });

  fab.addEventListener('click', () => {
    panel.classList.toggle('open');
    if (panel.classList.contains('open')) input.focus();
  });

  sendBtn.addEventListener('click', () => sendChat());
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); }
  });
}

function renderChatMessages() {
  const container = document.getElementById('chat-messages');
  container.innerHTML = '';
  state.chatHistory.forEach(msg => {
    const div = document.createElement('div');
    div.className = `chat-msg ${msg.role}`;
    div.textContent = msg.content;
    container.appendChild(div);
  });
  container.scrollTop = container.scrollHeight;
}

function addChatMessage(role, content) {
  state.chatHistory.push({ role, content });
  if (state.chatHistory.length > 50) state.chatHistory = state.chatHistory.slice(-50);
  saveState();
  renderChatMessages();
}

async function sendChat() {
  const input = document.getElementById('chat-input');
  const sendBtn = document.getElementById('chat-send');
  const message = input.value.trim();
  if (!message) return;

  if (!state.apiKey) {
    addChatMessage('error', 'Please enter your Anthropic API key above.');
    return;
  }

  addChatMessage('user', message);
  input.value = '';
  sendBtn.disabled = true;

  const systemPrompt = buildSystemPrompt();
  const messages = state.chatHistory
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .map(m => ({ role: m.role, content: m.content }));

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': state.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: systemPrompt,
        messages: messages
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `API error ${response.status}`);
    }

    const data = await response.json();
    const reply = data.content[0]?.text || 'No response.';
    addChatMessage('assistant', reply);
    processAssistantActions(reply);
  } catch (err) {
    addChatMessage('error', err.message);
  } finally {
    sendBtn.disabled = false;
  }
}

function buildSystemPrompt() {
  const dates = getDateRange();
  const assignmentLines = [];
  dates.forEach(iso => {
    SLOTS.forEach(slot => {
      const key = `${iso}-${slot}`;
      const meal = getMeal(state.assignments[key]);
      assignmentLines.push(`${formatDateShort(iso)} ${slot}: ${meal ? meal.name : '(empty)'}`);
    });
  });

  const allMealNames = state.masterMeals.map(m => `- ${m.name} [${m.category}] (id: ${m.id})`).join('\n');

  return `You are a helpful meal planning assistant focused on gut health and weight loss.

DIETARY GOALS:
- Promote gut health through high-fiber, diverse plant-based foods
- Support weight loss with balanced macros and portion control
- Target ${MACRO_TARGETS.fiber}g of fiber per day
- Encourage fermented foods, prebiotics, and polyphenol-rich ingredients

DATE RANGE: ${formatDateShort(state.dateRangeStart)} to ${formatDateShort(addDays(state.dateRangeStart, state.dateRangeLength - 1))}

CURRENT MEAL ASSIGNMENTS:
${assignmentLines.join('\n')}

AVAILABLE MEALS IN MASTER LIST:
${allMealNames}

CURRENT CONTEXT:
- Active day tab: ${state.currentDay === 'All' ? 'All' : formatDateShort(state.currentDay)}
- Page: ${state.currentPage}

CAPABILITIES - You can instruct data changes using these exact formats on their own line:
[ADD_MEAL] id|name|category|description|fats|carbs|fiber|protein|ingredients_json
[EDIT_MEAL] id|field|new_value
[REMOVE_MEAL] id
[ASSIGN] date-slot|meal_id  (date in YYYY-MM-DD format, e.g. 2026-03-31-Breakfast)
[UNASSIGN] date-slot

For ingredients_json use: [{"name":"X","amount":"Y","section":"Z"}]
Valid categories: Breakfast, Lunch, Snack, Dinner, Dessert
Valid slots: Breakfast, Lunch, Snack, Dinner, Dessert
Dates must be ISO format (YYYY-MM-DD) within the current range.

When making changes, include the command AND a natural language explanation. Keep responses concise and helpful.`;
}

function processAssistantActions(reply) {
  const lines = reply.split('\n');
  let changed = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('[ADD_MEAL]')) {
      const parts = trimmed.replace('[ADD_MEAL]', '').trim().split('|');
      if (parts.length >= 8) {
        const newMeal = {
          id: parts[0].trim(),
          name: parts[1].trim(),
          category: parts[2].trim(),
          description: parts[3].trim(),
          macros: {
            fats: parseInt(parts[4]) || 0,
            carbs: parseInt(parts[5]) || 0,
            fiber: parseInt(parts[6]) || 0,
            protein: parseInt(parts[7]) || 0
          },
          ingredients: []
        };
        try { if (parts[8]) newMeal.ingredients = JSON.parse(parts[8].trim()); } catch (e) {}
        if (!getMeal(newMeal.id)) { state.masterMeals.push(newMeal); changed = true; }
      }
    }

    if (trimmed.startsWith('[EDIT_MEAL]')) {
      const parts = trimmed.replace('[EDIT_MEAL]', '').trim().split('|');
      if (parts.length >= 3) {
        const meal = getMeal(parts[0].trim());
        if (meal) {
          const field = parts[1].trim();
          const value = parts.slice(2).join('|').trim();
          if (field === 'name') meal.name = value;
          else if (field === 'description') meal.description = value;
          else if (field === 'fiber') meal.macros.fiber = parseInt(value) || 0;
          else if (field === 'fats') meal.macros.fats = parseInt(value) || 0;
          else if (field === 'carbs') meal.macros.carbs = parseInt(value) || 0;
          else if (field === 'protein') meal.macros.protein = parseInt(value) || 0;
          else if (field === 'ingredients') { try { meal.ingredients = JSON.parse(value); } catch (e) {} }
          changed = true;
        }
      }
    }

    if (trimmed.startsWith('[REMOVE_MEAL]')) {
      const id = trimmed.replace('[REMOVE_MEAL]', '').trim();
      const idx = state.masterMeals.findIndex(m => m.id === id);
      if (idx >= 0) {
        state.masterMeals.splice(idx, 1);
        for (const key in state.assignments) {
          if (state.assignments[key] === id) delete state.assignments[key];
        }
        changed = true;
      }
    }

    if (trimmed.startsWith('[ASSIGN]')) {
      const parts = trimmed.replace('[ASSIGN]', '').trim().split('|');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const mealId = parts[1].trim();
        if (getMeal(mealId)) { state.assignments[key] = mealId; changed = true; }
      }
    }

    if (trimmed.startsWith('[UNASSIGN]')) {
      const key = trimmed.replace('[UNASSIGN]', '').trim();
      if (state.assignments[key]) { delete state.assignments[key]; changed = true; }
    }
  }

  if (changed) {
    saveState();
    renderDayTabs();
    renderPlanner();
  }
}

/* ─── NUTRITION MODAL BINDING ─── */
function bindNutritionModal() {
  document.getElementById('nutrition-close-btn').addEventListener('click', closeNutritionModal);
  document.getElementById('nutrition-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'nutrition-overlay') closeNutritionModal();
  });
}

/* ─── NUTRITION BADGE DELEGATION ─── */
function bindNutritionDelegation() {
  // Use capture phase so this fires before card-level click handlers
  document.addEventListener('click', (e) => {
    // Ingredient-level NF badge
    const ingBadge = e.target.closest('.ingredient-nf-badge');
    if (ingBadge) {
      e.stopPropagation();
      e.preventDefault();
      const mealId = ingBadge.dataset.mealId;
      const ingName = ingBadge.dataset.ingredient;
      const meal = getMeal(mealId);
      if (meal) {
        const ing = meal.ingredients.find(i => i.name === ingName);
        if (ing) openIngredientNutritionModal(ing);
      }
      return;
    }

    const badge = e.target.closest('.nutrition-badge');
    if (!badge) return;
    e.stopPropagation();
    e.preventDefault();
    // Day NF badge — open day nutrition modal
    if (badge.classList.contains('day-nf-badge')) {
      const dateISO = badge.dataset.date;
      if (!dateISO) return;
      const dayMeals = [];
      SLOTS.forEach(slot => {
        const meal = getMeal(state.assignments[`${dateISO}-${slot}`]);
        if (meal) dayMeals.push(meal);
      });
      openDayNutritionModal(dayMeals, formatDateFull(dateISO));
      return;
    }
    const mealId = badge.dataset.mealId;
    const meal = getMeal(mealId);
    if (meal) openNutritionModal(meal);
  }, true);
}

/* ─── DELETE MEAL MODAL ─── */
let deleteMealId = null;

function bindDeleteModal() {
  document.getElementById('delete-cancel').addEventListener('click', closeDeleteModal);
  document.getElementById('delete-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeDeleteModal();
  });
  document.getElementById('delete-confirm').addEventListener('click', () => {
    if (!deleteMealId) return;
    const idx = state.masterMeals.findIndex(m => m.id === deleteMealId);
    if (idx >= 0) state.masterMeals.splice(idx, 1);
    for (const key in state.assignments) {
      if (state.assignments[key] === deleteMealId) delete state.assignments[key];
    }
    saveState();
    closeDeleteModal();
    renderDayTabs();
    renderPlanner();
  });

  // Delegate click on delete buttons
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.meal-delete-btn');
    if (!btn) return;
    e.stopPropagation();
    const mealId = btn.dataset.mealId;
    const meal = getMeal(mealId);
    if (!meal) return;
    deleteMealId = mealId;
    document.getElementById('delete-meal-name').textContent = meal.name;
    document.getElementById('delete-overlay').classList.add('open');
  });
}

function closeDeleteModal() {
  document.getElementById('delete-overlay').classList.remove('open');
  deleteMealId = null;
}

/* ─── PREFERENCES PAGE ─── */

const ALLERGENS = [
  'Milk', 'Eggs', 'Peanuts', 'Tree Nuts', 'Wheat', 'Soy',
  'Fish', 'Shellfish', 'Sesame', 'Mustard'
];

let prefsInitialized = false;

function getAllIngredientNames() {
  const names = new Set();
  state.masterMeals.forEach(m => m.ingredients.forEach(i => names.add(i.name)));
  (state.customIngredients || []).forEach(n => names.add(n));
  return [...names].sort((a, b) => a.localeCompare(b));
}

function renderPreferences() {
  // Allergens checklist
  const checklist = document.getElementById('allergen-checklist');
  const tagsEl = document.getElementById('allergen-tags');

  function renderAllergenChecklist() {
    checklist.innerHTML = ALLERGENS.map(a => {
      const checked = state.allergens.includes(a) ? 'checked' : '';
      return `<label class="allergen-item"><input type="checkbox" value="${esc(a)}" ${checked}><span>${esc(a)}</span></label>`;
    }).join('');
  }

  function renderAllergenTags() {
    // Show tags only for custom (non-preset) allergens
    const custom = state.allergens.filter(a => !ALLERGENS.includes(a));
    tagsEl.innerHTML = custom.map(a =>
      `<span class="allergen-tag">${esc(a)}<button class="allergen-tag-x" data-allergen="${esc(a)}">&times;</button></span>`
    ).join('');
  }

  renderAllergenChecklist();
  renderAllergenTags();

  if (!prefsInitialized) {
    checklist.addEventListener('change', e => {
      if (e.target.type !== 'checkbox') return;
      const val = e.target.value;
      if (e.target.checked) {
        if (!state.allergens.includes(val)) state.allergens.push(val);
      } else {
        state.allergens = state.allergens.filter(a => a !== val);
      }
      renderAllergenTags();
      saveState();
    });

    tagsEl.addEventListener('click', e => {
      const btn = e.target.closest('.allergen-tag-x');
      if (!btn) return;
      const val = btn.dataset.allergen;
      state.allergens = state.allergens.filter(a => a !== val);
      renderAllergenChecklist();
      renderAllergenTags();
      saveState();
    });

    // "Other" custom allergen input
    const otherInput = document.getElementById('allergen-other');
    otherInput.addEventListener('keydown', e => {
      if (e.key !== 'Enter') return;
      const val = otherInput.value.trim();
      if (val && !state.allergens.includes(val)) {
        state.allergens.push(val);
        renderAllergenTags();
        saveState();
      }
      otherInput.value = '';
    });

    // Diet goals
    const goalsEl = document.getElementById('diet-goals');
    goalsEl.value = state.dietGoals;
    goalsEl.addEventListener('input', () => {
      state.dietGoals = goalsEl.value;
      saveState();
    });
  }

  // Export / Import
  if (!prefsInitialized) {
    document.getElementById('export-prefs-btn').addEventListener('click', () => {
      const prefs = {
        ingredientTiers: state.ingredientTiers,
        allergens: state.allergens,
        dietGoals: state.dietGoals
      };
      const blob = new Blob([JSON.stringify(prefs, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'preferences.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });

    document.getElementById('import-meals-input').addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      const statusEl = document.getElementById('import-status');
      const reader = new FileReader();
      reader.onload = evt => {
        try {
          const meals = JSON.parse(evt.target.result);
          if (!Array.isArray(meals)) throw new Error('Expected a JSON array of meals — make sure you\'re importing generated-meals.json, not preferences.json');
          let added = 0;
          for (const meal of meals) {
            if (!meal.id || !meal.name || !meal.category) continue;
            if (getMeal(meal.id)) continue;
            state.masterMeals.push(meal);
            added++;
          }
          saveState();
          renderDayTabs();
          renderPlanner();
          statusEl.textContent = `✓ Imported ${added} meal${added !== 1 ? 's' : ''}.`;
        } catch (err) {
          statusEl.textContent = `✗ Import failed: ${err.message}`;
        }
        e.target.value = '';
      };
      reader.readAsText(file);
    });
  }

  // Custom ingredient add
  if (!prefsInitialized) {
    const addInput = document.getElementById('tier-bank-add-input');
    const addBtn = document.getElementById('tier-bank-add-btn');
    const submitCustomIngredient = () => {
      const raw = addInput.value.trim();
      if (!raw) return;
      const existing = getAllIngredientNames().find(n => n.toLowerCase() === raw.toLowerCase());
      if (existing) {
        if (state.ingredientTiers[existing] === 'trash') {
          delete state.ingredientTiers[existing];
          saveState();
          renderTierList();
        }
        addInput.value = '';
        return;
      }
      state.customIngredients.push(raw);
      saveState();
      addInput.value = '';
      renderTierList();
    };
    addBtn.addEventListener('click', submitCustomIngredient);
    addInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); submitCustomIngredient(); }
    });
  }

  // Tier list
  renderTierList();
  prefsInitialized = true;
}

function renderTierList() {
  const bank = document.getElementById('tier-bank');
  const allIngredients = getAllIngredientNames();

  // Clear tier drops
  document.querySelectorAll('.tier-drop').forEach(d => d.innerHTML = '');
  bank.innerHTML = '';

  allIngredients.forEach(name => {
    let tier = state.ingredientTiers[name];
    // migrate old "never" tier
    if (tier === 'never') { tier = 'try'; state.ingredientTiers[name] = 'try'; }
    if (tier === 'trash') return; // trashed — don't render
    const chip = createIngredientChip(name);
    if (tier) {
      const drop = document.querySelector(`.tier-drop[data-tier="${tier}"]`);
      if (drop) { drop.appendChild(chip); return; }
    }
    bank.appendChild(chip);
  });

  // Bind drag-and-drop for tier zones and bank
  bindTierDragDrop();
}

// Click-to-pick state
let pickedChip = null;
let pickedGhost = null;

function pickUpChip(chip) {
  // If clicking the same chip again, cancel
  if (pickedChip === chip) { dropPickedChip(); return; }
  // If another chip was picked, cancel it first
  if (pickedChip) dropPickedChip();

  pickedChip = chip;
  chip.classList.add('picked');

  pickedGhost = chip.cloneNode(true);
  pickedGhost.className = 'tier-chip tier-chip-ghost picked-ghost';
  pickedGhost.style.position = 'fixed';
  pickedGhost.style.pointerEvents = 'none';
  pickedGhost.style.zIndex = '9999';
  pickedGhost.style.display = 'none';
  document.body.appendChild(pickedGhost);

  document.addEventListener('mousemove', movePickedGhost);
}

function movePickedGhost(e) {
  if (!pickedGhost) return;
  pickedGhost.style.display = '';
  pickedGhost.style.left = (e.clientX + 12) + 'px';
  pickedGhost.style.top = (e.clientY - 14) + 'px';
}

function dropPickedChip() {
  if (pickedChip) pickedChip.classList.remove('picked');
  if (pickedGhost && pickedGhost.parentNode) pickedGhost.parentNode.removeChild(pickedGhost);
  document.removeEventListener('mousemove', movePickedGhost);
  pickedChip = null;
  pickedGhost = null;
  document.querySelectorAll('.tier-drop, .tier-bank, .tier-trash').forEach(el => el.classList.remove('drag-over'));
}

function insertChipInBank(bank, chip) {
  const name = chip.dataset.ingredient.toLowerCase();
  const children = [...bank.children];
  const insertBefore = children.find(c => c.dataset.ingredient && c.dataset.ingredient.toLowerCase() > name);
  if (insertBefore) {
    bank.insertBefore(chip, insertBefore);
  } else {
    bank.appendChild(chip);
  }
}

function placeChipInZone(chip, zone) {
  if (zone.classList.contains('tier-bank')) {
    insertChipInBank(zone, chip);
  } else {
    zone.appendChild(chip);
  }
}

function placePickedChip(zone) {
  if (!pickedChip) return;
  const name = pickedChip.dataset.ingredient;
  const isTrash = zone.classList.contains('tier-trash');

  if (isTrash) {
    pickedChip.remove();
    state.ingredientTiers[name] = 'trash';
  } else {
    placeChipInZone(pickedChip, zone);
    const tier = zone.dataset.tier || null;
    if (tier) {
      state.ingredientTiers[name] = tier;
    } else {
      delete state.ingredientTiers[name];
    }
  }
  saveState();
  dropPickedChip();
}

function createIngredientChip(name) {
  const chip = document.createElement('div');
  chip.className = 'tier-chip';
  chip.draggable = true;
  chip.dataset.ingredient = name;
  if (!hasNutritionData(name)) {
    chip.innerHTML = esc(name) + ' <span class="chip-no-nutrition" title="No nutritional info available">&#9888;</span>';
  } else {
    chip.innerHTML = esc(name) + ' <button class="chip-nf-badge" title="View Nutrition Facts">NF</button>';
  }

  // NF badge click — open nutrition modal, don't start drag
  const nfBtn = chip.querySelector('.chip-nf-badge');
  if (nfBtn) {
    nfBtn.addEventListener('click', e => {
      e.stopPropagation();
      e.preventDefault();
      // Build a minimal ingredient object with a generic "100g" amount for the label
      openIngredientNutritionModal({ name, amount: '100 g' });
    });
    nfBtn.addEventListener('mousedown', e => e.stopPropagation());
    nfBtn.addEventListener('touchstart', e => e.stopPropagation());
  }

  // Click to pick up
  chip.addEventListener('click', e => {
    if (e.target.closest('.chip-nf-badge') || e.target.closest('.chip-no-nutrition')) return;
    e.stopPropagation();
    pickUpChip(chip);
  });

  chip.addEventListener('dragstart', e => {
    // Cancel any picked chip when starting a real drag
    if (pickedChip) dropPickedChip();
    e.dataTransfer.setData('text/plain', name);
    chip.classList.add('dragging');
  });
  chip.addEventListener('dragend', () => chip.classList.remove('dragging'));

  // Touch drag support — distinguish taps from drags
  let touchClone = null;
  let touchStartX = 0, touchStartY = 0;
  let touchOffsetX = 0, touchOffsetY = 0;
  let touchDragging = false;
  const DRAG_THRESHOLD = 8;

  chip.addEventListener('touchstart', e => {
    const touch = e.touches[0];
    const rect = chip.getBoundingClientRect();
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    touchOffsetX = touch.clientX - rect.left;
    touchOffsetY = touch.clientY - rect.top;
    touchDragging = false;
    // Cancel any picked chip when starting a touch
    if (pickedChip) dropPickedChip();
  }, { passive: true });

  chip.addEventListener('touchmove', e => {
    const touch = e.touches[0];
    const dx = touch.clientX - touchStartX;
    const dy = touch.clientY - touchStartY;

    // Only start drag once finger moves past threshold
    if (!touchDragging) {
      if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;
      touchDragging = true;
      touchClone = chip.cloneNode(true);
      touchClone.className = 'tier-chip dragging tier-chip-ghost';
      touchClone.style.position = 'fixed';
      touchClone.style.zIndex = '9999';
      touchClone.style.pointerEvents = 'none';
      document.body.appendChild(touchClone);
      chip.classList.add('dragging');
    }

    e.preventDefault();
    touchClone.style.left = (touch.clientX - touchOffsetX) + 'px';
    touchClone.style.top = (touch.clientY - touchOffsetY) + 'px';

    // Highlight drop target
    document.querySelectorAll('.tier-drop, .tier-bank, .tier-trash').forEach(el => el.classList.remove('drag-over'));
    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    const dropZone = target?.closest('.tier-drop, .tier-bank, .tier-trash');
    if (dropZone) dropZone.classList.add('drag-over');
  }, { passive: false });

  chip.addEventListener('touchend', e => {
    if (!touchDragging) {
      // Short tap — let the click handler deal with it (pick up)
      return;
    }
    // Suppress synthetic click after a drag
    chip.addEventListener('click', function suppress(ev) {
      ev.stopImmediatePropagation();
      chip.removeEventListener('click', suppress, true);
    }, { once: true, capture: true });

    const touch = e.changedTouches[0];
    if (touchClone && touchClone.parentNode) touchClone.parentNode.removeChild(touchClone);
    touchClone = null;
    touchDragging = false;
    chip.classList.remove('dragging');

    document.querySelectorAll('.tier-drop, .tier-bank, .tier-trash').forEach(el => el.classList.remove('drag-over'));
    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    const trashZone = target?.closest('.tier-trash');
    if (trashZone) {
      chip.remove();
      state.ingredientTiers[name] = 'trash';
      saveState();
      return;
    }
    const dropZone = target?.closest('.tier-drop, .tier-bank');
    if (dropZone) {
      placeChipInZone(chip, dropZone);
      const tier = dropZone.dataset.tier || null;
      if (tier) {
        state.ingredientTiers[name] = tier;
      } else {
        delete state.ingredientTiers[name];
      }
      saveState();
    }
  });

  return chip;
}

function bindTierDragDrop() {
  const allZones = document.querySelectorAll('.tier-drop, .tier-bank, .tier-trash');

  allZones.forEach(zone => {
    // Drag-and-drop
    zone.addEventListener('dragover', e => {
      e.preventDefault();
      zone.classList.add('drag-over');
    });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', e => {
      e.preventDefault();
      zone.classList.remove('drag-over');
      const name = e.dataTransfer.getData('text/plain');
      const chip = document.querySelector(`.tier-chip.dragging[data-ingredient="${CSS.escape(name)}"]`);
      if (!chip) return;
      if (zone.classList.contains('tier-trash')) {
        chip.remove();
        state.ingredientTiers[name] = 'trash';
      } else {
        placeChipInZone(chip, zone);
        const tier = zone.dataset.tier || null;
        if (tier) { state.ingredientTiers[name] = tier; }
        else { delete state.ingredientTiers[name]; }
      }
      saveState();
    });

    // Click-to-place
    zone.addEventListener('click', e => {
      if (!pickedChip) return;
      // Don't trigger if they clicked a chip inside the zone (that would pick up that chip instead)
      if (e.target.closest('.tier-chip')) return;
      placePickedChip(zone);
    });

    // Hover highlight when a chip is picked
    zone.addEventListener('mouseenter', () => { if (pickedChip) zone.classList.add('drag-over'); });
    zone.addEventListener('mouseleave', () => zone.classList.remove('drag-over'));
  });

  // Cancel pick on Escape or clicking outside
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && pickedChip) dropPickedChip(); });
  document.addEventListener('click', e => {
    if (!pickedChip) return;
    if (e.target.closest('.tier-chip, .tier-drop, .tier-bank, .tier-trash')) return;
    dropPickedChip();
  });
}

/* ─── HELPERS ─── */
function esc(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/* ─── START ─── */
document.addEventListener('DOMContentLoaded', init);

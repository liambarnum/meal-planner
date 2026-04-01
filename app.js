/* ─── STATE ─── */
const SLOTS = ['Breakfast', 'Lunch', 'Snack', 'Dinner', 'Dessert'];
const SECTIONS = ['Produce', 'Dairy', 'Meat and Seafood', 'Pantry and Grains', 'Canned and Jarred', 'Refrigerated', 'Frozen'];
const FIBER_TARGET = 30; // grams per day
const DAY_ABBRS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const DAY_NOTES = {
  0: "Prep day — batch-cook fiber-rich grains and roast vegetables for the week.",
  1: "Start strong with high-fiber breakfast and prebiotic-rich foods.",
  2: "Focus on fermented foods and diverse plant fibers today.",
  3: "Midweek balance — lean proteins with plenty of colorful vegetables.",
  4: "Increase omega-3 intake to support gut lining repair.",
  5: "Polyphenol-rich foods today — berries, dark chocolate, green tea.",
  6: "Flexible day — maintain fiber goals while enjoying variety."
};

let state = {
  currentPage: 'planner',
  currentDay: 'All',        // 'All' or ISO date string like '2026-03-31'
  assignments: {},           // { "2026-03-31-Breakfast": "meal-id", ... }
  checkedItems: {},
  apiKey: '',
  usdaApiKey: '',
  masterMeals: [],
  chatHistory: [],
  dateRangeStart: null,      // ISO date string
  dateRangeLength: 7         // number of days
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

function getDayNote(iso) {
  return DAY_NOTES[parseDate(iso).getDay()];
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
  registerSW();

  // Start background USDA data fetch for all ingredients
  initNutritionData(state.masterMeals);
}

function loadState() {
  try {
    const saved = localStorage.getItem('mealPlannerState');
    if (saved) {
      const parsed = JSON.parse(saved);
      state.assignments = parsed.assignments || {};
      state.checkedItems = parsed.checkedItems || {};
      state.apiKey = parsed.apiKey || '';
      state.usdaApiKey = parsed.usdaApiKey || '';
      state.chatHistory = parsed.chatHistory || [];
      state.dateRangeStart = parsed.dateRangeStart || null;
      state.dateRangeLength = parsed.dateRangeLength || 7;
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
    usdaApiKey: state.usdaApiKey,
    chatHistory: state.chatHistory,
    customMeals: customMeals,
    dateRangeStart: state.dateRangeStart,
    dateRangeLength: state.dateRangeLength
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
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      state.currentPage = tab.dataset.page;
      document.getElementById('page-planner').style.display = state.currentPage === 'planner' ? '' : 'none';
      document.getElementById('page-grocery').style.display = state.currentPage === 'grocery' ? '' : 'none';
      if (state.currentPage === 'grocery') renderGrocery();
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
  allBtn.className = 'day-tab' + (state.currentDay === 'All' ? ' active' : '');
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
    if (iso === todayISO()) btn.classList.add('today');
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
    const header = document.createElement('div');
    header.className = 'category-header';
    header.textContent = cat;
    container.appendChild(header);
    meals.forEach(meal => {
      container.appendChild(createMealCard(meal));
    });
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
      ${(meal.ingredients || []).map(ing => `
        <div class="ingredient-row">
          <span class="ingredient-amount">${esc(ing.amount)}</span>
          <span class="ingredient-info">
            <span class="ingredient-name">${esc(ing.name)}</span>
            ${ing.detail ? `<span class="ingredient-detail">${esc(ing.detail)}</span>` : ''}
          </span>
        </div>
      `).join('')}
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
  const hasWarning = hasUnacknowledgedWarnings(meal);
  card.innerHTML = `
    <div class="meal-card-name">${esc(meal.name)}</div>
    <div class="meal-card-desc">${esc(meal.description)}</div>
    <div class="meal-card-actions">
      <div class="macro-badge">
        <span>F: ${meal.macros.fats}g</span>
        <span>C: ${meal.macros.carbs}g</span>
        <span class="fiber">Fb: ${meal.macros.fiber}g</span>
        <span>P: ${meal.macros.protein}g</span>
      </div>
      <button class="nutrition-badge${hasWarning ? ' has-warning' : ''}" data-meal-id="${esc(meal.id)}" title="View Nutrition Facts">
        NF
        ${hasWarning ? '<span class="nutrition-warning-triangle" title="Some nutrition data needs attention">&#9888;</span>' : ''}
      </button>
    </div>
    ${renderIngredientsList(meal)}
  `;
  bindIngredientsToggle(card);
  card.addEventListener('click', (e) => {
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

  const fiberPct = Math.min(100, Math.round((totals.fiber / FIBER_TARGET) * 100));

  const summary = document.createElement('div');
  summary.className = 'day-summary';
  summary.innerHTML = `
    <div class="day-summary-title">${formatDateFull(dateISO)}</div>
    <div class="day-macros">
      <span>Fats: ${totals.fats}g</span>
      <span>Carbs: ${totals.carbs}g</span>
      <span>Fiber: ${totals.fiber}g</span>
      <span>Protein: ${totals.protein}g</span>
    </div>
    <div class="fiber-bar-container">
      <div class="fiber-bar-label">Fiber: ${totals.fiber}g / ${FIBER_TARGET}g (${fiberPct}%)</div>
      <div class="fiber-bar-track">
        <div class="fiber-bar-fill" style="width: ${fiberPct}%"></div>
      </div>
    </div>
    <div class="day-note">${getDayNote(dateISO)}</div>
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
      const hasWarning = hasUnacknowledgedWarnings(meal);
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
            <button class="nutrition-badge${hasWarning ? ' has-warning' : ''}" data-meal-id="${esc(meal.id)}" title="View Nutrition Facts">
              NF
              ${hasWarning ? '<span class="nutrition-warning-triangle" title="Some nutrition data needs attention">&#9888;</span>' : ''}
            </button>
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

  const usdaKeyInput = document.getElementById('usda-api-key');

  if (state.apiKey) apiKeyInput.value = state.apiKey;
  if (state.usdaApiKey) usdaKeyInput.value = state.usdaApiKey;
  renderChatMessages();

  apiKeyInput.addEventListener('change', () => {
    state.apiKey = apiKeyInput.value.trim();
    saveState();
  });

  usdaKeyInput.addEventListener('change', () => {
    state.usdaApiKey = usdaKeyInput.value.trim();
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
- Target ${FIBER_TARGET}g of fiber per day
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

/* ─── NUTRITION BADGE DELEGATION ─── */
function bindNutritionDelegation() {
  // Use capture phase so this fires before card-level click handlers
  document.addEventListener('click', (e) => {
    const badge = e.target.closest('.nutrition-badge');
    if (!badge) return;
    e.stopPropagation();
    e.preventDefault();
    const mealId = badge.dataset.mealId;
    const meal = getMeal(mealId);
    if (meal) openNutritionModal(meal);
  }, true);
}

/* ─── HELPERS ─── */
function esc(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/* ─── START ─── */
document.addEventListener('DOMContentLoaded', init);

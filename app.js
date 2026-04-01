/* ─── STATE ─── */
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const SLOTS = ['Breakfast', 'Lunch', 'Snack', 'Dinner', 'Dessert'];
const SECTIONS = ['Produce', 'Dairy', 'Meat and Seafood', 'Pantry and Grains', 'Canned and Jarred', 'Refrigerated', 'Frozen'];
const FIBER_TARGET = 30; // grams per day

const DAY_NOTES = {
  Sun: "Prep day — batch-cook fiber-rich grains and roast vegetables for the week.",
  Mon: "Start strong with high-fiber breakfast and prebiotic-rich foods.",
  Tue: "Focus on fermented foods and diverse plant fibers today.",
  Wed: "Midweek balance — lean proteins with plenty of colorful vegetables.",
  Thu: "Increase omega-3 intake to support gut lining repair.",
  Fri: "Polyphenol-rich foods today — berries, dark chocolate, green tea.",
  Sat: "Flexible day — maintain fiber goals while enjoying variety."
};

let state = {
  currentPage: 'planner',
  currentDay: 'All',
  assignments: {},   // { "Mon-Breakfast": "meal-id", ... }
  checkedItems: {},   // { "ingredient-key": true, ... }
  apiKey: '',
  masterMeals: [],    // working copy of MEALS
  chatHistory: []
};

/* ─── INIT ─── */
function init() {
  loadState();
  state.masterMeals = JSON.parse(JSON.stringify(MEALS));
  mergeSavedMeals();
  renderDayTabs();
  renderPlanner();
  bindNav();
  bindModal();
  bindChat();
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
  // Save meals that differ from defaults or are new
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
    customMeals: customMeals
  }));
}

function getMeal(id) {
  return state.masterMeals.find(m => m.id === id);
}

/* ─── SERVICE WORKER ─── */
function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js').catch(() => {});
  }
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
  const container = document.getElementById('day-tabs');
  container.innerHTML = '';
  const tabs = ['All', ...DAYS];
  tabs.forEach(day => {
    const btn = document.createElement('button');
    btn.className = 'day-tab' + (day === state.currentDay ? ' active' : '');
    btn.textContent = day;
    btn.addEventListener('click', () => {
      state.currentDay = day;
      document.querySelectorAll('.day-tab').forEach(t => t.classList.remove('active'));
      btn.classList.add('active');
      renderPlanner();
    });
    container.appendChild(btn);
  });
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

function createMealCard(meal) {
  const card = document.createElement('div');
  card.className = 'meal-card';
  card.innerHTML = `
    <div class="meal-card-name">${esc(meal.name)}</div>
    <div class="meal-card-desc">${esc(meal.description)}</div>
    <div class="macro-badge">
      <span>F: ${meal.macros.fats}g</span>
      <span>C: ${meal.macros.carbs}g</span>
      <span class="fiber">Fb: ${meal.macros.fiber}g</span>
      <span>P: ${meal.macros.protein}g</span>
    </div>
  `;
  card.addEventListener('click', () => openModal(meal.id));
  return card;
}

function renderDayView(container, day) {
  container.innerHTML = '';

  // Day summary
  const totals = { fats: 0, carbs: 0, fiber: 0, protein: 0 };
  SLOTS.forEach(slot => {
    const key = `${day}-${slot}`;
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
    <div class="day-summary-title">${dayFullName(day)}</div>
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
    <div class="day-note">${DAY_NOTES[day]}</div>
  `;
  container.appendChild(summary);

  // Meal slots
  SLOTS.forEach(slot => {
    const key = `${day}-${slot}`;
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
          <div class="macro-badge">
            <span>F: ${meal.macros.fats}g</span>
            <span>C: ${meal.macros.carbs}g</span>
            <span class="fiber">Fb: ${meal.macros.fiber}g</span>
            <span>P: ${meal.macros.protein}g</span>
          </div>
          <button class="slot-remove" title="Remove meal">&times;</button>
        </div>
      `;
      slotEl.querySelector('.slot-remove').addEventListener('click', (e) => {
        e.stopPropagation();
        delete state.assignments[key];
        saveState();
        renderPlanner();
      });
    } else {
      slotEl.innerHTML = `
        <div class="slot-label">${slot}</div>
        <div class="slot-empty">+ Tap to assign a meal</div>
      `;
      slotEl.querySelector('.slot-empty').addEventListener('click', () => {
        openModal(null, day, slot);
      });
    }

    container.appendChild(slotEl);
  });
}

/* ─── MODAL ─── */
let modalMealId = null;

function bindModal() {
  document.getElementById('modal-cancel').addEventListener('click', closeModal);
  document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal();
  });
  document.getElementById('modal-confirm').addEventListener('click', () => {
    const day = document.getElementById('modal-day').value;
    const slot = document.getElementById('modal-slot').value;
    if (modalMealId) {
      state.assignments[`${day}-${slot}`] = modalMealId;
      saveState();
      // Switch to the assigned day
      state.currentDay = day;
      renderDayTabs();
      renderPlanner();
    }
    closeModal();
  });
}

function openModal(mealId, preDay, preSlot) {
  modalMealId = mealId;

  if (mealId) {
    const meal = getMeal(mealId);
    document.getElementById('modal-title').textContent = `Assign: ${meal ? meal.name : 'Meal'}`;
  } else {
    document.getElementById('modal-title').textContent = 'Select a meal first from the All tab';
  }

  if (preDay) document.getElementById('modal-day').value = preDay;
  if (preSlot) document.getElementById('modal-slot').value = preSlot;

  // If opened from an empty slot, show meal selection instead
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

/* ─── GROCERY LIST ─── */
let grocerySection = 'Produce';

function renderGrocery() {
  const content = document.getElementById('grocery-content');
  content.innerHTML = '';

  // Header
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

  // Build ingredient map from assigned meals only
  const ingredientMap = {};
  for (const [key, mealId] of Object.entries(state.assignments)) {
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
    empty.textContent = grocerySection === Object.keys(ingredientMap).find(k => ingredientMap[k] && Object.keys(ingredientMap[k]).length > 0)
      ? 'No items in this section.'
      : Object.keys(state.assignments).length === 0
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

  // Restore chat history
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
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChat();
    }
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
  // Keep last 50 messages
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
  // Build current assignment state
  const assignmentLines = [];
  DAYS.forEach(day => {
    SLOTS.forEach(slot => {
      const key = `${day}-${slot}`;
      const meal = getMeal(state.assignments[key]);
      assignmentLines.push(`${day} ${slot}: ${meal ? meal.name : '(empty)'}`);
    });
  });

  const allMealNames = state.masterMeals.map(m => `- ${m.name} [${m.category}] (id: ${m.id})`).join('\n');

  return `You are a helpful meal planning assistant focused on gut health and weight loss.

DIETARY GOALS:
- Promote gut health through high-fiber, diverse plant-based foods
- Support weight loss with balanced macros and portion control
- Target ${FIBER_TARGET}g of fiber per day
- Encourage fermented foods, prebiotics, and polyphenol-rich ingredients

CURRENT MEAL ASSIGNMENTS:
${assignmentLines.join('\n')}

AVAILABLE MEALS IN MASTER LIST:
${allMealNames}

CURRENT CONTEXT:
- Active day tab: ${state.currentDay}
- Page: ${state.currentPage}

CAPABILITIES - You can instruct data changes using these exact formats on their own line:
[ADD_MEAL] id|name|category|description|fats|carbs|fiber|protein|ingredients_json
[EDIT_MEAL] id|field|new_value
[REMOVE_MEAL] id
[ASSIGN] day-slot|meal_id
[UNASSIGN] day-slot

For ingredients_json use: [{"name":"X","amount":"Y","section":"Z"}]
Valid categories: Breakfast, Lunch, Snack, Dinner, Dessert
Valid days: Sun, Mon, Tue, Wed, Thu, Fri, Sat
Valid slots: Breakfast, Lunch, Snack, Dinner, Dessert

When making changes, include the command AND a natural language explanation. Keep responses concise and helpful.`;
}

function processAssistantActions(reply) {
  const lines = reply.split('\n');
  let changed = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // [ADD_MEAL] id|name|category|description|fats|carbs|fiber|protein|ingredients_json
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
        try {
          if (parts[8]) newMeal.ingredients = JSON.parse(parts[8].trim());
        } catch (e) { /* no ingredients */ }
        if (!getMeal(newMeal.id)) {
          state.masterMeals.push(newMeal);
          changed = true;
        }
      }
    }

    // [EDIT_MEAL] id|field|new_value
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
          else if (field === 'ingredients') {
            try { meal.ingredients = JSON.parse(value); } catch (e) {}
          }
          changed = true;
        }
      }
    }

    // [REMOVE_MEAL] id
    if (trimmed.startsWith('[REMOVE_MEAL]')) {
      const id = trimmed.replace('[REMOVE_MEAL]', '').trim();
      const idx = state.masterMeals.findIndex(m => m.id === id);
      if (idx >= 0) {
        state.masterMeals.splice(idx, 1);
        // Remove any assignments of this meal
        for (const key in state.assignments) {
          if (state.assignments[key] === id) delete state.assignments[key];
        }
        changed = true;
      }
    }

    // [ASSIGN] day-slot|meal_id
    if (trimmed.startsWith('[ASSIGN]')) {
      const parts = trimmed.replace('[ASSIGN]', '').trim().split('|');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const mealId = parts[1].trim();
        if (getMeal(mealId)) {
          state.assignments[key] = mealId;
          changed = true;
        }
      }
    }

    // [UNASSIGN] day-slot
    if (trimmed.startsWith('[UNASSIGN]')) {
      const key = trimmed.replace('[UNASSIGN]', '').trim();
      if (state.assignments[key]) {
        delete state.assignments[key];
        changed = true;
      }
    }
  }

  if (changed) {
    saveState();
    renderPlanner();
  }
}

/* ─── HELPERS ─── */
function esc(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function dayFullName(abbr) {
  const map = { Sun: 'Sunday', Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday' };
  return map[abbr] || abbr;
}

/* ─── START ─── */
document.addEventListener('DOMContentLoaded', init);

const toast = document.getElementById('toast');
let toastTimeout = null;
function showToast(msg) {
  if (!toast) return;
  toast.textContent = msg;
  toast.style.display = 'flex';
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.style.display = 'none';
  }, 2500);
}
const ACCENT_KEY = 'lifeDash.accent';
const accentColorPicker = document.getElementById('accentColorPicker');
function setAccentColor(color) {
  document.documentElement.style.setProperty('--primary', color);
  localStorage.setItem(ACCENT_KEY, color);
}
if (accentColorPicker) {
  const saved = localStorage.getItem(ACCENT_KEY);
  const defaultColor = getComputedStyle(document.documentElement).getPropertyValue('--primary-default').trim() || '#4f46e5';
  accentColorPicker.value = saved || defaultColor;
  setAccentColor(accentColorPicker.value);
  accentColorPicker.addEventListener('input', (e) => {
    setAccentColor(e.target.value);
  });
}
const cancelBtn = document.getElementById('cancelBtn');
if (cancelBtn) {
  cancelBtn.addEventListener('click', () => {
    modal.close();
  });
}
// Storage + utils
const STORAGE_KEY = 'lifeDash.tasks.v1';
const THEME_KEY = 'lifeDash.theme';
const todayISO = () => new Date().toISOString().slice(0,10);
const parseDate = (iso) => iso ? new Date(`${iso}T00:00:00`) : null;
const daysBetween = (a,b) => Math.floor((a - b) / 86_400_000);

// crypto.randomUUID polyfill (older Safari)
if (!(crypto && 'randomUUID' in crypto)) {
  crypto.randomUUID = () =>
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random()*16|0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
}

// State
/** @type {Array<{id:string,name:string,frequencyDays:number,lastDone?:string,notes?:string,pinned?:boolean,active?:boolean,lastCompleted?:string}>} */
let tasks = [];
let filter = 'all';
let q = '';

// Elements
const listEl = document.getElementById('taskList');
const modal = document.getElementById('taskModal');
const form = document.getElementById('taskForm');
const tpl = document.getElementById('taskCardTpl');
const addBtn = document.getElementById('addTaskBtn');
const searchInput = document.getElementById('searchInput');
const resetBtn = document.getElementById('resetBtn');
const markAllDoneBtn = document.getElementById('markAllDoneBtn');
const clearCompletedBtn = document.getElementById('clearCompletedBtn');
// Quick Actions
if (markAllDoneBtn) {
  markAllDoneBtn.addEventListener('click', () => {
    const today = todayISO();
    let changed = false;
    tasks.forEach(t => {
      if ((t.active ?? true) && (!t.lastCompleted || t.lastCompleted !== today)) {
        t.lastDone = today;
        t.lastCompleted = today;
        changed = true;
      }
    });
    if (changed) { save(); render(); }
  });
}

if (clearCompletedBtn) {
  clearCompletedBtn.addEventListener('click', () => {
    const today = todayISO();
    let changed = false;
    tasks.forEach(t => {
      if (t.lastCompleted === today) {
        t.lastCompleted = undefined;
        changed = true;
      }
    });
    if (changed) { save(); render(); }
  });
}
const themeBtn = document.getElementById('themeBtn');
const statOverdue = document.getElementById('statOverdue');
const statSoon = document.getElementById('statSoon');
const statTotal = document.getElementById('statTotal');
const filterBtns = Array.from(document.querySelectorAll('.filterBtn'));
const modalTitle = document.getElementById('modalTitle');

// Data
function seed(){
  return [
    { id: crypto.randomUUID(), name:'Wash sheets', frequencyDays:7, lastDone: todayISO(), pinned:true, active:true, notes:'Rotate pillowcases' },
    { id: crypto.randomUUID(), name:'Laundry', frequencyDays:5, lastDone: todayISO(), active:true },
    { id: crypto.randomUUID(), name:'Clean kitchen', frequencyDays:2, lastDone: todayISO(), active:true },
    { id: crypto.randomUUID(), name:'Vacuum', frequencyDays:7, active:true },
    { id: crypto.randomUUID(), name:'Take out trash', frequencyDays:2, active:true }
  ];
}
function load(){
  const raw = localStorage.getItem(STORAGE_KEY);
  tasks = raw ? JSON.parse(raw) : seed();
}
function save(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

// Helpers
function compute(task){
  const now = parseDate(todayISO());
  const last = parseDate(task.lastDone);
  const since = last ? daysBetween(now, last) : Number.POSITIVE_INFINITY;
  const dueIn = isFinite(since) ? task.frequencyDays - since : -9999;
  let status = 'ok';
  if (dueIn <= 0) status = 'overdue';
  else if (dueIn <= 2) status = 'soon';
  return { since, dueIn, status };
}
function statusLabel(status, dueIn){
  if (status === 'overdue') return `Overdue by ${Math.abs(dueIn)}d`;
  if (status === 'soon') return `Due in ${dueIn}d`;
  return 'On track';
}
function detailsText(task, meta){
  const freq = `Repeat: ${task.frequencyDays} days`;
  if (!task.lastDone) {
    return `${freq} • Last done: — (never)`;
  }
  const last = new Date(task.lastDone).toLocaleDateString();
  const since = isFinite(meta.since) ? `(${meta.since} days ago)` : '';
  return `${freq} • Last done: ${last} ${since}`;
}

// Render
function render(){
  const items = tasks
    .map(t => ({ t, m: compute(t) }))
    .filter(({t,m})=>{
      const matchesQ = !q || t.name.toLowerCase().includes(q);
      const matchesActive = filter === 'completed' ? !!t.lastCompleted && t.lastCompleted === todayISO() : (t.active ?? true);
      let matchesFilter = true;
      if (filter === 'overdue') matchesFilter = m.status === 'overdue';
      else if (filter === 'soon') matchesFilter = m.status === 'soon';
      else if (filter === 'ok') matchesFilter = m.status === 'ok';
      else if (filter === 'completed') matchesFilter = !!t.lastCompleted && t.lastCompleted === todayISO();
      return matchesQ && matchesFilter;
    })
    .sort((a,b)=>{
      if ((b.t.pinned|0) - (a.t.pinned|0)) return (b.t.pinned|0) - (a.t.pinned|0);
      const rank = s=> s==='overdue'?2 : s==='soon'?1 : 0;
      const r = rank(b.m.status) - rank(a.m.status);
      if (r) return r;
      if (a.m.dueIn !== b.m.dueIn) return a.m.dueIn - b.m.dueIn;
      return a.t.name.localeCompare(b.t.name);
    });

  // Stats
  const active = tasks.filter(t=> t.active ?? true);
  statTotal.textContent = active.length;
  statOverdue.textContent = active.filter(t=> compute(t).status==='overdue').length;
  statSoon.textContent = active.filter(t=> compute(t).status==='soon').length;

  // List
  listEl.innerHTML = '';
  if (!items.length){
    listEl.innerHTML = `
      <div class="empty-state" style="text-align:center;padding:3rem 0;display:flex;flex-direction:column;align-items:center;gap:1.5rem;">
        <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="10" y="20" width="60" height="40" rx="8" fill="var(--panel)" stroke="var(--border)" stroke-width="2"/>
          <rect x="22" y="32" width="36" height="8" rx="2" fill="var(--muted)"/>
          <rect x="22" y="44" width="24" height="6" rx="2" fill="var(--muted)"/>
          <circle cx="40" cy="60" r="4" fill="var(--primary)"/>
        </svg>
        <div class="muted" style="font-size:1.1rem;">No tasks yet! Click <b>Add Task</b> to get started.</div>
      </div>
    `;
    return;
  }
  for (const {t,m} of items){
    const node = tpl.content.firstElementChild.cloneNode(true);
    node.querySelector('.name').textContent = t.name;
    node.querySelector('.details').textContent = detailsText(t,m);
    const notesEl = node.querySelector('.notes');
    if (t.notes) { notesEl.textContent = t.notes; notesEl.classList.remove('hidden'); }

    const statusTag = node.querySelector('.statusTag');
    statusTag.textContent = statusLabel(m.status, m.dueIn);
    statusTag.classList.add(m.status === 'overdue' ? 'red' : m.status === 'soon' ? 'yellow' : 'green');

    node.querySelector('.pinnedTag').classList.toggle('hidden', !t.pinned);
    node.querySelector('.completedTag').classList.toggle('hidden', t.lastCompleted !== todayISO());

    node.querySelector('.markBtn').addEventListener('click', ()=> markDone(t.id));
    node.querySelector('.editBtn').addEventListener('click', ()=> openModal(t));
    node.querySelector('.deleteBtn').addEventListener('click', ()=> delTask(t.id));

    listEl.appendChild(node);
  }
}

// CRUD
function openModal(task){
  form.reset();
  if (task){
    document.getElementById('modalTitle').textContent = 'Edit Task';
    form.name.value = task.name;
    form.frequencyDays.value = task.frequencyDays;
    form.lastDone.value = task.lastDone || '';
    form.notes.value = task.notes || '';
    form.pinned.checked = !!task.pinned;
    form.active.checked = task.active ?? true;
    form.id.value = task.id;
  } else {
    document.getElementById('modalTitle').textContent = 'Add Task';
    form.lastDone.value = todayISO();
    form.active.checked = true;
    form.id.value = '';
  }
  modal.showModal();
}

function upsertFromForm(){
  const data = Object.fromEntries(new FormData(form).entries());
  const item = {
    id: data.id || crypto.randomUUID(),
    name: String(data.name).trim(),
    frequencyDays: Math.max(1, parseInt(data.frequencyDays||'1',10)),
    lastDone: data.lastDone || '',
    notes: String(data.notes||'').trim(),
    pinned: !!data.pinned,
    active: !!data.active,
    lastCompleted: undefined
  };
  const idx = tasks.findIndex(t=> t.id === item.id);
  if (idx >= 0) {
    tasks[idx] = {...tasks[idx], ...item};
    showToast('Task updated');
  } else {
    tasks.push(item);
    showToast('Task added');
  }
  save(); render();
}
function delTask(id){
  if (!confirm('Delete this task?')) return;
  tasks = tasks.filter(t=> t.id !== id);
  save();
  render();
  showToast('Task deleted');
}
function markDone(id){
  const t = tasks.find(x=>x.id===id);
  if(!t) return;
  t.lastDone = todayISO();
  t.lastCompleted = todayISO();
  save();
  render();
  showToast('Task marked done');
}

// Events
addBtn.addEventListener('click', ()=> openModal());
document.addEventListener('keydown', (e)=>{
  if ((e.metaKey||e.ctrlKey) && e.key.toLowerCase()==='d'){
    const first = tasks.slice().sort((a,b)=> a.name.localeCompare(b.name))[0];
    if (first) markDone(first.id);
  }
});
filterBtns.forEach(b => b.addEventListener('click', ()=>{
  filter = b.dataset.filter; render();
}));
resetBtn.addEventListener('click', ()=>{
  filter='all'; q=''; searchInput.value=''; render();
});
searchInput.addEventListener('input', ()=>{
  q = searchInput.value.trim().toLowerCase(); render();
});

// Form submit uses method="dialog" values
modal.addEventListener('close', ()=>{
  if (modal.returnValue === 'save') upsertFromForm();
  // if 'cancel' or Esc, do nothing
});

// Theme

function applyTheme(t){
  document.body.classList.remove('light','dark');
  document.body.classList.add(t === 'dark' ? 'dark' : 'light');
  localStorage.setItem(THEME_KEY, t);
  // Update theme-color meta
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute('content', t === 'dark' ? '#0b0b0f' : '#ffffff');
  }
}

themeBtn.addEventListener('click', ()=>{
  const curr = localStorage.getItem(THEME_KEY) || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  applyTheme(curr === 'light' ? 'dark' : 'light');
});

// Boot
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
applyTheme(localStorage.getItem(THEME_KEY) || (prefersDark ? 'dark' : 'light'));
load();
render();

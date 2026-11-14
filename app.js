/**
 * Google Antigravity & Material 3 Expressive - High-Performance Controller
 * Sub-millisecond reactive updates, offline vector icons, and hardware-accelerated animations
 */

const ACCENT_PRESETS = [
  { name: "Cyan", hex: "#22D3EE" },
  { name: "Electric Blue", hex: "#3B82F6" },
  { name: "Sky Blue", hex: "#0EA5E9" },
  { name: "Deep Purple", hex: "#8B5CF6" },
  { name: "Violet", hex: "#A855F7" },
  { name: "Emerald", hex: "#10B981" },
  { name: "Teal", hex: "#14B8A6" },
  { name: "Rose Pink", hex: "#F43F5E" },
  { name: "Hot Pink", hex: "#EC4899" },
  { name: "Orange", hex: "#F97316" },
  { name: "Amber", hex: "#F59E0B" },
  { name: "Red", hex: "#EF4444" }
];

const GRADIENT_PRESETS = [
  { name: "Aurora Borealis", hex: "#22D3EE", secondary: "#10B981", gradient: "linear-gradient(135deg, #22D3EE 0%, #10B981 100%)" },
  { name: "Cyberpunk Neon", hex: "#EC4899", secondary: "#8B5CF6", gradient: "linear-gradient(135deg, #EC4899 0%, #8B5CF6 100%)" },
  { name: "Electric Ocean", hex: "#3B82F6", secondary: "#22D3EE", gradient: "linear-gradient(135deg, #3B82F6 0%, #22D3EE 100%)" },
  { name: "Sunset Ember", hex: "#F97316", secondary: "#EF4444", gradient: "linear-gradient(135deg, #F97316 0%, #EF4444 100%)" },
  { name: "Cosmic Galaxy", hex: "#8B5CF6", secondary: "#3B82F6", gradient: "linear-gradient(135deg, #8B5CF6 0%, #3B82F6 100%)" },
  { name: "Golden Dawn", hex: "#F59E0B", secondary: "#F43F5E", gradient: "linear-gradient(135deg, #F59E0B 0%, #F43F5E 100%)" },
  { name: "Emerald Frost", hex: "#10B981", secondary: "#06B6D4", gradient: "linear-gradient(135deg, #10B981 0%, #06B6D4 100%)" },
  { name: "Midnight Plum", hex: "#7C3AED", secondary: "#EC4899", gradient: "linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)" }
];

const BUILDING_COLOR_PRESETS = [
  "#22D3EE", "#3B82F6", "#8B5CF6", "#10B981",
  "#F59E0B", "#F97316", "#F43F5E", "#EC4899"
];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

// App Global State
const state = {
  currentView: "dashboard",
  currentMonth: new Date().getMonth() + 1,
  currentYear: new Date().getFullYear(),
  buildings: [],
  selectedBuildingId: null,
  rooms: [],
  records: [],
  utilityBill: null,
  preferences: {
    theme: "dark",
    accent_color: "#22D3EE",
    reduced_motion: false
  },
  searchQuery: "",
  roomFilter: "all",
  ledgerFilter: "all",
  spreadsheetSort: "room-asc",
  spreadsheetSortCol: "room",
  spreadsheetSortDir: "asc",
  spreadsheetEditMode: false,
  stagedUnivJsonData: null
};

let isAppInitialized = false;

// Robust, idempotent PyWebView / PWA & DOM initialization
function onReady(fn) {
  const triggerInit = () => {
    if (isAppInitialized) return;
    // When pywebview is active, wait until api is attached
    if (window.pywebview && !window.pywebview.api) {
      return;
    }
    isAppInitialized = true;
    fn();
  };

  if (window.pywebview && window.pywebview.api) {
    triggerInit();
  } else if (!window.pywebview && (document.readyState === "complete" || document.readyState === "interactive")) {
    setTimeout(triggerInit, 50);
  } else {
    window.addEventListener("pywebviewready", triggerInit);
    window.addEventListener("DOMContentLoaded", () => {
      setTimeout(triggerInit, 50);
    });
  }
}

// -----------------------------------------------------------------------------
// Offline Vector Icon & HTML Escaping Helpers
// -----------------------------------------------------------------------------

function getIconSvg(name, className = "", style = "") {
  return `<svg class="app-icon ${className}" ${style ? `style="${style}"` : ""} aria-hidden="true"><use href="#icon-${name}"></use></svg>`;
}

function escapeHtml(str) {
  if (typeof str !== "string") return String(str == null ? "" : str);
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// -----------------------------------------------------------------------------
// Modern Toast Notification System
// -----------------------------------------------------------------------------

function showToast(message, type = "info", duration = 4000) {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;

  const iconName = type === "success" ? "check_circle" : (type === "error" ? "error" : (type === "warning" ? "warning" : "info"));
  toast.innerHTML = `
    <svg class="app-icon toast-icon" aria-hidden="true"><use href="#icon-${iconName}"></use></svg>
    <div class="toast-content">${escapeHtml(message)}</div>
    <button class="toast-close" title="Dismiss" aria-label="Dismiss">
      <svg class="app-icon" style="width: 14px; height: 14px;"><use href="#icon-close"></use></svg>
    </button>
  `;

  const closeBtn = toast.querySelector(".toast-close");
  let timeoutId = null;

  const removeToast = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    toast.classList.remove("show");
    toast.classList.add("hide");
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 260);
  };

  closeBtn.onclick = removeToast;

  container.appendChild(toast);
  requestAnimationFrame(() => {
    toast.classList.add("show");
  });

  timeoutId = setTimeout(removeToast, duration);
}

// -----------------------------------------------------------------------------
// Async Loading Indicator Management
// -----------------------------------------------------------------------------

let activeApiRequests = 0;

function startLoading() {
  activeApiRequests++;
  const bar = document.getElementById("topLoadingBar");
  if (bar) bar.classList.add("active");
  const refreshBtn = document.getElementById("refreshBtn");
  if (refreshBtn) refreshBtn.classList.add("spinning");
}

function stopLoading() {
  activeApiRequests = Math.max(0, activeApiRequests - 1);
  if (activeApiRequests === 0) {
    const bar = document.getElementById("topLoadingBar");
    if (bar) bar.classList.remove("active");
    const refreshBtn = document.getElementById("refreshBtn");
    if (refreshBtn) refreshBtn.classList.remove("spinning");
  }
}

// Formatters
function fmtCurrency(val) {
  return "₹" + (Number(val) || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function fmtUnits(val) {
  return (Number(val) || 0).toFixed(1) + " Units";
}

// API Bridge Safe Call (PyWebView Desktop + Client-Side PWA Fallback)
async function callAPI(method, ...args) {
  startLoading();
  try {
    if (window.pywebview && window.pywebview.api && typeof window.pywebview.api[method] === "function") {
      const res = await window.pywebview.api[method](...args);
      if (res && res.error) {
        showToast(res.error, "error");
      }
      return res;
    } else if (window.pwaStorage && typeof window.pwaStorage[method] === "function") {
      const res = await window.pwaStorage[method](...args);
      if (res && res.error) {
        showToast(res.error, "error");
      }
      return res;
    } else {
      console.warn(`API method '${method}' not found in pywebview or pwaStorage.`);
      return null;
    }
  } catch (err) {
    console.error(`API Error in ${method}:`, err);
    showToast(`API Error: ${err.message || err}`, "error");
    return null;
  } finally {
    stopLoading();
  }
}

// -----------------------------------------------------------------------------
// Core Initialization & Data Fetching
// -----------------------------------------------------------------------------

async function initApp() {
  setupNavigation();
  setupPropertySwitcher();
  setupSearch();
  setupPeriodSwitcher();
  setupSpreadsheetControls();
  setupUniversalImportExport();
  setupStudioSettings();
  setupModals();
  setupInputGuards();

  await loadPreferences();
  await loadBuildings();
  await refreshData();
}

async function loadPreferences() {
  const prefs = await callAPI("get_preferences");
  if (prefs) {
    state.preferences = prefs;
    applyThemePreferences(prefs);
  }
}

function applyThemePreferences(prefs) {
  const hex = prefs.accent_color || "#22D3EE";
  const gradCss = prefs.gradient_css || `linear-gradient(135deg, ${hex} 0%, ${prefs.gradient_color || hex} 100%)`;
  
  document.documentElement.style.setProperty("--primary", hex);
  document.documentElement.style.setProperty("--primary-gradient", gradCss);
  
  // Compute RGB for container alpha
  const rgb = hexToRgb(hex);
  if (rgb) {
    document.documentElement.style.setProperty("--primary-rgb", `${rgb.r}, ${rgb.g}, ${rgb.b}`);
  }
  
  const secHex = prefs.gradient_color || hex;
  const secRgb = hexToRgb(secHex) || rgb;
  if (secRgb) {
    document.documentElement.style.setProperty("--primary-secondary-rgb", `${secRgb.r}, ${secRgb.g}, ${secRgb.b}`);
  }
  if (rgb && secRgb) {
    const heroGrad = `linear-gradient(135deg, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.22) 0%, rgba(${secRgb.r}, ${secRgb.g}, ${secRgb.b}, 0.05) 100%)`;
    document.documentElement.style.setProperty("--hero-gradient", heroGrad);
  }

  if (prefs.theme === "light") {
    document.body.classList.remove("theme-dark");
    document.body.classList.add("theme-light");
  } else {
    document.body.classList.remove("theme-light");
    document.body.classList.add("theme-dark");
  }

  if (prefs.reduced_motion) {
    document.body.classList.add("reduced-motion");
  } else {
    document.body.classList.remove("reduced-motion");
  }
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

// -----------------------------------------------------------------------------
// Property / Building Switcher & Management
// -----------------------------------------------------------------------------

function setupPropertySwitcher() {
  const btn = document.getElementById("propSelectorBtn");
  const menu = document.getElementById("propDropdownMenu");
  const addFromDropBtn = document.getElementById("openAddBuildingFromDropdownBtn");
  const addFromRoomsBtn = document.getElementById("openAddBuildingFromRoomsBtn");

  if (btn && menu) {
    btn.onclick = (e) => {
      e.stopPropagation();
      const isOpen = menu.style.display !== "none";
      if (isOpen) {
        closePropertyDropdown();
      } else {
        openPropertyDropdown();
      }
    };

    document.addEventListener("click", (e) => {
      if (!btn.contains(e.target) && !menu.contains(e.target)) {
        closePropertyDropdown();
      }
    });
  }

  if (addFromDropBtn) {
    addFromDropBtn.onclick = (e) => {
      e.stopPropagation();
      openAddBuildingModal();
    };
  }

  if (addFromRoomsBtn) {
    addFromRoomsBtn.onclick = () => {
      openAddBuildingModal();
    };
  }
}

function openPropertyDropdown() {
  const menu = document.getElementById("propDropdownMenu");
  const btn = document.getElementById("propSelectorBtn");
  if (!menu || !btn) return;
  renderPropertyDropdown();
  menu.style.display = "block";
  btn.classList.add("open");
}

function closePropertyDropdown() {
  const menu = document.getElementById("propDropdownMenu");
  const btn = document.getElementById("propSelectorBtn");
  if (menu) menu.style.display = "none";
  if (btn) btn.classList.remove("open");
}

function renderPropertyDropdown() {
  const list = document.getElementById("propDropdownList");
  if (!list) return;
  list.innerHTML = "";

  // 1. "All Properties" consolidated item
  const allItem = document.createElement("div");
  allItem.className = `prop-dropdown-item ${state.selectedBuildingId === null ? "active" : ""}`;
  allItem.innerHTML = `
    <div class="prop-item-indicator" style="background: var(--primary);"></div>
    <div class="prop-item-info">
      <div class="prop-item-title">All Properties</div>
      <div class="prop-item-sub">Consolidated Portfolio View</div>
    </div>
    ${state.selectedBuildingId === null ? `<svg class="app-icon check"><use href="#icon-check"></use></svg>` : ''}
  `;
  allItem.onclick = async () => {
    state.selectedBuildingId = null;
    document.getElementById("currentBuildingName").textContent = "All Properties";
    closePropertyDropdown();
    await refreshData();
  };
  list.appendChild(allItem);

  // 2. Individual Buildings
  state.buildings.forEach(b => {
    const item = document.createElement("div");
    item.className = `prop-dropdown-item ${state.selectedBuildingId === b.id ? "active" : ""}`;
    item.innerHTML = `
      <div class="prop-item-indicator" style="background: ${b.colorHex || 'var(--primary)'};"></div>
      <div class="prop-item-info">
        <div class="prop-item-title">${escapeHtml(b.name)}</div>
        <div class="prop-item-sub">${escapeHtml(b.address || 'Property')}</div>
      </div>
      <div class="prop-item-actions">
        <button class="prop-action-btn edit-bldg" title="Edit Property Details">
          <svg class="app-icon"><use href="#icon-edit"></use></svg>
        </button>
        <button class="prop-action-btn danger delete-bldg" title="Delete Property">
          <svg class="app-icon"><use href="#icon-delete"></use></svg>
        </button>
      </div>
      ${state.selectedBuildingId === b.id ? `<svg class="app-icon check"><use href="#icon-check"></use></svg>` : ''}
    `;

    // Row click selects property
    item.onclick = async (e) => {
      if (e.target.closest(".prop-action-btn")) return;
      state.selectedBuildingId = b.id;
      document.getElementById("currentBuildingName").textContent = b.name;
      closePropertyDropdown();
      await refreshData();
    };

    // Edit action
    const editBtn = item.querySelector(".edit-bldg");
    if (editBtn) {
      editBtn.onclick = (e) => {
        e.stopPropagation();
        openEditBuildingModal(b.id);
      };
    }

    // Delete action
    const delBtn = item.querySelector(".delete-bldg");
    if (delBtn) {
      delBtn.onclick = (e) => {
        e.stopPropagation();
        handleDeleteBuilding(b.id, b.name);
      };
    }

    list.appendChild(item);
  });
}

function renderBuildingColorOptions(selectedHex) {
  const container = document.getElementById("buildingColorOptions");
  if (!container) return;
  container.innerHTML = "";

  BUILDING_COLOR_PRESETS.forEach(hex => {
    const dot = document.createElement("div");
    dot.className = `building-color-dot ${hex.toLowerCase() === selectedHex.toLowerCase() ? "active" : ""}`;
    dot.style.backgroundColor = hex;
    dot.innerHTML = `<svg class="app-icon"><use href="#icon-check"></use></svg>`;
    dot.onclick = () => {
      container.querySelectorAll(".building-color-dot").forEach(d => d.classList.remove("active"));
      dot.classList.add("active");
      document.getElementById("modalBuildingColor").value = hex;
    };
    container.appendChild(dot);
  });
}

function openAddBuildingModal() {
  document.getElementById("modalBuildingId").value = "";
  document.getElementById("buildingModalTitle").textContent = "Add New Building / Property";
  document.getElementById("modalBuildingName").value = "";
  document.getElementById("modalBuildingAddress").value = "";
  document.getElementById("modalBuildingColor").value = "#22D3EE";
  document.getElementById("saveBuildingBtn").textContent = "Create Property";
  const delBtn = document.getElementById("deleteBuildingBtn");
  if (delBtn) delBtn.style.display = "none";
  renderBuildingColorOptions("#22D3EE");
  document.getElementById("buildingModal").classList.add("open");
  closePropertyDropdown();
  setTimeout(() => document.getElementById("modalBuildingName").focus(), 80);
}

function openEditBuildingModal(buildingId) {
  const bldg = state.buildings.find(b => b.id === buildingId);
  if (!bldg) return;
  document.getElementById("modalBuildingId").value = bldg.id;
  document.getElementById("buildingModalTitle").textContent = `Edit Property: ${bldg.name}`;
  document.getElementById("modalBuildingName").value = bldg.name || "";
  document.getElementById("modalBuildingAddress").value = bldg.address || "";
  document.getElementById("modalBuildingColor").value = bldg.colorHex || "#22D3EE";
  document.getElementById("saveBuildingBtn").textContent = "Save Changes";
  const delBtn = document.getElementById("deleteBuildingBtn");
  if (delBtn) {
    delBtn.style.display = "inline-flex";
    delBtn.onclick = () => handleDeleteBuilding(bldg.id, bldg.name);
  }
  renderBuildingColorOptions(bldg.colorHex || "#22D3EE");
  document.getElementById("buildingModal").classList.add("open");
  closePropertyDropdown();
  setTimeout(() => document.getElementById("modalBuildingName").focus(), 80);
}

async function handleSaveBuilding() {
  const bIdStr = document.getElementById("modalBuildingId").value;
  const bId = bIdStr ? parseInt(bIdStr) : null;
  const name = document.getElementById("modalBuildingName").value.trim();
  const address = document.getElementById("modalBuildingAddress").value.trim();
  const colorHex = document.getElementById("modalBuildingColor").value || "#22D3EE";

  if (!name) {
    showToast("Property name is required.", "error");
    document.getElementById("modalBuildingName").focus();
    return;
  }

  let res;
  if (bId) {
    res = await callAPI("update_building", bId, name, address, colorHex);
    if (res && res.error) {
      showToast("Error updating building: " + res.error, "error");
      return;
    }
    showToast(`Property '${name}' updated successfully!`, "success");
  } else {
    res = await callAPI("create_building", name, address, colorHex);
    if (res && res.error) {
      showToast("Error creating building: " + res.error, "error");
      return;
    }
    showToast(`Property '${name}' created successfully!`, "success");
  }

  document.getElementById("buildingModal").classList.remove("open");

  await loadBuildings();
  if (bId) {
    if (state.selectedBuildingId === bId) {
      document.getElementById("currentBuildingName").textContent = name;
    }
  } else if (res && res.id) {
    state.selectedBuildingId = res.id;
    document.getElementById("currentBuildingName").textContent = name;
  }
  await refreshData();
}

async function handleDeleteBuilding(buildingId, buildingName) {
  const confirmed = confirm(
    `Are you sure you want to permanently delete property '${buildingName}'?\n\nWarning: This will delete this property along with all its associated rooms, meter readings, and ledger statements.`
  );
  if (!confirmed) return;

  const res = await callAPI("delete_building", buildingId);
  if (res && res.error) {
    showToast("Error deleting property: " + res.error, "error");
    return;
  }

  document.getElementById("buildingModal").classList.remove("open");
  showToast(`Property '${buildingName}' deleted successfully.`, "info");

  if (state.selectedBuildingId === buildingId) {
    state.selectedBuildingId = null;
    document.getElementById("currentBuildingName").textContent = "All Properties";
  }

  await loadBuildings();
  await refreshData();
}

async function loadBuildings() {
  const buildings = await callAPI("get_buildings") || [];
  state.buildings = buildings;
  if (state.selectedBuildingId) {
    const cur = buildings.find(b => b.id === state.selectedBuildingId);
    if (cur) {
      document.getElementById("currentBuildingName").textContent = cur.name;
    } else {
      state.selectedBuildingId = null;
      document.getElementById("currentBuildingName").textContent = "All Properties";
    }
  } else {
    document.getElementById("currentBuildingName").textContent = "All Properties";
  }
  renderPropertyDropdown();
}

async function refreshData() {
  document.getElementById("currentPeriodLabel").textContent = `${MONTH_NAMES[state.currentMonth - 1]} ${state.currentYear}`;

  const [rooms, records, bill] = await Promise.all([
    callAPI("get_rooms", state.selectedBuildingId) || [],
    callAPI("get_records", state.selectedBuildingId, state.currentMonth, state.currentYear) || [],
    callAPI("get_utility_bill", state.selectedBuildingId || 1, state.currentMonth, state.currentYear)
  ]);

  state.rooms = rooms || [];
  state.records = records || [];
  state.utilityBill = bill || null;

  renderDashboard();
  renderRooms();
  renderLedger();
  renderSpreadsheet();

  document.getElementById("navRoomsCount").textContent = state.rooms.length;
  document.getElementById("telemetryRooms").textContent = `${state.rooms.length} Rooms Tracked`;
}

// -----------------------------------------------------------------------------
// 1. Dashboard View Renderer
// -----------------------------------------------------------------------------

function renderDashboard() {
  let totalContracted = 0;
  let totalCleared = 0;
  let totalPending = 0;
  let totalUnits = 0;
  let totalElectricAmount = 0;
  let occupiedCount = 0;

  state.rooms.forEach(r => {
    if (r.status === "Lended") {
      occupiedCount++;
      totalContracted += (r.agreedRent || 0);
    }
  });

  state.records.forEach(rd => {
    totalCleared += (rd.record.totalPaid || 0);
    totalPending += (rd.record.balance || 0);
    totalUnits += (rd.record.units || 0);
    totalElectricAmount += (rd.record.electricity || 0);
  });

  // Hero Card
  document.getElementById("heroRevenue").textContent = fmtCurrency(totalContracted);
  document.getElementById("heroSubtext").textContent = `Telemetry updating across ${state.rooms.length} rooms (${occupiedCount} occupied)`;
  document.getElementById("telemetryInflow").textContent = `${fmtCurrency(totalContracted)} Contracted`;

  // Occupancy Gauge
  const pct = state.rooms.length > 0 ? Math.round((occupiedCount / state.rooms.length) * 100) : 0;
  document.getElementById("occupancyCircle").setAttribute("stroke-dasharray", `${pct}, 100`);
  document.getElementById("occupancyText").textContent = `${pct}%`;

  // 4 KPIs
  document.getElementById("kpiContracted").textContent = fmtCurrency(totalContracted);
  document.getElementById("kpiCleared").textContent = fmtCurrency(totalCleared);
  document.getElementById("kpiClearedSub").textContent = `${state.records.filter(r => r.record.totalPaid > 0).length} Payments logged`;

  document.getElementById("kpiPending").textContent = fmtCurrency(totalPending);
  document.getElementById("kpiEnergy").textContent = fmtUnits(totalUnits);
  document.getElementById("kpiEnergySub").textContent = `${fmtCurrency(totalElectricAmount)} sub-metered`;

  // Reconcile Card
  document.getElementById("recTenantSum").textContent = `${fmtCurrency(totalElectricAmount)} (${fmtUnits(totalUnits)})`;
  const recBadge = document.getElementById("recBadge");
  const recBadgeText = document.getElementById("recBadgeText");
  const recBadgeIcon = document.getElementById("recBadgeIcon");
  const recBoardSum = document.getElementById("recBoardSum");

  if (state.utilityBill) {
    const bAmt = state.utilityBill.amount || 0;
    const bUnits = state.utilityBill.units || 0;
    recBoardSum.textContent = `${fmtCurrency(bAmt)} (${fmtUnits(bUnits)})`;

    const delta = totalElectricAmount - bAmt;
    if (delta >= 0) {
      recBadge.className = "reconcile-badge surplus";
      recBadgeText.textContent = `Surplus Recovery: +${fmtCurrency(delta)} ahead of grid bill`;
      if (recBadgeIcon) recBadgeIcon.querySelector("use")?.setAttribute("href", "#icon-check_circle");
    } else {
      recBadge.className = "reconcile-badge deficit";
      recBadgeText.textContent = `Deficit Under-Recovery: ${fmtCurrency(delta)} shortfall vs grid bill`;
      if (recBadgeIcon) recBadgeIcon.querySelector("use")?.setAttribute("href", "#icon-warning");
    }
  } else {
    recBoardSum.textContent = "Not Logged";
    recBadge.className = "reconcile-badge";
    recBadgeText.textContent = "No Main Electricity Board invoice entered for this cycle";
    if (recBadgeIcon) recBadgeIcon.querySelector("use")?.setAttribute("href", "#icon-info");
  }

  // Dashboard Units Table (First 6)
  const tbody = document.getElementById("dashboardUnitsBody");
  tbody.innerHTML = "";
  state.rooms.slice(0, 6).forEach(r => {
    const tr = document.createElement("tr");
    const isOccupied = r.status === "Lended";
    tr.innerHTML = `
      <td><strong>${escapeHtml(r.roomNumber)}</strong></td>
      <td><span class="status-chip ${isOccupied ? 'occupied' : 'vacant'}">${isOccupied ? 'Occupied' : 'Vacant'}</span></td>
      <td>${r.tenant ? escapeHtml(r.tenant.name) : '—'}</td>
      <td>${fmtCurrency(r.agreedRent)}</td>
      <td>${fmtCurrency(r.defaultMeterRate)}/Unit</td>
      <td><span class="status-chip ${isOccupied ? 'paid' : 'vacant'}">${isOccupied ? 'Active Lease' : 'Available'}</span></td>
    `;
    tbody.appendChild(tr);
  });

  // Render Collection Inflow Chart (Canvas)
  renderCanvasChart();
}

function renderCanvasChart() {
  const canvas = document.getElementById("collectionChart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * (window.devicePixelRatio || 1);
  canvas.height = 180 * (window.devicePixelRatio || 1);
  ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);

  const w = rect.width;
  const h = 180;
  ctx.clearRect(0, 0, w, h);

  // Group payments by day of month
  const daysInMonth = new Date(state.currentYear, state.currentMonth, 0).getDate();
  const dailySums = new Array(daysInMonth).fill(0);

  state.records.forEach(rd => {
    (rd.payments || []).forEach(p => {
      if (p.paymentDate) {
        const day = parseInt(p.paymentDate.split("-")[2], 10);
        if (day >= 1 && day <= daysInMonth) {
          dailySums[day - 1] += (p.amount || 0);
        }
      }
    });
  });

  const maxVal = Math.max(...dailySums, 1000);
  const barWidth = Math.max(3, (w - 60) / daysInMonth - 3);

  // Draw Grid Lines
  ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 3; i++) {
    const y = 20 + (i * 35);
    ctx.beginPath();
    ctx.moveTo(30, y);
    ctx.lineTo(w - 10, y);
    ctx.stroke();
  }

  // Draw Bars
  const primaryHex = state.preferences.accent_color || "#22D3EE";
  dailySums.forEach((val, i) => {
    const x = 35 + i * ((w - 50) / daysInMonth);
    const barH = (val / maxVal) * 110;
    const y = h - 35 - barH;

    if (val > 0) {
      ctx.fillStyle = primaryHex;
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barH, [3, 3, 0, 0]);
      ctx.fill();
    } else {
      ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
      ctx.fillRect(x, h - 38, barWidth, 3);
    }
  });

  document.getElementById("chartTotalTag").textContent = `${fmtCurrency(dailySums.reduce((a, b) => a + b, 0))} Cleared`;
}

// -----------------------------------------------------------------------------
// 2. Rooms View Renderer
// -----------------------------------------------------------------------------

function renderRooms() {
  const container = document.getElementById("roomsGrid");
  container.innerHTML = "";

  const filtered = state.rooms.filter(r => {
    const matchesFilter = state.roomFilter === "all" || r.status === state.roomFilter;
    const tName = (r.tenant ? r.tenant.name : (r.tenantName || "")) || "";
    const matchesSearch = !state.searchQuery || 
      (r.roomNumber && r.roomNumber.toLowerCase().includes(state.searchQuery.toLowerCase())) ||
      tName.toLowerCase().includes(state.searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">
        ${getIconSvg("meeting_room", "", "width: 48px; height: 48px; opacity: 0.4;")}
        <p style="margin-top: 8px;">No rooms match your filter criteria.</p>
      </div>
    `;
    return;
  }

  filtered.forEach(r => {
    const card = document.createElement("div");
    card.className = "room-card";
    const isOccupied = r.status === "Lended";

    const depositAmount = r.securityDepositAmount > 0 ? r.securityDepositAmount : (r.securityDepositReceived ? r.agreedRent : 0);
    const hasDeposit = Boolean(r.securityDepositReceived || r.advanceReceived);

    card.innerHTML = `
      <div class="room-card-header">
        <span class="room-card-title">Room ${escapeHtml(r.roomNumber)}</span>
        <span class="status-chip ${isOccupied ? 'occupied' : 'vacant'}">${isOccupied ? 'Occupied' : 'Vacant'}</span>
      </div>

      <div class="room-card-tenant">
        ${getIconSvg("person", "", "width: 16px; height: 16px;")}
        <span>${escapeHtml(r.tenant ? r.tenant.name : 'No active tenant')}</span>
      </div>

      <div class="room-card-metrics">
        <div>
          <span style="color: var(--text-muted); display: block;">Agreed Rent</span>
          <strong>${fmtCurrency(r.agreedRent)}</strong>
        </div>
        <div>
          <span style="color: var(--text-muted); display: block;">Meter Rate</span>
          <strong>${fmtCurrency(r.defaultMeterRate)}/Unit</strong>
        </div>
        <div>
          <span style="color: var(--text-muted); display: block;">1 Mo. Deposit</span>
          <strong style="color: ${hasDeposit ? 'var(--success)' : 'var(--text-muted)'};">${hasDeposit ? fmtCurrency(depositAmount) : 'None'}</strong>
        </div>
      </div>

      <div class="room-card-sub-info">
        <span class="room-lended-badge">
          ${r.lendedDate ? 'Lended: ' + escapeHtml(r.lendedDate) : 'Due day: ' + (r.moveInDay || 1)}
        </span>
        <span class="deposit-pill ${hasDeposit ? 'received' : 'not-given'}">
          ${getIconSvg("shield", "", "width: 11px; height: 11px;")}
          <span>${hasDeposit ? 'Deposit Received' : 'No Deposit'}</span>
        </span>
      </div>

      <div class="room-card-actions">
        <button class="pill-action-btn edit-room-btn" data-id="${r.id}">
          ${getIconSvg("edit")}
          <span>Edit</span>
        </button>
        <button class="pill-action-btn btn-danger delete-room-btn" data-id="${r.id}" data-num="${escapeHtml(r.roomNumber)}">
          ${getIconSvg("delete")}
          <span>Delete</span>
        </button>
      </div>
    `;
    container.appendChild(card);
  });

  // Bind edit & delete buttons
  container.querySelectorAll(".edit-room-btn").forEach(btn => {
    btn.onclick = () => openEditRoomModal(Number(btn.dataset.id));
  });

  container.querySelectorAll(".delete-room-btn").forEach(btn => {
    btn.onclick = () => {
      handleDeleteRoom(Number(btn.dataset.id), btn.dataset.num);
    };
  });
}

// -----------------------------------------------------------------------------
// 3. Monthly Ledger View Renderer
// -----------------------------------------------------------------------------

function renderLedger() {
  const container = document.getElementById("ledgerCardsContainer");
  container.innerHTML = "";

  const filtered = state.records.filter(rd => {
    const isPaid = rd.record.isPaid;
    let matchesFilter = true;
    if (state.ledgerFilter === "paid") matchesFilter = isPaid;
    if (state.ledgerFilter === "unpaid") matchesFilter = !isPaid;

    const matchesSearch = !state.searchQuery ||
      rd.room.roomNumber.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
      (rd.room.tenantName && rd.room.tenantName.toLowerCase().includes(state.searchQuery.toLowerCase()));

    return matchesFilter && matchesSearch;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px; color: var(--text-muted);">
        ${getIconSvg("receipt_long", "", "width: 48px; height: 48px; opacity: 0.4;")}
        <p style="margin-top: 8px;">No monthly statements found for this period.</p>
      </div>
    `;
    return;
  }

  filtered.forEach(rd => {
    const card = document.createElement("div");
    card.className = "ledger-item-card";
    const rec = rd.record;
    const isPaid = rec.isPaid;
    const hasPaidSome = rec.totalPaid > 0 && !isPaid;

    const statusClass = isPaid ? "paid" : (hasPaidSome ? "partial" : "unpaid");
    const statusLabel = isPaid ? "Fully Paid" : (hasPaidSome ? "Partially Paid" : "Payment Due");

    card.innerHTML = `
      <div class="ledger-col-unit">
        <h4>Room ${escapeHtml(rd.room.roomNumber)}</h4>
        <span>${escapeHtml(rd.room.tenantName || 'Vacant')}</span>
        <div style="margin-top: 6px;">
          <span class="status-chip ${statusClass}">${statusLabel}</span>
        </div>
      </div>

      <div class="ledger-col-meter">
        <div class="meter-box-pill">
          <span class="label">Start Meter</span>
          <span class="val">${rec.meterPrevious.toFixed(1)}</span>
        </div>
        <div class="meter-box-pill">
          <span class="label">End Meter</span>
          <span class="val">${rec.meterCurrent.toFixed(1)}</span>
        </div>
        <div class="meter-box-pill">
          <span class="label">Units Consumed</span>
          <span class="val" style="color: var(--primary);">${rec.units.toFixed(1)} Units</span>
        </div>
        <div class="meter-box-pill">
          <span class="label">Power Bill</span>
          <span class="val">${fmtCurrency(rec.electricity)}</span>
        </div>
      </div>

      <div class="ledger-col-financials">
        <div class="financial-total">${fmtCurrency(rec.totalDue)}</div>
        <div class="financial-balance" style="color: ${rec.balance > 0 ? 'var(--danger)' : 'var(--success)'};">
          ${rec.balance > 0 ? 'Due: ' + fmtCurrency(rec.balance) : 'Cleared'}
        </div>
        <span style="font-size: 10px; color: var(--text-muted); display: block; margin-top: 2px;">
          Paid: ${fmtCurrency(rec.totalPaid)}
        </span>
        ${(rd.payments && rd.payments.length > 0) ? `
          <div class="ledger-payments-strip">
            ${rd.payments.map((p, idx) => {
              const isAdv = p.paymentType && p.paymentType.toLowerCase().includes("advance");
              const isDep = p.paymentType && p.paymentType.toLowerCase().includes("deposit");
              let badge = '';
              if (isAdv) badge = `<span class="advance-tag">Adv</span>`;
              if (isDep) badge = `<span class="advance-tag" style="background:rgba(34,197,94,0.2);color:#86efac;">Dep</span>`;
              return `
                <span class="payment-installment-chip ${isAdv ? 'advance' : ''}" title="${escapeHtml(p.notes || p.paymentType || '')} on ${escapeHtml(p.paymentDate || '')}">
                  <strong>#${idx + 1}</strong> ${fmtCurrency(p.amount)} (${escapeHtml(p.method)}) ${badge}
                </span>
              `;
            }).join("")}
          </div>
        ` : ''}
      </div>

      <div class="ledger-col-actions">
        <button class="action-btn-primary record-pay-btn" data-rec="${rec.id}" data-due="${rec.balance}" data-unit="${escapeHtml(rd.room.roomNumber)}" data-tenant="${escapeHtml(rd.room.tenantName || '')}" data-rent="${rec.rent}">
          ${getIconSvg("payments")}
          <span>${rec.balance > 0 ? (rec.totalPaid > 0 ? '+ Pay 2nd/3rd' : 'Pay') : '+ Advance Pay'}</span>
        </button>
        <div style="display: flex; gap: 6px;">
          <button class="pill-action-btn edit-statement-btn" data-rec="${rec.id}" style="flex: 1;" title="Edit Statement Entry">
            ${getIconSvg("edit")}
            <span>Edit</span>
          </button>
          <button class="pill-action-btn btn-danger delete-ledger-btn" data-rec="${rec.id}" data-room="${escapeHtml(rd.room.roomNumber)}" title="Delete Statement Entry">
            ${getIconSvg("delete")}
          </button>
        </div>
      </div>
    `;
    container.appendChild(card);
  });

  // Bind Actions
  container.querySelectorAll(".record-pay-btn").forEach(btn => {
    btn.onclick = () => openPaymentModal(
      Number(btn.dataset.rec),
      btn.dataset.unit,
      btn.dataset.tenant,
      Number(btn.dataset.due),
      Number(btn.dataset.rent || 0)
    );
  });

  container.querySelectorAll(".edit-statement-btn").forEach(btn => {
    btn.onclick = () => {
      const recId = Number(btn.dataset.rec);
      const rd = state.records.find(r => r.record.id === recId);
      if (rd) openStatementModal(rd);
    };
  });

  container.querySelectorAll(".delete-ledger-btn").forEach(btn => {
    btn.onclick = () => {
      const recId = Number(btn.dataset.rec);
      const roomNum = btn.dataset.room;
      handleDeleteStatement(recId, roomNum);
    };
  });
}

// -----------------------------------------------------------------------------
// 4. Matrix Spreadsheet Renderer & Inline Editor
// -----------------------------------------------------------------------------

function renderSpreadsheet() {
  const tbody = document.getElementById("matrixTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  let records = state.records;
  if (state.searchQuery) {
    const q = state.searchQuery.toLowerCase();
    records = records.filter(rd => {
      const roomNum = (rd.room.roomNumber || "").toLowerCase();
      const tenant = (rd.room.tenantName || "").toLowerCase();
      const building = (rd.room.buildingName || "").toLowerCase();
      return roomNum.includes(q) || tenant.includes(q) || building.includes(q);
    });
  }

  const sorted = [...records].sort((a, b) => {
    const rA = a.room;
    const rB = b.room;
    const recA = a.record;
    const recB = b.record;

    const numA = parseInt((rA.roomNumber || "").replace(/\D/g, "")) || 0;
    const numB = parseInt((rB.roomNumber || "").replace(/\D/g, "")) || 0;

    switch (state.spreadsheetSort) {
      case "room-asc":
        return numA !== numB ? numA - numB : (rA.roomNumber || "").localeCompare(rB.roomNumber || "");
      case "room-desc":
        return numA !== numB ? numB - numA : (rB.roomNumber || "").localeCompare(rA.roomNumber || "");
      case "building-asc":
        return (rA.buildingName || "").localeCompare(rB.buildingName || "") || (numA - numB);
      case "building-desc":
        return (rB.buildingName || "").localeCompare(rA.buildingName || "") || (numB - numA);
      case "tenant-asc":
        return (rA.tenantName || "").localeCompare(rB.tenantName || "") || (numA - numB);
      case "tenant-desc":
        return (rB.tenantName || "").localeCompare(rA.tenantName || "") || (numB - numA);
      case "units-desc":
        return recB.units - recA.units;
      case "units-asc":
        return recA.units - recB.units;
      case "due-desc":
        return recB.totalDue - recA.totalDue;
      case "due-asc":
        return recA.totalDue - recB.totalDue;
      case "balance-desc":
        return recB.balance - recA.balance;
      case "balance-asc":
        return recA.balance - recB.balance;
      case "rent-desc":
        return recB.rent - recA.rent;
      case "rent-asc":
        return recA.rent - recB.rent;
      case "status-unpaid":
        return (recB.balance > 0 ? 1 : 0) - (recA.balance > 0 ? 1 : 0);
      default:
        return numA !== numB ? numA - numB : (rA.roomNumber || "").localeCompare(rB.roomNumber || "");
    }
  });

  // Update header arrows
  document.querySelectorAll("#matrixTable th.sortable-th").forEach(th => {
    const col = th.dataset.col;
    const arrow = th.querySelector(".th-sort-arrow");
    if (arrow) {
      if (state.spreadsheetSort.startsWith(col)) {
        arrow.textContent = state.spreadsheetSort.endsWith("desc") ? " ▼" : " ▲";
      } else {
        arrow.textContent = "";
      }
    }
  });

  if (sorted.length === 0) {
    tbody.innerHTML = `<tr><td colspan="15" style="text-align: center; padding: 36px; color: var(--text-muted); font-size: 13px;">No statement entries match your filter or search.</td></tr>`;
    return;
  }

  sorted.forEach(rd => {
    const tr = document.createElement("tr");
    tr.dataset.recId = rd.record.id;
    const rec = rd.record;
    const isPaid = rec.isPaid;
    const statusClass = isPaid ? "paid" : (rec.totalPaid > 0 ? "partial" : "unpaid");
    const statusText = isPaid ? "Paid" : (rec.totalPaid > 0 ? "Partial" : "Unpaid");

    if (state.spreadsheetEditMode) {
      tr.innerHTML = `
        <td><strong>${escapeHtml(rd.room.roomNumber)}</strong></td>
        <td><span style="font-size: 11px; color: var(--text-secondary);">${escapeHtml(rd.room.buildingName || 'Main')}</span></td>
        <td>${escapeHtml(rd.room.tenantName || '—')}</td>
        <td><span class="status-chip ${rd.room.status === 'Lended' ? 'occupied' : 'vacant'}">${rd.room.status}</span></td>
        <td><input type="number" class="spreadsheet-inline-input inline-rent" data-rec="${rec.id}" value="${rec.rent}" step="100" min="0"></td>
        <td><input type="number" class="spreadsheet-inline-input inline-prev" data-rec="${rec.id}" value="${rec.meterPrevious}" step="0.1" min="0"></td>
        <td><input type="number" class="spreadsheet-inline-input inline-curr" data-rec="${rec.id}" value="${rec.meterCurrent}" step="0.1" min="0"></td>
        <td class="col-units" style="font-weight: 600; color: var(--primary);">${rec.units.toFixed(1)}</td>
        <td><input type="number" class="spreadsheet-inline-input inline-rate" data-rec="${rec.id}" value="${rec.meterRatePerUnit}" step="0.5" min="0"></td>
        <td class="col-electric">${fmtCurrency(rec.electricity)}</td>
        <td><input type="number" class="spreadsheet-inline-input inline-other" data-rec="${rec.id}" value="${rec.otherCharges}" step="50" min="0"></td>
        <td>${fmtCurrency(rec.previousBalance)}</td>
        <td class="col-total"><strong>${fmtCurrency(rec.totalDue)}</strong></td>
        <td>${fmtCurrency(rec.totalPaid)}</td>
        <td class="col-balance" style="color: ${rec.balance > 0 ? 'var(--danger)' : 'var(--success)'}; font-weight: 700;">${fmtCurrency(rec.balance)}</td>
        <td class="col-status"><span class="status-chip ${statusClass}">${statusText}</span></td>
        <td>
          <button class="pill-action-btn edit-matrix-row-btn" data-rec="${rec.id}">
            ${getIconSvg("edit")}
            <span>Edit</span>
          </button>
        </td>
      `;
    } else {
      tr.innerHTML = `
        <td><strong>${escapeHtml(rd.room.roomNumber)}</strong></td>
        <td><span style="font-size: 11px; color: var(--text-secondary);">${escapeHtml(rd.room.buildingName || 'Main')}</span></td>
        <td>${escapeHtml(rd.room.tenantName || '—')}</td>
        <td><span class="status-chip ${rd.room.status === 'Lended' ? 'occupied' : 'vacant'}">${rd.room.status}</span></td>
        <td>${fmtCurrency(rec.rent)}</td>
        <td>${rec.meterPrevious.toFixed(1)}</td>
        <td>${rec.meterCurrent.toFixed(1)}</td>
        <td style="font-weight: 600; color: var(--primary);">${rec.units.toFixed(1)}</td>
        <td>${fmtCurrency(rec.meterRatePerUnit)}</td>
        <td>${fmtCurrency(rec.electricity)}</td>
        <td>${fmtCurrency(rec.otherCharges)}</td>
        <td>${fmtCurrency(rec.previousBalance)}</td>
        <td><strong>${fmtCurrency(rec.totalDue)}</strong></td>
        <td>${fmtCurrency(rec.totalPaid)}</td>
        <td style="color: ${rec.balance > 0 ? 'var(--danger)' : 'var(--success)'}; font-weight: 700;">${fmtCurrency(rec.balance)}</td>
        <td><span class="status-chip ${statusClass}">${statusText}</span></td>
        <td>
          <button class="pill-action-btn edit-matrix-row-btn" data-rec="${rec.id}">
            ${getIconSvg("edit")}
            <span>Edit</span>
          </button>
        </td>
      `;
    }

    tbody.appendChild(tr);
  });

  // Bind Row Edit Buttons
  tbody.querySelectorAll(".edit-matrix-row-btn").forEach(btn => {
    btn.onclick = () => {
      const recId = Number(btn.dataset.rec);
      const rd = state.records.find(r => r.record.id === recId);
      if (rd) openStatementModal(rd);
    };
  });

  // Bind Inline Inputs Auto-Save in Edit Mode
  if (state.spreadsheetEditMode) {
    const handleInlineChange = async (e) => {
      const input = e.target;
      const recId = Number(input.dataset.rec);
      const rd = state.records.find(r => r.record.id === recId);
      if (!rd) return;

      const tr = input.closest("tr");
      const rent = Math.max(0, parseFloat(tr.querySelector(".inline-rent").value) || 0);
      const prev = Math.max(0, parseFloat(tr.querySelector(".inline-prev").value) || 0);
      const curr = Math.max(0, parseFloat(tr.querySelector(".inline-curr").value) || 0);
      const rate = Math.max(0, parseFloat(tr.querySelector(".inline-rate").value) || 0);
      const other = Math.max(0, parseFloat(tr.querySelector(".inline-other").value) || 0);

      // Update local state immediately
      const units = Math.max(0, curr - prev);
      const electricity = units * rate;
      const totalDue = rent + electricity + other + rd.record.previousBalance;
      const balance = totalDue - rd.record.totalPaid;
      const isPaid = rd.record.totalPaid >= totalDue && totalDue > 0;

      rd.record.rent = rent;
      rd.record.meterPrevious = prev;
      rd.record.meterCurrent = curr;
      rd.record.units = units;
      rd.record.meterRatePerUnit = rate;
      rd.record.electricity = electricity;
      rd.record.otherCharges = other;
      rd.record.totalDue = totalDue;
      rd.record.balance = balance;
      rd.record.isPaid = isPaid;

      // Update table cells live
      tr.querySelector(".col-units").textContent = units.toFixed(1);
      tr.querySelector(".col-electric").textContent = fmtCurrency(electricity);
      tr.querySelector(".col-total").innerHTML = `<strong>${fmtCurrency(totalDue)}</strong>`;
      const balEl = tr.querySelector(".col-balance");
      balEl.textContent = fmtCurrency(balance);
      balEl.style.color = balance > 0 ? 'var(--danger)' : 'var(--success)';
      const statusEl = tr.querySelector(".col-status");
      statusEl.innerHTML = `<span class="status-chip ${isPaid ? 'paid' : (rd.record.totalPaid > 0 ? 'partial' : 'unpaid')}">${isPaid ? 'Paid' : (rd.record.totalPaid > 0 ? 'Partial' : 'Unpaid')}</span>`;

      // Flash green feedback
      input.classList.add("saved-flash");
      setTimeout(() => input.classList.remove("saved-flash"), 900);

      // Save to SQLite
      await callAPI(
        "save_meter_reading",
        recId,
        rd.room.id,
        state.currentMonth,
        state.currentYear,
        prev,
        curr,
        rate,
        rent,
        other,
        rd.record.otherChargesNote || "",
        rd.record.previousBalance || 0.0,
        rd.record.note || ""
      );

      // Refresh overview KPIs in background
      renderDashboardOverview();
    };

    tbody.querySelectorAll(".spreadsheet-inline-input").forEach(input => {
      input.onchange = handleInlineChange;
      input.onkeydown = (e) => {
        if (e.key === "-" || e.key === "e" || e.key === "E") {
          e.preventDefault();
        } else if (e.key === "Enter") {
          input.blur();
        }
      };
    });
  }
}

function setupSpreadsheetControls() {
  const sortSelect = document.getElementById("matrixSortSelect");
  if (sortSelect) {
    sortSelect.onchange = () => {
      state.spreadsheetSort = sortSelect.value;
      renderSpreadsheet();
    };
  }

  const editBtn = document.getElementById("toggleSpreadsheetEditBtn");
  const editLbl = document.getElementById("spreadsheetEditModeLabel");
  if (editBtn) {
    editBtn.onclick = () => {
      state.spreadsheetEditMode = !state.spreadsheetEditMode;
      if (state.spreadsheetEditMode) {
        editBtn.classList.add("active");
        if (editLbl) editLbl.textContent = "Done Editing";
        showToast("Spreadsheet Inline Edit Mode Enabled. Click any number to edit.", "info");
      } else {
        editBtn.classList.remove("active");
        if (editLbl) editLbl.textContent = "Edit Mode";
        showToast("Spreadsheet Edit Mode Closed.", "info");
      }
      renderSpreadsheet();
    };
  }

  // Header click sorting
  document.querySelectorAll("#matrixTable th.sortable-th").forEach(th => {
    th.onclick = () => {
      const col = th.dataset.col;
      if (!col) return;
      if (state.spreadsheetSort === `${col}-asc`) {
        state.spreadsheetSort = `${col}-desc`;
      } else {
        state.spreadsheetSort = `${col}-asc`;
      }
      if (sortSelect) {
        const matchingOpt = sortSelect.querySelector(`option[value="${state.spreadsheetSort}"]`);
        if (matchingOpt) sortSelect.value = state.spreadsheetSort;
      }
      renderSpreadsheet();
    };
  });
}

// -----------------------------------------------------------------------------
// 5. Studio & Settings View
// -----------------------------------------------------------------------------

function setupStudioSettings() {
  const gradGrid = document.getElementById("gradientSwatchesGrid");
  const grid = document.getElementById("swatchesGrid");

  // 1. Render Expressive Gradients
  if (gradGrid) {
    gradGrid.innerHTML = "";
    GRADIENT_PRESETS.forEach(p => {
      const swatch = document.createElement("div");
      swatch.className = "gradient-swatch";
      swatch.style.background = p.gradient;
      swatch.title = `${p.name} (Expressive Gradient)`;
      swatch.innerHTML = getIconSvg("check");

      const isActive = (state.preferences.gradient_preset === p.name) ||
        (state.preferences.accent_color && state.preferences.accent_color.toLowerCase() === p.hex.toLowerCase() &&
         state.preferences.gradient_color && state.preferences.gradient_color.toLowerCase() === p.secondary.toLowerCase());

      if (isActive) {
        swatch.classList.add("active");
      }

      swatch.onclick = async () => {
        document.querySelectorAll(".gradient-swatch, .color-swatch").forEach(s => s.classList.remove("active"));
        swatch.classList.add("active");
        state.preferences.accent_color = p.hex;
        state.preferences.gradient_color = p.secondary;
        state.preferences.gradient_preset = p.name;
        state.preferences.gradient_css = p.gradient;
        applyThemePreferences(state.preferences);
        await callAPI("save_preferences", state.preferences);
        renderCanvasChart();
        showToast(`Gradient preset '${p.name}' applied!`, "info");
      };

      gradGrid.appendChild(swatch);
    });
  }

  // 2. Render Solid Accents
  if (grid) {
    grid.innerHTML = "";
    ACCENT_PRESETS.forEach(p => {
      const swatch = document.createElement("div");
      swatch.className = "color-swatch";
      swatch.style.backgroundColor = p.hex;
      swatch.title = `${p.name} (Solid Color)`;
      swatch.innerHTML = getIconSvg("check");

      if (!state.preferences.gradient_preset && p.hex.toLowerCase() === (state.preferences.accent_color || "").toLowerCase()) {
        swatch.classList.add("active");
      }

      swatch.onclick = async () => {
        document.querySelectorAll(".gradient-swatch, .color-swatch").forEach(s => s.classList.remove("active"));
        swatch.classList.add("active");
        state.preferences.accent_color = p.hex;
        state.preferences.gradient_color = p.hex;
        state.preferences.gradient_preset = "";
        state.preferences.gradient_css = "";
        applyThemePreferences(state.preferences);
        await callAPI("save_preferences", state.preferences);
        renderCanvasChart();
        showToast(`Color preset updated to ${p.name}`, "info");
      };

      grid.appendChild(swatch);
    });
  }

  // Custom Hex Input
  const hexInput = document.getElementById("customHexInput");
  const nativePicker = document.getElementById("nativeColorPicker");

  document.getElementById("applyHexBtn").onclick = async () => {
    const val = hexInput.value.trim();
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
      document.querySelectorAll(".gradient-swatch, .color-swatch").forEach(s => s.classList.remove("active"));
      state.preferences.accent_color = val;
      state.preferences.gradient_color = val;
      state.preferences.gradient_preset = "";
      state.preferences.gradient_css = "";
      if (nativePicker) nativePicker.value = val;
      applyThemePreferences(state.preferences);
      await callAPI("save_preferences", state.preferences);
      renderCanvasChart();
      showToast(`Custom accent color ${val} applied`, "info");
    } else {
      showToast("Please enter a valid 6-character hex code (e.g. #22D3EE)", "error");
    }
  };

  nativePicker.oninput = async (e) => {
    const val = e.target.value;
    document.querySelectorAll(".gradient-swatch, .color-swatch").forEach(s => s.classList.remove("active"));
    hexInput.value = val;
    state.preferences.accent_color = val;
    state.preferences.gradient_color = val;
    state.preferences.gradient_preset = "";
    state.preferences.gradient_css = "";
    applyThemePreferences(state.preferences);
    await callAPI("save_preferences", state.preferences);
    renderCanvasChart();
  };

  // Live preview controls feedback
  document.querySelectorAll(".live-preview-box .preview-controls button").forEach(btn => {
    btn.onclick = () => {
      showToast(`Theme Preview: ${btn.textContent.trim()} action verified.`, "info");
    };
  });

  // Theme Palette Toggle
  document.getElementById("darkThemeBtn").onclick = async () => {
    state.preferences.theme = "dark";
    document.getElementById("darkThemeBtn").classList.add("active");
    document.getElementById("lightThemeBtn").classList.remove("active");
    applyThemePreferences(state.preferences);
    await callAPI("save_preferences", state.preferences);
  };

  document.getElementById("lightThemeBtn").onclick = async () => {
    state.preferences.theme = "light";
    document.getElementById("lightThemeBtn").classList.add("active");
    document.getElementById("darkThemeBtn").classList.remove("active");
    applyThemePreferences(state.preferences);
    await callAPI("save_preferences", state.preferences);
  };

  // Reduced Motion
  const rmToggle = document.getElementById("reducedMotionToggle");
  rmToggle.onchange = async () => {
    state.preferences.reduced_motion = rmToggle.checked;
    applyThemePreferences(state.preferences);
    await callAPI("save_preferences", state.preferences);
  };

  // Database Backup & Restore
  document.getElementById("backupJsonBtn").onclick = async () => {
    const data = await callAPI("backup_database_json");
    if (data) {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `RentalLedger_Backup_${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("Database backup snapshot exported successfully", "success");
    }
  };

  document.getElementById("restoreJsonBtn").onclick = () => {
    document.getElementById("restoreFileInput").click();
  };

  document.getElementById("restoreFileInput").onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const res = await callAPI("restore_database_json", evt.target.result);
        if (!res || !res.error) {
          showToast("Database snapshot restored successfully!", "success");
          await refreshData();
        }
      } catch (err) {
        showToast("Failed to restore database: " + (err.message || err), "error");
      } finally {
        e.target.value = "";
      }
    };
    reader.readAsText(file);
  };

  // CSV Export
  document.getElementById("exportCsvBtn").onclick = async () => {
    const csvContent = await callAPI("export_csv_data", state.selectedBuildingId, state.currentMonth, state.currentYear);
    if (csvContent) {
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `RentalLedger_${state.currentYear}_${state.currentMonth}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("Full matrix spreadsheet exported to CSV successfully", "success");
    }
  };

  // PDF Export
  const exportPdfBtn = document.getElementById("exportPdfBtn");
  if (exportPdfBtn) {
    exportPdfBtn.onclick = async () => {
      exportPdfBtn.disabled = true;
      exportPdfBtn.classList.add("loading");
      showToast("Generating landscape PDF report...", "info");
      try {
        const res = await callAPI("export_pdf_data", state.selectedBuildingId, state.currentMonth, state.currentYear);
        if (res && res.base64) {
          // Trigger browser blob download
          const byteCharacters = atob(res.base64);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: "application/pdf" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = res.filename || `RentalLedger_${state.currentYear}_${state.currentMonth}.pdf`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(url), 2000);

          if (res.path) {
            showToast(`PDF exported & saved to Downloads: ${res.filename}`, "success");
            // Prompt user if they want to view the PDF right now
            if (confirm(`PDF statement exported successfully!\n\nSaved to:\n${res.path}\n\nWould you like to open it now?`)) {
              await callAPI("open_pdf_file", res.path);
            }
          } else {
            showToast("Spreadsheet PDF downloaded successfully", "success");
          }
        } else if (res && res.error) {
          showToast(`PDF generation failed: ${res.error}`, "error");
        }
      } catch (err) {
        showToast(`PDF generation error: ${err.message}`, "error");
      } finally {
        exportPdfBtn.disabled = false;
        exportPdfBtn.classList.remove("loading");
      }
    };
  }
}

// -----------------------------------------------------------------------------
// Universal Cross-Platform Import & Export Hub (Android / iOS / Windows / macOS)
// -----------------------------------------------------------------------------

function setupUniversalImportExport() {
  const exportJsonBtn = document.getElementById("exportUnivJsonBtn");
  const copyJsonBtn = document.getElementById("copyUnivJsonBtn");
  const exportCsvBtn = document.getElementById("exportUnivCsvBtn");

  if (exportJsonBtn) {
    exportJsonBtn.onclick = async () => {
      exportJsonBtn.disabled = true;
      try {
        const data = await callAPI("backup_database_json");
        if (data) {
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `RentalLedger_Universal_Backup_${new Date().toISOString().split("T")[0]}.json`;
          a.click();
          URL.revokeObjectURL(url);
          showToast("Universal JSON backup exported successfully! Compatible with Android, iOS, Windows & macOS.", "success");
        }
      } finally {
        exportJsonBtn.disabled = false;
      }
    };
  }

  if (copyJsonBtn) {
    copyJsonBtn.onclick = async () => {
      try {
        const data = await callAPI("backup_database_json");
        if (data) {
          await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
          showToast("Universal JSON copied to clipboard! You can paste this into notes or messaging to sync across phones.", "success");
        }
      } catch (err) {
        showToast("Unable to copy to clipboard: " + (err.message || err), "error");
      }
    };
  }

  if (exportCsvBtn) {
    exportCsvBtn.onclick = async () => {
      exportCsvBtn.disabled = true;
      try {
        const csvContent = await callAPI("export_csv_data", state.selectedBuildingId, state.currentMonth, state.currentYear);
        if (csvContent) {
          const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `RentalLedger_Universal_${state.currentYear}_${state.currentMonth}.csv`;
          a.click();
          URL.revokeObjectURL(url);
          showToast("Universal CSV exported successfully!", "success");
        }
      } finally {
        exportCsvBtn.disabled = false;
      }
    };
  }

  // Dropzone & File selection
  const dropzone = document.getElementById("univDropzone");
  const fileInput = document.getElementById("univFileInput");
  const browseBtn = document.getElementById("browseUnivFileBtn");
  const inspectCard = document.getElementById("univInspectionCard");

  if (browseBtn && fileInput) {
    browseBtn.onclick = () => fileInput.click();
  }

  const processFile = (file) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".json")) {
      showToast("Please select a valid .json backup file.", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const content = evt.target.result;
        state.stagedUnivJsonData = content;
        const inspection = await callAPI("inspect_backup_json", content);
        if (inspection && inspection.success) {
          if (inspectCard) inspectCard.style.display = "block";
          document.getElementById("inspectFileNameText").textContent = file.name;
          document.getElementById("inspectBadgeText").textContent = `Schema v${inspection.version} · Universal`;
          
          const grid = document.getElementById("inspectCountsGrid");
          if (grid) {
            grid.innerHTML = `
              <div class="inspection-count-item">
                <div class="inspection-count-val">${inspection.counts.buildings}</div>
                <div class="inspection-count-lbl">Properties</div>
              </div>
              <div class="inspection-count-item">
                <div class="inspection-count-val">${inspection.counts.rooms}</div>
                <div class="inspection-count-lbl">Rooms</div>
              </div>
              <div class="inspection-count-item">
                <div class="inspection-count-val">${inspection.counts.monthly_records}</div>
                <div class="inspection-count-lbl">Records</div>
              </div>
              <div class="inspection-count-item">
                <div class="inspection-count-val">${inspection.counts.payments}</div>
                <div class="inspection-count-lbl">Payments</div>
              </div>
            `;
          }
          showToast(`Backup verified: ${inspection.counts.rooms} rooms and ${inspection.counts.payments} payments found. Ready to merge or restore.`, "info");
        } else {
          showToast("Invalid backup JSON file: " + (inspection.error || "Unrecognized structure"), "error");
        }
      } catch (err) {
        showToast("Error reading file: " + (err.message || err), "error");
      }
    };
    reader.readAsText(file);
  };

  if (fileInput) {
    fileInput.onchange = (e) => {
      processFile(e.target.files[0]);
    };
  }

  if (dropzone) {
    dropzone.ondragover = (e) => {
      e.preventDefault();
      dropzone.classList.add("dragover");
    };
    dropzone.ondragleave = () => {
      dropzone.classList.remove("dragover");
    };
    dropzone.ondrop = (e) => {
      e.preventDefault();
      dropzone.classList.remove("dragover");
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
        processFile(e.dataTransfer.files[0]);
      }
    };
  }

  // Safe Merge
  const mergeBtn = document.getElementById("performSafeMergeBtn");
  if (mergeBtn) {
    mergeBtn.onclick = async () => {
      if (!state.stagedUnivJsonData) {
        showToast("Please select a JSON backup file first.", "error");
        return;
      }
      mergeBtn.disabled = true;
      try {
        const res = await callAPI("merge_database_json", state.stagedUnivJsonData);
        if (res && res.success) {
          const m = res.merged || {};
          showToast(`Safe Merge Complete! Added/updated: ${m.buildings || 0} buildings, ${m.rooms || 0} rooms, ${m.records || 0} records, ${m.payments || 0} payments without removing any existing data.`, "success");
          if (inspectCard) inspectCard.style.display = "none";
          state.stagedUnivJsonData = null;
          await refreshData();
        } else {
          showToast("Merge failed: " + (res.error || "Unknown error"), "error");
        }
      } finally {
        mergeBtn.disabled = false;
      }
    };
  }

  // Full Restore
  const restoreBtn = document.getElementById("performFullRestoreBtn");
  if (restoreBtn) {
    restoreBtn.onclick = async () => {
      if (!state.stagedUnivJsonData) {
        showToast("Please select a JSON backup file first.", "error");
        return;
      }
      if (confirm("WARNING: Complete Snapshot Restore will replace your current database records with the snapshot.\n\nAre you sure you want to proceed?")) {
        restoreBtn.disabled = true;
        try {
          const res = await callAPI("restore_database_json", state.stagedUnivJsonData);
          if (res && res.success) {
            showToast("Database restored completely from snapshot!", "success");
            if (inspectCard) inspectCard.style.display = "none";
            state.stagedUnivJsonData = null;
            await refreshData();
          } else {
            showToast("Restore failed: " + (res.error || "Unknown error"), "error");
          }
        } finally {
          restoreBtn.disabled = false;
        }
      }
    };
  }
}

// -----------------------------------------------------------------------------
// Navigation & Search Wiring
// -----------------------------------------------------------------------------

function setupNavigation() {
  document.querySelectorAll(".nav-item").forEach(item => {
    item.onclick = () => {
      const targetView = item.dataset.view;
      if (!targetView) return;

      document.querySelectorAll(".nav-item").forEach(i => i.classList.remove("active"));
      item.classList.add("active");

      document.querySelectorAll(".view-panel").forEach(p => p.classList.remove("active"));
      const panel = document.getElementById(`view-${targetView}`);
      if (panel) panel.classList.add("active");

      state.currentView = targetView;
      if (targetView === "dashboard") {
        setTimeout(renderCanvasChart, 100);
      }
    };
  });

  // Filter Pills for Rooms
  document.querySelectorAll("#roomFilterPills .filter-pill").forEach(p => {
    p.onclick = () => {
      document.querySelectorAll("#roomFilterPills .filter-pill").forEach(i => i.classList.remove("active"));
      p.classList.add("active");
      state.roomFilter = p.dataset.filter;
      renderRooms();
    };
  });

  // Filter Pills for Ledger
  document.querySelectorAll("#ledgerFilterPills .filter-pill").forEach(p => {
    p.onclick = () => {
      document.querySelectorAll("#ledgerFilterPills .filter-pill").forEach(i => i.classList.remove("active"));
      p.classList.add("active");
      state.ledgerFilter = p.dataset.filter;
      renderLedger();
    };
  });

  // View All Units button on dashboard
  document.getElementById("viewAllUnitsBtn").onclick = () => {
    document.querySelector('.nav-item[data-view="rooms"]').click();
  };

  document.getElementById("refreshBtn").onclick = async () => {
    await refreshData();
    showToast("Live ledger data refreshed", "info");
  };
}

function setupSearch() {
  const search = document.getElementById("globalSearchInput");
  search.oninput = (e) => {
    state.searchQuery = e.target.value.trim();
    if (state.currentView === "rooms") renderRooms();
    if (state.currentView === "ledger") renderLedger();
    if (state.currentView === "spreadsheet") renderSpreadsheet();
  };

  // Keyboard shortcut Escape, Ctrl+F / Cmd+F, and numerical shortcuts
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      document.querySelectorAll(".modal-backdrop.open").forEach(m => m.classList.remove("open"));
      closePropertyDropdown();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
      e.preventDefault();
      search.focus();
      search.select();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "1") {
      e.preventDefault();
      document.querySelector('.nav-item[data-view="dashboard"]').click();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "2") {
      e.preventDefault();
      document.querySelector('.nav-item[data-view="rooms"]').click();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "3") {
      e.preventDefault();
      document.querySelector('.nav-item[data-view="ledger"]').click();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "4") {
      e.preventDefault();
      document.querySelector('.nav-item[data-view="spreadsheet"]').click();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "5") {
      e.preventDefault();
      const importItem = document.querySelector('.nav-item[data-view="import-export"]');
      if (importItem) importItem.click();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "6") {
      e.preventDefault();
      const settingsItem = document.querySelector('.nav-item[data-view="settings"]');
      if (settingsItem) settingsItem.click();
    }
  });
}

function setupPeriodSwitcher() {
  document.getElementById("prevMonthBtn").onclick = async () => {
    state.currentMonth--;
    if (state.currentMonth < 1) {
      state.currentMonth = 12;
      state.currentYear--;
    }
    await refreshData();
  };

  document.getElementById("nextMonthBtn").onclick = async () => {
    state.currentMonth++;
    if (state.currentMonth > 12) {
      state.currentMonth = 1;
      state.currentYear++;
    }
    await refreshData();
  };

  document.getElementById("todayBtn").onclick = async () => {
    state.currentMonth = new Date().getMonth() + 1;
    state.currentYear = new Date().getFullYear();
    await refreshData();
  };
}

// -----------------------------------------------------------------------------
// Strict Input Validation & UX Guards
// -----------------------------------------------------------------------------

function setupInputGuards() {
  // Prevent typing negative numbers or scientific notation 'e' in numeric fields
  document.querySelectorAll('input[type="number"]').forEach(input => {
    input.addEventListener("keydown", (e) => {
      if (e.key === "-" || e.key === "e" || e.key === "E") {
        e.preventDefault();
      }
    });

    input.addEventListener("paste", (e) => {
      const text = (e.clipboardData || window.clipboardData)?.getData("text") || "";
      if (text.includes("-")) {
        e.preventDefault();
        showToast("Negative values are not permitted.", "warning");
      }
    });

    input.addEventListener("input", () => {
      if (parseFloat(input.value) < 0) {
        input.value = "0";
      }
    });
  });
}

// -----------------------------------------------------------------------------
// Modals Setup (Room, Payment, Meter, Utility)
// -----------------------------------------------------------------------------

function recalcMeter() {
  const mRent = document.getElementById("meterRentInput");
  const mPrev = document.getElementById("meterPrevInput");
  const mCurr = document.getElementById("meterCurrInput");
  const mRate = document.getElementById("meterRateInput");
  const mOther = document.getElementById("meterOtherChargesInput");
  const warnAlert = document.getElementById("meterWarningAlert");

  const rent = parseFloat(mRent ? mRent.value : 0) || 0;
  const prev = parseFloat(mPrev ? mPrev.value : 0) || 0;
  const curr = parseFloat(mCurr ? mCurr.value : 0) || 0;
  const rate = parseFloat(mRate ? mRate.value : 10) || 10;
  const other = parseFloat(mOther ? mOther.value : 0) || 0;
  const units = Math.max(0, curr - prev);
  const powerBill = units * rate;
  const totalDue = rent + powerBill + other;

  const unitsEl = document.getElementById("meterCalcUnits");
  if (unitsEl) unitsEl.textContent = units.toFixed(1);
  const billEl = document.getElementById("meterCalcBill");
  if (billEl) billEl.textContent = fmtCurrency(powerBill);
  const totalEl = document.getElementById("meterCalcTotal");
  if (totalEl) totalEl.textContent = fmtCurrency(totalDue);

  if (warnAlert) {
    if (curr < prev && curr > 0) {
      warnAlert.style.display = "flex";
    } else {
      warnAlert.style.display = "none";
    }
  }
}

function setupModals() {
  // Top Add Unit button
  document.getElementById("topAddUnitBtn").onclick = () => openAddRoomModal();
  document.getElementById("addRoomBtn").onclick = () => openAddRoomModal();

  // Close modals on backdrop click
  document.querySelectorAll(".modal-backdrop").forEach(backdrop => {
    backdrop.onclick = (e) => {
      if (e.target === backdrop) backdrop.classList.remove("open");
    };
  });

  // 1. Room Modal
  document.getElementById("closeRoomModalBtn").onclick = () => document.getElementById("roomModal").classList.remove("open");
  document.getElementById("cancelRoomModalBtn").onclick = () => document.getElementById("roomModal").classList.remove("open");
  document.getElementById("saveRoomBtn").onclick = handleSaveRoom;

  const depCheck = document.getElementById("modalRoomDepositCheckbox");
  const depRow = document.getElementById("modalDepositAmountRow");
  const depAmtInput = document.getElementById("modalRoomDepositAmount");
  const rentInput = document.getElementById("modalAgreedRent");
  if (depCheck && depRow) {
    depCheck.onchange = () => {
      depRow.style.display = depCheck.checked ? "block" : "none";
      if (depCheck.checked && (!depAmtInput.value || parseFloat(depAmtInput.value) === 0)) {
        depAmtInput.value = (rentInput && rentInput.value) ? rentInput.value : "5000";
      }
    };
  }

  // 2. Payment Modal
  document.getElementById("closePaymentModalBtn").onclick = () => document.getElementById("paymentModal").classList.remove("open");
  document.getElementById("cancelPayModalBtn").onclick = () => document.getElementById("paymentModal").classList.remove("open");
  document.getElementById("submitPaymentBtn").onclick = handleSubmitPayment;

  // 3. Meter Modal / Monthly Statement Modal
  document.getElementById("closeMeterModalBtn").onclick = () => document.getElementById("meterModal").classList.remove("open");
  document.getElementById("cancelMeterModalBtn").onclick = () => document.getElementById("meterModal").classList.remove("open");
  document.getElementById("saveMeterBtn").onclick = handleSaveMeter;
  const addLedgerBtn = document.getElementById("addLedgerEntryBtn");
  if (addLedgerBtn) addLedgerBtn.onclick = () => openAddStatementModal();

  // Statement inputs live calculation & UX warning guard
  const mRent = document.getElementById("meterRentInput");
  const mPrev = document.getElementById("meterPrevInput");
  const mCurr = document.getElementById("meterCurrInput");
  const mRate = document.getElementById("meterRateInput");
  const mOther = document.getElementById("meterOtherChargesInput");

  if (mRent) mRent.oninput = recalcMeter;
  if (mPrev) mPrev.oninput = recalcMeter;
  if (mCurr) mCurr.oninput = recalcMeter;
  if (mRate) mRate.oninput = recalcMeter;
  if (mOther) mOther.oninput = recalcMeter;

  // 4. Utility Modal
  document.getElementById("openUtilityModalBtn").onclick = openUtilityModal;
  document.getElementById("closeUtilityModalBtn").onclick = () => document.getElementById("utilityModal").classList.remove("open");
  document.getElementById("cancelUtilityModalBtn").onclick = () => document.getElementById("utilityModal").classList.remove("open");
  document.getElementById("saveUtilityBtn").onclick = handleSaveUtility;
  document.getElementById("deleteUtilityBtn").onclick = handleDeleteUtility;

  // 5. Building Modal
  const closeBldgBtn = document.getElementById("closeBuildingModalBtn");
  const cancelBldgBtn = document.getElementById("cancelBuildingModalBtn");
  const saveBldgBtn = document.getElementById("saveBuildingBtn");
  const delBldgBtn = document.getElementById("deleteBuildingBtn");
  if (closeBldgBtn) closeBldgBtn.onclick = () => document.getElementById("buildingModal").classList.remove("open");
  if (cancelBldgBtn) cancelBldgBtn.onclick = () => document.getElementById("buildingModal").classList.remove("open");
  if (saveBldgBtn) saveBldgBtn.onclick = handleSaveBuilding;
  if (delBldgBtn) {
    delBldgBtn.onclick = () => {
      const bIdStr = document.getElementById("modalBuildingId").value;
      const name = document.getElementById("modalBuildingName").value;
      if (bIdStr) handleDeleteBuilding(parseInt(bIdStr), name);
    };
  }
}

function populateRoomBuildingSelect(selectedId) {
  const sel = document.getElementById("modalRoomBuilding");
  if (!sel) return;
  sel.innerHTML = "";
  state.buildings.forEach(b => {
    const opt = document.createElement("option");
    opt.value = b.id;
    opt.textContent = b.name + (b.address ? ` (${b.address})` : "");
    if (b.id === selectedId) opt.selected = true;
    sel.appendChild(opt);
  });
}

function openAddRoomModal() {
  document.getElementById("roomModalTitle").textContent = "Add New Room";
  populateRoomBuildingSelect(state.selectedBuildingId || (state.buildings[0] ? state.buildings[0].id : 1));
  document.getElementById("modalRoomId").value = "";
  document.getElementById("modalRoomNumber").value = "";
  document.getElementById("modalRoomStatus").value = "Lended";
  document.getElementById("modalAgreedRent").value = "5000";
  document.getElementById("modalMeterRate").value = "10.0";
  document.getElementById("modalTenantName").value = "";
  document.getElementById("modalTenantPhone").value = "";
  document.getElementById("modalTenantNotes").value = "";
  document.getElementById("modalRoomLendedDate").value = new Date().toISOString().split("T")[0];
  document.getElementById("modalRoomMoveInDay").value = "1";
  const depCheck = document.getElementById("modalRoomDepositCheckbox");
  if (depCheck) depCheck.checked = false;
  const depRow = document.getElementById("modalDepositAmountRow");
  if (depRow) depRow.style.display = "none";
  document.getElementById("modalRoomDepositAmount").value = "";

  const delBtn = document.getElementById("deleteRoomBtn");
  if (delBtn) delBtn.style.display = "none";
  document.getElementById("roomModal").classList.add("open");
  setTimeout(() => document.getElementById("modalRoomNumber").focus(), 80);
}

function openEditRoomModal(roomId) {
  const room = state.rooms.find(r => r.id === roomId);
  if (!room) return;
  document.getElementById("roomModalTitle").textContent = `Edit Room ${room.roomNumber}`;
  populateRoomBuildingSelect(room.buildingId || state.selectedBuildingId || 1);
  document.getElementById("modalRoomId").value = room.id;
  document.getElementById("modalRoomNumber").value = room.roomNumber;
  document.getElementById("modalRoomStatus").value = room.status;
  document.getElementById("modalAgreedRent").value = room.agreedRent;
  document.getElementById("modalMeterRate").value = room.defaultMeterRate;
  document.getElementById("modalTenantName").value = room.tenant ? room.tenant.name : "";
  document.getElementById("modalTenantPhone").value = room.tenant ? room.tenant.phone : "";
  document.getElementById("modalTenantNotes").value = room.tenant ? room.tenant.notes : "";
  document.getElementById("modalRoomLendedDate").value = room.lendedDate || "";
  document.getElementById("modalRoomMoveInDay").value = room.moveInDay || 1;

  const hasDeposit = Boolean(room.securityDepositReceived || room.advanceReceived);
  const depCheck = document.getElementById("modalRoomDepositCheckbox");
  if (depCheck) depCheck.checked = hasDeposit;
  const depRow = document.getElementById("modalDepositAmountRow");
  if (depRow) depRow.style.display = hasDeposit ? "block" : "none";
  document.getElementById("modalRoomDepositAmount").value = room.securityDepositAmount || (hasDeposit ? room.agreedRent : "");

  const delBtn = document.getElementById("deleteRoomBtn");
  if (delBtn) {
    delBtn.style.display = "flex";
    delBtn.onclick = () => handleDeleteRoom(room.id, room.roomNumber);
  }
  document.getElementById("roomModal").classList.add("open");
  setTimeout(() => document.getElementById("modalRoomNumber").focus(), 80);
}

async function handleDeleteRoom(roomId, roomNumber) {
  if (confirm(`Are you sure you want to delete Room ${roomNumber}? All monthly statements and recorded payments for this room will be permanently removed.`)) {
    const res = await callAPI("delete_room", Number(roomId));
    if (res && res.error) return;
    document.getElementById("roomModal").classList.remove("open");
    showToast(`Room ${roomNumber} deleted successfully`, "info");
    await refreshData();
  }
}

async function handleSaveRoom() {
  const roomId = document.getElementById("modalRoomId").value ? Number(document.getElementById("modalRoomId").value) : null;
  const bSelect = document.getElementById("modalRoomBuilding");
  const buildingId = (bSelect && parseInt(bSelect.value)) ? parseInt(bSelect.value) : (state.selectedBuildingId || (state.buildings[0] ? state.buildings[0].id : 1));
  const roomNumber = document.getElementById("modalRoomNumber").value.trim();
  const status = document.getElementById("modalRoomStatus").value;
  const agreedRent = parseFloat(document.getElementById("modalAgreedRent").value);
  const defaultMeterRate = parseFloat(document.getElementById("modalMeterRate").value);
  const tenantName = document.getElementById("modalTenantName").value.trim();
  const tenantPhone = document.getElementById("modalTenantPhone").value.trim();
  const tenantNotes = document.getElementById("modalTenantNotes").value.trim();
  const lendedDate = document.getElementById("modalRoomLendedDate").value.trim();
  const moveInDay = parseInt(document.getElementById("modalRoomMoveInDay").value) || 1;
  const secDep = document.getElementById("modalRoomDepositCheckbox").checked ? 1 : 0;
  const secAmt = secDep ? (parseFloat(document.getElementById("modalRoomDepositAmount").value) || agreedRent || 0.0) : 0.0;

  // Strict Validation: Room number cannot be empty or pure whitespace
  if (!roomNumber) {
    showToast("Room number cannot be empty or pure whitespace.", "error");
    document.getElementById("modalRoomNumber").focus();
    return;
  }

  // Prevent negative rent
  if (isNaN(agreedRent) || agreedRent < 0) {
    showToast("Agreed rent cannot be negative.", "error");
    document.getElementById("modalAgreedRent").focus();
    return;
  }

  // Prevent negative meter rate
  if (isNaN(defaultMeterRate) || defaultMeterRate < 0) {
    showToast("Default meter rate cannot be negative.", "error");
    document.getElementById("modalMeterRate").focus();
    return;
  }

  const res = await callAPI(
    "save_room",
    roomId,
    buildingId,
    roomNumber,
    status,
    agreedRent,
    defaultMeterRate,
    secDep,
    moveInDay,
    tenantName,
    tenantPhone,
    tenantNotes,
    lendedDate,
    secDep,
    secAmt
  );

  if (res && res.error) return;

  document.getElementById("roomModal").classList.remove("open");
  showToast(roomId ? `Room ${roomNumber} updated successfully` : `Room ${roomNumber} created successfully`, "success");
  await refreshData();
}

function openPaymentModal(recordId, unitNum, tenantName, dueBalance, rentAmount = 0) {
  document.getElementById("payRecordId").value = recordId;
  document.getElementById("payModalUnit").textContent = `Room ${unitNum} · ${tenantName || 'Tenant'}`;
  document.getElementById("payModalUnit").dataset.unitNum = unitNum;
  document.getElementById("payModalDue").textContent = `Outstanding Balance: ${fmtCurrency(dueBalance)}`;
  
  const purposeSel = document.getElementById("payPurposeSelect");
  if (dueBalance > 0) {
    document.getElementById("payAmountInput").value = dueBalance.toFixed(2);
    if (purposeSel) purposeSel.value = "Rent";
  } else {
    // When balance is cleared, default to 1 month advance
    document.getElementById("payAmountInput").value = rentAmount > 0 ? rentAmount.toFixed(2) : "5000.00";
    if (purposeSel) purposeSel.value = "Advance-1";
  }
  document.getElementById("payDateInput").value = new Date().toISOString().split("T")[0];
  document.getElementById("payNoteInput").value = "";
  document.getElementById("paymentModal").classList.add("open");
  setTimeout(() => document.getElementById("payAmountInput").focus(), 80);
}

async function handleSubmitPayment() {
  const recordId = Number(document.getElementById("payRecordId").value);
  const amount = parseFloat(document.getElementById("payAmountInput").value);
  const dateStr = document.getElementById("payDateInput").value;
  const method = document.getElementById("payMethodSelect").value;
  const notes = document.getElementById("payNoteInput").value.trim();
  const purpose = document.getElementById("payPurposeSelect") ? document.getElementById("payPurposeSelect").value : "Rent";

  if (isNaN(amount) || amount <= 0) {
    showToast("Please enter a valid positive payment amount.", "error");
    document.getElementById("payAmountInput").focus();
    return;
  }

  let paymentType = "Rent";
  let advanceMonths = 0;
  if (purpose === "Advance-1") {
    paymentType = "Advance (1 Month)";
    advanceMonths = 1;
  } else if (purpose === "Advance-2") {
    paymentType = "Advance (2 Months)";
    advanceMonths = 2;
  } else if (purpose === "Deposit") {
    paymentType = "Security Deposit";
  } else if (purpose === "Arrears") {
    paymentType = "Arrears";
  }

  const res = await callAPI("record_payment", recordId, amount, dateStr, method, notes, paymentType, advanceMonths);
  if (res && res.error) return;

  document.getElementById("paymentModal").classList.remove("open");
  const unitNum = document.getElementById("payModalUnit").dataset.unitNum || "Room";
  showToast(`Payment of ${fmtCurrency(amount)} (${paymentType}) recorded for Room ${unitNum}`, "success");
  await refreshData();
}

function openStatementModal(rd) {
  const rec = rd.record;
  const room = rd.room;

  document.getElementById("meterModalTitle").textContent = `Edit Monthly Statement - Room ${room.roomNumber}`;
  document.getElementById("meterRecordId").value = rec.id;
  document.getElementById("meterRoomId").value = room.id;

  const roomSelectGrp = document.getElementById("meterRoomSelectGroup");
  if (roomSelectGrp) roomSelectGrp.style.display = "none";
  const summaryBox = document.getElementById("meterSummaryBox");
  if (summaryBox) summaryBox.style.display = "flex";

  document.getElementById("meterModalUnit").textContent = `Room ${escapeHtml(room.roomNumber)} · ${escapeHtml(room.tenantName || 'Vacant')}`;
  document.getElementById("meterModalUnit").dataset.unitNum = room.roomNumber;
  document.getElementById("meterModalSummary").textContent = `Period: ${state.currentMonth}/${state.currentYear} · Agreed Base Rent: ${fmtCurrency(room.agreedRent)}`;

  document.getElementById("meterRentInput").value = rec.rent;
  document.getElementById("meterRateInput").value = rec.meterRatePerUnit;
  document.getElementById("meterPrevInput").value = rec.meterPrevious;
  document.getElementById("meterCurrInput").value = rec.meterCurrent;
  document.getElementById("meterOtherChargesInput").value = rec.otherCharges || 0;
  document.getElementById("meterOtherNotesInput").value = rec.otherChargesNote || "";
  document.getElementById("meterStatementNotesInput").value = rec.note || "";

  // Delete button visible
  const delBtn = document.getElementById("deleteStatementBtn");
  if (delBtn) {
    delBtn.style.display = "flex";
    delBtn.onclick = () => handleDeleteStatement(rec.id, room.roomNumber);
  }

  // Render payments list
  renderModalPayments(rec.id, rd.payments || []);

  const warnAlert = document.getElementById("meterWarningAlert");
  if (warnAlert) warnAlert.style.display = "none";

  // Live recalculate
  recalcMeter();

  document.getElementById("meterModal").classList.add("open");
  setTimeout(() => document.getElementById("meterCurrInput").focus(), 80);
}

function openAddStatementModal() {
  const existingRoomIds = new Set(state.records.map(rd => rd.room.id));
  const availableRooms = state.rooms.filter(r => !existingRoomIds.has(r.id));

  if (availableRooms.length === 0) {
    showToast(`All rooms already have monthly statements for ${state.currentMonth}/${state.currentYear}`, "info");
    return;
  }

  document.getElementById("meterModalTitle").textContent = "New Monthly Statement Entry";
  document.getElementById("meterRecordId").value = "";

  const roomSelectGrp = document.getElementById("meterRoomSelectGroup");
  if (roomSelectGrp) roomSelectGrp.style.display = "block";
  const summaryBox = document.getElementById("meterSummaryBox");
  if (summaryBox) summaryBox.style.display = "none";

  const roomSelect = document.getElementById("meterRoomSelect");
  roomSelect.innerHTML = "";
  availableRooms.forEach(r => {
    const opt = document.createElement("option");
    opt.value = r.id;
    opt.textContent = `Room ${r.roomNumber} (${r.tenant ? r.tenant.name : 'Vacant'}) - Rent: ₹${r.agreedRent}`;
    roomSelect.appendChild(opt);
  });

  const updateForSelectedRoom = () => {
    const selRoomId = Number(roomSelect.value);
    const selRoom = availableRooms.find(r => r.id === selRoomId) || availableRooms[0];
    if (selRoom) {
      document.getElementById("meterRoomId").value = selRoom.id;
      document.getElementById("meterRentInput").value = selRoom.agreedRent;
      document.getElementById("meterRateInput").value = selRoom.defaultMeterRate;
      document.getElementById("meterModalUnit").dataset.unitNum = selRoom.roomNumber;
    }
    recalcMeter();
  };

  roomSelect.onchange = updateForSelectedRoom;
  document.getElementById("meterPrevInput").value = "0.0";
  document.getElementById("meterCurrInput").value = "0.0";
  document.getElementById("meterOtherChargesInput").value = "0";
  document.getElementById("meterOtherNotesInput").value = "";
  document.getElementById("meterStatementNotesInput").value = "";
  updateForSelectedRoom();
  recalcMeter();

  // Delete button hidden in add mode
  const delBtn = document.getElementById("deleteStatementBtn");
  if (delBtn) delBtn.style.display = "none";

  // Payments empty
  renderModalPayments(0, []);

  const warnAlert = document.getElementById("meterWarningAlert");
  if (warnAlert) warnAlert.style.display = "none";

  document.getElementById("meterModal").classList.add("open");
  setTimeout(() => document.getElementById("meterCurrInput").focus(), 80);
}

function renderModalPayments(recordId, payments) {
  const container = document.getElementById("meterPaymentsList");
  const totalEl = document.getElementById("meterPaymentsTotal");
  if (!container) return;

  if (!payments || payments.length === 0) {
    container.innerHTML = `<div class="modal-empty-payments">No payments recorded yet for this month.</div>`;
    if (totalEl) totalEl.textContent = "₹0.00 Paid";
    return;
  }

  let totalPaid = 0;
  container.innerHTML = "";
  payments.forEach(p => {
    totalPaid += Number(p.amount) || 0;
    const row = document.createElement("div");
    row.className = "modal-payment-row";
    row.innerHTML = `
      <div class="modal-payment-info">
        <span class="modal-payment-amount">${fmtCurrency(p.amount)} <span class="modal-payment-meta">via ${escapeHtml(p.method || 'Cash')}</span></span>
        <span class="modal-payment-meta">${escapeHtml(p.paymentDate || '')} ${p.notes ? '· ' + escapeHtml(p.notes) : ''}</span>
      </div>
      <div class="modal-payment-actions">
        <button type="button" class="delete-payment-btn" data-pid="${p.id}" data-amt="${p.amount}" title="Delete this payment">
          ${getIconSvg("delete", "", "width: 14px; height: 14px;")}
        </button>
      </div>
    `;
    container.appendChild(row);
  });

  if (totalEl) totalEl.textContent = `${fmtCurrency(totalPaid)} Paid`;

  container.querySelectorAll(".delete-payment-btn").forEach(btn => {
    btn.onclick = async (e) => {
      e.stopPropagation();
      const pid = Number(btn.dataset.pid);
      const amt = Number(btn.dataset.amt);
      if (confirm(`Are you sure you want to delete this payment of ${fmtCurrency(amt)}?`)) {
        const res = await callAPI("delete_payment", pid);
        if (res && res.error) return;
        showToast(`Payment of ${fmtCurrency(amt)} deleted`, "info");
        await refreshData();
        const updatedRd = state.records.find(r => r.record.id === recordId);
        if (updatedRd) {
          renderModalPayments(recordId, updatedRd.payments || []);
        } else {
          document.getElementById("meterModal").classList.remove("open");
        }
      }
    };
  });
}

function openMeterModal(recordId, roomId, unitNum, prev, curr, rate, rent) {
  const rd = state.records.find(r => r.record.id === recordId);
  if (rd) {
    openStatementModal(rd);
  } else {
    openAddStatementModal();
  }
}

async function handleSaveMeter() {
  const recordId = document.getElementById("meterRecordId").value ? Number(document.getElementById("meterRecordId").value) : null;
  const isAddMode = !recordId;
  const roomId = isAddMode 
    ? Number(document.getElementById("meterRoomSelect").value)
    : Number(document.getElementById("meterRoomId").value);

  const prev = parseFloat(document.getElementById("meterPrevInput").value);
  const curr = parseFloat(document.getElementById("meterCurrInput").value);
  const rate = parseFloat(document.getElementById("meterRateInput").value);
  const rent = parseFloat(document.getElementById("meterRentInput").value);
  const otherCharges = parseFloat(document.getElementById("meterOtherChargesInput").value) || 0;
  const otherNotes = document.getElementById("meterOtherNotesInput").value.trim();
  const statementNote = document.getElementById("meterStatementNotesInput").value.trim();

  // Strict Validation: Prevent negative values
  if (isNaN(rent) || rent < 0) {
    showToast("Monthly rent cannot be negative.", "error");
    document.getElementById("meterRentInput").focus();
    return;
  }

  if (isNaN(prev) || prev < 0) {
    showToast("Previous meter reading cannot be negative.", "error");
    document.getElementById("meterPrevInput").focus();
    return;
  }

  if (isNaN(curr) || curr < 0) {
    showToast("Current meter reading cannot be negative.", "error");
    document.getElementById("meterCurrInput").focus();
    return;
  }

  if (isNaN(rate) || rate < 0) {
    showToast("Meter rate cannot be negative.", "error");
    document.getElementById("meterRateInput").focus();
    return;
  }

  if (otherCharges < 0) {
    showToast("Other charges cannot be negative.", "error");
    document.getElementById("meterOtherChargesInput").focus();
    return;
  }

  // Warning guard: Current reading < Previous reading
  if (curr < prev) {
    const proceed = confirm(`Meter reset or meter replacement detected:\nCurrent Reading (${curr} Units) is less than Previous Reading (${prev} Units).\n\nConfirm to proceed?`);
    if (!proceed) {
      return;
    }
  }

  const room = state.rooms.find(r => r.id === roomId);
  const unitNum = room ? room.roomNumber : (document.getElementById("meterModalUnit").dataset.unitNum || "");

  let res;
  if (isAddMode) {
    res = await callAPI(
      "create_monthly_record",
      roomId,
      state.currentMonth,
      state.currentYear,
      rent,
      prev,
      curr,
      rate,
      otherCharges,
      otherNotes,
      0,
      statementNote
    );
  } else {
    res = await callAPI(
      "save_meter_reading",
      recordId,
      roomId,
      state.currentMonth,
      state.currentYear,
      prev,
      curr,
      rate,
      rent,
      otherCharges,
      otherNotes,
      0,
      statementNote
    );
  }

  if (res && res.error) return;

  document.getElementById("meterModal").classList.remove("open");
  showToast(`Monthly statement saved for Room ${unitNum}`, "success");
  await refreshData();
}

async function handleDeleteStatement(recordId, roomNumber) {
  if (confirm(`Are you sure you want to delete the monthly statement for Room ${roomNumber}? Any recorded payments for this month will also be permanently deleted.`)) {
    const res = await callAPI("delete_monthly_record", Number(recordId));
    if (res && res.error) return;
    document.getElementById("meterModal").classList.remove("open");
    showToast(`Monthly statement for Room ${roomNumber} deleted successfully`, "info");
    await refreshData();
  }
}

function openUtilityModal() {
  const b = state.utilityBill;
  document.getElementById("utilityBillId").value = b ? b.id : "";
  document.getElementById("utilAmountInput").value = b ? b.amount : "";
  document.getElementById("utilUnitsInput").value = b ? b.units : "";
  document.getElementById("utilInvoiceInput").value = b ? (b.invoiceNumber || "") : "";
  document.getElementById("utilDateInput").value = b ? (b.billDate || "") : new Date().toISOString().split("T")[0];

  document.getElementById("deleteUtilityBtn").style.display = b ? "flex" : "none";
  document.getElementById("utilityModal").classList.add("open");
  setTimeout(() => document.getElementById("utilAmountInput").focus(), 80);
}

async function handleSaveUtility() {
  const billId = document.getElementById("utilityBillId").value ? Number(document.getElementById("utilityBillId").value) : null;
  const amount = parseFloat(document.getElementById("utilAmountInput").value);
  const units = parseFloat(document.getElementById("utilUnitsInput").value);
  const invoice = document.getElementById("utilInvoiceInput").value.trim();
  const dateStr = document.getElementById("utilDateInput").value;

  if (isNaN(amount) || amount < 0) {
    showToast("Total bill amount cannot be negative.", "error");
    document.getElementById("utilAmountInput").focus();
    return;
  }

  if (isNaN(units) || units < 0) {
    showToast("Total units billed cannot be negative.", "error");
    document.getElementById("utilUnitsInput").focus();
    return;
  }

  const res = await callAPI(
    "save_utility_bill",
    billId,
    state.selectedBuildingId || 1,
    state.currentMonth,
    state.currentYear,
    amount,
    units,
    dateStr,
    invoice
  );

  if (res && res.error) return;

  document.getElementById("utilityModal").classList.remove("open");
  showToast("Power Board electricity bill recorded successfully", "success");
  await refreshData();
}

async function handleDeleteUtility() {
  const billId = document.getElementById("utilityBillId").value ? Number(document.getElementById("utilityBillId").value) : null;
  if (billId && confirm("Are you sure you want to delete this Power Board invoice?")) {
    const res = await callAPI("delete_utility_bill", billId);
    if (res && res.error) return;
    document.getElementById("utilityModal").classList.remove("open");
    showToast("Power Board utility bill deleted", "info");
    await refreshData();
  }
}

// -----------------------------------------------------------------------------
// Window Resize & Chart Redraw
// -----------------------------------------------------------------------------
window.addEventListener("resize", () => {
  if (state.currentView === "dashboard") {
    renderCanvasChart();
  }
});

// Boot the application
onReady(initApp);

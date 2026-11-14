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
  spreadsheetMode: "annual",
  spreadsheetJump: "all",
  annualMatrixData: null,
  activeInspectionData: null,
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
// iOS Native Navigation, Gestures & Haptic Feedback System
// Tailored for iPhone 11 (414x896), iOS 17/18 HIG, Spring Physics & Share Sheet
// -----------------------------------------------------------------------------

function triggerHaptic(type = "light") {
  if (!navigator.vibrate) return;
  try {
    if (type === "light") {
      navigator.vibrate(12);
    } else if (type === "medium") {
      navigator.vibrate(22);
    } else if (type === "success" || type === "heavy") {
      navigator.vibrate([15, 35, 15]);
    } else if (type === "warning" || type === "delete") {
      navigator.vibrate([25, 50, 25]);
    }
  } catch (_) {}
}

function playIosHapticClick() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    if (!window._iosAudioCtx) window._iosAudioCtx = new AudioCtx();
    const ctx = window._iosAudioCtx;
    if (ctx.state === "suspended") ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.03);
    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.03);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.035);
  } catch (_) {}
}

// Native iOS Share Sheet Integration with graceful fallback to blob download
async function shareOrDownloadFile(fileOrBlob, filename, mimeType, title = "Rental Ledger") {
  triggerHaptic("light");
  playIosHapticClick();
  try {
    let fileObj;
    if (fileOrBlob instanceof File) {
      fileObj = fileOrBlob;
    } else {
      fileObj = new File([fileOrBlob], filename, { type: mimeType });
    }

    if (navigator.canShare && navigator.canShare({ files: [fileObj] })) {
      await navigator.share({
        title: title,
        text: `${title} - ${filename}`,
        files: [fileObj]
      });
      showToast(`${title} shared successfully via iOS Share Sheet!`, "success");
      triggerHaptic("success");
      return true;
    }
  } catch (err) {
    if (err.name === "AbortError") {
      return true; // User cancelled share sheet
    }
    console.warn("[iOS Share] Fallback to download:", err);
  }

  // Fallback: direct browser file download
  const blob = (fileOrBlob instanceof Blob) ? fileOrBlob : new Blob([fileOrBlob], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return false;
}

// Apple-style Segmented Control Handler with sliding thumb and spring physics
function updateSegmentThumb(container, activeBtn, animate = true) {
  if (!container || !activeBtn) return;
  const thumb = container.querySelector(".ios-segment-thumb");
  if (!thumb) return;
  
  if (!animate) {
    thumb.style.transition = "none";
  } else {
    thumb.style.transition = "transform 0.32s cubic-bezier(0.32, 0.72, 0, 1), width 0.32s cubic-bezier(0.32, 0.72, 0, 1)";
  }
  
  const leftOffset = activeBtn.offsetLeft;
  const width = activeBtn.offsetWidth;
  thumb.style.width = `${width}px`;
  thumb.style.transform = `translateX(${leftOffset}px)`;
}

function setupSegmentedControl(containerId, onChange) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.querySelectorAll(".ios-segment-btn").forEach(btn => {
    btn.onclick = () => {
      container.querySelectorAll(".ios-segment-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      updateSegmentThumb(container, btn, true);
      btn.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      triggerHaptic("light");
      playIosHapticClick();
      if (onChange) onChange(btn);
    };
  });

  const activeBtn = container.querySelector(".ios-segment-btn.active") || container.querySelector(".ios-segment-btn");
  if (activeBtn) {
    activeBtn.classList.add("active");
    requestAnimationFrame(() => updateSegmentThumb(container, activeBtn, false));
  }
}

// Render dynamic Building Segmented Control
function renderBuildingSegmentedControl() {
  const container = document.getElementById("buildingSegmentedControl");
  if (!container) return;

  container.innerHTML = '<div class="ios-segment-thumb" id="buildingSegmentThumb"></div>';

  // 1. All Properties
  const allBtn = document.createElement("button");
  allBtn.className = `ios-segment-btn ${state.selectedBuildingId === null ? "active" : ""}`;
  allBtn.dataset.buildingId = "all";
  allBtn.innerHTML = `
    <svg class="app-icon" style="width: 14px; height: 14px;"><use href="#icon-domain"></use></svg>
    <span>All Properties</span>
  `;
  container.appendChild(allBtn);

  // 2. Individual Buildings
  state.buildings.forEach(b => {
    const btn = document.createElement("button");
    btn.className = `ios-segment-btn ${state.selectedBuildingId === b.id ? "active" : ""}`;
    btn.dataset.buildingId = String(b.id);
    btn.innerHTML = `
      <span class="ios-segment-dot" style="background: ${b.colorHex || 'var(--primary)'};"></span>
      <span>${escapeHtml(b.name)}</span>
    `;
    container.appendChild(btn);
  });

  setupSegmentedControl("buildingSegmentedControl", async (btn) => {
    const bId = btn.dataset.buildingId;
    if (bId === "all") {
      state.selectedBuildingId = null;
      document.getElementById("currentBuildingName").textContent = "All Properties";
    } else {
      state.selectedBuildingId = Number(bId);
      const bObj = state.buildings.find(b => b.id === state.selectedBuildingId);
      if (bObj) document.getElementById("currentBuildingName").textContent = bObj.name;
    }
    await refreshData();
  });
}

// iOS Swipe-to-Action gesture engine
let activeOpenSwipeCell = null;

function makeSwipeable(cell, actionsConfig) {
  const content = cell.querySelector(".ios-swipe-content");
  const actions = cell.querySelector(".ios-swipe-actions");
  if (!content || !actions) return;

  let startX = 0;
  let startY = 0;
  let currentOffset = 0;
  let isSwiping = false;
  let isHorizontal = null;
  const maxActionsWidth = 192; // 3 buttons * 64px

  const payBtn = actions.querySelector(".action-pay");
  const editBtn = actions.querySelector(".action-edit");
  const deleteBtn = actions.querySelector(".action-delete");

  if (payBtn && actionsConfig.onPay) {
    payBtn.onclick = (e) => {
      e.stopPropagation();
      closeSwipeCell(cell);
      triggerHaptic("light");
      playIosHapticClick();
      actionsConfig.onPay();
    };
  }
  if (editBtn && actionsConfig.onEdit) {
    editBtn.onclick = (e) => {
      e.stopPropagation();
      closeSwipeCell(cell);
      triggerHaptic("light");
      playIosHapticClick();
      actionsConfig.onEdit();
    };
  }
  if (deleteBtn && actionsConfig.onDelete) {
    deleteBtn.onclick = (e) => {
      e.stopPropagation();
      closeSwipeCell(cell);
      triggerHaptic("warning");
      actionsConfig.onDelete();
    };
  }

  cell.addEventListener("touchstart", (e) => {
    if (e.touches.length !== 1) return;
    if (activeOpenSwipeCell && activeOpenSwipeCell !== cell) {
      closeSwipeCell(activeOpenSwipeCell);
    }

    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    currentOffset = cell.dataset.isOpen === "true" ? -maxActionsWidth : 0;
    isHorizontal = null;
    isSwiping = true;
    content.style.transition = "none";
  }, { passive: true });

  cell.addEventListener("touchmove", (e) => {
    if (!isSwiping || e.touches.length !== 1) return;
    const clientX = e.touches[0].clientX;
    const clientY = e.touches[0].clientY;
    const deltaX = clientX - startX;
    const deltaY = clientY - startY;

    if (isHorizontal === null) {
      if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 7) {
        isHorizontal = false;
        isSwiping = false;
        return;
      }
      if (Math.abs(deltaX) > 7) {
        isHorizontal = true;
      }
    }

    if (isHorizontal) {
      let targetX = currentOffset + deltaX;
      if (targetX > 0) {
        targetX = targetX * 0.15; // Damped right drag resistance
      } else if (targetX < -maxActionsWidth) {
        targetX = -maxActionsWidth + (targetX + maxActionsWidth) * 0.22; // Damped left overswipe
      }
      content.style.transform = `translateX(${targetX}px)`;
    }
  }, { passive: false });

  cell.addEventListener("touchend", (e) => {
    if (!isSwiping) return;
    isSwiping = false;

    if (isHorizontal) {
      const deltaX = e.changedTouches[0].clientX - startX;
      content.style.transition = "transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)";
      
      if (cell.dataset.isOpen === "true") {
        if (deltaX > 40) {
          closeSwipeCell(cell);
        } else {
          openSwipeCell(cell, maxActionsWidth);
        }
      } else {
        if (deltaX < -55) {
          openSwipeCell(cell, maxActionsWidth);
        } else {
          closeSwipeCell(cell);
        }
      }
    }
  });

  content.addEventListener("click", (e) => {
    if (cell.dataset.isOpen === "true") {
      e.stopPropagation();
      e.preventDefault();
      closeSwipeCell(cell);
    }
  });
}

function openSwipeCell(cell, maxActionsWidth = 192) {
  const content = cell.querySelector(".ios-swipe-content");
  if (!content) return;
  content.style.transition = "transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)";
  content.style.transform = `translateX(-${maxActionsWidth}px)`;
  cell.dataset.isOpen = "true";
  cell.classList.add("swipe-open");
  activeOpenSwipeCell = cell;
  triggerHaptic("light");
}

function closeSwipeCell(cell) {
  const content = cell.querySelector(".ios-swipe-content");
  if (!content) return;
  content.style.transition = "transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)";
  content.style.transform = "translateX(0)";
  cell.dataset.isOpen = "false";
  cell.classList.remove("swipe-open");
  if (activeOpenSwipeCell === cell) {
    activeOpenSwipeCell = null;
  }
}

document.addEventListener("click", (e) => {
  if (activeOpenSwipeCell && !activeOpenSwipeCell.contains(e.target)) {
    closeSwipeCell(activeOpenSwipeCell);
  }
});

// Native iOS Pull-to-Refresh interaction
function setupPullToRefresh() {
  const scrollContainer = document.getElementById("viewContainer");
  const ptrContainer = document.getElementById("iosPullToRefresh");
  const spinner = document.getElementById("iosPtrSpinner");
  if (!scrollContainer || !ptrContainer || !spinner) return;

  let startY = 0;
  let isPulling = false;
  let isRefreshing = false;
  let hasTriggeredThresholdHaptic = false;
  const PULL_THRESHOLD = 62;

  scrollContainer.addEventListener("touchstart", (e) => {
    if (isRefreshing) return;
    if (scrollContainer.scrollTop <= 0) {
      startY = e.touches[0].clientY;
      isPulling = true;
      hasTriggeredThresholdHaptic = false;
      ptrContainer.style.transition = "none";
    }
  }, { passive: true });

  scrollContainer.addEventListener("touchmove", (e) => {
    if (!isPulling || isRefreshing) return;
    if (scrollContainer.scrollTop > 0) {
      isPulling = false;
      ptrContainer.style.height = "0px";
      return;
    }

    const currentY = e.touches[0].clientY;
    const deltaY = currentY - startY;

    if (deltaY > 0) {
      const pullDist = Math.min(84, Math.pow(deltaY, 0.82) * 1.6);
      ptrContainer.style.height = `${pullDist}px`;
      
      const progress = Math.min(1, pullDist / PULL_THRESHOLD);
      spinner.style.opacity = Math.max(0.2, progress);
      spinner.style.transform = `scale(${0.6 + progress * 0.4}) rotate(${progress * 280}deg)`;

      const blades = spinner.querySelectorAll(".ios-ptr-blade");
      const activeBlades = Math.floor(progress * blades.length);
      blades.forEach((blade, idx) => {
        blade.style.opacity = idx < activeBlades ? "1" : "0.2";
      });

      if (pullDist >= PULL_THRESHOLD && !hasTriggeredThresholdHaptic) {
        hasTriggeredThresholdHaptic = true;
        triggerHaptic("medium");
        playIosHapticClick();
      } else if (pullDist < PULL_THRESHOLD) {
        hasTriggeredThresholdHaptic = false;
      }
    }
  }, { passive: true });

  scrollContainer.addEventListener("touchend", async (e) => {
    if (!isPulling || isRefreshing) return;
    isPulling = false;

    const currentHeight = parseFloat(ptrContainer.style.height || "0");
    if (currentHeight >= PULL_THRESHOLD) {
      isRefreshing = true;
      ptrContainer.style.transition = "height 0.28s cubic-bezier(0.32, 0.72, 0, 1)";
      ptrContainer.style.height = "52px";
      spinner.classList.add("refreshing");
      triggerHaptic("success");
      playIosHapticClick();

      try {
        await refreshData();
        showToast("Updated just now", "info", 2000);
      } catch (err) {
        console.error("[Pull-to-refresh error]", err);
      } finally {
        setTimeout(() => {
          ptrContainer.style.transition = "height 0.38s cubic-bezier(0.32, 0.72, 0, 1)";
          ptrContainer.style.height = "0px";
          setTimeout(() => {
            spinner.classList.remove("refreshing");
            spinner.style.opacity = "0";
            spinner.style.transform = "scale(0.6) rotate(0deg)";
            isRefreshing = false;
          }, 400);
        }, 500);
      }
    } else {
      ptrContainer.style.transition = "height 0.3s cubic-bezier(0.32, 0.72, 0, 1)";
      ptrContainer.style.height = "0px";
      setTimeout(() => {
        spinner.style.opacity = "0";
        spinner.style.transform = "scale(0.6) rotate(0deg)";
      }, 300);
    }
  });
}

// iOS Large Navigation Title System with smooth scroll-driven collapse
function setupIosLargeTitleCollapse() {
  const scrollContainer = document.getElementById("viewContainer");
  const compactTitle = document.getElementById("iosNavCompactTitle");
  const sidebar = document.querySelector(".sidebar");
  if (!scrollContainer || !compactTitle) return;

  const viewTitles = {
    "dashboard": "Overview",
    "rooms": "Rooms",
    "ledger": "Monthly Ledger",
    "spreadsheet": "Spreadsheet Matrix",
    "settings": "Studio & Theme",
    "import-export": "Import & Export"
  };

  function updateCompactTitleText() {
    const curTitle = viewTitles[state.currentView] || "Rental Ledger";
    compactTitle.textContent = curTitle;
  }

  scrollContainer.addEventListener("scroll", () => {
    const scrollTop = scrollContainer.scrollTop;
    const activePanel = document.querySelector(".view-panel.active");
    if (!activePanel) return;

    const largeTitle = activePanel.querySelector(".ios-large-title");

    const collapseThreshold = 46;
    const progress = Math.min(1, Math.max(0, scrollTop / collapseThreshold));

    if (largeTitle) {
      largeTitle.style.opacity = (1 - progress * 1.15).toFixed(3);
      largeTitle.style.transform = `translateY(${-progress * 14}px) scale(${1 - progress * 0.05})`;
    }

    compactTitle.style.opacity = progress.toFixed(3);
    compactTitle.style.transform = `translateX(-50%) translateY(${(1 - progress) * 8}px)`;

    if (sidebar) {
      if (progress > 0.15) {
        sidebar.classList.add("ios-nav-scrolled");
      } else {
        sidebar.classList.remove("ios-nav-scrolled");
      }
    }
  }, { passive: true });

  window.updateIosTitleState = () => {
    updateCompactTitleText();
    const activePanel = document.querySelector(".view-panel.active");
    if (!activePanel) return;
    const largeTitle = activePanel.querySelector(".ios-large-title");
    if (largeTitle) {
      largeTitle.style.opacity = "1";
      largeTitle.style.transform = "translateY(0) scale(1)";
    }
    compactTitle.style.opacity = "0";
    compactTitle.style.transform = "translateX(-50%) translateY(8px)";
    if (sidebar) sidebar.classList.remove("ios-nav-scrolled");
  };
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
  setupCellInspectionGestures();
  setupUniversalImportExport();
  setupStudioSettings();
  setupModals();
  setupInputGuards();

  // iOS Navigation & Gestures Framework
  setupIosLargeTitleCollapse();
  setupPullToRefresh();

  await loadPreferences();
  await loadBuildings();
  renderBuildingSegmentedControl();
  await refreshData();

  // Firebase Authentication & Native App Lock
  await setupAuthEngine();
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
  const confirmed = await showIosConfirm({
    title: `Delete Property '${buildingName}'`,
    message: `Are you sure you want to permanently delete property '${buildingName}'?\n\nWarning: This will delete this property along with all its associated rooms, meter readings, and ledger statements.`,
    confirmText: "Delete Property",
    isDestructive: true,
    cancelText: "Cancel"
  });
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
  renderBuildingSegmentedControl();
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
  renderBuildingSegmentedControl();

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
    const cell = document.createElement("div");
    cell.className = "ios-swipe-cell";
    cell.dataset.roomId = r.id;
    const isOccupied = r.status === "Lended";

    const depositAmount = r.securityDepositAmount > 0 ? r.securityDepositAmount : (r.securityDepositReceived ? r.agreedRent : 0);
    const hasDeposit = Boolean(r.securityDepositReceived || r.advanceReceived);

    cell.innerHTML = `
      <div class="ios-swipe-actions">
        <button class="ios-swipe-action action-pay" title="Record Rent Payment">
          ${getIconSvg("payments")}
          <span>Payment</span>
        </button>
        <button class="ios-swipe-action action-edit" title="Edit Room Details">
          ${getIconSvg("edit")}
          <span>Edit</span>
        </button>
        <button class="ios-swipe-action action-delete" title="Delete Room">
          ${getIconSvg("delete")}
          <span>Delete</span>
        </button>
      </div>

      <div class="ios-swipe-content room-card">
        <div class="room-card-header" style="cursor: pointer;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="room-card-title">Room ${escapeHtml(r.roomNumber)}</span>
            <span class="status-chip ${isOccupied ? 'occupied' : 'vacant'}">${isOccupied ? 'Occupied' : 'Vacant'}</span>
          </div>
          <svg class="app-icon" style="color: var(--text-muted); width: 18px; height: 18px;"><use href="#icon-chevron_right"></use></svg>
        </div>

        <div class="room-card-tenant" style="padding-top: 6px; padding-bottom: 6px; display: flex; align-items: center; gap: 8px;">
          ${getIconSvg("person", "", "width: 16px; height: 16px; flex-shrink: 0;")}
          <span style="font-size: 13px; font-weight: 500;">${escapeHtml(r.tenant ? r.tenant.name : 'No active tenant')}</span>
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
      </div>
    `;

    container.appendChild(cell);

    // Attach iOS Touch-Drag Swipe Actions
    makeSwipeable(cell, {
      onPay: () => {
        if (isOccupied) {
          const rd = state.records.find(item => item.room.id === r.id);
          if (rd) {
            openPaymentModal(
              rd.record.id,
              r.roomNumber,
              r.tenant ? r.tenant.name : (r.tenantName || ""),
              rd.record.balance,
              rd.record.rent
            );
          } else {
            openPaymentModal(
              0,
              r.roomNumber,
              r.tenant ? r.tenant.name : (r.tenantName || ""),
              r.agreedRent,
              r.agreedRent
            );
          }
        } else {
          showToast(`Room ${r.roomNumber} is currently vacant. Assign a tenant to record rent payment.`, "info");
        }
      },
      onEdit: () => openEditRoomModal(r.id),
      onDelete: () => handleDeleteRoom(r.id, r.roomNumber)
    });
  });

  // Tapping the card header also opens the room details / edit modal
  container.querySelectorAll(".room-card-header").forEach(hdr => {
    hdr.onclick = () => {
      const editBtn = hdr.closest(".room-card").querySelector(".edit-room-btn");
      if (editBtn) editBtn.click();
    };
  });

  // Bind desktop inside buttons
  container.querySelectorAll(".edit-room-btn").forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      openEditRoomModal(Number(btn.dataset.id));
    };
  });

  container.querySelectorAll(".delete-room-btn").forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
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
    const cell = document.createElement("div");
    cell.className = "ios-swipe-cell";
    cell.dataset.recordId = rd.record.id;
    const rec = rd.record;
    const isPaid = rec.isPaid;
    const hasPaidSome = rec.totalPaid > 0 && !isPaid;

    const statusClass = isPaid ? "paid" : (hasPaidSome ? "partial" : "unpaid");
    const statusLabel = isPaid ? "Fully Paid" : (hasPaidSome ? "Partially Paid" : "Payment Due");

    cell.innerHTML = `
      <div class="ios-swipe-actions">
        <button class="ios-swipe-action action-pay" title="Record Rent Payment">
          ${getIconSvg("payments")}
          <span>Payment</span>
        </button>
        <button class="ios-swipe-action action-edit" title="Edit Statement Entry">
          ${getIconSvg("edit")}
          <span>Edit</span>
        </button>
        <button class="ios-swipe-action action-delete" title="Delete Statement Entry">
          ${getIconSvg("delete")}
          <span>Delete</span>
        </button>
      </div>

      <div class="ios-swipe-content ledger-item-card">
        <div class="ledger-col-unit" style="cursor: pointer;">
          <div>
            <h4>Room ${escapeHtml(rd.room.roomNumber)}</h4>
            <span>${escapeHtml(rd.room.tenantName || 'Vacant')}</span>
          </div>
          <div style="margin-left: auto; display: flex; align-items: center; gap: 8px;">
            <span class="status-chip ${statusClass}">${statusLabel}</span>
            <svg class="app-icon" style="color: var(--text-muted); width: 16px; height: 16px;"><use href="#icon-chevron_right"></use></svg>
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
      </div>
    `;

    container.appendChild(cell);

    // Attach iOS Touch-Drag Swipe Actions
    makeSwipeable(cell, {
      onPay: () => openPaymentModal(
        rec.id,
        rd.room.roomNumber,
        rd.room.tenantName || '',
        rec.balance,
        rec.rent
      ),
      onEdit: () => openStatementModal(rd),
      onDelete: () => handleDeleteStatement(rec.id, rd.room.roomNumber)
    });
  });

  // Tapping the unit header opens the edit statement modal
  container.querySelectorAll(".ledger-col-unit").forEach(hdr => {
    hdr.onclick = () => {
      const editBtn = hdr.closest(".ledger-item-card").querySelector(".edit-statement-btn");
      if (editBtn) editBtn.click();
    };
  });

  // Bind inside action buttons
  container.querySelectorAll(".record-pay-btn").forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      openPaymentModal(
        Number(btn.dataset.rec),
        btn.dataset.unit,
        btn.dataset.tenant,
        Number(btn.dataset.due),
        Number(btn.dataset.rent || 0)
      );
    };
  });

  container.querySelectorAll(".edit-statement-btn").forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const recId = Number(btn.dataset.rec);
      const rd = state.records.find(r => r.record.id === recId);
      if (rd) openStatementModal(rd);
    };
  });

  container.querySelectorAll(".delete-ledger-btn").forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const recId = Number(btn.dataset.rec);
      const roomNum = btn.dataset.room;
      handleDeleteStatement(recId, roomNum);
    };
  });
}

// -----------------------------------------------------------------------------
// 4. Matrix Spreadsheet Renderer, Annual Matrix & Cell Inspection
// -----------------------------------------------------------------------------

async function renderSpreadsheet() {
  const tbody = document.getElementById("matrixTableBody");
  const thead = document.getElementById("matrixTableHead");
  if (!tbody) return;

  if (state.spreadsheetMode === "annual") {
    await renderAnnualMatrixSpreadsheet(thead, tbody);
  } else {
    renderMonthlyDetailSpreadsheet(thead, tbody);
  }
}

async function renderAnnualMatrixSpreadsheet(thead, tbody) {
  // Render Annual Headers
  if (thead) {
    thead.innerHTML = `
      <tr>
        <th class="sortable-th sticky-first-col" data-col="room" style="min-width: 135px;" title="Click to sort by Room">Room & Tenant <span class="th-sort-arrow"></span></th>
        <th data-col-month="1" title="January">Jan</th>
        <th data-col-month="2" title="February">Feb</th>
        <th data-col-month="3" title="March">Mar</th>
        <th data-col-month="4" title="April">Apr</th>
        <th data-col-month="5" title="May">May</th>
        <th data-col-month="6" title="June">Jun</th>
        <th data-col-month="7" title="July">Jul</th>
        <th data-col-month="8" title="August">Aug</th>
        <th data-col-month="9" title="September">Sep</th>
        <th data-col-month="10" title="October">Oct</th>
        <th data-col-month="11" title="November">Nov</th>
        <th data-col-month="12" title="December">Dec</th>
        <th class="sortable-th" data-col="due" style="text-align: right;" title="Click to sort by Annual Due">Annual Due <span class="th-sort-arrow"></span></th>
        <th class="sortable-th" data-col="paid" style="text-align: right;" title="Click to sort by Annual Paid">Annual Paid <span class="th-sort-arrow"></span></th>
        <th class="sortable-th" data-col="balance" style="text-align: right;" title="Click to sort by Annual Balance">Balance <span class="th-sort-arrow"></span></th>
      </tr>
    `;

    // Re-bind header sort clicks
    thead.querySelectorAll("th.sortable-th").forEach(th => {
      th.onclick = () => {
        const col = th.dataset.col;
        if (!col) return;
        state.spreadsheetSort = (state.spreadsheetSort === `${col}-asc`) ? `${col}-desc` : `${col}-asc`;
        const sortSelect = document.getElementById("matrixSortSelect");
        if (sortSelect) {
          const opt = sortSelect.querySelector(`option[value="${state.spreadsheetSort}"]`);
          if (opt) sortSelect.value = state.spreadsheetSort;
        }
        renderSpreadsheet();
      };
    });
  }

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

  // Fetch Annual Matrix Data
  state.annualMatrixData = await callAPI("get_annual_matrix", state.selectedBuildingId, state.currentYear);
  if (!state.annualMatrixData || !state.annualMatrixData.rows) {
    tbody.innerHTML = `<tr><td colspan="16" style="text-align: center; padding: 36px; color: var(--text-muted); font-size: 13px;">No matrix records found.</td></tr>`;
    return;
  }

  let rows = [...state.annualMatrixData.rows];
  if (state.searchQuery) {
    const q = state.searchQuery.toLowerCase();
    rows = rows.filter(r => {
      const roomNum = (r.room.roomNumber || "").toLowerCase();
      const tenant = (r.room.tenantName || "").toLowerCase();
      const building = (r.room.buildingName || "").toLowerCase();
      return roomNum.includes(q) || tenant.includes(q) || building.includes(q);
    });
  }

  // Sort rows
  rows.sort((a, b) => {
    const rA = a.room;
    const rB = b.room;
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
      case "due-desc":
        return b.annualDue - a.annualDue;
      case "due-asc":
        return a.annualDue - b.annualDue;
      case "balance-desc":
        return b.annualBalance - a.annualBalance;
      case "balance-asc":
        return a.annualBalance - b.annualBalance;
      case "status-unpaid":
        return (b.annualBalance > 0 ? 1 : 0) - (a.annualBalance > 0 ? 1 : 0);
      default:
        return numA !== numB ? numA - numB : (rA.roomNumber || "").localeCompare(rB.roomNumber || "");
    }
  });

  tbody.innerHTML = "";
  if (rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="16" style="text-align: center; padding: 36px; color: var(--text-muted); font-size: 13px;">No rooms match your filter or search.</td></tr>`;
    return;
  }

  rows.forEach(r => {
    const tr = document.createElement("tr");
    tr.dataset.roomId = r.room.id;

    // Sticky First Column: Room Number & Tenant Name with vertical divider
    let rowHtml = `
      <td class="sticky-first-col" data-room-id="${r.room.id}">
        <div class="matrix-room-cell">
          <div class="matrix-room-badge">
            <span>Room ${escapeHtml(r.room.roomNumber)}</span>
          </div>
          <div class="matrix-tenant-name">${escapeHtml(r.room.tenantName || 'Vacant')}</div>
        </div>
      </td>
    `;

    // 12 Months
    for (let m = 1; m <= 12; m++) {
      const monthItem = r.months[m];
      if (!monthItem) {
        rowHtml += `
          <td class="matrix-cell empty-cell" data-room-id="${r.room.id}" data-month="${m}" data-year="${state.currentYear}">
            <div class="matrix-cell-content">
              <span class="matrix-cell-pill empty">—</span>
            </div>
          </td>
        `;
      } else {
        const rec = monthItem.record;
        const isPaid = rec.isPaid;
        const statusClass = isPaid ? "paid" : (rec.totalPaid > 0 ? "partial" : "unpaid");
        const statusLabel = isPaid ? "Paid" : (rec.totalPaid > 0 ? "Partial" : "Unpaid");
        const displayAmt = isPaid ? rec.totalPaid : (rec.balance > 0 ? rec.balance : rec.totalDue);

        rowHtml += `
          <td class="matrix-cell" data-room-id="${r.room.id}" data-month="${m}" data-year="${state.currentYear}" data-rec-id="${rec.id}">
            <div class="matrix-cell-content">
              <span class="matrix-cell-pill ${statusClass}">
                <span class="matrix-status-dot ${statusClass}"></span>
                ${statusLabel}
              </span>
              <span class="matrix-cell-amt">${fmtCurrency(displayAmt)}</span>
            </div>
          </td>
        `;
      }
    }

    // Annual Totals
    const balColor = r.annualBalance > 0 ? 'var(--danger)' : 'var(--success)';
    rowHtml += `
      <td style="text-align: right; font-weight: 600;" class="matrix-total-val">${fmtCurrency(r.annualDue)}</td>
      <td style="text-align: right; font-weight: 600; color: var(--success);" class="matrix-total-val">${fmtCurrency(r.annualPaid)}</td>
      <td style="text-align: right; font-weight: 700; color: ${balColor};" class="matrix-total-val">${fmtCurrency(r.annualBalance)}</td>
    `;

    tr.innerHTML = rowHtml;
    tbody.appendChild(tr);
  });

  // Footer Row: Monthly and Grand Totals
  const tfoot = document.createElement("tr");
  tfoot.className = "matrix-footer-totals-row";
  tfoot.style.fontWeight = "700";
  tfoot.style.background = "var(--bg-elevated)";
  let fHtml = `<td class="sticky-first-col" style="background: var(--bg-elevated); font-weight: 700;">TOTALS</td>`;
  for (let m = 1; m <= 12; m++) {
    const tot = state.annualMatrixData.columnTotals[m] || { due: 0, paid: 0, balance: 0 };
    fHtml += `
      <td class="matrix-cell" style="text-align: center; font-size: 11px;">
        <div style="color: var(--text-muted); font-size: 10px;">Due: ${fmtCurrency(tot.due)}</div>
        <div style="color: ${tot.balance > 0 ? 'var(--danger)' : 'var(--success)'}; font-weight: 700;">Bal: ${fmtCurrency(tot.balance)}</div>
      </td>
    `;
  }
  fHtml += `
    <td style="text-align: right;">${fmtCurrency(state.annualMatrixData.grandTotalDue)}</td>
    <td style="text-align: right; color: var(--success);">${fmtCurrency(state.annualMatrixData.grandTotalPaid)}</td>
    <td style="text-align: right; color: ${state.annualMatrixData.grandTotalBalance > 0 ? 'var(--danger)' : 'var(--success)'};">${fmtCurrency(state.annualMatrixData.grandTotalBalance)}</td>
  `;
  tfoot.innerHTML = fHtml;
  tbody.appendChild(tfoot);

  // Bind Cell Tap / Click Inspection
  tbody.querySelectorAll(".matrix-cell").forEach(td => {
    td.onclick = () => {
      tbody.querySelectorAll(".matrix-cell.cell-selected").forEach(c => c.classList.remove("cell-selected"));
      td.classList.add("cell-selected");

      const roomId = Number(td.dataset.roomId);
      const month = Number(td.dataset.month);
      const year = Number(td.dataset.year) || state.currentYear;

      const rowItem = state.annualMatrixData.rows.find(r => r.room.id === roomId);
      if (!rowItem) return;
      const monthItem = rowItem.months[month];

      openCellInspection({
        room: rowItem.room,
        month: month,
        year: year,
        record: monthItem ? monthItem.record : null,
        payments: monthItem ? monthItem.payments : []
      });
    };
  });
}

function renderMonthlyDetailSpreadsheet(thead, tbody) {
  // Render Monthly Detail Headers
  if (thead) {
    thead.innerHTML = `
      <tr>
        <th class="sortable-th sticky-first-col" data-col="room" title="Click to sort by Room">Room & Tenant <span class="th-sort-arrow"></span></th>
        <th class="sortable-th" data-col="building" title="Click to sort by Building">Building <span class="th-sort-arrow"></span></th>
        <th class="sortable-th" data-col="status" title="Click to sort by Status">Status <span class="th-sort-arrow"></span></th>
        <th class="sortable-th" data-col="rent" title="Click to sort by Rent">Rent (₹) <span class="th-sort-arrow"></span></th>
        <th class="sortable-th" data-col="startMeter" title="Click to sort by Start Meter">Start Meter <span class="th-sort-arrow"></span></th>
        <th class="sortable-th" data-col="endMeter" title="Click to sort by End Meter">End Meter <span class="th-sort-arrow"></span></th>
        <th class="sortable-th" data-col="units" title="Click to sort by Units Consumed">Units Consumed <span class="th-sort-arrow"></span></th>
        <th class="sortable-th" data-col="rate" title="Click to sort by Rate">Rate (₹/Unit) <span class="th-sort-arrow"></span></th>
        <th class="sortable-th" data-col="electric" title="Click to sort by Electricity">Electricity (₹) <span class="th-sort-arrow"></span></th>
        <th class="sortable-th" data-col="other" title="Click to sort by Other">Other (₹) <span class="th-sort-arrow"></span></th>
        <th class="sortable-th" data-col="prevBal" title="Click to sort by Prev Bal">Prev Bal (₹) <span class="th-sort-arrow"></span></th>
        <th class="sortable-th" data-col="totalDue" title="Click to sort by Total Due">Total Due (₹) <span class="th-sort-arrow"></span></th>
        <th class="sortable-th" data-col="paid" title="Click to sort by Paid">Paid (₹) <span class="th-sort-arrow"></span></th>
        <th class="sortable-th" data-col="balance" title="Click to sort by Balance">Balance (₹) <span class="th-sort-arrow"></span></th>
        <th class="sortable-th" data-col="paymentStatus" title="Click to sort by Payment Status">Payment Status <span class="th-sort-arrow"></span></th>
        <th>Actions</th>
      </tr>
    `;

    // Re-bind header sort clicks
    thead.querySelectorAll("th.sortable-th").forEach(th => {
      th.onclick = () => {
        const col = th.dataset.col;
        if (!col) return;
        state.spreadsheetSort = (state.spreadsheetSort === `${col}-asc`) ? `${col}-desc` : `${col}-asc`;
        const sortSelect = document.getElementById("matrixSortSelect");
        if (sortSelect) {
          const opt = sortSelect.querySelector(`option[value="${state.spreadsheetSort}"]`);
          if (opt) sortSelect.value = state.spreadsheetSort;
        }
        renderSpreadsheet();
      };
    });
  }

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
        return (recB.balance > 0 ? 1 : 0) - (a.balance > 0 ? 1 : 0);
      default:
        return numA !== numB ? numA - numB : (rA.roomNumber || "").localeCompare(rB.roomNumber || "");
    }
  });

  if (sorted.length === 0) {
    tbody.innerHTML = `<tr><td colspan="16" style="text-align: center; padding: 36px; color: var(--text-muted); font-size: 13px;">No statement entries match your filter or search.</td></tr>`;
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
        <td class="sticky-first-col">
          <div class="matrix-room-cell">
            <div class="matrix-room-badge">Room ${escapeHtml(rd.room.roomNumber)}</div>
            <div class="matrix-tenant-name">${escapeHtml(rd.room.tenantName || 'Vacant')}</div>
          </div>
        </td>
        <td><span style="font-size: 11px; color: var(--text-secondary);">${escapeHtml(rd.room.buildingName || 'Main')}</span></td>
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
        <td class="sticky-first-col matrix-cell" data-room-id="${rd.room.id}">
          <div class="matrix-room-cell">
            <div class="matrix-room-badge">Room ${escapeHtml(rd.room.roomNumber)}</div>
            <div class="matrix-tenant-name">${escapeHtml(rd.room.tenantName || 'Vacant')}</div>
          </div>
        </td>
        <td class="matrix-cell"><span style="font-size: 11px; color: var(--text-secondary);">${escapeHtml(rd.room.buildingName || 'Main')}</span></td>
        <td class="matrix-cell"><span class="status-chip ${rd.room.status === 'Lended' ? 'occupied' : 'vacant'}">${rd.room.status}</span></td>
        <td class="matrix-cell">${fmtCurrency(rec.rent)}</td>
        <td class="matrix-cell">${rec.meterPrevious.toFixed(1)}</td>
        <td class="matrix-cell">${rec.meterCurrent.toFixed(1)}</td>
        <td class="matrix-cell" style="font-weight: 600; color: var(--primary);">${rec.units.toFixed(1)}</td>
        <td class="matrix-cell">${fmtCurrency(rec.meterRatePerUnit)}</td>
        <td class="matrix-cell">${fmtCurrency(rec.electricity)}</td>
        <td class="matrix-cell">${fmtCurrency(rec.otherCharges)}</td>
        <td class="matrix-cell">${fmtCurrency(rec.previousBalance)}</td>
        <td class="matrix-cell"><strong>${fmtCurrency(rec.totalDue)}</strong></td>
        <td class="matrix-cell">${fmtCurrency(rec.totalPaid)}</td>
        <td class="matrix-cell" style="color: ${rec.balance > 0 ? 'var(--danger)' : 'var(--success)'}; font-weight: 700;">${fmtCurrency(rec.balance)}</td>
        <td class="matrix-cell"><span class="status-chip ${statusClass}">${statusText}</span></td>
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
    btn.onclick = (e) => {
      e.stopPropagation();
      const recId = Number(btn.dataset.rec);
      const rd = state.records.find(r => r.record.id === recId);
      if (rd) openStatementModal(rd);
    };
  });

  // Bind Cell Clicks in Read-Only Mode
  if (!state.spreadsheetEditMode) {
    tbody.querySelectorAll("tr").forEach(row => {
      row.querySelectorAll(".matrix-cell").forEach(cell => {
        cell.onclick = () => {
          tbody.querySelectorAll(".matrix-cell.cell-selected").forEach(c => c.classList.remove("cell-selected"));
          cell.classList.add("cell-selected");
          const recId = Number(row.dataset.recId);
          const rd = state.records.find(r => r.record.id === recId);
          if (rd) {
            openCellInspection({
              room: rd.room,
              month: state.currentMonth,
              year: state.currentYear,
              record: rd.record,
              payments: rd.payments || []
            });
          }
        };
      });
    });
  }

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

      // Update UI row elements
      tr.querySelector(".col-units").textContent = units.toFixed(1);
      tr.querySelector(".col-electric").textContent = fmtCurrency(electricity);
      tr.querySelector(".col-total").innerHTML = `<strong>${fmtCurrency(totalDue)}</strong>`;
      const balEl = tr.querySelector(".col-balance");
      balEl.textContent = fmtCurrency(balance);
      balEl.style.color = balance > 0 ? "var(--danger)" : "var(--success)";

      const statusEl = tr.querySelector(".col-status");
      const statusClass = isPaid ? "paid" : (rd.record.totalPaid > 0 ? "partial" : "unpaid");
      const statusText = isPaid ? "Paid" : (rd.record.totalPaid > 0 ? "Partial" : "Unpaid");
      statusEl.innerHTML = `<span class="status-chip ${statusClass}">${statusText}</span>`;

      // Persist to database
      input.classList.add("saved-flash");
      setTimeout(() => input.classList.remove("saved-flash"), 800);

      await callAPI(
        "update_monthly_record",
        recId,
        rent,
        prev,
        curr,
        rate,
        other,
        rd.record.otherChargesNote || "",
        rd.record.note || "",
        rd.record.meterReadAt || ""
      );
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
  // 1. Sort Dropdown
  const sortSelect = document.getElementById("matrixSortSelect");
  if (sortSelect) {
    sortSelect.onchange = () => {
      state.spreadsheetSort = sortSelect.value;
      renderSpreadsheet();
    };
  }

  // 2. Mode Switcher (Annual Matrix vs Monthly Detail)
  const modeSwitch = document.getElementById("matrixModeSwitch");
  if (modeSwitch) {
    modeSwitch.querySelectorAll(".ios-seg-btn").forEach(btn => {
      btn.onclick = () => {
        const mode = btn.dataset.mode;
        if (state.spreadsheetMode === mode) return;
        state.spreadsheetMode = mode;
        modeSwitch.querySelectorAll(".ios-seg-btn").forEach(b => {
          b.classList.toggle("active", b === btn);
        });
        renderSpreadsheet();
      };
    });
  }

  // 3. Quick Month / Quarter Jump Pills
  const jumpPills = document.getElementById("matrixJumpPills");
  if (jumpPills) {
    jumpPills.querySelectorAll(".ios-pill").forEach(pill => {
      pill.onclick = () => {
        const jump = pill.dataset.jump;
        state.spreadsheetJump = jump;
        jumpPills.querySelectorAll(".ios-pill").forEach(p => p.classList.toggle("active", p === pill));
        handleMatrixJump(jump);
      };
    });
  }

  // 4. Edit Mode Toggle
  const editBtn = document.getElementById("toggleSpreadsheetEditBtn");
  const editLbl = document.getElementById("spreadsheetEditModeLabel");
  if (editBtn) {
    editBtn.onclick = () => {
      state.spreadsheetEditMode = !state.spreadsheetEditMode;
      if (state.spreadsheetEditMode) {
        // Switch to monthly mode for inline editing if in annual
        if (state.spreadsheetMode === "annual") {
          state.spreadsheetMode = "monthly";
          document.querySelectorAll("#matrixModeSwitch .ios-seg-btn").forEach(b => {
            b.classList.toggle("active", b.dataset.mode === "monthly");
          });
        }
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
}

function handleMatrixJump(jump) {
  const scrollContainer = document.getElementById("matrixScrollWrapper");
  if (!scrollContainer) return;

  if (state.spreadsheetMode === "annual") {
    let targetMonth = null;
    if (jump === "all") {
      scrollContainer.scrollTo({ left: 0, behavior: "smooth" });
      return;
    } else if (jump === "current") {
      targetMonth = state.currentMonth;
    } else if (jump === "q1") {
      targetMonth = 1;
    } else if (jump === "q2") {
      targetMonth = 4;
    } else if (jump === "q3") {
      targetMonth = 7;
    } else if (jump === "q4") {
      targetMonth = 10;
    }

    if (targetMonth !== null) {
      const targetTh = scrollContainer.querySelector(`th[data-col-month="${targetMonth}"]`);
      if (targetTh) {
        const stickyCol = scrollContainer.querySelector("th.sticky-first-col");
        const stickyWidth = stickyCol ? stickyCol.offsetWidth : 120;
        const targetLeft = Math.max(0, targetTh.offsetLeft - stickyWidth - 10);
        scrollContainer.scrollTo({ left: targetLeft, behavior: "smooth" });

        // Highlight column header
        targetTh.classList.remove("col-jump-highlight");
        void targetTh.offsetWidth;
        targetTh.classList.add("col-jump-highlight");
      }
    }
  } else {
    // In monthly breakdown mode, jump switches the active month
    if (jump === "current") {
      state.currentMonth = new Date().getMonth() + 1;
    } else if (jump === "q1") {
      state.currentMonth = 1;
    } else if (jump === "q2") {
      state.currentMonth = 4;
    } else if (jump === "q3") {
      state.currentMonth = 7;
    } else if (jump === "q4") {
      state.currentMonth = 10;
    }
    refreshData();
  }
}

// -----------------------------------------------------------------------------
// Cell Tap Inspection Bottom Card Drawer & Gestures
// -----------------------------------------------------------------------------

function openCellInspection(data) {
  state.activeInspectionData = data;
  const sheet = document.getElementById("cellInspectionSheet");
  const backdrop = document.getElementById("cellInspectionBackdrop");
  if (!sheet || !backdrop) return;

  const room = data.room || {};
  const rec = data.record || {};
  const monthName = MONTH_NAMES[(data.month || state.currentMonth || 1) - 1];
  const year = data.year || state.currentYear;
  const isPaid = rec.isPaid || false;
  const totalPaid = rec.totalPaid || 0;
  const totalDue = rec.totalDue || (room.agreedRent || 0);
  const balance = (rec.balance !== undefined) ? rec.balance : (totalDue - totalPaid);
  const status = isPaid ? "Paid" : (totalPaid > 0 ? "Partial" : "Unpaid");

  // Populate Room & Property
  const roomBadgeEl = document.getElementById("sheetRoomBadge");
  if (roomBadgeEl) roomBadgeEl.textContent = `Room ${room.roomNumber || ''}`;
  const bldgEl = document.getElementById("sheetBuildingName");
  if (bldgEl) bldgEl.textContent = room.buildingName || 'Main Property';
  const tenantEl = document.getElementById("sheetTenantName");
  if (tenantEl) tenantEl.textContent = room.tenantName || 'Vacant';

  // Period & iOS Badge
  const periodEl = document.getElementById("sheetMonthPeriod");
  if (periodEl) periodEl.textContent = `${monthName} ${year}`;
  const badgeEl = document.getElementById("sheetStatusBadge");
  if (badgeEl) {
    badgeEl.className = `ios-badge ${status.toLowerCase()}`;
    badgeEl.textContent = status;
  }

  // Financial KPIs
  const dueEl = document.getElementById("sheetTotalDue");
  if (dueEl) dueEl.textContent = fmtCurrency(totalDue);
  const paidEl = document.getElementById("sheetPaidAmount");
  if (paidEl) paidEl.textContent = fmtCurrency(totalPaid);
  const balEl = document.getElementById("sheetBalance");
  if (balEl) {
    balEl.textContent = fmtCurrency(balance);
    balEl.style.color = balance > 0 ? "var(--danger)" : "var(--success)";
  }

  // Inset Breakdown Group
  const rentVal = document.getElementById("sheetRentVal");
  if (rentVal) rentVal.textContent = fmtCurrency(rec.rent || room.agreedRent || 0);
  const unitsVal = document.getElementById("sheetUnitsVal");
  if (unitsVal) unitsVal.textContent = fmtUnits(rec.units || 0);
  const powerVal = document.getElementById("sheetPowerVal");
  if (powerVal) powerVal.textContent = fmtCurrency(rec.electricity || 0);
  const otherVal = document.getElementById("sheetOtherVal");
  if (otherVal) otherVal.textContent = fmtCurrency(rec.otherCharges || 0);
  const prevVal = document.getElementById("sheetPrevBalVal");
  if (prevVal) prevVal.textContent = fmtCurrency(rec.previousBalance || 0);

  // Payments List
  const paymentsListEl = document.getElementById("sheetPaymentsList");
  const paymentsCountEl = document.getElementById("sheetPaymentsCount");
  const payments = data.payments || [];
  if (paymentsCountEl) paymentsCountEl.textContent = payments.length;
  if (paymentsListEl) {
    paymentsListEl.innerHTML = "";
    if (payments.length === 0) {
      paymentsListEl.innerHTML = `
        <div style="padding: 10px; text-align: center; font-size: 11px; color: var(--text-muted); background: rgba(255,255,255,0.02); border-radius: 8px;">
          No payment transactions logged for this month.
        </div>
      `;
    } else {
      payments.forEach(p => {
        const item = document.createElement("div");
        item.className = "ios-sheet-payment-item";
        item.innerHTML = `
          <div class="ios-sheet-payment-left">
            <span class="ios-sheet-payment-date">${p.paidAt || 'Recent'}</span>
            <span class="ios-sheet-payment-meta">${escapeHtml(p.method || 'Cash')} · ${escapeHtml(p.purpose || 'Rent')}</span>
          </div>
          <div class="ios-sheet-payment-amount">+${fmtCurrency(p.amount)}</div>
        `;
        paymentsListEl.appendChild(item);
      });
    }
  }

  // Action Buttons
  const addPayBtn = document.getElementById("sheetAddPaymentBtn");
  if (addPayBtn) {
    addPayBtn.onclick = async () => {
      closeCellInspection();
      let recordId = rec.id;
      if (!recordId) {
        const recs = await callAPI("get_records", room.buildingId, data.month || state.currentMonth, year);
        const found = (recs || []).find(r => r.room.id === room.id);
        if (found) recordId = found.record.id;
      }
      if (recordId) {
        openPaymentModal(recordId, room.roomNumber, room.tenantName, balance, rec.rent || room.agreedRent || 0);
      } else {
        showToast("Opening statement entry to record payment...", "info");
        openAddStatementModal();
      }
    };
  }

  const viewHistBtn = document.getElementById("sheetViewHistoryBtn");
  if (viewHistBtn) {
    viewHistBtn.onclick = () => {
      closeCellInspection();
      if (data.record) {
        openStatementModal({
          room: room,
          record: rec,
          payments: data.payments || []
        });
      } else {
        showToast(`No monthly statement entry created yet for Room ${room.roomNumber} in ${monthName}.`, "info");
      }
    };
  }

  // Open Bottom Sheet with iOS Spring animation
  backdrop.classList.add("open");
  sheet.style.transform = "translateY(0)";
}

function closeCellInspection() {
  const sheet = document.getElementById("cellInspectionSheet");
  const backdrop = document.getElementById("cellInspectionBackdrop");
  if (sheet) sheet.style.transform = "translateY(100%)";
  if (backdrop) backdrop.classList.remove("open");
  state.activeInspectionData = null;
  document.querySelectorAll(".matrix-cell.cell-selected").forEach(c => c.classList.remove("cell-selected"));
}

function setupCellInspectionGestures() {
  const sheet = document.getElementById("cellInspectionSheet");
  const backdrop = document.getElementById("cellInspectionBackdrop");
  const closeBtn = document.getElementById("closeInspectionSheetBtn");

  if (closeBtn) closeBtn.onclick = closeCellInspection;
  if (backdrop) {
    backdrop.onclick = (e) => {
      if (e.target === backdrop) closeCellInspection();
    };
  }

  // Swipe-down touch gesture
  if (sheet) {
    let startY = 0;
    let currentY = 0;
    let isDragging = false;

    sheet.addEventListener("touchstart", (e) => {
      const body = sheet.querySelector(".ios-sheet-body");
      if (body && body.scrollTop > 0) return;
      startY = e.touches[0].clientY;
      isDragging = true;
      sheet.style.transition = "none";
    }, { passive: true });

    sheet.addEventListener("touchmove", (e) => {
      if (!isDragging) return;
      currentY = e.touches[0].clientY;
      const deltaY = currentY - startY;
      if (deltaY > 0) {
        sheet.style.transform = `translateY(${deltaY}px)`;
      }
    }, { passive: true });

    sheet.addEventListener("touchend", () => {
      if (!isDragging) return;
      isDragging = false;
      sheet.style.transition = "transform 0.36s var(--ios-spring)";
      const deltaY = currentY - startY;
      if (deltaY > 70) {
        closeCellInspection();
      } else {
        sheet.style.transform = "translateY(0)";
      }
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && backdrop && backdrop.classList.contains("open")) {
      closeCellInspection();
    }
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

  // Quick Export Sheet Button (Native iOS Action Sheet)
  const exportSheetBtn = document.getElementById("openExportSheetBtn");
  if (exportSheetBtn) {
    exportSheetBtn.onclick = () => showExportActionSheet();
  }

  // Database Backup & Restore with native iOS Share Sheet support
  document.getElementById("backupJsonBtn").onclick = async () => {
    triggerHaptic("light");
    const data = await callAPI("backup_database_json");
    if (data) {
      const filename = `RentalLedger_Backup_${new Date().toISOString().split("T")[0]}.json`;
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      await shareOrDownloadFile(blob, filename, "application/json", "Database JSON Backup");
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

  
// Publication-grade Pure Client-Side Landscape PDF Generator
function generateLedgerPdfBlob({ buildingName, monthName, year, records, totals }) {
  const W = 842;
  const H = 595;

  let stream = "";
  const addText = (txt, x, y, font = "/F1", size = 10, r = 1, g = 1, b = 1) => {
    const clean = String(txt || "")
      .replace(/\\/g, "\\\\")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)");
    stream += `BT ${font} ${size} Tf ${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg ${x.toFixed(1)} ${y.toFixed(1)} Td (${clean}) Tj ET\n`;
  };

  const addRect = (x, y, w, h, r, g, b) => {
    stream += `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg ${x.toFixed(1)} ${y.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)} re f\n`;
  };

  const addLine = (x1, y1, x2, y2, r = 0.8, g = 0.8, b = 0.8, width = 0.5) => {
    stream += `${width} w ${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} RG ${x1.toFixed(1)} ${y1.toFixed(1)} m ${x2.toFixed(1)} ${y2.toFixed(1)} l S\n`;
  };

  // Header Banner
  addRect(0, 520, W, 75, 0.05, 0.08, 0.14);
  addText(`RENTAL LEDGER · ${buildingName.toUpperCase()}`, 36, 560, "/F2", 18, 0.13, 0.83, 0.93);
  addText(`Monthly Statement & Sub-Meter Billing Matrix  |  Period: ${monthName} ${year}  |  Generated: ${new Date().toLocaleDateString()}`, 36, 538, "/F1", 10, 0.7, 0.75, 0.82);

  // Summary KPI Cards
  const kpiY = 472;
  const kpiW = 180;
  const kpiH = 38;
  const kpiGap = 16;
  const startX = 36;

  addRect(startX, kpiY, kpiW, kpiH, 0.08, 0.11, 0.18);
  addText("CONTRACTED INFLOW", startX + 12, kpiY + 24, "/F1", 8, 0.6, 0.65, 0.75);
  addText(fmtCurrency(totals.contracted), startX + 12, kpiY + 8, "/F2", 12, 1, 1, 1);

  addRect(startX + (kpiW + kpiGap), kpiY, kpiW, kpiH, 0.08, 0.11, 0.18);
  addText("CLEARED INFLOW", startX + (kpiW + kpiGap) + 12, kpiY + 24, "/F1", 8, 0.6, 0.65, 0.75);
  addText(fmtCurrency(totals.cleared), startX + (kpiW + kpiGap) + 12, kpiY + 8, "/F2", 12, 0.22, 0.82, 0.45);

  addRect(startX + (kpiW + kpiGap) * 2, kpiY, kpiW, kpiH, 0.08, 0.11, 0.18);
  addText("PENDING ARREARS", startX + (kpiW + kpiGap) * 2 + 12, kpiY + 24, "/F1", 8, 0.6, 0.65, 0.75);
  addText(fmtCurrency(totals.pending), startX + (kpiW + kpiGap) * 2 + 12, kpiY + 8, "/F2", 12, 0.96, 0.35, 0.45);

  addRect(startX + (kpiW + kpiGap) * 3, kpiY, kpiW, kpiH, 0.08, 0.11, 0.18);
  addText("ELECTRICITY UNITS", startX + (kpiW + kpiGap) * 3 + 12, kpiY + 24, "/F1", 8, 0.6, 0.65, 0.75);
  addText(fmtUnits(totals.energy), startX + (kpiW + kpiGap) * 3 + 12, kpiY + 8, "/F2", 12, 0.98, 0.75, 0.18);

  // Table Headers
  const tableY = 445;
  addRect(startX, tableY, W - startX * 2, 22, 0.12, 0.16, 0.24);

  const cols = [
    { title: "ROOM", x: startX + 6 },
    { title: "TENANT", x: startX + 55 },
    { title: "STATUS", x: startX + 160 },
    { title: "RENT", x: startX + 220 },
    { title: "PREV", x: startX + 285 },
    { title: "CURR", x: startX + 335 },
    { title: "UNITS", x: startX + 385 },
    { title: "RATE", x: startX + 435 },
    { title: "POWER", x: startX + 480 },
    { title: "OTHER", x: startX + 540 },
    { title: "TOTAL DUE", x: startX + 590 },
    { title: "PAID", x: startX + 655 },
    { title: "BALANCE", x: startX + 715 }
  ];

  cols.forEach(c => {
    addText(c.title, c.x, tableY + 6, "/F2", 8, 0.85, 0.9, 0.95);
  });

  // Table Rows
  let curY = tableY - 18;
  const rowH = 17;

  (records || []).slice(0, 22).forEach((rd, idx) => {
    const rec = rd.record || {};
    const room = rd.room || {};
    if (idx % 2 === 1) {
      addRect(startX, curY - 3, W - startX * 2, rowH, 0.05, 0.07, 0.11);
    }

    addText(room.roomNumber, cols[0].x, curY + 2, "/F2", 8, 1, 1, 1);
    addText(room.tenantName ? room.tenantName.substring(0, 16) : "Vacant", cols[1].x, curY + 2, "/F1", 8, 0.8, 0.8, 0.8);
    addText(room.status, cols[2].x, curY + 2, "/F1", 7.5, room.status === "Lended" ? 0.3 : 0.7, room.status === "Lended" ? 0.8 : 0.7, 0.5);
    addText(fmtCurrency(rec.rent || 0), cols[3].x, curY + 2, "/F1", 8, 0.9, 0.9, 0.9);
    addText(Number(rec.meterPrevious || 0).toFixed(1), cols[4].x, curY + 2, "/F1", 7.5, 0.7, 0.7, 0.7);
    addText(Number(rec.meterCurrent || 0).toFixed(1), cols[5].x, curY + 2, "/F1", 7.5, 0.7, 0.7, 0.7);
    addText(Number(rec.units || 0).toFixed(1), cols[6].x, curY + 2, "/F2", 8, 0.13, 0.83, 0.93);
    addText(`₹${rec.meterRatePerUnit || 10}`, cols[7].x, curY + 2, "/F1", 7.5, 0.7, 0.7, 0.7);
    addText(fmtCurrency(rec.electricity || 0), cols[8].x, curY + 2, "/F1", 8, 0.9, 0.9, 0.9);
    addText(fmtCurrency(rec.otherCharges || 0), cols[9].x, curY + 2, "/F1", 8, 0.7, 0.7, 0.7);
    addText(fmtCurrency(rec.totalDue || 0), cols[10].x, curY + 2, "/F2", 8, 1, 1, 1);
    addText(fmtCurrency(rec.totalPaid || 0), cols[11].x, curY + 2, "/F1", 8, 0.22, 0.82, 0.45);

    const bal = rec.balance || 0;
    const balColor = bal > 0 ? [0.96, 0.35, 0.45] : [0.22, 0.82, 0.45];
    addText(fmtCurrency(bal), cols[12].x, curY + 2, "/F2", 8, balColor[0], balColor[1], balColor[2]);

    addLine(startX, curY - 3, W - startX, curY - 3, 0.15, 0.18, 0.25, 0.5);
    curY -= rowH;
  });

  addText("Rental Ledger PWA · Hardware Accelerated Native Mobile & Desktop Financial Operating System", startX, 22, "/F1", 8, 0.4, 0.45, 0.52);

  const streamLen = stream.length;
  let pdf = "%PDF-1.4\n";
  const offsets = [];

  const addObj = (str) => {
    offsets.push(pdf.length);
    pdf += str;
  };

  addObj("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
  addObj("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");
  addObj(`3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj\n`);
  addObj("4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n");
  addObj("5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n");
  addObj(`6 0 obj\n<< /Length ${streamLen} >>\nstream\n${stream}endstream\nendobj\n`);

  const xrefOffset = pdf.length;
  pdf += "xref\n0 7\n0000000000 65535 f \n";
  for (let i = 0; i < 6; i++) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new Blob([pdf], { type: "application/pdf" });
}
window.generateLedgerPdfBlob = generateLedgerPdfBlob;


  // CSV Export with native Apple Share Sheet support
  document.getElementById("exportCsvBtn").onclick = async () => {
    triggerHaptic("light");
    const bldg = state.buildings.find(b => b.id === state.selectedBuildingId);
    const buildingName = bldg ? bldg.name : "All Properties";
    const shareTitle = 'Rental Ledger - ' + buildingName;

    try {
      let csvData;
      let filename;
      if (state.spreadsheetMode === "annual") {
        csvData = await callAPI("export_annual_csv_data", state.selectedBuildingId, state.currentYear);
        filename = `RentalLedger_Annual_${buildingName.replace(/\s+/g, '_')}_${state.currentYear}.csv`;
      } else {
        csvData = await callAPI("export_csv_data", state.selectedBuildingId, state.currentMonth, state.currentYear);
        filename = `RentalLedger_${buildingName.replace(/\s+/g, '_')}_${state.currentYear}_${state.currentMonth}.csv`;
      }

      const csvContent = (csvData && csvData.csv) ? csvData.csv : (typeof csvData === "string" ? csvData : "");
      if (csvContent) {
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        await shareOrDownloadFile(blob, filename, "text/csv;charset=utf-8;", shareTitle);
      }
    } catch (err) {
      showToast("CSV export failed: " + (err.message || err), "error");
    }
  };

  // PDF Export with native Apple Share Sheet support
  const exportPdfBtn = document.getElementById("exportPdfBtn");
  if (exportPdfBtn) {
    exportPdfBtn.onclick = async () => {
      exportPdfBtn.disabled = true;
      exportPdfBtn.classList.add("loading");
      triggerHaptic("medium");
      showToast("Generating publication-grade landscape PDF...", "info");
      try {
        const bldg = state.buildings.find(b => b.id === state.selectedBuildingId);
        const buildingName = bldg ? bldg.name : "All Properties";
        const shareTitle = 'Rental Ledger - ' + buildingName;
        const monthName = MONTH_NAMES[state.currentMonth - 1];
        const filename = `RentalLedger_${buildingName.replace(/\s+/g, '_')}_${state.currentYear}_${state.currentMonth}.pdf`;

        // Check backend PDF export first
        let res = await callAPI("export_pdf_data", state.selectedBuildingId, state.currentMonth, state.currentYear);
        let pdfBlob = null;

        if (res && res.base64) {
          const byteCharacters = atob(res.base64);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          pdfBlob = new Blob([new Uint8Array(byteNumbers)], { type: "application/pdf" });
        } else {
          // Generate client-side PDF blob
          const contracted = state.records.reduce((sum, r) => sum + (r.record.rent || 0), 0);
          const cleared = state.records.reduce((sum, r) => sum + (r.record.totalPaid || 0), 0);
          const pending = state.records.reduce((sum, r) => sum + (r.record.balance > 0 ? r.record.balance : 0), 0);
          const energy = state.records.reduce((sum, r) => sum + (r.record.units || 0), 0);

          pdfBlob = generateLedgerPdfBlob({
            buildingName: buildingName,
            monthName: monthName,
            year: state.currentYear,
            records: state.records,
            totals: { contracted, cleared, pending, energy }
          });
        }

        if (pdfBlob) {
          await shareOrDownloadFile(pdfBlob, filename, "application/pdf", shareTitle);
        }
      } catch (err) {
        showToast(`PDF generation error: ${err.message || err}`, "error");
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
          const filename = `RentalLedger_Universal_Backup_${new Date().toISOString().split("T")[0]}.json`;
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
          await shareOrDownloadFile(blob, filename, "application/json", "Universal JSON Backup");
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
        const bldg = state.buildings.find(b => b.id === state.selectedBuildingId);
        const buildingName = bldg ? bldg.name : "All Properties";
        const shareTitle = 'Rental Ledger - ' + buildingName;
        const res = await callAPI("export_csv_data", state.selectedBuildingId, state.currentMonth, state.currentYear);
        const csvStr = (res && res.csv) ? res.csv : (typeof res === "string" ? res : "");
        if (csvStr) {
          const filename = `RentalLedger_Universal_${buildingName.replace(/\s+/g, '_')}_${state.currentYear}_${state.currentMonth}.csv`;
          const blob = new Blob([csvStr], { type: "text/csv;charset=utf-8;" });
          await shareOrDownloadFile(blob, filename, "text/csv;charset=utf-8;", shareTitle);
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
      const confirmed = await showIosConfirm({
        title: "Full Snapshot Restore",
        message: "WARNING: Complete Snapshot Restore will replace your current database records with the snapshot.\n\nAre you sure you want to proceed?",
        confirmText: "Restore Database",
        isDestructive: true,
        cancelText: "Cancel"
      });
      if (confirmed) {
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

      triggerHaptic("light");
      playIosHapticClick();

      document.querySelectorAll(".nav-item").forEach(i => i.classList.remove("active"));
      item.classList.add("active");

      document.querySelectorAll(".view-panel").forEach(p => p.classList.remove("active"));
      const panel = document.getElementById(`view-${targetView}`);
      if (panel) panel.classList.add("active");

      state.currentView = targetView;
      const scrollContainer = document.getElementById("viewContainer");
      if (scrollContainer) scrollContainer.scrollTop = 0;
      if (window.updateIosTitleState) window.updateIosTitleState();

      if (targetView === "dashboard") {
        setTimeout(renderCanvasChart, 100);
      }
    };
  });

  // Segmented Control for Rooms (with sliding thumb & spring physics)
  setupSegmentedControl("roomFilterPills", (btn) => {
    state.roomFilter = btn.dataset.filter;
    renderRooms();
  });

  // Segmented Control for Ledger (with sliding thumb & spring physics)
  setupSegmentedControl("ledgerFilterPills", (btn) => {
    state.ledgerFilter = btn.dataset.filter;
    renderLedger();
  });

  // View All Units button on dashboard
  document.getElementById("viewAllUnitsBtn").onclick = () => {
    triggerHaptic("light");
    playIosHapticClick();
    document.querySelector('.nav-item[data-view="rooms"]').click();
  };

  document.getElementById("refreshBtn").onclick = async () => {
    triggerHaptic("light");
    playIosHapticClick();
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
    triggerHaptic("light");
    playIosHapticClick();
    state.currentMonth--;
    if (state.currentMonth < 1) {
      state.currentMonth = 12;
      state.currentYear--;
    }
    await refreshData();
  };

  document.getElementById("nextMonthBtn").onclick = async () => {
    triggerHaptic("light");
    playIosHapticClick();
    state.currentMonth++;
    if (state.currentMonth > 12) {
      state.currentMonth = 1;
      state.currentYear++;
    }
    await refreshData();
  };

  document.getElementById("todayBtn").onclick = async () => {
    triggerHaptic("light");
    playIosHapticClick();
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

// =============================================================================
// Native Apple iOS Action Sheet Dialogs (iOS 17 / 18 HIG)
// =============================================================================

function showIosActionSheet({ title = "", message = "", actions = [], cancelText = "Cancel" }) {
  return new Promise((resolve) => {
    const existing = document.getElementById("iosActionSheetBackdrop");
    if (existing) existing.remove();

    const backdrop = document.createElement("div");
    backdrop.id = "iosActionSheetBackdrop";
    backdrop.className = "ios-actionsheet-backdrop";

    const dialog = document.createElement("div");
    dialog.className = "ios-actionsheet-dialog";

    const group = document.createElement("div");
    group.className = "ios-actionsheet-group";

    if (title || message) {
      const header = document.createElement("div");
      header.className = "ios-actionsheet-header";
      if (title) {
        const titleEl = document.createElement("div");
        titleEl.className = "ios-actionsheet-title";
        titleEl.textContent = title;
        header.appendChild(titleEl);
      }
      if (message) {
        const msgEl = document.createElement("div");
        msgEl.className = "ios-actionsheet-message";
        msgEl.textContent = message;
        header.appendChild(msgEl);
      }
      group.appendChild(header);
    }

    actions.forEach(action => {
      const btn = document.createElement("button");
      btn.className = "ios-actionsheet-action" + (action.style === "destructive" ? " destructive" : "");
      btn.textContent = action.text;
      btn.onclick = () => {
        closeSheet(action.value !== undefined ? action.value : true);
        if (typeof action.handler === "function") {
          try { action.handler(); } catch (e) { console.error(e); }
        }
      };
      group.appendChild(btn);
    });

    dialog.appendChild(group);

    const cancelBtn = document.createElement("button");
    cancelBtn.className = "ios-actionsheet-cancel";
    cancelBtn.textContent = cancelText;
    cancelBtn.onclick = () => closeSheet(null);
    dialog.appendChild(cancelBtn);

    backdrop.appendChild(dialog);
    document.body.appendChild(backdrop);

    requestAnimationFrame(() => {
      backdrop.classList.add("open");
    });

    let isClosed = false;
    function closeSheet(result) {
      if (isClosed) return;
      isClosed = true;
      document.removeEventListener("keydown", escListener);
      backdrop.classList.remove("open");
      setTimeout(() => {
        if (backdrop.parentNode) backdrop.remove();
        resolve(result);
      }, 340);
    }

    backdrop.onclick = (e) => {
      if (e.target === backdrop) closeSheet(null);
    };

    const escListener = (e) => {
      if (e.key === "Escape") closeSheet(null);
    };
    document.addEventListener("keydown", escListener);
  });
}

function showIosConfirm({ title = "", message = "", confirmText = "Confirm", isDestructive = false, cancelText = "Cancel" }) {
  return showIosActionSheet({
    title,
    message,
    actions: [
      {
        text: confirmText,
        style: isDestructive ? "destructive" : "default",
        value: true
      }
    ],
    cancelText
  }).then(res => Boolean(res));
}

function showExportActionSheet() {
  return showIosActionSheet({
    title: "Universal Export & Backup",
    message: "Select a format to export your property ledger data:",
    actions: [
      {
        text: "Export SQLite JSON Backup (.json)",
        handler: () => {
          const btn = document.getElementById("backupJsonBtn") || document.getElementById("exportUnivJsonBtn");
          if (btn) btn.click();
        }
      },
      {
        text: "Export Universal Spreadsheet (.csv)",
        handler: () => {
          const btn = document.getElementById("exportUnivCsvBtn") || document.getElementById("exportCsvBtn");
          if (btn) btn.click();
        }
      },
      {
        text: "Export Monthly PDF Statement (.pdf)",
        handler: () => {
          const btn = document.getElementById("exportPdfBtn");
          if (btn) btn.click();
          else showToast("Please open the Monthly Ledger view to export the PDF statement.", "info");
        }
      }
    ],
    cancelText: "Cancel"
  });
}
window.showIosActionSheet = showIosActionSheet;
window.showIosConfirm = showIosConfirm;
window.showExportActionSheet = showExportActionSheet;

// =============================================================================
// Native iOS Bottom-Sheet Modals with Swipe-To-Dismiss Gestures
// =============================================================================

function setupModalDragToDismiss() {
  document.querySelectorAll(".modal-backdrop").forEach(backdrop => {
    const dialog = backdrop.querySelector(".modal-dialog");
    if (!dialog) return;

    let startY = 0;
    let isDragging = false;
    let startTime = 0;

    const dragHandle = dialog.querySelector(".ios-drag-handle");
    const modalHeader = dialog.querySelector(".modal-header");
    const modalBody = dialog.querySelector(".modal-body");

    function onTouchStart(e) {
      if (!backdrop.classList.contains("open")) return;
      const touch = e.touches[0];

      if (modalBody && modalBody.contains(e.target)) {
        if (modalBody.scrollTop > 0) return;
      }

      startY = touch.clientY;
      startTime = Date.now();
      isDragging = true;
      dialog.style.transition = "none";
    }

    function onTouchMove(e) {
      if (!isDragging) return;
      const touch = e.touches[0];
      const deltaY = touch.clientY - startY;

      if (deltaY > 0) {
        if (e.cancelable) e.preventDefault();
        dialog.style.transform = `translateY(${deltaY}px)`;
        const progress = Math.min(1, deltaY / 350);
        backdrop.style.backgroundColor = `rgba(0, 0, 0, ${0.72 * (1 - progress * 0.7)})`;
      } else {
        dialog.style.transform = `translateY(${deltaY * 0.15}px)`;
      }
    }

    function onTouchEnd(e) {
      if (!isDragging) return;
      isDragging = false;
      const touch = e.changedTouches[0];
      const deltaY = touch.clientY - startY;
      const duration = Date.now() - startTime;
      const velocity = deltaY / Math.max(1, duration);

      if (deltaY > 80 || (deltaY > 30 && velocity > 0.35)) {
        dialog.style.transition = "transform 0.28s cubic-bezier(0.32, 0.72, 0, 1)";
        dialog.style.transform = "translateY(100%)";
        backdrop.style.transition = "opacity 0.25s ease, background 0.25s ease";
        backdrop.style.opacity = "0";

        setTimeout(() => {
          backdrop.classList.remove("open");
          dialog.style.transform = "";
          dialog.style.transition = "";
          backdrop.style.opacity = "";
          backdrop.style.transition = "";
          backdrop.style.backgroundColor = "";
        }, 280);
      } else {
        dialog.style.transition = "transform 0.32s cubic-bezier(0.2, 0.9, 0.3, 1)";
        dialog.style.transform = "translateY(0)";
        backdrop.style.transition = "background 0.3s ease";
        backdrop.style.backgroundColor = "";

        setTimeout(() => {
          dialog.style.transform = "";
          dialog.style.transition = "";
        }, 330);
      }
    }

    if (dragHandle) {
      dragHandle.addEventListener("touchstart", onTouchStart, { passive: false });
      dragHandle.addEventListener("touchmove", onTouchMove, { passive: false });
      dragHandle.addEventListener("touchend", onTouchEnd, { passive: false });
      dragHandle.addEventListener("touchcancel", onTouchEnd, { passive: false });
    }

    if (modalHeader) {
      modalHeader.addEventListener("touchstart", onTouchStart, { passive: true });
      modalHeader.addEventListener("touchmove", onTouchMove, { passive: false });
      modalHeader.addEventListener("touchend", onTouchEnd, { passive: true });
      modalHeader.addEventListener("touchcancel", onTouchEnd, { passive: true });
    }
  });
}

function setupModals() {
  setupModalDragToDismiss();

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
  const confirmed = await showIosConfirm({
    title: `Delete Room ${roomNumber}`,
    message: `Are you sure you want to delete Room ${roomNumber}? All monthly statements and recorded payments for this room will be permanently removed.`,
    confirmText: "Delete Room",
    isDestructive: true,
    cancelText: "Cancel"
  });
  if (!confirmed) return;
  const res = await callAPI("delete_room", Number(roomId));
  if (res && res.error) return;
  document.getElementById("roomModal").classList.remove("open");
  showToast(`Room ${roomNumber} deleted successfully`, "info");
  await refreshData();
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
      const confirmed = await showIosConfirm({
        title: "Delete Payment",
        message: `Are you sure you want to delete this payment of ${fmtCurrency(amt)}?`,
        confirmText: "Delete Payment",
        isDestructive: true,
        cancelText: "Cancel"
      });
      if (confirmed) {
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
    const proceed = await showIosConfirm({
      title: "Meter Reset Warning",
      message: `Current Reading (${curr} Units) is less than Previous Reading (${prev} Units).\n\nThis indicates a meter reset or replacement. Do you want to proceed?`,
      confirmText: "Proceed with Reset",
      isDestructive: false,
      cancelText: "Cancel"
    });
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
  const confirmed = await showIosConfirm({
    title: "Delete Monthly Statement",
    message: `Are you sure you want to delete the monthly statement for Room ${roomNumber}? Any recorded payments for this month will also be permanently deleted.`,
    confirmText: "Delete Statement",
    isDestructive: true,
    cancelText: "Cancel"
  });
  if (!confirmed) return;
  const res = await callAPI("delete_monthly_record", Number(recordId));
  if (res && res.error) return;
  document.getElementById("meterModal").classList.remove("open");
  showToast(`Monthly statement for Room ${roomNumber} deleted successfully`, "info");
  await refreshData();
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
  if (!billId) return;
  const confirmed = await showIosConfirm({
    title: "Delete Electricity Bill",
    message: "Are you sure you want to delete this Power Board utility invoice?",
    confirmText: "Delete Invoice",
    isDestructive: true,
    cancelText: "Cancel"
  });
  if (!confirmed) return;
  const res = await callAPI("delete_utility_bill", billId);
  if (res && res.error) return;
  document.getElementById("utilityModal").classList.remove("open");
  showToast("Power Board utility bill deleted", "info");
  await refreshData();
}

// -----------------------------------------------------------------------------
// Window Resize & Orientation Change (Chart Redraw on iPhone 11)
// -----------------------------------------------------------------------------
window.addEventListener("resize", () => {
  if (state.currentView === "dashboard") {
    renderCanvasChart();
  }
});

window.addEventListener("orientationchange", () => {
  setTimeout(() => {
    if (state.currentView === "dashboard") {
      renderCanvasChart();
    }
  }, 150);
});

// =============================================================================
// Firebase Authentication & Native iOS App Lock Engine
// =============================================================================

async function setupAuthEngine() {
  const lockScreen = document.getElementById("authLockScreen");
  const appContainer = document.getElementById("app");
  if (!lockScreen) return;

  const authForm = document.getElementById("authForm");
  const authUsername = document.getElementById("authUsername");
  const authPassword = document.getElementById("authPassword");
  const authTogglePwd = document.getElementById("authTogglePwd");
  const authPwdIcon = document.getElementById("authPwdIcon");
  const authTabLogin = document.getElementById("authTabLogin");
  const authTabSignup = document.getElementById("authTabSignup");
  const authSegmentThumb = document.getElementById("authSegmentThumb");
  const authSubmitBtn = document.getElementById("authSubmitBtn");
  const authErrorAlert = document.getElementById("authErrorAlert");
  const authSignupWarning = document.getElementById("authSignupWarning");
  const authSetupNotice = document.getElementById("authSetupNotice");
  const authBypassDemoBtn = document.getElementById("authBypassDemoBtn");

  const accountUsernameDisplay = document.getElementById("accountUsernameDisplay");
  const accountUidDisplay = document.getElementById("accountUidDisplay");
  const accountSyncStatusBadge = document.getElementById("accountSyncStatusBadge");
  const prefLogoutBtn = document.getElementById("prefLogoutBtn");
  const prefChangePasswordBtn = document.getElementById("prefChangePasswordBtn");
  const prefMigrateDataBtn = document.getElementById("prefMigrateDataBtn");

  let authMode = "login";
  let activeUser = null;

  function showAuthError(msg) {
    if (!authErrorAlert) return;
    authErrorAlert.textContent = msg;
    authErrorAlert.style.display = "block";
    triggerHaptic("warning");
  }

  function hideAuthError() {
    if (authErrorAlert) authErrorAlert.style.display = "none";
  }

  function setLockState(locked) {
    if (locked) {
      lockScreen.style.display = "flex";
      if (appContainer) appContainer.style.display = "none";
      document.body.classList.add("app-locked");
    } else {
      lockScreen.style.display = "none";
      if (appContainer) appContainer.style.display = "flex";
      document.body.classList.remove("app-locked");
    }
  }

  // 1. Toggle Login / Sign Up Tabs
  if (authTabLogin && authTabSignup) {
    authTabLogin.onclick = () => {
      authMode = "login";
      authTabLogin.classList.add("active");
      authTabSignup.classList.remove("active");
      if (authSegmentThumb) authSegmentThumb.style.transform = "translateX(0%)";
      if (authSubmitBtn) authSubmitBtn.querySelector("span").textContent = "Log In";
      if (authSignupWarning) authSignupWarning.style.display = "none";
      hideAuthError();
      triggerHaptic("light");
    };

    authTabSignup.onclick = () => {
      authMode = "signup";
      authTabSignup.classList.add("active");
      authTabLogin.classList.remove("active");
      if (authSegmentThumb) authSegmentThumb.style.transform = "translateX(100%)";
      if (authSubmitBtn) authSubmitBtn.querySelector("span").textContent = "Create Account";
      if (authSignupWarning) authSignupWarning.style.display = "flex";
      hideAuthError();
      triggerHaptic("light");
    };
  }

  // 2. Show / Hide Password Toggle
  if (authTogglePwd && authPassword) {
    authTogglePwd.onclick = () => {
      const isPwd = authPassword.type === "password";
      authPassword.type = isPwd ? "text" : "password";
      if (authPwdIcon) {
        authPwdIcon.textContent = isPwd ? "visibility_off" : "visibility";
      }
      triggerHaptic("light");
    };
  }

  // 3. Form Submission
  if (authForm) {
    authForm.onsubmit = async (e) => {
      e.preventDefault();
      hideAuthError();

      const username = (authUsername.value || "").trim().toLowerCase();
      const password = authPassword.value || "";

      if (!window.rentalFirebase) {
        showAuthError("Firebase service is initializing. Please try again in a moment.");
        return;
      }

      if (authSubmitBtn) {
        authSubmitBtn.disabled = true;
        authSubmitBtn.querySelector("span").textContent = authMode === "signup" ? "Creating Account..." : "Signing In...";
      }

      try {
        if (authMode === "signup") {
          const res = await window.rentalFirebase.signUpWithUsername(username, password);
          showToast(`Account created! Welcome, ${res.username}.`, "success");
        } else {
          const res = await window.rentalFirebase.logInWithUsername(username, password);
          showToast(`Welcome back, ${res.username}!`, "success");
        }
      } catch (err) {
        console.error("[Auth Error]", err);
        showAuthError(err.message || "Authentication failed.");
      } finally {
        if (authSubmitBtn) {
          authSubmitBtn.disabled = false;
          authSubmitBtn.querySelector("span").textContent = authMode === "signup" ? "Create Account" : "Log In";
        }
      }
    };
  }

  // 4. Local Preview Bypass (for when Firebase keys are not yet pasted)
  if (authBypassDemoBtn) {
    authBypassDemoBtn.onclick = () => {
      triggerHaptic("medium");
      setLockState(false);
      if (accountUsernameDisplay) accountUsernameDisplay.textContent = "Local User";
      if (accountUidDisplay) accountUidDisplay.textContent = "offline_mode";
      if (accountSyncStatusBadge) {
        accountSyncStatusBadge.textContent = "Local Storage";
        accountSyncStatusBadge.className = "status-chip status-chip-warning";
      }
      showToast("Unlocked in Local Storage preview mode. Connect Firebase in firebase.js for cloud sync.", "info");
    };
  }

  // 5. Change Password Modal & Handlers
  const changePasswordModal = document.getElementById("changePasswordModal");
  const changePasswordForm = document.getElementById("changePasswordForm");
  const changeCurrentPassword = document.getElementById("changeCurrentPassword");
  const changeNewPassword = document.getElementById("changeNewPassword");
  const changeConfirmPassword = document.getElementById("changeConfirmPassword");
  const submitChangePasswordBtn = document.getElementById("submitChangePasswordBtn");
  const cancelChangePasswordBtn = document.getElementById("cancelChangePasswordBtn");
  const closeChangePasswordBtn = document.getElementById("closeChangePasswordBtn");
  const changePwdErrorAlert = document.getElementById("changePwdErrorAlert");

  const closeChangePwd = () => {
    if (changePasswordModal) changePasswordModal.classList.remove("open");
    if (changePasswordForm) changePasswordForm.reset();
    if (changePwdErrorAlert) changePwdErrorAlert.style.display = "none";
  };

  if (prefChangePasswordBtn) {
    prefChangePasswordBtn.onclick = () => {
      triggerHaptic("light");
      if (!activeUser || !window.rentalFirebase || !window.rentalFirebase.isFirebaseConfigured || !window.rentalFirebase.isFirebaseConfigured()) {
        showToast("Cloud account required to change password.", "warning");
        return;
      }
      if (changePasswordModal) changePasswordModal.classList.add("open");
    };
  }

  if (cancelChangePasswordBtn) cancelChangePasswordBtn.onclick = closeChangePwd;
  if (closeChangePasswordBtn) closeChangePasswordBtn.onclick = closeChangePwd;

  // Toggle helpers for change password fields
  ["toggleChangeCurrentPwd", "toggleChangeNewPwd", "toggleChangeConfirmPwd"].forEach((id) => {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.onclick = () => {
      const inp = btn.previousElementSibling;
      if (inp) {
        const isPwd = inp.type === "password";
        inp.type = isPwd ? "text" : "password";
        const ic = btn.querySelector(".material-symbols-outlined");
        if (ic) ic.textContent = isPwd ? "visibility_off" : "visibility";
      }
    };
  });

  if (submitChangePasswordBtn) {
    submitChangePasswordBtn.onclick = async () => {
      if (changePwdErrorAlert) changePwdErrorAlert.style.display = "none";
      const currentPwd = changeCurrentPassword.value || "";
      const newPwd = changeNewPassword.value || "";
      const confirmPwd = changeConfirmPassword.value || "";

      if (!currentPwd) {
        changePwdErrorAlert.textContent = "Please enter your current password.";
        changePwdErrorAlert.style.display = "block";
        return;
      }
      if (newPwd.length < 8) {
        changePwdErrorAlert.textContent = "New password must be at least 8 characters.";
        changePwdErrorAlert.style.display = "block";
        return;
      }
      if (newPwd !== confirmPwd) {
        changePwdErrorAlert.textContent = "New passwords do not match.";
        changePwdErrorAlert.style.display = "block";
        return;
      }

      submitChangePasswordBtn.disabled = true;
      submitChangePasswordBtn.textContent = "Updating...";

      try {
        await window.rentalFirebase.changeUserPassword(currentPwd, newPwd);
        showToast("Password changed successfully!", "success");
        closeChangePwd();
      } catch (err) {
        changePwdErrorAlert.textContent = err.message || "Could not change password.";
        changePwdErrorAlert.style.display = "block";
      } finally {
        submitChangePasswordBtn.disabled = false;
        submitChangePasswordBtn.textContent = "Update Password";
      }
    };
  }

  // 6. Log Out Action
  if (prefLogoutBtn) {
    prefLogoutBtn.onclick = async () => {
      triggerHaptic("warning");
      const confirmed = await (window.showIosConfirm ? window.showIosConfirm("Are you sure you want to log out?", "Log Out", "Cancel") : confirm("Are you sure you want to log out?"));
      if (!confirmed) return;

      if (window.rentalFirebase && window.rentalFirebase.logOutUser) {
        await window.rentalFirebase.logOutUser();
      }
      activeUser = null;
      if (authForm) authForm.reset();
      setLockState(true);
      showToast("Logged out safely.", "info");
    };
  }

  // 7. Migration Modal & Handlers
  const migrationModal = document.getElementById("migrationModal");
  const confirmMigrationBtn = document.getElementById("confirmMigrationBtn");
  const skipMigrationBtn = document.getElementById("skipMigrationBtn");

  if (confirmMigrationBtn) {
    confirmMigrationBtn.onclick = async () => {
      if (!activeUser || !window.pwaStorage) return;
      confirmMigrationBtn.disabled = true;
      confirmMigrationBtn.querySelector("span").textContent = "Importing...";
      try {
        await window.pwaStorage.migrateLocalDataToCloud(activeUser.uid);
        showToast("Local portfolio successfully imported to your account!", "success");
        if (migrationModal) migrationModal.classList.remove("open");
        if (prefMigrateDataBtn) prefMigrateDataBtn.style.display = "none";
        await refreshData();
      } catch (err) {
        console.error("[Migration Error]", err);
        showToast("Could not import data: " + err.message, "error");
      } finally {
        confirmMigrationBtn.disabled = false;
        confirmMigrationBtn.querySelector("span").textContent = "Import My Existing Local Data";
      }
    };
  }

  if (skipMigrationBtn) {
    skipMigrationBtn.onclick = () => {
      if (migrationModal) migrationModal.classList.remove("open");
      showToast("Started fresh portfolio.", "info");
    };
  }

  if (prefMigrateDataBtn) {
    prefMigrateDataBtn.onclick = () => {
      if (migrationModal) migrationModal.classList.add("open");
    };
  }

  // 8. Firebase Auth State Observer
  function checkFirebaseConfigStatus() {
    const isConfigured = window.rentalFirebase && window.rentalFirebase.isFirebaseConfigured && window.rentalFirebase.isFirebaseConfigured();
    if (!isConfigured) {
      if (authSetupNotice) authSetupNotice.style.display = "block";
      setLockState(true);
    }
    return isConfigured;
  }

  if (window.rentalFirebase && window.rentalFirebase.onAuthChange) {
    window.rentalFirebase.onAuthChange(async (user) => {
      activeUser = user;
      if (user) {
        console.log("[Auth Engine] User signed in:", user.username, user.uid);
        setLockState(false);
        if (accountUsernameDisplay) accountUsernameDisplay.textContent = user.username;
        if (accountUidDisplay) accountUidDisplay.textContent = user.uid.substring(0, 8) + '...';
        if (accountSyncStatusBadge) {
          accountSyncStatusBadge.textContent = "Cloud Synced";
          accountSyncStatusBadge.className = "status-chip status-chip-success";
        }

        // Connect pwaStorage to current user
        if (window.pwaStorage) {
          const syncResult = await window.pwaStorage.setCurrentUser(user.uid);
          if (syncResult && !syncResult.hasCloudData && syncResult.localRoomsCount > 0) {
            // Unmigrated local data detected! Prompt user
            if (migrationModal) migrationModal.classList.add("open");
            if (prefMigrateDataBtn) prefMigrateDataBtn.style.display = "flex";
          }
        }
        await refreshData();
      } else {
        console.log("[Auth Engine] No user signed in (App Locked).");
        setLockState(true);
        checkFirebaseConfigStatus();
      }
    });
  } else {
    // If Firebase module is loading asynchronously, wait a tick
    setTimeout(checkFirebaseConfigStatus, 800);
  }
}

// Boot the application
onReady(initApp);

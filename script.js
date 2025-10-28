// =====================
//  12 Days – SCRIPT.JS
// =====================

// ---------- CONFIG ----------
const START_DAY = 13;            // Dec 13 unlock for Day 1
const TOTAL_DAYS = 12;
const PREVIEW_MODE = true;       // <-- set to false before launch
const STORAGE_KEY = "kc12-progress"; // localStorage key for completion
// ----------------------------

// ---- Date helpers (Europe/London) ----
function todayInLondon() {
  const s = new Date().toLocaleString("en-GB", { timeZone: "Europe/London" });
  return new Date(s);
}
function isUnlocked(indexZeroBased) {
  if (PREVIEW_MODE) return true;
  const t = todayInLondon();
  // Month is 0-indexed: 11 = December
  const unlockDate = new Date(t.getFullYear(), 11, START_DAY + indexZeroBased, 0, 0, 0);
  return t >= unlockDate;
}

// ---- Progress helpers ----
function loadProgress() {
  try {
    const arr = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(arr) && arr.length === TOTAL_DAYS) return arr;
  } catch {}
  return new Array(TOTAL_DAYS).fill(false);
}
function saveProgress(arr) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
}

// ---- Content loader ----
async function loadContent() {
  const res = await fetch("content.json", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load content.json");
  return res.json();
}

// ---- Sounds (safe no-ops if files missing) ----
function playSound(id) {
  const el = document.getElementById(id);
  if (!el) return;
  try { el.currentTime = 0; el.play(); } catch {}
}

// ---- Phase grouping for tile stamp classes ----
function phaseGroup(phase) {
  const p = (phase || "").toLowerCase();
  if (p.includes("white")) return "white";
  if (p.includes("green")) return "green";
  if (p.includes("brown")) return "brown";
  if (p.includes("black")) return "black";
  return "white";
}

// ---- Calendar rendering ----
function renderCalendar(days, progress) {
  const calendar = document.getElementById("calendar");
  calendar.innerHTML = "";

  days.forEach((d, i) => {
    const unlocked = isUnlocked(i);
    const grp = phaseGroup(d.phase);

    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = `day-tile phase-${grp}` + (unlocked ? "" : " locked");
    tile.setAttribute("aria-disabled", unlocked ? "false" : "true");
    tile.style.position = "relative";

    tile.innerHTML = `
      <div class="badge ${progress[i] ? "done" : ""}">
        ${progress[i] ? "✓ Done" : unlocked ? "Open" : "Locked"}
      </div>
      <div class="day-title">Day ${d.day}</div>
      <div class="day-date">Dec ${START_DAY + i} • ${d.title}</div>
    `;

    tile.onclick = () => { if (unlocked) openModal(d, i, progress); };
    calendar.appendChild(tile);
  });
}

// ---- Modal logic ----
function openModal(day, index, progress) {
  document.getElementById("modal-title").textContent = `Day ${day.day} – ${day.title || ""}`;
  document.getElementById("modal-belt").textContent = `${day.phaseIcon || ""} ${day.phase || ""}`;
  document.getElementById("modal-physical").innerHTML = day.physical || "<p>—</p>";
  document.getElementById("modal-knowledge").innerHTML = day.knowledge || "<p>—</p>";
  document.getElementById("modal-festive").innerHTML = day.festive || "<p>—</p>";
  document.getElementById("modal-santa").textContent = day.santa || "—";

  const completeBtn = document.getElementById("complete-btn");
  completeBtn.disabled = !!progress[index];
  completeBtn.onclick = () => {
    const updated = [...progress];
    updated[index] = true;

    // Detect if a phase just flipped to "earned" (for animation)
    let revealKey = null;
    PHASES.forEach(p => {
      const [a,b] = p.range;
      const beforeDone = progress.slice(a,b+1).filter(Boolean).length;
      const afterDone  = updated.slice(a,b+1).filter(Boolean).length;
      if (beforeDone < (b-a+1) && afterDone === (b-a+1)) {
        revealKey = p.key;
      }
    });

    saveProgress(updated);
    closeModal();
    renderCalendar(window.__kcDays, updated);
    renderBeltTracker(updated, revealKey);
    playSound("sound-complete");
  };

  const modal = document.getElementById("modal");
  modal.hidden = false;
  playSound("sound-chime");
}
function closeModal() {
  const modal = document.getElementById("modal");
  if (modal) modal.hidden = true;
}

// Close modal on overlay or X
document.addEventListener("click", (e) => {
  const modal = document.getElementById("modal");
  if (!modal || modal.hidden) return;
  if (e.target.id === "modal" || e.target.id === "modal-close") closeModal();
});
// ESC closes modal
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

// ===================
// BELT SCROLL TRACKER
// ===================
// Map days -> phases (3 days each)
const PHASES = [
  { key: "white", label: "White Belt Snow",       icon: "❄️", range: [0,2] },
  { key: "green", label: "Green Belt Fir Tree",   icon: "🌿", range: [3,5] },
  { key: "brown", label: "Brown Belt Reindeer",   icon: "🦌", range: [6,8] },
  { key: "black", label: "Black Belt Blizzard",   icon: "🌟", range: [9,11] }
];

function renderBeltTracker(progress, revealKey) {
  const wrap = document.getElementById("belt-tracker");
  if (!wrap) return;

  let html = "";
  PHASES.forEach(phase => {
    const [a,b] = phase.range;
    const total = b - a + 1; // 3
    const done  = progress.slice(a, b+1).filter(Boolean).length;

    let state = "locked";
    if (done === 0) state = "locked";
    else if (done < total) state = "partial";
    else state = "earned";

    const percent = Math.round((done/total)*100);
    const revealedClass = (revealKey === phase.key && state === "earned") ? "revealed" : "";

    html += `
      <div class="scroll ${phase.key} ${state} ${revealedClass}">
        <div class="ribbon" aria-hidden="true"></div>
        <div class="scroll-paper">
          <div class="scroll-header">
            <span class="icon">${phase.icon}</span>
            <span class="title">${phase.label}</span>
            <span class="stamp">達成</span>
          </div>
          <p class="scroll-sub">Days ${a+1}–${b+1}</p>
          <div class="scroll-meta">
            <div class="progress-bar" aria-label="${phase.label} progress">
              <span style="width:${percent}%"></span>
            </div>
            <div class="badge-state">
              ${done}/${total} ${
                state === "earned" ? "• Belt Earned" :
                state === "partial" ? "• In Progress" : "• Locked"
              }
            </div>
          </div>
        </div>
      </div>
    `;
  });

  wrap.innerHTML = html;
}

// ---- Init ----
(async function init() {
  try {
    // Preview banner
    if (PREVIEW_MODE) {
      const b = document.getElementById("preview-banner");
      if (b) b.style.display = "block";
    }

    const data = await loadContent();
    window.__kcDays = data.days;

    const progress = loadProgress();
    renderCalendar(window.__kcDays, progress);
    renderBeltTracker(progress);
  } catch (e) {
    console.error(e);
    const calendar = document.getElementById("calendar");
    calendar.innerHTML = "<p style='color:#ffb3b3;'>Error loading calendar.</p>";
  }
})();

/* ========= Festive Snow (mouse-responsive, respects reduced motion) ========= */
(function snow() {
  const prefersReduced =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canvas = document.getElementById("snow");
  if (!canvas || prefersReduced) return;

  const ctx = canvas.getContext("2d");
  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);
  let windX = 0; // gentle side breeze based on mouse position
  const flakes = [];
  const FLAKES = Math.min(180, Math.floor((width * height) / 12000)); // scale with viewport

  function makeFlake() {
    return {
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 2 + 1.2, // radius 1.2–3.2
      v: Math.random() * 0.6 + 0.45, // fall speed
      drift: Math.random() * 0.6 - 0.3 // innate sideways drift
    };
  }
  for (let i = 0; i < FLAKES; i++) flakes.push(makeFlake());

  function step() {
    ctx.clearRect(0, 0, width, height);

    for (const f of flakes) {
      f.y += f.v;
      f.x += f.drift + windX * 0.05;

      // wrap around edges
      if (f.y > height + 5) { f.y = -5; f.x = Math.random() * width; }
      if (f.x > width + 5) f.x = -5;
      if (f.x < -5) f.x = width + 5;

      // soft glow + core
      ctx.beginPath();
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      ctx.arc(f.x, f.y, f.r + 0.6, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.fillStyle = "rgba(255,255,255,0.97)";
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fill();
    }
    requestAnimationFrame(step);
  }
  step();

  // Mouse wind
  window.addEventListener("mousemove", (e) => {
    const mid = width / 2;
    const dist = (e.clientX - mid) / mid; // -1..1
    windX = dist * 1.5; // gentle breeze
  });

  window.addEventListener("resize", () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });
})();

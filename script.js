// =====================
//  12 Days – SCRIPT.JS
// =====================

// ---------- CONFIG ----------
const START_DAY = 13;                // Dec 13 unlock for Day 1
const TOTAL_DAYS = 12;
const PREVIEW_MODE = true;           // <-- set to false before launch
const STORAGE_KEY = "kc12-progress"; // completion per day
const CERT_SHOWN_KEY = "kc12-cert-shown"; // show certificate modal once when earned
const BELT_KEY = "kc12-belt-level";  // 0=white,1=green,2=brown,3=black

// Sounds (absolute URLs hosted on karate-christmas repo)
const SOUND_OPEN_URL = "https://garycturner.github.io/karate-christmas/assets/sounds/open.mp3";
const SOUND_COMPLETE_URL = "https://garycturner.github.io/karate-christmas/assets/sounds/complete.mp3";

// Build a base path that works on GitHub Project Pages (e.g., /12DaysofKarateChristmas/)
const BASE_PATH = (document.querySelector('base')?.href)
  ? new URL(document.querySelector('base').href).pathname
  : (function () {
      const p = window.location.pathname;
      return p.endsWith('/') ? p : p.replace(/[^/]*$/, '');
    })();

// Absolute URL to your certificate PDF (adjust filename if needed)
const CERT_PATH = new URL('certificates/christmas_cert.pdf', window.location.origin + BASE_PATH).toString();

// Belt image map
const BELTS = [
  { name: "White Belt", img: "assets/belts/belt_white.png" },
  { name: "Green Belt", img: "assets/belts/belt_green.png" },
  { name: "Brown Belt", img: "assets/belts/belt_brown.png" },
  { name: "Black Belt", img: "assets/belts/belt_black.png" },
];

// Required completion indices to be *eligible* for each belt level
const BELT_REQUIREMENTS = {
  1: [...Array(4).keys()],         // 0..3 complete to be eligible for Green
  2: [...Array(7).keys()],         // 0..6 complete to be eligible for Brown
  3: [...Array(12).keys()],        // 0..11 complete to be eligible for Black
};

// ---- Date helpers (Europe/London) ----
function todayInLondon() {
  const s = new Date().toLocaleString("en-GB", { timeZone: "Europe/London" });
  return new Date(s);
}
function isUnlocked(indexZeroBased) {
  if (PREVIEW_MODE) return true;
  const t = todayInLondon();
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
function saveProgress(arr) { localStorage.setItem(STORAGE_KEY, JSON.stringify(arr)); }
function countDone(arr){ return arr.filter(Boolean).length; }

// Belt level persistence
function loadBeltLevel(){
  const raw = localStorage.getItem(BELT_KEY);
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 && n <= 3 ? n : 0; // default white
}
function saveBeltLevel(level){ localStorage.setItem(BELT_KEY, String(level)); }

// ---- Content loader ----
async function loadContent() {
  const res = await fetch("content.json", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load content.json");
  return res.json();
}

// ---- Sounds ----
function ensureAudioSrcs() {
  const ao = document.getElementById("sound-open");
  const ac = document.getElementById("sound-complete");
  if (ao && !ao.src) ao.src = SOUND_OPEN_URL;
  if (ac && !ac.src) ac.src = SOUND_COMPLETE_URL;
}
function playSound(id) {
  const el = document.getElementById(id);
  if (!el) { console.warn(`[sound] element #${id} not found`); return; }
  try {
    el.currentTime = 0;
    const p = el.play();
    if (p?.catch) p.catch(err => console.warn(`[sound] play() failed for #${id}:`, err));
  } catch (err) {
    console.warn(`[sound] exception for #${id}:`, err);
  }
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

// ---- Modal logic (day content) ----
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

    saveProgress(updated);
    closeModal();
    renderCalendar(window.__kcDays, updated);
    renderBeltSection(updated);
    renderBadges(updated);
    playSound("sound-complete");

    // If all days are completed, auto-show certificate modal & show persistent CTA
    const allDone = updated.every(Boolean);
    const persist = document.getElementById("cert-download");
    const persistBtn = document.getElementById("download-cert-btn-persist");
    if (persist && persistBtn) {
      if (allDone) {
        persist.hidden = false;
        persistBtn.href = CERT_PATH;
      }
    }
    if (allDone && localStorage.getItem(CERT_SHOWN_KEY) !== "1") {
      openCertificateModal();
      localStorage.setItem(CERT_SHOWN_KEY, "1");
    }
  };

  const modal = document.getElementById("modal");
  modal.hidden = false;
  playSound("sound-open");
}
function closeModal() {
  const modal = document.getElementById("modal");
  if (modal) modal.hidden = true;
}

// Close day modal on overlay or X
document.addEventListener("click", (e) => {
  const modal = document.getElementById("modal");
  if (modal && !modal.hidden && (e.target.id === "modal" || e.target.id === "modal-close")) closeModal();
});
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

// ===================
// NEW: PIXEL BELT + UPGRADE LOGIC
// ===================
function eligibleLevel(progress) {
  // Returns highest level the user is ELIGIBLE for based on completion
  for (let level = 3; level >= 1; level--) {
    const req = BELT_REQUIREMENTS[level];
    if (req.every(i => !!progress[i])) return level;
  }
  return 0; // default white
}

function renderBeltSection(progress) {
  const img = document.getElementById("current-belt-img");
  const nameEl = document.getElementById("belt-name");
  const statusEl = document.getElementById("belt-status");
  const panel = document.querySelector(".belt-visual");
  const hint = document.getElementById("belt-upgrade-hint");
  if (!img || !nameEl || !panel || !statusEl) return;

  const current = loadBeltLevel();         // saved level
  const eligible = eligibleLevel(progress); // based on completed days
  const upgradeAvailable = eligible > current;

  // update img + name with a quick fade
  img.classList.remove("belt-fade-in");
  img.classList.add("belt-fade-out");
  setTimeout(() => {
    img.src = BELTS[current].img;
    nameEl.textContent = BELTS[current].name;
    img.classList.remove("belt-fade-out");
    img.classList.add("belt-fade-in");
  }, 150);

  // Status & upgrade affordance
  if (upgradeAvailable) {
    panel.classList.add("upgrade-available");
    hint.hidden = false;
    statusEl.textContent = "Upgrade available — click the belt to level up!";
    panel.onclick = () => openUpgradeModal(current, eligible);
  } else {
    panel.classList.remove("upgrade-available");
    hint.hidden = true;
    panel.onclick = null;
    const done = countDone(progress);
    if (current < 3) {
      statusEl.textContent = `Complete more days to unlock your next belt (completed: ${done}/12).`;
    } else {
      statusEl.textContent = "You are a Black Belt — wear it with quiet strength.";
    }
  }

  // Show persistent certificate CTA if all done
  const persist = document.getElementById("cert-download");
  const persistBtn = document.getElementById("download-cert-btn-persist");
  if (persist && persistBtn) {
    if (progress.every(Boolean)) {
      persist.hidden = false;
      persistBtn.href = CERT_PATH;
    } else {
      persist.hidden = true;
      persistBtn.removeAttribute("href");
    }
  }
}

// Upgrade modal + apply
function openUpgradeModal(current, eligible) {
  const modal = document.getElementById("upgrade-modal");
  const closeBtn = document.getElementById("upgrade-close");
  const msg = document.getElementById("upgrade-message");
  const img = document.getElementById("upgrade-belt-img");
  const btn = document.getElementById("confirm-upgrade-btn");

  const newBelt = BELTS[eligible];
  msg.textContent = `“Your training shines like snow under moonlight. You are ready to wear the ${newBelt.name}.”`;
  img.src = newBelt.img;

  modal.hidden = false;

  closeBtn.onclick = () => closeUpgradeModal();
  btn.onclick = () => {
    saveBeltLevel(eligible);
    closeUpgradeModal();
    playSound("sound-complete");
    const progress = loadProgress();
    renderBeltSection(progress);
  };

  // ESC / outside click
  function esc(e){ if (e.key === "Escape") closeUpgradeModal(); }
  function outside(e){ if (e.target.id === "upgrade-modal") closeUpgradeModal(); }
  document.addEventListener("keydown", esc, { once:true });
  document.addEventListener("click", outside, { once:true });

  function closeUpgradeModal(){
    modal.hidden = true;
  }
}

// ===================
// BADGE GRID
// ===================
function renderBadges(progress){
  const grid = document.getElementById("badge-grid");
  if (!grid) return;
  grid.innerHTML = "";
  for (let i = 0; i < 12; i++){
    const tile = document.createElement("div");
    const unlocked = !!progress[i];
    tile.className = "badge-tile" + (unlocked ? " unlocked" : "");
    const img = document.createElement("img");
    img.src = `assets/badges/badge_day${i+1}.png`;
    img.alt = unlocked ? `Badge Day ${i+1} (unlocked)` : `Badge Day ${i+1} (locked)`;
    if (unlocked) img.classList.add("badge-pop");
    tile.appendChild(img);
    grid.appendChild(tile);
  }
}

// ===================
// CERTIFICATE MODAL (static PDF download)
// ===================
function openCertificateModal() {
  const modal = document.getElementById("certificate-modal");
  const dl = document.getElementById("download-cert-btn");
  if (dl) {
    dl.href = CERT_PATH;
    dl.setAttribute("target", "_blank");
    dl.setAttribute("rel", "noopener");
  }
  if (modal) modal.hidden = false;

  const closeBtn = document.getElementById("certificate-close");
  if (closeBtn) closeBtn.onclick = () => { closeCertificateModal(); };

  document.addEventListener("keydown", certEscHandler);
  document.addEventListener("click", certOutsideHandler);
}
function closeCertificateModal() {
  const modal = document.getElementById("certificate-modal");
  if (modal) modal.hidden = true;
  document.removeEventListener("keydown", certEscHandler);
  document.removeEventListener("click", certOutsideHandler);
}
function certEscHandler(e){ if (e.key === "Escape") closeCertificateModal(); }
function certOutsideHandler(e){
  const m = document.getElementById("certificate-modal");
  if (m && !m.hidden && e.target.id === "certificate-modal") closeCertificateModal();
}

// ---- Init ----
(async function init() {
  try {
    if (PREVIEW_MODE) {
      const b = document.getElementById("preview-banner");
      if (b) b.style.display = "block";
    }

    // Ensure audio tags point to the absolute URLs
    ensureAudioSrcs();

    const data = await loadContent();
    window.__kcDays = data.days;

    const progress = loadProgress();
    renderCalendar(window.__kcDays, progress);
    renderBeltSection(progress);
    renderBadges(progress);

    // One-time sound unlock for mobile Safari/iOS
    (function setupSoundUnlock() {
      let unlocked = false;
      function unlock() {
        if (unlocked) return;
        unlocked = true;
        ['sound-open','sound-complete'].forEach(id => {
          const a = document.getElementById(id);
          if (!a) return;
          try {
            const p = a.play();
            if (p?.then) {
              p.then(() => { try { a.pause(); a.currentTime = 0; } catch(_){}; })
              .catch(err => console.warn(`[sound] unlock failed for #${id}:`, err));
            }
          } catch(err) { console.warn(`[sound] unlock exception for #${id}:`, err); }
        });
        window.removeEventListener('pointerdown', unlock);
        window.removeEventListener('keydown', unlock);
        window.removeEventListener('touchstart', unlock);
      }
      window.addEventListener('pointerdown', unlock, { once:true });
      window.addEventListener('keydown', unlock, { once:true });
      window.addEventListener('touchstart', unlock, { once:true });
    })();

    // Show persistent certificate CTA if all done (on load)
    const persist = document.getElementById("cert-download");
    const persistBtn = document.getElementById("download-cert-btn-persist");
    if (persist && persistBtn && progress.every(Boolean)) {
      persist.hidden = false;
      persistBtn.href = CERT_PATH;
    }

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

  window.addEventListener("mousemove", (e) => {
    const mid = width / 2;
    const dist = (e.clientX - mid) / mid; // -1..1
    windX = dist * 1.5;
  });

  window.addEventListener("resize", () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });
})();

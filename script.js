// =====================
//  12 Days – SCRIPT.JS
// =====================

// ---------- CONFIG ----------
const START_DAY = 13;            // Dec 13 unlock for Day 1
const TOTAL_DAYS = 12;
const PREVIEW_MODE = true;       // <-- set to false before launch
const STORAGE_KEY = "kc12-progress";     // completion per day
const NAME_KEY = "kc12-name";            // certificate name
const CERT_SHOWN_KEY = "kc12-cert-shown";// show certificate modal once when earned
// ----------------------------

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

    // Detect if a phase just flipped to "earned" (for animation and certificate)
    let revealKey = null;
    PHASES.forEach(p => {
      const [a,b] = p.range;
      const beforeDone = progress.slice(a,b+1).filter(Boolean).length;
      const afterDone  = updated.slice(a,b+1).filter(Boolean).length;
      if (beforeDone < (b-a+1) && afterDone === (b-a+1)) revealKey = p.key;
    });

    saveProgress(updated);
    closeModal();
    renderCalendar(window.__kcDays, updated);
    renderBeltTracker(updated, revealKey);
    playSound("sound-complete");

    // If Black Belt became earned now, show certificate modal
    if (revealKey === "black") {
      openCertificateModal();
      localStorage.setItem(CERT_SHOWN_KEY, "1");
    }
  };

  const modal = document.getElementById("modal");
  modal.hidden = false;
  playSound("sound-chime");
}
function closeModal() {
  const modal = document.getElementById("modal");
  if (modal) modal.hidden = true;
}

// Close day modal on overlay or X
document.addEventListener("click", (e) => {
  const modal = document.getElementById("modal");
  if (modal && !modal.hidden && (e.target.id === "modal" || e.target.id === "modal-close")) {
    closeModal();
  }
});
// ESC closes day modal
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

// ===================
// BELT SCROLL TRACKER
// ===================
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

  // If user already earned Black previously but hasn't seen modal (e.g., new device),
  // optionally show a small prompt or allow manual trigger. For now: auto-open once.
  const [a,b] = PHASES[3].range; // black phase range [9,11]
  const blackDone = progress.slice(a,b+1).filter(Boolean).length === (b-a+1);
  const shown = localStorage.getItem(CERT_SHOWN_KEY) === "1";
  if (blackDone && !shown) {
    openCertificateModal();
    localStorage.setItem(CERT_SHOWN_KEY, "1");
  }
}

// ===================
// CERTIFICATE MODAL + GENERATOR
// ===================
function openCertificateModal() {
  const modal = document.getElementById("certificate-modal");
  const input = document.getElementById("cert-name-input");
  const saved = localStorage.getItem(NAME_KEY) || "";
  if (input) input.value = saved;
  if (modal) modal.hidden = false;

  // Close handlers
  const closeBtn = document.getElementById("certificate-close");
  if (closeBtn) closeBtn.onclick = () => { modal.hidden = true; };

  // Generate handler
  const genBtn = document.getElementById("generate-cert-btn");
  if (genBtn) {
    genBtn.onclick = () => {
      const name = (input.value || "").trim();
      if (name.length === 0) {
        input.focus();
        input.placeholder = "Please enter your name";
        return;
      }
      localStorage.setItem(NAME_KEY, name);
      generateCertificatePNG(name);
    };
  }

  // Close on Esc
  document.addEventListener("keydown", certEscHandler);
}
function closeCertificateModal() {
  const modal = document.getElementById("certificate-modal");
  if (modal) modal.hidden = true;
  document.removeEventListener("keydown", certEscHandler);
}
function certEscHandler(e){ if (e.key === "Escape") closeCertificateModal(); }

// Canvas-based PNG generator (A4-ish dimensions)
function generateCertificatePNG(name) {
  // A4 at ~220 DPI-ish for web download
  const W = 2480, H = 3508; // pixels
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");

  // Background parchment gradient
  const g = ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0, "#f6f2e8");
  g.addColorStop(1, "#eee8d9");
  ctx.fillStyle = g;
  ctx.fillRect(0,0,W,H);

  // Subtle noise overlay
  ctx.globalAlpha = 0.05;
  for (let i = 0; i < 6000; i++) {
    const x = Math.random()*W, y = Math.random()*H, r = Math.random()*1.4;
    ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fillStyle = "#000"; ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Frame / border
  ctx.strokeStyle = "#1f1f1f";
  ctx.lineWidth = 10;
  ctx.strokeRect(80,80,W-160,H-160);
  ctx.strokeStyle = "#a67c37";
  ctx.lineWidth = 4;
  ctx.strokeRect(120,120,W-240,H-240);

  // Header
  ctx.fillStyle = "#222";
  ctx.font = "bold 88px 'Noto Serif JP', serif";
  ctx.textAlign = "center";
  ctx.fillText("KARATE CHRISTMAS BLACK BELT", W/2, 300);
  ctx.font = "bold 76px 'Noto Serif JP', serif";
  ctx.fillText("CERTIFICATE", W/2, 390);

  // Divider with belt motif
  ctx.strokeStyle = "#222"; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(480, 460); ctx.lineTo(W-480, 460); ctx.stroke();
  // knot
  ctx.strokeRect(W/2 - 120, 430, 240, 60);
  // tails
  ctx.beginPath();
  ctx.moveTo(W/2 - 120, 490); ctx.lineTo(W/2 - 240, 620); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(W/2 + 120, 490); ctx.lineTo(W/2 + 240, 620); ctx.stroke();

  // Body text
  ctx.fillStyle = "#2b2b2b";
  ctx.font = "42px Inter, Arial, sans-serif";
  ctx.fillText("This certifies that", W/2, 700);

  // Name
  ctx.fillStyle = "#000";
  ctx.font = "bold 120px 'Noto Serif JP', serif";
  ctx.fillText(name, W/2, 860);

  // Sub text
  ctx.fillStyle = "#2b2b2b";
  ctx.font = "40px Inter, Arial, sans-serif";
  ctx.fillText("has completed the 12 Days of Karate Christmas and demonstrated the spirit of", W/2, 960);
  ctx.fillText("Respect • Courage • Perseverance • Kindness • Strength", W/2, 1015);

  // Auto date (Europe/London)
  const d = todayInLondon();
  const dateStr = d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }); // e.g., 24 December 2025
  ctx.font = "38px Inter, Arial, sans-serif";
  ctx.fillText(`Awarded: ${dateStr}`, W/2, 1120);

  // Quote
  ctx.font = "italic 36px 'Noto Serif JP', serif";
  ctx.fillText("“A true black belt shines not through their belt, but through their spirit.”", W/2, 1210);

  // Signature + seal
  ctx.textAlign = "left";
  ctx.font = "44px 'Noto Serif JP', serif";
  ctx.fillStyle = "#222";
  ctx.fillText("Sensei Santa", 460, H-420);
  ctx.font = "34px Inter, Arial, sans-serif";
  ctx.fillStyle = "#555";
  ctx.fillText("Christmas Dojo", 460, H-370);

  // Red hanko seal
  ctx.save();
  ctx.translate(W-520, H-520);
  ctx.fillStyle = "#b23434";
  ctx.strokeStyle = "#680a0a";
  ctx.lineWidth = 6;
  ctx.beginPath(); ctx.rect(-120, -120, 240, 240); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#f2dcdc";
  ctx.textAlign = "center";
  ctx.font = "bold 100px 'Noto Serif JP', serif";
  ctx.fillText("道", 0, -10);
  ctx.font = "bold 40px Inter, Arial, sans-serif";
  ctx.fillText("認定", 0, 60);
  ctx.restore();

  // Snow corners (holiday flair)
  ctx.textAlign = "center";
  ctx.font = "60px serif";
  ctx.fillText("❄", 200, 220);
  ctx.fillText("❄", W-200, 220);
  ctx.fillText("❄", 200, H-220);
  ctx.fillText("❄", W-200, H-220);

  // Download
  const url = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = url;
  a.download = `Karate_Christmas_Certificate_${name.replace(/\s+/g,"_")}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();

  // Close modal after generation
  closeCertificateModal();
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

    // Close certificate modal on outside click
    document.addEventListener("click", (e) => {
      const m = document.getElementById("certificate-modal");
      if (m && !m.hidden && e.target.id === "certificate-modal") closeCertificateModal();
    });
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

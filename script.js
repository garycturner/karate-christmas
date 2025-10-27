// Config
const START_DAY = 13;           // Dec 13
const TOTAL_DAYS = 12;
const PREVIEW_MODE = true;      // set to false before launch
const STORAGE_KEY = "kc12-progress";

// Helpers
function todayInLondon(){ const s=new Date().toLocaleString("en-GB",{timeZone:"Europe/London"}); return new Date(s); }
function isUnlocked(i){ if(PREVIEW_MODE) return true; const t=todayInLondon(); return t>=new Date(t.getFullYear(),11,START_DAY+i,0,0,0); }
function loadProgress(){ try{const a=JSON.parse(localStorage.getItem(STORAGE_KEY)); if(Array.isArray(a)&&a.length===TOTAL_DAYS) return a;}catch{} return new Array(TOTAL_DAYS).fill(false); }
function saveProgress(a){ localStorage.setItem(STORAGE_KEY,JSON.stringify(a)); }
async function loadContent(){ const r=await fetch("content.json",{cache:"no-store"}); if(!r.ok) throw new Error("content.json"); return r.json(); }

// Render
function renderCalendar(days,progress){
  const el=document.getElementById("calendar"); el.innerHTML="";
  days.forEach((d,i)=>{
    const unlocked=isUnlocked(i);
    const tile=document.createElement("button");
    tile.type="button";
    tile.className="day-tile"+(unlocked?"":" locked");
    tile.style.position="relative";
    tile.innerHTML=`
      <div class="badge ${progress[i]?"done":""}">${progress[i]?"✓ Done":unlocked?"Open":"Locked"}</div>
      <div class="day-title">Day ${d.day}</div>
      <div class="day-date">Dec ${START_DAY+i} • ${d.title}</div>`;
    tile.onclick=()=>{ if(unlocked) openModal(d,i,progress); };
    el.appendChild(tile);
  });
}

function openModal(day,index,progress){
  document.getElementById("modal-title").textContent=`Day ${day.day} – ${day.title||""}`;
  document.getElementById("modal-belt").textContent=`${day.phaseIcon||""} ${day.phase||""}`;
  document.getElementById("modal-physical").innerHTML=day.physical||"<p>—</p>";
  document.getElementById("modal-knowledge").innerHTML=day.knowledge||"<p>—</p>";
  document.getElementById("modal-festive").innerHTML=day.festive||"<p>—</p>";
  document.getElementById("modal-santa").textContent=day.santa||"—";

  const btn=document.getElementById("complete-btn");
  btn.disabled=!!progress[index];
  btn.onclick=()=>{ const up=[...progress]; up[index]=true; saveProgress(up); closeModal(); renderCalendar(window.__kcDays,up); };

  document.getElementById("modal").hidden=false;
}
function closeModal(){ document.getElementById("modal").hidden=true; }

// Close on overlay or X
document.addEventListener("click",(e)=>{
  const m=document.getElementById("modal");
  if(m.hidden) return;
  if(e.target.id==="modal" || e.target.id==="modal-close") closeModal();
});
document.addEventListener("keydown",(e)=>{ if(e.key==="Escape") closeModal(); });

// Init
(async function(){
  if(PREVIEW_MODE){ const b=document.getElementById("preview-banner"); if(b) b.style.display="block"; }
  const data=await loadContent(); window.__kcDays=data.days;
  renderCalendar(window.__kcDays, loadProgress());
})();
/* ========= Festive Snow (mouse-responsive, respects reduced-motion) ========= */
(function snow() {
  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canvas = document.getElementById('snow');
  if (!canvas || prefersReduced) return;

  const ctx = canvas.getContext('2d');
  let width = canvas.width = window.innerWidth;
  let height = canvas.height = window.innerHeight;
  let windX = 0; // mouse-driven wind
  const flakes = [];
  const FLAKES = Math.min(160, Math.floor((width * height) / 12000)); // scale with viewport

  function makeFlake() {
    return {
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 2 + 1.2,          // radius 1.2–3.2
      v: Math.random() * 0.6 + 0.4,        // fall speed
      drift: (Math.random() * 0.6 - 0.3)   // side drift
    };
  }

  for (let i = 0; i < FLAKES; i++) flakes.push(makeFlake());

  function step() {
    ctx.clearRect(0,0,width,height);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    for (const f of flakes) {
      f.y += f.v;
      f.x += f.drift + windX * 0.05;

      if (f.y > height + 5) { f.y = -5; f.x = Math.random() * width; }
      if (f.x > width + 5) f.x = -5;
      if (f.x < -5) f.x = width + 5;

      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fill();
    }
    requestAnimationFrame(step);
  }
  step();

  // Parallax-y wind from mouse
  window.addEventListener('mousemove', (e) => {
    const mid = width / 2;
    const dist = (e.clientX - mid) / mid; // -1..1
    windX = dist * 1.5; // gentle
  });

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });
})();

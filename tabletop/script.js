const canvas = document.getElementById("canvas"), ctx = canvas.getContext("2d");
let w = innerWidth, h = innerHeight;
canvas.width = w; canvas.height = h;
onresize = () => { w = innerWidth; h = innerHeight; canvas.width = w; canvas.height = h; draw(); };

let cam = { x: 0, y: 0, scale: 1 }, panning = false, last = {};
let draggingToken = null, offset = { x: 0, y: 0 };
let selectedToken = null;

// cache de imagens + data para hitbox
const imgCache = {};
function getImage(src, cb) {
  if (imgCache[src]) { cb(imgCache[src]); return; }
  const im = new Image();
  im.onload = () => {
    // criar canvas temporário para extrair pixels
    const tmp = document.createElement("canvas");
    tmp.width = im.width; tmp.height = im.height;
    const tctx = tmp.getContext("2d");
    tctx.drawImage(im, 0, 0);
    const data = tctx.getImageData(0, 0, im.width, im.height);
    imgCache[src] = { img: im, data };
    cb(imgCache[src]);
  };
  im.src = src;
}

// instâncias
let instances = JSON.parse(localStorage.getItem("instances") || "[]");

// função utilitária: testa se clique pegou pixel visível
function hitTest(inst, mx, my) {
  const cache = imgCache[inst.src];
  if (!cache) return false;
  const { img, data } = cache;
  const base = inst.size * 50;
  const iw = img.width, ih = img.height, aspect = iw / ih;
  let drawW, drawH;
  if (aspect >= 1) { drawW = base; drawH = base / aspect; } 
  else { drawW = base * aspect; drawH = base; }

  // inverter transformações
  const relX = mx - inst.x, relY = my - inst.y;
  const rot = -(inst.rotation || 0);
  const cos = Math.cos(rot), sin = Math.sin(rot);
  let rx = relX * cos - relY * sin;
  let ry = relX * sin + relY * cos;
  if (inst.flipped) rx = -rx;

  if (rx < -drawW / 2 || rx > drawW / 2 || ry < -drawH / 2 || ry > drawH / 2) return false;

  // normalizar para pixel da imagem
  const u = (rx + drawW / 2) / drawW;
  const v = (ry + drawH / 2) / drawH;
  const px = Math.floor(u * iw);
  const py = Math.floor(v * ih);
  const idx = (py * iw + px) * 4;
  return data.data[idx + 3] > 10; // alpha > 10 considera visível
}

// eventos mouse
canvas.onmousedown = e => {
  if (e.button !== 0) return;
  const rect = canvas.getBoundingClientRect();
  const mx = (e.clientX - rect.left - w / 2) / cam.scale - cam.x;
  const my = (e.clientY - rect.top - h / 2) / cam.scale - cam.y;
  for (let i = instances.length - 1; i >= 0; i--) {
    const inst = instances[i];
    if (hitTest(inst, mx, my)) {
      draggingToken = inst;
      offset.x = mx - inst.x; offset.y = my - inst.y;
      return;
    }
  }
  panning = true; last = { x: e.clientX, y: e.clientY };
};
canvas.onmouseup = () => { panning = false; draggingToken = null; localStorage.setItem("instances", JSON.stringify(instances)); };
canvas.onmousemove = e => {
  if (panning) {
    cam.x += (e.clientX - last.x) / cam.scale;
    cam.y += (e.clientY - last.y) / cam.scale;
    last = { x: e.clientX, y: e.clientY }; draw();
  }
  if (draggingToken) {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left - w / 2) / cam.scale - cam.x;
    const my = (e.clientY - rect.top - h / 2) / cam.scale - cam.y;
    draggingToken.x = mx - offset.x; draggingToken.y = my - offset.y;
    draw();
  }
};

// clique direito → menu flutuante
canvas.oncontextmenu = e => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const mx = (e.clientX - rect.left - w / 2) / cam.scale - cam.x;
  const my = (e.clientY - rect.top - h / 2) / cam.scale - cam.y;
  for (let i = instances.length - 1; i >= 0; i--) {
    const inst = instances[i];
    if (hitTest(inst, mx, my)) {
      selectedToken = inst; showTokenMenu(e.clientX, e.clientY); return;
    }
  }
};

// clique fora → fecha menu
document.addEventListener("mousedown", e => {
  if (tokenMenu.style.display === "flex" && !tokenMenu.contains(e.target)) {
    hideTokenMenu();
  }
});

// scroll
canvas.onwheel = e => {
  e.preventDefault();
  if (draggingToken && e.shiftKey) {
    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    draggingToken.size = Math.max(0.1, draggingToken.size + delta); draw();
  } else if (draggingToken) {
    draggingToken.rotation = (draggingToken.rotation || 0) + e.deltaY * 0.001; draw();
  } else {
    const f = 1.1; cam.scale *= e.deltaY < 0 ? f : 1 / f; draw();
  }
};

// grid
let opacity = 0.3;
document.getElementById("gridBtn").onclick = () => { draw(); };
document.getElementById("opacityControl").oninput = e => { opacity = e.target.value / 100; draw(); };
function drawIso(tw = 80, th = 40) {
  const w2 = tw / 2, h2 = th / 2;
  const cols = Math.ceil(w / (w2 * cam.scale)) + 4;
  const rows = Math.ceil(h / (h2 * cam.scale)) + 4;
  ctx.strokeStyle = `rgba(255,255,255,${opacity})`;
  for (let r = -rows; r < rows; r++) {
    for (let c = -cols; c < cols; c++) {
      const worldX = (c - r) * w2, worldY = (c + r) * h2;
      const x = w / 2 + (worldX + cam.x) * cam.scale;
      const y = h / 2 + (worldY + cam.y) * cam.scale;
      ctx.beginPath();
      ctx.moveTo(x, y - h2 * cam.scale);
      ctx.lineTo(x + w2 * cam.scale, y);
      ctx.lineTo(x, y + h2 * cam.scale);
      ctx.lineTo(x - w2 * cam.scale, y);
      ctx.closePath(); ctx.stroke();
    }
  }
}

// draw principal
function draw() {
  ctx.fillStyle = "#111"; ctx.fillRect(0, 0, w, h);
  drawIso();
  instances.sort((a, b) => a.y + (a.size * 25) - (b.y + (b.size * 25)));
  instances.forEach(inst => {
    getImage(inst.src, cached => {
      const img = cached.img;
      const base = inst.size * 50 * cam.scale;
      const x = w / 2 + (inst.x + cam.x) * cam.scale;
      const y = h / 2 + (inst.y + cam.y) * cam.scale;
      ctx.save();
      ctx.translate(x, y); ctx.rotate(inst.rotation || 0);
      if (inst.flipped) { ctx.scale(-1, 1); }
      const iw = img.width, ih = img.height, aspect = iw / ih;
      let drawW, drawH;
      if (aspect >= 1) { drawW = base; drawH = base / aspect; } 
      else { drawW = base * aspect; drawH = base; }
      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();
    });
  });
}
draw();

// toggle controles
document.getElementById("menuToggle").onclick = () => { document.getElementById("controls").classList.toggle("hidden"); };

// modal e categorias
let currentCat = null, pendingImg = null;
document.querySelectorAll(".category").forEach(cat => { cat.onclick = () => { currentCat = cat.dataset.cat; openModal(); }; });
function openModal() { pendingImg = null; document.getElementById("drop").textContent = "Selecione ou solte aqui"; document.getElementById("sizeInput").value = 1; document.getElementById("modal").style.display = "flex"; }
function closeModal() { document.getElementById("modal").style.display = "none"; }
const drop = document.getElementById("drop");
drop.onclick = () => { const inp = document.createElement("input"); inp.type = "file"; inp.onchange = e => loadFile(e.target.files[0]); inp.click(); };
drop.ondragover = e => { e.preventDefault(); };
drop.ondrop = e => { e.preventDefault(); loadFile(e.dataTransfer.files[0]); };
function loadFile(file) { if (!file) return; const r = new FileReader(); r.onload = () => { pendingImg = r.result; drop.textContent = file.name; }; r.readAsDataURL(file); }
document.getElementById("addBtn").onclick = () => { if (!pendingImg) return; const size = +document.getElementById("sizeInput").value || 1; const cats = JSON.parse(localStorage.getItem("categories") || "{}"); if (!cats[currentCat]) cats[currentCat] = []; cats[currentCat].push({ src: pendingImg, size }); localStorage.setItem("categories", JSON.stringify(cats)); renderCategories(); closeModal(); };
document.getElementById("cancelBtn").onclick = closeModal;
function renderCategories() { const cats = JSON.parse(localStorage.getItem("categories") || "{}"); document.querySelectorAll(".category").forEach(cat => { const div = cat.querySelector(".thumbs"); div.innerHTML = ""; (cats[cat.dataset.cat] || []).forEach(item => { const img = document.createElement("img"); img.src = item.src; img.draggable = true; img.ondragstart = e => { e.dataTransfer.setData("item", JSON.stringify(item)); }; div.appendChild(img); }); }); }
renderCategories();
canvas.ondrop = e => { e.preventDefault(); const data = e.dataTransfer.getData("item"); if (!data) return; const item = JSON.parse(data); const rect = canvas.getBoundingClientRect(); const x = (e.clientX - rect.left - w / 2) / cam.scale - cam.x; const y = (e.clientY - rect.top - h / 2) / cam.scale - cam.y; instances.push({ src: item.src, size: item.size, x, y }); localStorage.setItem("instances", JSON.stringify(instances)); draw(); };
canvas.ondragover = e => e.preventDefault();

// toggle menu inferior
const toggleBottom = document.getElementById("menuToggleBottom");
const menu = document.getElementById("menu");
toggleBottom.onclick = () => { menu.classList.toggle("hidden"); toggleBottom.textContent = menu.classList.contains("hidden") ? "▲" : "▼"; };

// menu flutuante
const tokenMenu = document.getElementById("tokenMenu");
function showTokenMenu(x, y) { tokenMenu.style.left = `${x + 10}px`; tokenMenu.style.top = `${y + 10}px`; tokenMenu.style.display = "flex"; }
function hideTokenMenu() { tokenMenu.style.display = "none"; selectedToken = null; }
document.getElementById("deleteBtn").onclick = () => { if (selectedToken) { instances = instances.filter(inst => inst !== selectedToken); localStorage.setItem("instances", JSON.stringify(instances)); draw(); hideTokenMenu(); } };
document.getElementById("flipBtn").onclick = () => { if (selectedToken) { selectedToken.flipped = !selectedToken.flipped; localStorage.setItem("instances", JSON.stringify(instances)); draw(); } };

/* --- Canvas e grid isométrico --- */
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
let w = window.innerWidth, h = window.innerHeight;
canvas.width = w; canvas.height = h;

let cam = { x: 0, y: 0, scale: 1 }, panning = false, last = {};

window.addEventListener('resize', () => { 
    w = window.innerWidth; 
    h = window.innerHeight; 
    canvas.width = w; 
    canvas.height = h; 
    draw(); 
});

let tileWidth = 80, tileHeight = 40, opacity = 0.3;

/* --- Instâncias do canvas --- */
let instances = [];
let draggingInstance = null, dragOffset = {x:0, y:0};

/* --- Mouse events --- */
canvas.addEventListener('mousedown', e => {
    const mx = (e.clientX - w/2) / cam.scale - cam.x;
    const my = (e.clientY - h/2) / cam.scale - cam.y;

    for(let i=instances.length-1;i>=0;i--){
        const obj = instances[i];
        const size = obj.scale;
        const localX = (mx - obj.worldX) / size + obj.width/2;
        const localY = (my - obj.worldY) / size + obj.height/2;

        if(localX>=0 && localX<obj.width && localY>=0 && localY<obj.height){
            const index = (Math.floor(localY)*obj.width + Math.floor(localX))*4 + 3;
            const alpha = obj.maskData?.data[index] || 0;
            if(alpha>0){
                draggingInstance = obj;
                dragOffset.x = mx - obj.worldX;
                dragOffset.y = my - obj.worldY;
                return;
            }
        }
    }

    panning = true;
    last = {x:e.clientX, y:e.clientY};
});

canvas.addEventListener('mouseup', ()=>{ draggingInstance = null; panning = false; });
canvas.addEventListener('mouseleave', ()=>{ draggingInstance = null; panning = false; });

canvas.addEventListener('mousemove', e => {
    if(draggingInstance){
        const mx = (e.clientX - w/2) / cam.scale - cam.x;
        const my = (e.clientY - h/2) / cam.scale - cam.y;
        draggingInstance.worldX = mx - dragOffset.x;
        draggingInstance.worldY = my - dragOffset.y;
        draw();
    } else if(panning){
        cam.x += (e.clientX - last.x)/cam.scale;
        cam.y += (e.clientY - last.y)/cam.scale;
        last = {x:e.clientX, y:e.clientY};
        draw();
    }
});

canvas.addEventListener('wheel', e => { 
    e.preventDefault(); 
    if(draggingInstance){
        if(e.shiftKey){
            const factor = e.deltaY < 0 ? 1.05 : 0.95;
            draggingInstance.scale *= factor;
        } else {
            draggingInstance.rotation += e.deltaY < 0 ? -5 : 5;
        }
        draw();
    } else {
        const f = 1.1; 
        cam.scale *= e.deltaY < 0 ? f : 1/f; 
        draw();
    }
});

/* --- Draw functions --- */
function drawIso(){
    const w2 = tileWidth/2, h2 = tileHeight/2;
    const cols = Math.ceil(w/(w2*cam.scale))+4;
    const rows = Math.ceil(h/(h2*cam.scale))+4;
    ctx.strokeStyle = `rgba(255,255,255,${opacity})`;
    ctx.lineWidth = 1;
    for(let r=-rows; r<rows; r++){
        for(let c=-cols; c<cols; c++){
            const worldX = (c-r)*w2, worldY = (c+r)*h2;
            const x = w/2 + (worldX+cam.x)*cam.scale;
            const y = h/2 + (worldY+cam.y)*cam.scale;
            ctx.beginPath();
            ctx.moveTo(x, y-h2*cam.scale);
            ctx.lineTo(x + w2*cam.scale, y);
            ctx.lineTo(x, y+h2*cam.scale);
            ctx.lineTo(x - w2*cam.scale, y);
            ctx.closePath();
            ctx.stroke();
        }
    }
}

function draw(){
    ctx.fillStyle="#111";
    ctx.fillRect(0,0,w,h);
    drawIso();

    const sorted = [...instances].sort((a,b)=>{
        if(a.cat==="mapas" || a.cat==="cenas") return -1;
        if(b.cat==="mapas" || b.cat==="cenas") return 1;
        return (a.worldY + a.height/2) - (b.worldY + b.height/2);
    });

    sorted.forEach(obj=>{
        if(!obj.visible) return;
        const x = w/2 + (obj.worldX + cam.x) * cam.scale;
        const y = h/2 + (obj.worldY + cam.y) * cam.scale;
        const size = obj.scale * cam.scale;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(obj.rotation * Math.PI/180);
        ctx.drawImage(obj.img, -obj.width/2 * size, -obj.height/2 * size, obj.width * size, obj.height * size);
        ctx.restore();

        if(obj.defaultText && obj.defaultText !== "None"){
            ctx.fillStyle="#fff";
            ctx.font = `${obj.fontSize}px ${obj.fontFamily}`;
            ctx.textAlign="center";
            ctx.fillText(obj.defaultText, x, y);
        }
    });
}

function getSizeScale(option){
    switch(option){
        case "Small": return 0.3;
        case "Medium": return 0.5;
        case "Large": return 0.8;
        default: return 0.5;
    }
}

draw();

/* --- Menu expandível --- */
const submenu = document.getElementById("submenu"),
      bottomBar = document.getElementById("bottomBar");
let activeCat = null;
const items = {cenas:[],mapas:[],props:[],tokens:[],attachments:[],docs:[]};

bottomBar.querySelectorAll("img").forEach(icon=>{
    icon.addEventListener("click",()=>{
        const cat = icon.dataset.cat;
        if(activeCat === cat){
            submenu.classList.remove("open");
            activeCat = null;
        } else {
            submenu.innerHTML = "";
            items[cat].forEach(src=>{
                const img = document.createElement("img");
                img.src = src;
                img.draggable = true;
                submenu.appendChild(img);

                img.addEventListener("dragstart", e=>{
                    e.dataTransfer.setData("text/plain", JSON.stringify({src,cat}));
                });
            });
            submenu.classList.add("open");
            activeCat = cat;
        }
    });
});

/* --- Canvas Drop --- */
canvas.addEventListener("dragover", e => e.preventDefault());

canvas.addEventListener("drop", e => {
    e.preventDefault();
    const data = e.dataTransfer.getData("text/plain");
    if(!data) return;
    const {src,cat} = JSON.parse(data);

    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left - w/2) / cam.scale - cam.x;
    const my = (e.clientY - rect.top - h/2) / cam.scale - cam.y;

    const img = new Image();
    img.src = src;
    img.onload = ()=>{
        const maskCanvas = document.createElement("canvas");
        maskCanvas.width = img.width;
        maskCanvas.height = img.height;
        const maskCtx = maskCanvas.getContext("2d");
        maskCtx.drawImage(img,0,0);
        const maskData = maskCtx.getImageData(0,0,img.width,img.height);

        instances.push({
            img,
            width: img.width,
            height: img.height,
            worldX: mx,
            worldY: my,
            scale: getSizeScale(sizeSelect.value),
            rotation: parseFloat(rotationInput.value)||0,
            visible: document.querySelector("#visibleToggle .active").dataset.value === "true",
            locked: document.querySelector("#lockedToggle .active").dataset.value === "true",
            fontSize: parseInt(fontSizeInput.value,10),
            fontFamily: fontFamilySelect.value,
            defaultText: defaultTextSelect.value,
            cat,
            maskData
        });
        draw();
    };
});

/* --- Modal lógica --- */
const modalOverlay = document.getElementById("modalOverlay"),
      addButton = document.getElementById("addButton"),
      closeBtn = document.getElementById("closeBtn"),
      assetsGrid = document.getElementById("assetsGrid"),
      tabs = document.querySelectorAll(".tabs button"),
      modalNew = document.getElementById("modalNew"),
      modalAdd = document.getElementById("modalAdd"),
      openAddModal = document.getElementById("openAddModal"),
      closeAddBtn = document.getElementById("closeAddBtn");

addButton.addEventListener("click", ()=>{
    modalOverlay.style.display="flex";
    const catToOpen = activeCat || "cenas";
    loadAssets(catToOpen);
    activeCat = catToOpen;
    tabs.forEach(b=>b.classList.remove("active"));
    const tabBtn = [...tabs].find(b=>b.dataset.cat===catToOpen);
    if(tabBtn) tabBtn.classList.add("active");
});

function closeModal(){ modalOverlay.style.display="none"; }
modalOverlay.addEventListener("click", e => { if(e.target === modalOverlay) closeModal(); });
closeBtn.addEventListener("click", closeModal);

/* --- Load Assets --- */
function loadAssets(cat){
    assetsGrid.innerHTML = "";
    if(items[cat].length === 0) return;

    items[cat].forEach(src=>{
        const div = document.createElement("div");
        div.className = "asset";
        div.innerHTML = `<img src="${src}">`;
        assetsGrid.appendChild(div);

        div.addEventListener("click", ()=>{
            console.log("Asset selecionado:", src);
        });
    });
}

tabs.forEach(btn=>{
    btn.addEventListener("click", ()=>{
        tabs.forEach(b=>b.classList.remove("active"));
        btn.classList.add("active");
        activeCat = btn.dataset.cat;
        loadAssets(activeCat);
    });
});

const rightMenuToggle = document.getElementById("rightMenuToggle");
const rightMenu = document.getElementById("rightMenu");

rightMenuToggle.addEventListener("click", () => {
  rightMenu.classList.toggle("open");
});


/* --- Add modal toggle --- */
openAddModal.addEventListener("click", ()=>{
    modalNew.style.display="none";
    modalAdd.style.display="flex";
});
closeAddBtn.addEventListener("click", ()=>{
    modalAdd.style.display="none";
    modalNew.style.display="flex";
});

/* --- Upload handling --- */
const fileInput = document.getElementById("fileInput"),
      uploadLink = document.getElementById("uploadLink"),
      uploadBox = document.getElementById("uploadBox"),
      previewImg = document.getElementById("previewImg");
let uploadedData = null;

uploadLink.addEventListener("click", ()=>fileInput.click());
fileInput.addEventListener("change", handleFile);
uploadBox.addEventListener("dragover", e => e.preventDefault());
uploadBox.addEventListener("drop", e => {
    e.preventDefault();
    fileInput.files = e.dataTransfer.files;
    handleFile();
});

function handleFile(){
    const file = fileInput.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = e => {
        uploadedData = e.target.result;
        previewImg.src = uploadedData;
        previewImg.style.display = "block";
    };
    reader.readAsDataURL(file);
}

/* --- Sidebar toggles --- */
function initToggle(id){
    const toggle = document.getElementById(id);
    toggle.querySelectorAll("button").forEach(btn=>{
        btn.addEventListener("click", ()=>{
            toggle.querySelectorAll("button").forEach(b=>b.classList.remove("active"));
            btn.classList.add("active");
        });
    });
}
initToggle("visibleToggle");
initToggle("lockedToggle");

/* --- Import --- */
const importBtn = document.getElementById("importBtn"),
      sizeSelect = document.getElementById("sizeSelect"),
      rotationInput = document.getElementById("rotationInput"),
      fontSizeInput = document.getElementById("fontSizeInput"),
      fontFamilySelect = document.getElementById("fontFamilySelect"),
      defaultTextSelect = document.getElementById("defaultTextSelect");

importBtn.addEventListener("click", ()=>{
    if(!uploadedData) return;

    items[activeCat].push(uploadedData);
    loadAssets(activeCat);

    modalAdd.style.display = "none";
    modalNew.style.display = "flex";

    previewImg.style.display = "none";
    uploadedData = null;
    fileInput.value = "";
});

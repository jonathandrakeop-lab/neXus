// script2.js - gerenciador exclusivo de texto
(function () {
  let texts = [];
  let editing = null;

  const mainCanvas = document.getElementById("canvas");

  // cria overlay para renderizar textos
  const textCanvas = document.createElement("canvas");
  textCanvas.id = "textLayer";
  textCanvas.style.position = "fixed";
  textCanvas.style.left = "0";
  textCanvas.style.top = "0";
  textCanvas.style.width = "100%";
  textCanvas.style.height = "100%";
  textCanvas.style.pointerEvents = "none"; 
  textCanvas.style.zIndex = 20; // acima do canvas principal, abaixo dos menus
  document.body.appendChild(textCanvas);
  const tctx = textCanvas.getContext("2d");

  function resize() {
    textCanvas.width = window.innerWidth;
    textCanvas.height = window.innerHeight;
    render();
  }
  window.addEventListener("resize", resize);
  resize();

  function worldToScreen(x, y) {
    return {
      x: window.innerWidth / 2 + (x + window.cam.x) * window.cam.scale,
      y: window.innerHeight / 2 + (y + window.cam.y) * window.cam.scale
    };
  }

  function screenToWorld(sx, sy) {
    return {
      x: (sx - window.innerWidth / 2) / window.cam.scale - window.cam.x,
      y: (sy - window.innerHeight / 2) / window.cam.scale - window.cam.y
    };
  }

  function render() {
    tctx.clearRect(0, 0, textCanvas.width, textCanvas.height);
    texts.forEach(t => {
      const pos = worldToScreen(t.x, t.y);
      tctx.fillStyle = "#fff";
      tctx.font = `${t.fontSize}px ${t.fontFamily}`;
      tctx.textAlign = "left";
      tctx.textBaseline = "top";
      tctx.fillText(t.content, pos.x, pos.y);
    });
  }

  // cria novo texto em qualquer clique esquerdo
  mainCanvas.addEventListener("mousedown", e => {
    if (e.button !== 0) return; // só botão esquerdo

    const pos = screenToWorld(e.clientX, e.clientY);
    const newText = {
      x: pos.x,
      y: pos.y,
      content: "",
      fontSize: 24,
      fontFamily: "sans-serif"
    };
    texts.push(newText);
    editing = newText;

    // cria textarea para edição
    const ta = document.createElement("textarea");
    ta.style.position = "absolute";
    ta.style.left = e.clientX + "px";
    ta.style.top = e.clientY + "px";
    ta.style.fontSize = newText.fontSize + "px";
    ta.style.fontFamily = newText.fontFamily;
    ta.style.color = "#fff";
    ta.style.background = "transparent";
    ta.style.border = "none";
    ta.style.outline = "none";
    ta.style.resize = "none";
    ta.style.overflow = "hidden";
    ta.style.zIndex = 9999;
    document.body.appendChild(ta);
    ta.focus();

    ta.addEventListener("input", () => {
      editing.content = ta.value;
      render();
    });

    ta.addEventListener("blur", () => {
      document.body.removeChild(ta);
      editing = null;
      render();
    });
  });

  // API pública para integração
  window.textManager = {
    addText(x, y, content, fontSize = 24, fontFamily = "sans-serif") {
      texts.push({ x, y, content, fontSize, fontFamily });
      render();
    },
    clearAll() {
      texts = [];
      render();
    },
    getAll() {
      return texts.map(t => ({ ...t }));
    },
    removeText(index) {
      if (index >= 0 && index < texts.length) {
        texts.splice(index, 1);
        render();
      }
    },
    render,
    texts
  };
})();

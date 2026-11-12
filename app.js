
/* =========================================================
   AQUA ARCANA — Main JavaScript
   4단계 타로 리딩 & 아르카나 포토부스
========================================================= */

const TAROT_CARDS = [
  { num:"0", name:"THE FOOL", icon:"☀", bgClass:"bg-fool", message:"두려움 없이 새로운 물결 속으로 가볍게 뛰어드세요.", accent:"#e0a83c", aura:["#fff8df","#ffe75d"], motifs:["☀","✦","🌊"] },
  { num:"I", name:"THE MAGICIAN", icon:"∞", bgClass:"bg-magician", message:"상상하는 모든 것을 현실의 색채로 물들일 순간입니다.", accent:"#d9683a", aura:["#fff1e6","#ff986b"], motifs:["∞","✦","⚗"] },
  { num:"II", name:"HIGH PRIESTESS", icon:"☾", bgClass:"bg-priestess", message:"고요한 수면 아래에서 내면의 목소리를 귀 기울여 들으세요.", accent:"#3f7ea6", aura:["#eaf5fc","#9dc9e6"], motifs:["☾","✦","🌙"] },
  { num:"III", name:"THE EMPRESS", icon:"♛", bgClass:"bg-empress", message:"당신의 모든 감정과 기운이 풍요롭게 만개합니다.", accent:"#5c9a3f", aura:["#f1fbe9","#b7e293"], motifs:["♛","✿","🌿"] },
  { num:"VI", name:"THE LOVERS", icon:"♡", bgClass:"bg-lovers", message:"마음이 향하는 솔직한 선택이 행운의 문을 엽니다.", accent:"#d9584a", aura:["#fff0ee","#ff8f83"], motifs:["♡","✦","🕊"] },
  { num:"XVII", name:"THE STAR", icon:"★", bgClass:"bg-star", message:"어두운 밤하늘을 밝히는 푸른 별빛처럼 희망이 솟아납니다.", accent:"#2f8fae", aura:["#eafaff","#84cde2"], motifs:["★","✦","🌊"] },
  { num:"XVIII", name:"THE MOON", icon:"☽", bgClass:"bg-moon", message:"안개 낀 물결 속에서도 당신의 직관은 정답을 알고 있습니다.", accent:"#3f6a86", aura:["#eaf1fa","#6c9bb9"], motifs:["☽","✦","🌊"] },
  { num:"XIX", name:"THE SUN", icon:"❋", bgClass:"bg-sun", message:"눈부신 태양의 온기가 당신의 모든 순간을 축복합니다.", accent:"#d9a428", aura:["#fffbe4","#ffe054"], motifs:["❋","☀","✦"] }
];

const BASE_STICKERS = ["🫧","✦","☾","★","♡","♛","✿","❋"];
const POSITIONS = [
  { key:"past", label:"과거", tagColor:"#3f6a86" },
  { key:"present", label:"현재", tagColor:"#e0a83c" },
  { key:"future", label:"미래", tagColor:"#d9584a" }
];

const CARD_COUNT = 3;
const CANVAS_W = 320;
const CANVAS_H = 560;
const PHOTO_PANEL_RATIO_W = 250;
const PHOTO_PANEL_RATIO_H = 250;

/* =========================================================
   STATE
========================================================= */

let selectedTarots = [];
let capturedPhotos = [];
let cardStates = [];
let loadedPhotoImgs = [];
let activeCardIndex = 0;

let stream = null;
let currentColor = "#ff816f";
let isDrawing = false;
let currentStroke = null;

/* =========================================================
   HTML ELEMENTS
========================================================= */

const $ = id => document.getElementById(id);

const deckContainer = $("deckContainer");
const selectionNext = $("selectionNext");
const oracleSpread = $("oracleSpread");
const pickHint = $("pickHint");

const toStage2Btn = $("toStage2Btn");
const toPhotoStageBtn = $("toPhotoStageBtn");
const backToCardsBtn = $("backToCardsBtn");

const webcam = $("webcam");
const countdownLayer = $("countdownLayer");
const flashOverlay = $("flashOverlay");
const startCaptureBtn = $("startCaptureBtn");
const toStage3Btn = $("toStage3Btn");
const photoCountEl = $("photoCount");
const captureTargetLabel = $("captureTargetLabel");

const canvas = $("purikuraCanvas");
const ctx = canvas.getContext("2d");
const cardTabs = $("cardTabs");
const resultGrid = $("resultGrid");

/* =========================================================
   STAGE CONTROL
   1. 카드 선택
   2. 운세 해석
   3. 사진 촬영
   4. 카드 꾸미기
========================================================= */

function setStage(stageNum) {
  document.querySelectorAll(".stage").forEach(stage => {
    stage.classList.remove("active");
  });

  const nextStage = $(`stage${stageNum}`);
  if (!nextStage) return;

  nextStage.classList.add("active");

  const progressFill = $("progressFill");
  const stepLabel = $("stepLabel");

  const labels = [
    "STEP 1 / 4 · SHUFFLE & SELECT",
    "STEP 2 / 4 · YOUR CARD READING",
    "STEP 3 / 4 · ARCANA PHOTO BOOTH",
    "STEP 4 / 4 · DECORATE YOUR CARDS"
  ];

  progressFill.style.width = `${stageNum * 25}%`;
  stepLabel.textContent = labels[stageNum - 1];

  if (stageNum === 3) {
    initThumbLabels();
    initCamera();
  }

  if (stageNum === 4) {
    initDecorationStage();
    $("resultArchive").hidden = true;
    $("finishDecoBtn").hidden = false;
  }

  window.scrollTo({ top:0, behavior:"smooth" });
}

/* =========================================================
   STAGE 1 — SHUFFLE & SELECT
========================================================= */

function shuffleCards(cards) {
  const result = [...cards];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

function initTarotDeck() {
  selectedTarots = [];
  deckContainer.innerHTML = "";

  selectionNext.hidden = true;
  $("toStage2Btn").disabled = true;

  const shuffled = shuffleCards(TAROT_CARDS);

  shuffled.forEach((card, index) => {
    const cardEl = document.createElement("div");

    cardEl.className = "card-flipper";
    cardEl.style.setProperty(
      "--fan-rot",
      `${(index - 3.5) * 7}deg`
    );

    cardEl.innerHTML = `
      <div class="card-side card-back">
        <div class="card-back-pattern">✦</div>
      </div>

      <div class="card-side card-front">
        <div class="card-front-inner">
          <div class="numeral-row">
            <b>${card.num}</b>
            <span>✦</span>
          </div>

          <div class="scene-plate ${card.bgClass}">
            <span class="scene-icon">${card.icon}</span>
          </div>
        </div>

        <small>${card.name}</small>
      </div>
    `;

    cardEl.addEventListener("click", () => {
      onCardPick(cardEl, card);
    });

    deckContainer.appendChild(cardEl);
  });

  updatePickHint();
}

function updatePickHint() {
  if (selectedTarots.length === CARD_COUNT) {
    pickHint.textContent = "3 / 3 장 선택 완료! 당신의 운세를 확인해보세요.";
  } else {
    const next = POSITIONS[selectedTarots.length].label;

    pickHint.textContent =
      `${selectedTarots.length} / 3 장 선택됨 — ${next} 카드를 선택하세요.`;
  }
}

function onCardPick(element, card) {
  if (selectedTarots.length >= CARD_COUNT) return;
  if (element.classList.contains("flipped")) return;

  selectedTarots.push(card);

  element.classList.add("flipped", "disabled");

  updatePickHint();

  if (selectedTarots.length === CARD_COUNT) {
    document.querySelectorAll(".card-flipper:not(.flipped)")
      .forEach(card => card.classList.add("disabled"));

    renderOracleSpread();

    selectionNext.hidden = false;
    toStage2Btn.disabled = false;
  }
}

/* =========================================================
   STAGE 2 — FORTUNE READING
========================================================= */

function renderOracleSpread() {
  oracleSpread.innerHTML = "";

  selectedTarots.forEach((card, index) => {
    const position = POSITIONS[index];

    const entry = document.createElement("article");
    entry.className = "oracle-entry";

    entry.innerHTML = `
      <span class="position-tag"
        style="background:${position.tagColor}">
        ${position.label}
      </span>

      <p class="card-name">
        ${card.icon} ${card.name} (${card.num})
      </p>

      <p class="card-msg">
        ${card.message}
      </p>
    `;

    oracleSpread.appendChild(entry);
  });
}

toStage2Btn.addEventListener("click", () => {
  if (selectedTarots.length !== CARD_COUNT) return;
  setStage(2);
});

toPhotoStageBtn.addEventListener("click", () => {
  setStage(3);
});

backToCardsBtn.addEventListener("click", () => {
  initTarotDeck();
  setStage(1);
});

/* =========================================================
   STAGE 3 — ARCANA PHOTO BOOTH
========================================================= */

function initThumbLabels() {
  selectedTarots.forEach((card, index) => {
    const thumb = $(`thumb${index}`);

    thumb.innerHTML = `
      <span>
        ${POSITIONS[index].label}<br>
        ${card.name}
      </span>
    `;
  });

  photoCountEl.textContent = "0";
  captureTargetLabel.textContent =
    "총 3장의 사진을 촬영해 카드에 연결합니다.";

  startCaptureBtn.disabled = false;
  startCaptureBtn.style.display = "inline-block";
  toStage3Btn.style.display = "none";
}

async function initCamera() {
  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("카메라 API를 사용할 수 없습니다.");
    }

    if (!stream) {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width:{ ideal:640 },
          height:{ ideal:480 }
        },
        audio:false
      });
    }

    webcam.srcObject = stream;
    await webcam.play();

  } catch (error) {
    console.error("Camera error:", error);

    alert(
      "카메라를 실행할 수 없습니다. HTTPS 또는 localhost에서 실행하고 카메라 권한을 확인해주세요."
    );
  }
}

function stopCamera() {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    stream = null;
  }

  if (webcam) webcam.srcObject = null;
}

function runCountdown(seconds) {
  return new Promise(resolve => {
    let count = seconds;

    countdownLayer.style.opacity = "1";
    countdownLayer.textContent = count;

    const timer = setInterval(() => {
      count--;

      if (count > 0) {
        countdownLayer.textContent = count;
      } else {
        clearInterval(timer);

        countdownLayer.style.opacity = "0";
        flashOverlay.classList.add("flash");

        setTimeout(() => {
          flashOverlay.classList.remove("flash");
        }, 150);

        resolve();
      }
    }, 1000);
  });
}

function getMediaSize(media) {
  if (media.videoWidth) {
    return {
      w:media.videoWidth,
      h:media.videoHeight
    };
  }

  return {
    w:media.naturalWidth || media.width,
    h:media.naturalHeight || media.height
  };
}

function drawMediaCover(context, media, x, y, w, h) {
  const { w:mw, h:mh } = getMediaSize(media);

  if (!mw || !mh) return;

  const mediaRatio = mw / mh;
  const boxRatio = w / h;

  let sx, sy, sw, sh;

  if (mediaRatio > boxRatio) {
    sh = mh;
    sw = sh * boxRatio;
    sx = (mw - sw) / 2;
    sy = 0;
  } else {
    sw = mw;
    sh = sw / boxRatio;
    sx = 0;
    sy = (mh - sh) / 2;
  }

  context.drawImage(
    media,
    sx, sy, sw, sh,
    x, y, w, h
  );
}

function captureSnapshot() {
  const width = 640;
  const height = Math.round(
    width * PHOTO_PANEL_RATIO_H / PHOTO_PANEL_RATIO_W
  );

  const snapCanvas = document.createElement("canvas");
  snapCanvas.width = width;
  snapCanvas.height = height;

  const sctx = snapCanvas.getContext("2d");

  sctx.save();
  sctx.translate(width, 0);
  sctx.scale(-1, 1);

  sctx.filter =
    "brightness(1.08) contrast(0.93) saturate(1.15) blur(1px)";

  drawMediaCover(sctx, webcam, 0, 0, width, height);
  sctx.restore();

  return snapCanvas.toDataURL("image/png");
}

startCaptureBtn.addEventListener("click", async () => {
  if (selectedTarots.length !== CARD_COUNT) return;

  if (!stream || webcam.readyState < 2) {
    await initCamera();
  }

  if (!stream || webcam.readyState < 2) {
    alert("카메라 영상이 준비되지 않았습니다.");
    return;
  }

  startCaptureBtn.disabled = true;
  capturedPhotos = [];

  photoCountEl.textContent = "0";

  try {
    for (let i = 0; i < CARD_COUNT; i++) {
      const card = selectedTarots[i];
      const position = POSITIONS[i];

      captureTargetLabel.textContent =
        `${position.label} · ${card.name} 사진 촬영`;

      await runCountdown(3);

      const photo = captureSnapshot();
      capturedPhotos.push(photo);

      photoCountEl.textContent = String(i + 1);

      $(`thumb${i}`).innerHTML = `
        <img src="${photo}" alt="${card.name} 사진">
      `;

      await new Promise(resolve => setTimeout(resolve, 400));
    }

    captureTargetLabel.textContent =
      "촬영 완료! 이제 나만의 아르카나 카드를 꾸며보세요.";

    startCaptureBtn.style.display = "none";
    toStage3Btn.style.display = "inline-block";

  } catch (error) {
    console.error("Capture error:", error);
    alert("사진 촬영에 실패했습니다. 다시 시도해주세요.");
    startCaptureBtn.disabled = false;
  }
});

toStage3Btn.addEventListener("click", () => {
  if (capturedPhotos.length !== CARD_COUNT) {
    alert("사진 3장을 먼저 촬영해주세요.");
    return;
  }

  stopCamera();
  setStage(4);
});

/* =========================================================
   STAGE 4 — CARD DECORATION
========================================================= */

function hexToRgba(hex, alpha) {
  const clean = hex.replace("#", "");

  const value = parseInt(
    clean.length === 3
      ? clean.split("").map(c => c + c).join("")
      : clean,
    16
  );

  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;

  return `rgba(${r},${g},${b},${alpha})`;
}

function wrapText(context, text, maxWidth) {
  const words = text.split(" ");
  const lines = [];
  let line = "";

  words.forEach(word => {
    const test = line ? `${line} ${word}` : word;

    if (
      context.measureText(test).width > maxWidth &&
      line
    ) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  });

  if (line) lines.push(line);

  return lines;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => resolve(img);
    img.onerror = reject;

    img.src = src;
  });
}

async function initDecorationStage() {
  cardStates = selectedTarots.map(() => ({
    strokes:[],
    stamps:[]
  }));

  loadedPhotoImgs = new Array(CARD_COUNT).fill(null);

  try {
    loadedPhotoImgs = await Promise.all(
      capturedPhotos.map(src => loadImage(src))
    );

    buildCardTabs();
    activeCardIndex = 0;

    switchActiveCard(0);

  } catch (error) {
    console.error("Image loading error:", error);
    alert("촬영한 사진을 불러오지 못했습니다.");
  }
}

function buildCardTabs() {
  cardTabs.innerHTML = "";

  selectedTarots.forEach((card, index) => {
    const button = document.createElement("button");

    button.type = "button";
    button.className =
      "card-tab-btn" + (index === 0 ? " active" : "");

    button.textContent =
      `${POSITIONS[index].label} · ${card.name}`;

    button.addEventListener("click", () => {
      switchActiveCard(index);
    });

    cardTabs.appendChild(button);
  });
}

function switchActiveCard(index) {
  activeCardIndex = index;

  cardTabs.querySelectorAll(".card-tab-btn")
    .forEach((button, i) => {
      button.classList.toggle("active", i === index);
    });

  const card = selectedTarots[index];

  populateColorPalette(card);
  populateStickerPalette(card);
  renderActiveCard();
}

function populateColorPalette(card) {
  const container = $("colorPalette");
  container.innerHTML = "";

  const colors = [
    card.accent,
    "#ffe95b",
    "#42b7d7",
    "#ffffff"
  ];

  colors.forEach((color, index) => {
    const swatch = document.createElement("button");

    swatch.type = "button";
    swatch.className =
      "color-swatch" + (index === 0 ? " active" : "");

    swatch.style.background = color;

    swatch.addEventListener("click", () => {
      container.querySelectorAll(".color-swatch")
        .forEach(item => item.classList.remove("active"));

      swatch.classList.add("active");
      currentColor = color;
    });

    container.appendChild(swatch);
  });

  currentColor = card.accent;
}

function populateStickerPalette(card) {
  const container = $("stickerPalette");
  container.innerHTML = "";

  const stickers = [
    ...new Set([...card.motifs, ...BASE_STICKERS])
  ].slice(0, 8);

  stickers.forEach(symbol => {
    const button = document.createElement("button");

    button.type = "button";
    button.className = "sticker-btn";
    button.textContent = symbol;

    button.addEventListener("click", () => {
      cardStates[activeCardIndex].stamps.push({
        emoji:symbol,
        x:CANVAS_W / 2 + Math.random() * 60 - 30,
        y:CANVAS_H / 2 + Math.random() * 80 - 40,
        size:32
      });

      renderActiveCard();
    });

    container.appendChild(button);
  });
}

$("clearDrawingBtn").addEventListener("click", () => {
  cardStates[activeCardIndex].strokes = [];
  cardStates[activeCardIndex].stamps = [];

  renderActiveCard();
});

/* 펜 입력 — 마우스 및 터치 지원 */
function getCanvasPoint(event) {
  const rect = canvas.getBoundingClientRect();

  return {
    x:(event.clientX - rect.left) * (canvas.width / rect.width),
    y:(event.clientY - rect.top) * (canvas.height / rect.height)
  };
}

canvas.addEventListener("pointerdown", event => {
  if (!cardStates[activeCardIndex]) return;

  event.preventDefault();

  isDrawing = true;

  const point = getCanvasPoint(event);

  currentStroke = {
    color:currentColor,
    points:[point]
  };

  cardStates[activeCardIndex].strokes.push(currentStroke);

  canvas.setPointerCapture(event.pointerId);
});

canvas.addEventListener("pointermove", event => {
  if (!isDrawing || !currentStroke) return;

  const point = getCanvasPoint(event);

  currentStroke.points.push(point);

  renderActiveCard();
});

function stopDrawing() {
  isDrawing = false;
  currentStroke = null;
}

canvas.addEventListener("pointerup", stopDrawing);
canvas.addEventListener("pointercancel", stopDrawing);

/* =========================================================
   CARD RENDERING
========================================================= */

function paintTarotCard(targetCtx, card, photoImg, state) {
  const W = CANVAS_W;
  const H = CANVAS_H;

  /* 배경 */
  targetCtx.fillStyle = "#f8f5dc";
  targetCtx.fillRect(0, 0, W, H);

  const aura = targetCtx.createLinearGradient(0, 0, W, H);

  aura.addColorStop(0, hexToRgba(card.aura[0], 0.9));
  aura.addColorStop(1, hexToRgba(card.aura[1], 0.25));

  targetCtx.fillStyle = aura;
  targetCtx.fillRect(0, 0, W, H);

  /* 테두리 */
  targetCtx.strokeStyle = card.accent;
  targetCtx.lineWidth = 3;
  targetCtx.strokeRect(8, 8, W - 16, H - 16);

  targetCtx.strokeStyle = "#ffe95b";
  targetCtx.lineWidth = 1;
  targetCtx.strokeRect(14, 14, W - 28, H - 28);

  /* 카드 번호 */
  targetCtx.fillStyle = "#076387";
  targetCtx.font = '700 20px "Playfair Display", serif';
  targetCtx.textAlign = "left";
  targetCtx.textBaseline = "alphabetic";
  targetCtx.fillText(card.num, 26, 46);

  targetCtx.textAlign = "right";
  targetCtx.font = "22px serif";
  targetCtx.fillText(card.icon, W - 26, 46);

  targetCtx.textAlign = "center";
  targetCtx.font = '500 9px "DM Mono", monospace';
  targetCtx.fillStyle = "#124c66";
  targetCtx.fillText("AQUA ARCANA · ORACLE PHOTO", W / 2, 60);

  /* 사진 */
  const panelX = 28;
  const panelY = 74;
  const panelW = W - 56;
  const panelH = 300;

  if (photoImg) {
    targetCtx.save();

    targetCtx.beginPath();
    targetCtx.rect(panelX, panelY, panelW, panelH);
    targetCtx.clip();

    drawMediaCover(
      targetCtx,
      photoImg,
      panelX,
      panelY,
      panelW,
      panelH
    );

    targetCtx.restore();
  }

  targetCtx.strokeStyle = card.accent;
  targetCtx.lineWidth = 2;
  targetCtx.strokeRect(panelX, panelY, panelW, panelH);

  /* 상징 */
  const motifs = card.motifs || ["✦"];

  targetCtx.fillStyle = card.accent;
  targetCtx.font = "16px serif";
  targetCtx.textAlign = "center";
  targetCtx.textBaseline = "middle";

  targetCtx.fillText(motifs[0], panelX, panelY);
  targetCtx.fillText(motifs[1 % motifs.length], panelX + panelW, panelY);
  targetCtx.fillText(motifs[2 % motifs.length], panelX, panelY + panelH);
  targetCtx.fillText(motifs[0], panelX + panelW, panelY + panelH);

  /* 카드 이름 */
  const plateY = panelY + panelH + 14;

  targetCtx.fillStyle = card.accent;
  targetCtx.fillRect(24, plateY, W - 48, 30);

  targetCtx.fillStyle = "#ffffff";
  targetCtx.font = '700 14px "Playfair Display", serif';
  targetCtx.textAlign = "center";
  targetCtx.fillText(card.name, W / 2, plateY + 20);

  /* 운세 문구 */
  targetCtx.fillStyle = "#124c66";
  targetCtx.font = '500 10px "DM Mono", monospace';

  const lines = wrapText(targetCtx, card.message, W - 60);

  lines.slice(0, 2).forEach((line, index) => {
    targetCtx.fillText(line, W / 2, plateY + 48 + index * 14);
  });

  /* 하단 문구 */
  targetCtx.font = '500 8px "DM Mono", monospace';
  targetCtx.fillStyle = "#076387";

  targetCtx.fillText(
    "SEOUL · AQUA ARCANA 2026 EDITION",
    W / 2,
    H - 18
  );

  /* 펜 드로잉 */
  state.strokes.forEach(stroke => {
    if (stroke.points.length < 2) return;

    targetCtx.strokeStyle = stroke.color;
    targetCtx.lineWidth = 4;
    targetCtx.lineCap = "round";
    targetCtx.lineJoin = "round";

    targetCtx.beginPath();
    targetCtx.moveTo(
      stroke.points[0].x,
      stroke.points[0].y
    );

    for (let i = 1; i < stroke.points.length; i++) {
      targetCtx.lineTo(
        stroke.points[i].x,
        stroke.points[i].y
      );
    }

    targetCtx.stroke();
  });

  /* 스티커 */
  state.stamps.forEach(stamp => {
    targetCtx.font = `${stamp.size}px serif`;
    targetCtx.textAlign = "center";
    targetCtx.textBaseline = "middle";

    targetCtx.fillText(
      stamp.emoji,
      stamp.x,
      stamp.y
    );
  });
}

function renderActiveCard() {
  const card = selectedTarots[activeCardIndex];
  if (!card) return;

  paintTarotCard(
    ctx,
    card,
    loadedPhotoImgs[activeCardIndex],
    cardStates[activeCardIndex]
  );
}

/* =========================================================
   EXPORT — PNG DOWNLOAD
========================================================= */

function renderResultStage() {
  resultGrid.innerHTML = "";

  selectedTarots.forEach((card, index) => {
    const exportCanvas = document.createElement("canvas");

    exportCanvas.width = CANVAS_W;
    exportCanvas.height = CANVAS_H;

    const exportCtx = exportCanvas.getContext("2d");

    paintTarotCard(
      exportCtx,
      card,
      loadedPhotoImgs[index],
      cardStates[index]
    );

    const dataUrl = exportCanvas.toDataURL("image/png");

    const wrap = document.createElement("div");
    wrap.className = "result-card";

    wrap.innerHTML = `
      <span class="result-label">
        ${POSITIONS[index].label} · ${card.name}
      </span>

      <img src="${dataUrl}" alt="${card.name} 결과 카드">

      <a
        class="arcana-btn coral"
        download="AQUA_ARCANA_${card.name.replace(/\s+/g, "_")}.png"
        href="${dataUrl}">
        SAVE PNG
      </a>
    `;

    resultGrid.appendChild(wrap);
  });
}

/* 꾸미기 완료 → 결과 보관함 표시 */
$("finishDecoBtn").addEventListener("click", () => {
  renderResultStage();

  $("resultArchive").hidden = false;
  $("finishDecoBtn").hidden = true;

  $("stepLabel").textContent =
    "COMPLETE · YOUR ARCANA IS READY";

  $("progressFill").style.width = "100%";

  const track = document.querySelector(".progress-track");

  if (track) {
    track.setAttribute("aria-valuenow", "100");
  }

  $("resultArchive").scrollIntoView({
    behavior:"smooth",
    block:"start"
  });
});

/* =========================================================
   INITIALIZE
========================================================= */

window.addEventListener("DOMContentLoaded", () => {
  initTarotDeck();

  selectionNext.hidden = true;
  toStage2Btn.disabled = true;
});

window.addEventListener("beforeunload", () => {
  stopCamera();
});

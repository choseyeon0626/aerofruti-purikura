// Intentionally static: editor-level camera controls are minimal by design.
/* ==========================================================
   타로 카드 데이터 정의
   - 오라클 메시지 (해당 카드가 상징하는 운세)
   - bgClass  : STAGE1 덱 카드 삽화 패널 배경 그라디언트 클래스
   - accent   : 이 카드가 뽑혔을 때 카드 프레임 전체에 스며드는 포인트 컬러
   - aura     : 카드 프레임 배경에 깔리는 은은한 그라디언트 두 색상
   - motifs   : 카드 여백과 스티커 팔레트에 쓰이는 아르카나 상징 기호들
========================================================== */
const TAROT_CARDS = [
  { num: "0", name: "THE FOOL", icon: "☀", bgClass: "bg-fool",
    message: "두려움 없이 새로운 물결 속으로 가볍게 뛰어드세요.",
    accent: "#e0a83c", aura: ["#fff8df", "#ffe75d"], motifs: ["☀", "✦", "🌊"] },
  { num: "I", name: "THE MAGICIAN", icon: "∞", bgClass: "bg-magician",
    message: "상상하는 모든 것을 현실의 색채로 물들일 순간입니다.",
    accent: "#d9683a", aura: ["#fff1e6", "#ff986b"], motifs: ["∞", "✦", "⚗"] },
  { num: "II", name: "HIGH PRIESTESS", icon: "☾", bgClass: "bg-priestess",
    message: "고요한 수면 아래에서 내면의 목소리를 귀 기울여 들으세요.",
    accent: "#3f7ea6", aura: ["#eaf5fc", "#9dc9e6"], motifs: ["☾", "✦", "🌙"] },
  { num: "III", name: "THE EMPRESS", icon: "♛", bgClass: "bg-empress",
    message: "당신의 모든 감정과 기운이 풍요롭게 만개합니다.",
    accent: "#5c9a3f", aura: ["#f1fbe9", "#b7e293"], motifs: ["♛", "✿", "🌿"] },
  { num: "VI", name: "THE LOVERS", icon: "♡", bgClass: "bg-lovers",
    message: "마음이 향하는 솔직한 선택이 행운의 문을 엽니다.",
    accent: "#d9584a", aura: ["#fff0ee", "#ff8f83"], motifs: ["♡", "✦", "🕊"] },
  { num: "XVII", name: "THE STAR", icon: "★", bgClass: "bg-star",
    message: "어두운 밤하늘을 밝히는 푸른 별빛처럼 희망이 솟아납니다.",
    accent: "#2f8fae", aura: ["#eafaff", "#84cde2"], motifs: ["★", "✦", "🌊"] },
  { num: "XVIII", name: "THE MOON", icon: "☽", bgClass: "bg-moon",
    message: "안개 낀 물결 속에서도 당신의 직관은 정답을 알고 있습니다.",
    accent: "#3f6a86", aura: ["#eaf1fa", "#6c9bb9"], motifs: ["☽", "✦", "🌊"] },
  { num: "XIX", name: "THE SUN", icon: "❋", bgClass: "bg-sun",
    message: "눈부신 태양의 온기가 당신의 모든 순간을 축복합니다.",
    accent: "#d9a428", aura: ["#fffbe4", "#ffe054"], motifs: ["❋", "☀", "✦"] }
];

const BASE_STICKERS = ["🫧", "✦", "☾", "★", "♡", "♛", "✿", "❋"];

// 3장 스프레드의 위치 정의 — 뽑은 순서를 그대로 과거 · 현재 · 미래에 대응시킨다.
const POSITIONS = [
  { key: "past", label: "과거", tagColor: "#3f6a86" },
  { key: "present", label: "현재", tagColor: "#e0a83c" },
  { key: "future", label: "미래", tagColor: "#d9584a" }
];

const CARD_COUNT = 3;

// 카드 캔버스 기준 크기 (실제 타로 카드 비율에 가깝게)
const CANVAS_W = 320;
const CANVAS_H = 560;

let selectedTarots = [];           // 뽑은 순서대로 최대 3장
let capturedPhotos = [];           // selectedTarots와 같은 순서의 사진 3장
let cardStates = [];                // 카드별 { strokes: [], stamps: [] }
let loadedPhotoImgs = [];
let activeCardIndex = 0;

/* ---------------- 전역 단계(Stage) 전환 로직 ---------------- */
function setStage(stageNum) {
  document.querySelectorAll('.stage').forEach(el => el.classList.remove('active'));
  document.getElementById(`stage${stageNum}`).classList.add('active');

  const progressFill = document.getElementById('progressFill');
  const stepLabel = document.getElementById('stepLabel');

  const stepLabels = [
    "STEP 1 : DRAW THREE TAROT CARDS",
    "STEP 2 : 3-SHOT RELAY BOOTH",
    "STEP 3 : PURIKURA DECORATION",
    "STEP 4 : ARCHIVE & DOWNLOAD"
  ];

  progressFill.style.width = `${stageNum * 25}%`;
  stepLabel.textContent = stepLabels[stageNum - 1];

  if (stageNum === 2) { initThumbLabels(); initCamera(); }
  if (stageNum === 3) initDecorationStage();
  if (stageNum === 4) renderResultStage();
}

/* ==========================================================
   STAGE 1 : 타로 카드 덱 렌더링 & 3장 뽑기(Flip) 로직
========================================================== */
const deckContainer = document.getElementById('deckContainer');
const readingResult = document.getElementById('readingResult');
const oracleSpread = document.getElementById('oracleSpread');
const pickHint = document.getElementById('pickHint');
const toStage2Btn = document.getElementById('toStage2Btn');

function initTarotDeck() {
  // 카드를 매번 무작위로 섞어서 배치 (셔플 후 3장 선택)
  const shuffled = [...TAROT_CARDS].sort(() => Math.random() - 0.5);

  deckContainer.innerHTML = '';
  shuffled.forEach((card) => {
    const cardEl = document.createElement('div');
    cardEl.className = 'card-flipper';
    cardEl.innerHTML = `
      <!-- 뒷면 -->
      <div class="card-side card-back">
        <div class="card-back-pattern">✦</div>
      </div>
      <!-- 앞면: 클래식 타로 카드 조판 -->
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

    cardEl.addEventListener('click', () => onCardPick(cardEl, card));
    deckContainer.appendChild(cardEl);
  });
}

function updatePickHint() {
  if (selectedTarots.length >= CARD_COUNT) {
    pickHint.textContent = `${CARD_COUNT} / ${CARD_COUNT} 장 선택 완료 — 아래에서 당신의 리딩을 확인하세요`;
  } else {
    const nextPosition = POSITIONS[selectedTarots.length].label;
    pickHint.textContent = `${selectedTarots.length} / ${CARD_COUNT} 장 선택됨 — 다음은 "${nextPosition}" 카드를 뽑으세요`;
  }
}

function onCardPick(clickedEl, card) {
  if (selectedTarots.length >= CARD_COUNT) return; // 이미 3장을 다 뽑았으면 무시
  if (clickedEl.classList.contains('flipped')) return;

  selectedTarots.push(card);
  clickedEl.classList.add('flipped');
  clickedEl.classList.add('disabled'); // 뽑힌 카드는 재선택 방지

  updatePickHint();

  if (selectedTarots.length === CARD_COUNT) {
    // 남은 카드는 모두 비활성화
    document.querySelectorAll('.card-flipper:not(.flipped)').forEach(c => {
      c.classList.add('disabled');
    });
    renderOracleSpread();
  }
}

function renderOracleSpread() {
  oracleSpread.innerHTML = '';
  selectedTarots.forEach((card, idx) => {
    const pos = POSITIONS[idx];
    const entry = document.createElement('div');
    entry.className = 'oracle-entry';
    entry.innerHTML = `
      <span class="position-tag" style="background:${pos.tagColor}">${pos.label}</span>
      <p class="card-name">${card.icon} ${card.name} (${card.num})</p>
      <p class="card-msg">${card.message}</p>
    `;
    oracleSpread.appendChild(entry);
  });
  readingResult.style.display = 'block';
}

toStage2Btn.addEventListener('click', () => setStage(2));

/* ==========================================================
   STAGE 2 : 카메라 및 3컷 릴레이 촬영 (카드마다 한 장씩)
========================================================== */
const webcam = document.getElementById('webcam');
const countdownLayer = document.getElementById('countdownLayer');
const flashOverlay = document.getElementById('flashOverlay');
const startCaptureBtn = document.getElementById('startCaptureBtn');
const toStage3Btn = document.getElementById('toStage3Btn');
const photoCountEl = document.getElementById('photoCount');
const captureTargetLabel = document.getElementById('captureTargetLabel');

let stream = null;

function initThumbLabels() {
  selectedTarots.forEach((card, idx) => {
    const thumb = document.getElementById(`thumb${idx}`);
    if (thumb && !thumb.querySelector('img')) {
      const pos = POSITIONS[idx];
      thumb.innerHTML = `<span>${pos.label}<br>${card.name}</span>`;
    }
  });
  captureTargetLabel.textContent = `총 ${CARD_COUNT}장을 촬영해 각 카드에 한 장씩 넣습니다.`;
}

async function initCamera() {
  try {
    if (!stream) {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false
      });
      webcam.srcObject = stream;
    }
  } catch (err) {
    alert("웹캠을 켤 수 없습니다. 카메라 접근 권한을 확인해주세요.");
  }
}

startCaptureBtn.addEventListener('click', async () => {
  startCaptureBtn.disabled = true;
  capturedPhotos = [];
  photoCountEl.textContent = '0';

  for (let i = 0; i < CARD_COUNT; i++) {
    const card = selectedTarots[i];
    const pos = POSITIONS[i];
    captureTargetLabel.textContent = `촬영 중 · "${pos.label}" 카드 「${card.name}」에 들어갈 사진`;

    await runCountdown(3);
    const dataUrl = captureSnapshot();
    capturedPhotos.push(dataUrl);
    photoCountEl.textContent = `${i + 1}`;

    const thumb = document.getElementById(`thumb${i}`);
    thumb.innerHTML = `<img src="${dataUrl}" alt="snap for ${card.name}">`;
    await new Promise(res => setTimeout(res, 500));
  }

  captureTargetLabel.textContent = "촬영 완료! 이제 각 카드를 꾸며보세요.";
  startCaptureBtn.style.display = 'none';
  toStage3Btn.style.display = 'inline-block';
});

function runCountdown(seconds) {
  return new Promise(resolve => {
    let current = seconds;
    countdownLayer.style.opacity = '1';
    countdownLayer.textContent = current;

    const countTimer = setInterval(() => {
      current--;
      if (current > 0) {
        countdownLayer.textContent = current;
      } else {
        clearInterval(countTimer);
        countdownLayer.style.opacity = '0';
        flashOverlay.classList.add('flash');
        setTimeout(() => flashOverlay.classList.remove('flash'), 150);
        resolve();
      }
    }, 1000);
  });
}

/* ---- 미디어(비디오/이미지) 원본 크기 가져오기 ---- */
function getMediaSize(el) {
  if (el.videoWidth) return { w: el.videoWidth, h: el.videoHeight };
  return { w: el.naturalWidth || el.width, h: el.naturalHeight || el.height };
}

/* ---- object-fit: cover 방식으로 잘라서 그리기 (비율 왜곡 방지 핵심 함수) ---- */
function drawMediaCover(context, media, x, y, w, h) {
  const { w: mw, h: mh } = getMediaSize(media);
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
  context.drawImage(media, sx, sy, sw, sh, x, y, w, h);
}

// 카드 안 사진 패널의 기준 비율 — 촬영본도 동일 비율로 캡처해 프레임에서 절대 왜곡되지 않게 한다.
const PHOTO_PANEL_RATIO_W = 250;
const PHOTO_PANEL_RATIO_H = 250;

/* ---- 촬영 스냅샷: 사진 패널 비율에 맞춰 캡처 + "뽀샤시" 글로우 보정 ---- */
function captureSnapshot() {
  const CAP_W = 640;
  const CAP_H = Math.round(CAP_W * (PHOTO_PANEL_RATIO_H / PHOTO_PANEL_RATIO_W));

  const snapCanvas = document.createElement('canvas');
  snapCanvas.width = CAP_W;
  snapCanvas.height = CAP_H;
  const sctx = snapCanvas.getContext('2d');

  // 1) 기본 영상 (좌우 반전 + 부드러운 뽀샤시 톤 보정)
  sctx.save();
  sctx.translate(CAP_W, 0);
  sctx.scale(-1, 1);
  sctx.filter = 'brightness(1.08) contrast(0.93) saturate(1.15) blur(1px)';
  drawMediaCover(sctx, webcam, 0, 0, CAP_W, CAP_H);
  sctx.restore();

  // 2) 은은한 글로우 레이어 (screen 블렌드로 하이라이트를 번지게 해 화사한 인물사진 느낌)
  sctx.save();
  sctx.translate(CAP_W, 0);
  sctx.scale(-1, 1);
  sctx.filter = 'blur(7px) brightness(1.2)';
  sctx.globalAlpha = 0.32;
  sctx.globalCompositeOperation = 'screen';
  drawMediaCover(sctx, webcam, 0, 0, CAP_W, CAP_H);
  sctx.restore();

  // 3) 아쿠아 톤의 은은한 비네트 워시
  sctx.globalCompositeOperation = 'source-over';
  sctx.globalAlpha = 1;
  const vignette = sctx.createRadialGradient(
    CAP_W / 2, CAP_H / 2, CAP_H * 0.15,
    CAP_W / 2, CAP_H / 2, CAP_H * 1.05
  );
  vignette.addColorStop(0, 'rgba(255,255,255,0)');
  vignette.addColorStop(1, 'rgba(18,76,102,0.16)');
  sctx.fillStyle = vignette;
  sctx.fillRect(0, 0, CAP_W, CAP_H);

  return snapCanvas.toDataURL('image/png');
}

toStage3Btn.addEventListener('click', () => {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
  }
  setStage(3);
});

/* ==========================================================
   STAGE 3 : 카드별 개별 프리쿠라 캔버스 데코레이션
========================================================== */
const canvas = document.getElementById('purikuraCanvas');
const ctx = canvas.getContext('2d');
const cardTabs = document.getElementById('cardTabs');

let currentColor = '#ff816f';
let isDrawing = false;
let currentStroke = null;

/* ---- hex 색상을 rgba 문자열로 변환 (은은한 오라 배경용) ---- */
function hexToRgba(hex, alpha) {
  const clean = hex.replace('#', '');
  const bigint = parseInt(clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/* ---- 긴 운세 문구를 캔버스 폭에 맞춰 줄바꿈 ---- */
function wrapText(context, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  words.forEach(word => {
    const test = line ? `${line} ${word}` : word;
    if (context.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  });
  if (line) lines.push(line);
  return lines;
}

function initDecorationStage() {
  // 상태 배열 초기화 (최초 1회)
  if (cardStates.length !== CARD_COUNT) {
    cardStates = selectedTarots.map(() => ({ strokes: [], stamps: [] }));
  }

  // 사진 3장 미리 로드
  loadedPhotoImgs = new Array(CARD_COUNT).fill(null);
  let loadedCount = 0;
  capturedPhotos.forEach((src, idx) => {
    const img = new Image();
    img.onload = () => {
      loadedPhotoImgs[idx] = img;
      loadedCount++;
      if (loadedCount === capturedPhotos.length) renderActiveCard();
    };
    img.src = src;
  });

  buildCardTabs();
  activeCardIndex = 0;
  switchActiveCard(0);
}

function buildCardTabs() {
  cardTabs.innerHTML = '';
  selectedTarots.forEach((card, idx) => {
    const pos = POSITIONS[idx];
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'card-tab-btn' + (idx === 0 ? ' active' : '');
    btn.textContent = `${pos.label} · ${card.name}`;
    btn.addEventListener('click', () => switchActiveCard(idx));
    cardTabs.appendChild(btn);
  });
}

function switchActiveCard(idx) {
  activeCardIndex = idx;
  cardTabs.querySelectorAll('.card-tab-btn').forEach((btn, i) => {
    btn.classList.toggle('active', i === idx);
  });
  const theme = selectedTarots[idx];
  populateColorPalette(theme);
  populateStickerPalette(theme);
  renderActiveCard();
}

/* ---- 색상 팔레트: 현재 카드의 accent 컬러를 맨 앞에 배치 ---- */
function populateColorPalette(card) {
  const container = document.getElementById('colorPalette');
  if (!container) return;
  const accent = card ? card.accent : '#ff816f';
  const colors = [accent, '#ffe95b', '#42b7d7', '#ffffff'];

  container.innerHTML = '';
  colors.forEach((color, idx) => {
    const swatch = document.createElement('div');
    swatch.className = 'color-swatch' + (idx === 0 ? ' active' : '');
    swatch.style.background = color;
    swatch.dataset.color = color;
    swatch.addEventListener('click', () => {
      container.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
      swatch.classList.add('active');
      currentColor = color;
    });
    container.appendChild(swatch);
  });
  currentColor = accent;
}

/* ---- 스티커 팔레트: 기본 타로 스티커 + 현재 카드 전용 상징 ---- */
function populateStickerPalette(card) {
  const container = document.getElementById('stickerPalette');
  if (!container) return;
  const themed = card && card.motifs ? card.motifs : [];
  const merged = Array.from(new Set([...themed, ...BASE_STICKERS])).slice(0, 8);

  container.innerHTML = '';
  merged.forEach(sym => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'sticker-btn';
    btn.dataset.emoji = sym;
    btn.textContent = sym;
    btn.addEventListener('click', () => {
      cardStates[activeCardIndex].stamps.push({
        emoji: sym,
        x: canvas.width / 2 + (Math.random() * 60 - 30),
        y: canvas.height / 2 + (Math.random() * 80 - 40),
        size: 32
      });
      renderActiveCard();
    });
    container.appendChild(btn);
  });
}

// 지우개 (현재 활성화된 카드만 초기화)
document.getElementById('clearDrawingBtn').addEventListener('click', () => {
  cardStates[activeCardIndex].strokes = [];
  cardStates[activeCardIndex].stamps = [];
  renderActiveCard();
});

// 마우스 드로잉 이벤트 (캔버스 CSS 크기와 실제 해상도가 달라도 좌표가 어긋나지 않도록 보정)
canvas.addEventListener('mousedown', (e) => {
  isDrawing = true;
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (canvas.width / rect.width);
  const y = (e.clientY - rect.top) * (canvas.height / rect.height);
  currentStroke = { color: currentColor, points: [{ x, y }] };
  cardStates[activeCardIndex].strokes.push(currentStroke);
});

canvas.addEventListener('mousemove', (e) => {
  if (!isDrawing) return;
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (canvas.width / rect.width);
  const y = (e.clientY - rect.top) * (canvas.height / rect.height);
  currentStroke.points.push({ x, y });
  renderActiveCard();
});

window.addEventListener('mouseup', () => {
  isDrawing = false;
});

/* ---- 카드 하나를 지정된 컨텍스트에 완전히 그려내는 공용 함수 ----
   (STAGE3 실시간 편집 캔버스와 STAGE4 최종 내보내기 캔버스가 동일한 함수를 공유) */
function paintTarotCard(targetCtx, card, photoImg, state) {
  const W = CANVAS_W, H = CANVAS_H;

  // 1. 배경 (빈티지 크림 페이퍼 + 카드 아우라 그라디언트 워시)
  targetCtx.fillStyle = '#f8f5dc';
  targetCtx.fillRect(0, 0, W, H);

  const aura = targetCtx.createLinearGradient(0, 0, W, H);
  aura.addColorStop(0, hexToRgba(card.aura[0], 0.9));
  aura.addColorStop(1, hexToRgba(card.aura[1], 0.25));
  targetCtx.fillStyle = aura;
  targetCtx.fillRect(0, 0, W, H);

  // 2. 클래식 타로 카드풍 이중 테두리
  targetCtx.strokeStyle = card.accent;
  targetCtx.lineWidth = 3;
  targetCtx.strokeRect(8, 8, W - 16, H - 16);
  targetCtx.strokeStyle = '#ffe95b';
  targetCtx.lineWidth = 1;
  targetCtx.strokeRect(14, 14, W - 28, H - 28);

  // 3. 상단 숫자 + 카드 아이콘
  targetCtx.fillStyle = '#076387';
  targetCtx.font = '700 20px "Playfair Display", serif';
  targetCtx.textAlign = 'left';
  targetCtx.textBaseline = 'alphabetic';
  targetCtx.fillText(card.num, 26, 46);

  targetCtx.textAlign = 'right';
  targetCtx.font = '22px serif';
  targetCtx.fillText(card.icon, W - 26, 46);

  targetCtx.textAlign = 'center';
  targetCtx.font = '500 9px "DM Mono", monospace';
  targetCtx.fillStyle = '#124c66';
  targetCtx.fillText('AQUA ARCANA · ORACLE PHOTO', W / 2, 60);

  // 4. 사진 패널 (cover 방식으로 잘라 넣어 절대 찌그러지지 않게)
  const panelX = 28, panelY = 74, panelW = W - 56, panelH = 300;

  if (photoImg) {
    targetCtx.save();
    targetCtx.beginPath();
    targetCtx.rect(panelX, panelY, panelW, panelH);
    targetCtx.clip();
    drawMediaCover(targetCtx, photoImg, panelX, panelY, panelW, panelH);
    targetCtx.restore();

    // 유리 질감의 은은한 글로시 하이라이트 (에어로 감성 유지)
    const gloss = targetCtx.createLinearGradient(panelX, panelY, panelX, panelY + panelH * 0.5);
    gloss.addColorStop(0, 'rgba(255,255,255,0.3)');
    gloss.addColorStop(1, 'rgba(255,255,255,0)');
    targetCtx.fillStyle = gloss;
    targetCtx.fillRect(panelX, panelY, panelW, panelH * 0.5);
  } else {
    targetCtx.fillStyle = '#a9e0ef';
    targetCtx.fillRect(panelX, panelY, panelW, panelH);
  }

  targetCtx.strokeStyle = card.accent;
  targetCtx.lineWidth = 2;
  targetCtx.strokeRect(panelX, panelY, panelW, panelH);

  // 5. 사진 패널 네 모서리에 아르카나 상징 장식 (실제 타로 카드의 코너 장식 느낌)
  const motifs = card.motifs && card.motifs.length ? card.motifs : ['✦'];
  targetCtx.save();
  targetCtx.globalAlpha = 0.85;
  targetCtx.fillStyle = card.accent;
  targetCtx.font = '16px serif';
  targetCtx.textAlign = 'center';
  targetCtx.textBaseline = 'middle';
  targetCtx.fillText(motifs[0], panelX, panelY);
  targetCtx.fillText(motifs[1 % motifs.length], panelX + panelW, panelY);
  targetCtx.fillText(motifs[2 % motifs.length], panelX, panelY + panelH);
  targetCtx.fillText(motifs[0], panelX + panelW, panelY + panelH);
  targetCtx.restore();

  // 6. 이름 명패 (컬러 리본)
  const plateY = panelY + panelH + 14;
  targetCtx.fillStyle = card.accent;
  targetCtx.fillRect(24, plateY, W - 48, 30);
  targetCtx.fillStyle = '#ffffff';
  targetCtx.font = '700 14px "Playfair Display", serif';
  targetCtx.textAlign = 'center';
  targetCtx.fillText(card.name, W / 2, plateY + 20);

  // 7. 이 카드의 운세 문구
  targetCtx.fillStyle = '#124c66';
  targetCtx.font = '500 10px "DM Mono", monospace';
  const lines = wrapText(targetCtx, card.message, W - 60);
  lines.slice(0, 2).forEach((line, i) => {
    targetCtx.fillText(line, W / 2, plateY + 48 + i * 14);
  });

  // 8. 하단 워드마크
  targetCtx.font = '500 8px "DM Mono", monospace';
  targetCtx.fillStyle = '#076387';
  targetCtx.fillText('SEOUL · AQUA ARCANA 2026 EDITION', W / 2, H - 18);

  // 9. 네온 펜 스트로크 (사용자 데코)
  state.strokes.forEach(stroke => {
    if (stroke.points.length < 2) return;
    targetCtx.strokeStyle = stroke.color;
    targetCtx.lineWidth = 4;
    targetCtx.lineCap = 'round';
    targetCtx.lineJoin = 'round';
    targetCtx.shadowColor = stroke.color;
    targetCtx.shadowBlur = 8;

    targetCtx.beginPath();
    targetCtx.moveTo(stroke.points[0].x, stroke.points[0].y);
    for (let j = 1; j < stroke.points.length; j++) {
      targetCtx.lineTo(stroke.points[j].x, stroke.points[j].y);
    }
    targetCtx.stroke();
  });
  targetCtx.shadowBlur = 0;

  // 10. 스탬프 (사용자 데코)
  state.stamps.forEach(st => {
    targetCtx.font = `${st.size}px serif`;
    targetCtx.textAlign = 'center';
    targetCtx.textBaseline = 'middle';
    targetCtx.fillText(st.emoji, st.x, st.y);
  });
}

function renderActiveCard() {
  const card = selectedTarots[activeCardIndex];
  if (!card) return;
  const photoImg = loadedPhotoImgs[activeCardIndex];
  const state = cardStates[activeCardIndex];
  paintTarotCard(ctx, card, photoImg, state);
}

document.getElementById('finishDecoBtn').addEventListener('click', () => {
  setStage(4);
});

/* ==========================================================
   STAGE 4 : 카드 3장 각각 내보내기 및 다운로드
========================================================== */
const resultGrid = document.getElementById('resultGrid');

function renderResultStage() {
  resultGrid.innerHTML = '';
  selectedTarots.forEach((card, idx) => {
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = CANVAS_W;
    exportCanvas.height = CANVAS_H;
    const exportCtx = exportCanvas.getContext('2d');
    paintTarotCard(exportCtx, card, loadedPhotoImgs[idx], cardStates[idx]);
    const dataUrl = exportCanvas.toDataURL('image/png');

    const pos = POSITIONS[idx];
    const wrap = document.createElement('div');
    wrap.className = 'result-card';
    wrap.innerHTML = `
      <span class="result-label">${pos.label} · ${card.name}</span>
      <img src="${dataUrl}" alt="${card.name} 결과 카드">
      <a class="arcana-btn coral" download="AQUA_ARCANA_${card.name.replace(/\s+/g, '_')}.png" href="${dataUrl}">💾 SAVE</a>
    `;
    resultGrid.appendChild(wrap);
  });
}

// 초기화
window.addEventListener('DOMContentLoaded', () => {
  initTarotDeck();
});
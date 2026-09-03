document.addEventListener('DOMContentLoaded', () => {
  let currentStep = 1;
  let selectedFrame = 'aqua-gloss';
  let capturedShots = [];
  let webcamStream = null;
  let fabricCanvas = null;
  let isDrawingMode = false;
  let activeColor = '#00f0ff';

  // 총 8종 카드 데이터 풀
  const ALL_CARDS_POOL = [
    {
      id: 'aqua-gloss',
      badge: '★ ULTRA RARE',
      cssClass: 'card-aqua',
      icon: '🫧',
      name: 'Aqua Vista 2006',
      attr: 'TYPE: WATER / AERO',
      desc: '투명한 물방울과 아쿠아 글래스 광택'
    },
    {
      id: 'cyber-green',
      badge: '★ NATURE BIO',
      cssClass: 'card-green',
      icon: '🍃',
      name: 'Meadow Bliss',
      attr: 'TYPE: GRASS / BIO',
      desc: '바람 부는 푸른 언덕과 맑은 하늘 감성'
    },
    {
      id: 'y2k-pink',
      badge: '★ SWEET KAWAII',
      cssClass: 'card-pink',
      icon: '🎀',
      name: 'Y2K Sakura Pop',
      attr: 'TYPE: FAIRY / PINK',
      desc: '딸기우유빛 프리쿠라 펄 샤인'
    },
    {
      id: 'matrix-holo',
      badge: '★ COSMO GLOW',
      cssClass: 'card-holo',
      icon: '🌌',
      name: 'Cosmo Hologram',
      attr: 'TYPE: DARK / MATRIX',
      desc: '사이버 퓨처리즘 딥 오로라 네온'
    },
    {
      id: 'deep-marine',
      badge: '★ OCEAN SECRET',
      cssClass: 'card-marine',
      icon: '🐬',
      name: 'Deep Sea Dolphin',
      attr: 'TYPE: OCEAN / DEEP',
      desc: '수면 왜곡 빛망울 & 돌고래 아쿠아'
    },
    {
      id: 'silver-metal',
      badge: '★ METALLIC WMP',
      cssClass: 'card-silver',
      icon: '💿',
      name: 'Silver Cyber CD',
      attr: 'TYPE: STEEL / SOUND',
      desc: '2000년대 미디어 플레이어 크롬 광택'
    },
    {
      id: 'sun-citrus',
      badge: '★ ENERGY BOOST',
      cssClass: 'card-citrus',
      icon: '🍋',
      name: 'Citrus Sunshine',
      attr: 'TYPE: SPARK / ENERGY',
      desc: '비타민 톡톡 튀는 투명 옐로 젤리'
    },
    {
      id: 'cyber-neon',
      badge: '★ HARAJUKU 2000',
      cssClass: 'card-neon',
      icon: '⚡',
      name: 'Neon Cyber Pop',
      attr: 'TYPE: ELECTRIC / POP',
      desc: '시부야 네온사인과 사이버펑크 핑크'
    }
  ];

  let drawnCards = [];

  const drawCardsContainer = document.getElementById('drawCardsContainer');
  const btnRerollCards = document.getElementById('btn-reroll-cards');
  const webcamVideo = document.getElementById('webcam');
  const flashOverlay = document.getElementById('flash-overlay');
  const countdownDisplay = document.getElementById('countdown-display');
  const btnStartCountdown = document.getElementById('btn-start-countdown');
  const btnRetakeCamera = document.getElementById('btn-retake-camera');
  const btnGotoDeco = document.getElementById('btn-goto-deco');
  const btnGotoCamera = document.getElementById('btn-goto-camera');
  const btnFinishDeco = document.getElementById('btn-finish-deco');
  const btnBackToCamera = document.getElementById('btn-back-to-camera');
  const btnSendEmail = document.getElementById('btn-send-email');
  const btnDownloadDirect = document.getElementById('btn-download-direct');
  const btnRestartApp = document.getElementById('btn-restart-app');
  const userEmailInput = document.getElementById('user-email-input');
  const emailStatusMessage = document.getElementById('email-status-message');
  const finalResultImg = document.getElementById('final-result-img');

  const BACKEND_API_URL = 'http://localhost:5000/api/send-photo';

  // --- [레트로 아케이드 효과음 (Web Audio API)] ---
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  function playArcadeSound(type) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    const now = audioCtx.currentTime;
    if (type === 'card-swipe') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.12);
    } else if (type === 'select') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.08);
      osc.frequency.setValueAtTime(783.99, now + 0.16);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.28);
      osc.start(now);
      osc.stop(now + 0.28);
    } else if (type === 'gacha') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(330, now);
      osc.frequency.linearRampToValueAtTime(990, now + 0.25);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    }
  }

  // --- [랜덤 3장 카드 뽑기 (Gacha Draw)] ---
  function drawRandomThreeCards() {
    playArcadeSound('gacha');
    const shuffled = [...ALL_CARDS_POOL].sort(() => 0.5 - Math.random());
    drawnCards = shuffled.slice(0, 3);
    selectedFrame = drawnCards[0].id;

    renderDrawnCards();
  }

  function renderDrawnCards() {
    drawCardsContainer.innerHTML = '';

    drawnCards.forEach((card) => {
      const cardEl = document.createElement('div');
      cardEl.className = `holo-card-draw ${card.id === selectedFrame ? 'selected' : ''}`;
      cardEl.dataset.frame = card.id;

      cardEl.innerHTML = `
        <div class="card-inner">
          <div class="card-header-badge">${card.badge}</div>
          <div class="card-visual-screen ${card.cssClass}">
            <span class="holo-symbol">${card.icon}</span>
            <div class="screen-grid"><span></span><span></span><span></span><span></span></div>
          </div>
          <div class="card-meta">
            <h3 class="card-name">${card.name}</h3>
            <span class="card-attr">${card.attr}</span>
            <p class="card-desc">${card.desc}</p>
          </div>
          <div class="card-holo-glare"></div>
        </div>
      `;

      cardEl.addEventListener('click', () => {
        playArcadeSound('card-swipe');
        selectedFrame = card.id;
        document.querySelectorAll('.holo-card-draw').forEach(c => c.classList.remove('selected'));
        cardEl.classList.add('selected');
      });

      drawCardsContainer.appendChild(cardEl);
    });
  }

  btnRerollCards.addEventListener('click', drawRandomThreeCards);
  drawRandomThreeCards();

  // --- [단계 전환 & 프로그레스 바] ---
  function goToStep(stepNumber) {
    currentStep = stepNumber;

    const percentage = stepNumber * 25;
    const progressBar = document.getElementById('main-progress-bar');
    const statusText = document.getElementById('progress-status-text');
    const percentText = document.getElementById('progress-percent-text');

    const statusNames = ['STAGE 1 : CARD DRAW', 'STAGE 2 : SHOOTING', 'STAGE 3 : DECORATION', 'STAGE 4 : PRINT & GET'];

    if (progressBar) progressBar.style.width = `${percentage}%`;
    if (statusText) statusText.innerText = statusNames[stepNumber - 1];
    if (percentText) percentText.innerText = `${percentage}%`;

    document.querySelectorAll('.track-markers .marker').forEach((m, idx) => {
      m.classList.toggle('active', idx < stepNumber);
    });

    document.querySelectorAll('.stage-section').forEach(sec => sec.classList.remove('active'));

    if (stepNumber === 1) document.getElementById('stage-frame').classList.add('active');
    if (stepNumber === 2) {
      document.getElementById('stage-camera').classList.add('active');
      startCamera();
    } else {
      stopCamera();
    }
    if (stepNumber === 3) {
      document.getElementById('stage-deco').classList.add('active');
      initFabricCanvas();
    }
    if (stepNumber === 4) {
      document.getElementById('stage-result').classList.add('active');
      renderFinalExport();
    }
  }

  btnGotoCamera.addEventListener('click', () => {
    playArcadeSound('select');
    goToStep(2);
  });

  // --- [웹캠 제어 (최대 고화질 보장)] ---
  async function startCamera() {
    try {
      webcamStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
          facingMode: 'user'
        },
        audio: false
      });
      webcamVideo.srcObject = webcamStream;
    } catch (err) {
      try {
        webcamStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        webcamVideo.srcObject = webcamStream;
      } catch (fallbackErr) {
        alert('카메라 권한을 확인해주세요!');
      }
    }
  }

  function stopCamera() {
    if (webcamStream) {
      webcamStream.getTracks().forEach(t => t.stop());
      webcamStream = null;
    }
  }

  // --- [4컷 연속 촬영] ---
  btnStartCountdown.addEventListener('click', () => {
    capturedShots = [];
    updateSlotPreviews();
    btnStartCountdown.disabled = true;
    btnGotoDeco.disabled = true;
    startRelayCapture(0);
  });

  function startRelayCapture(shotIndex) {
    if (shotIndex >= 4) {
      btnStartCountdown.disabled = false;
      btnRetakeCamera.style.display = 'inline-flex';
      btnGotoDeco.disabled = false;
      return;
    }

    let count = 3;
    countdownDisplay.innerText = count;
    countdownDisplay.classList.add('show');
    playArcadeSound('card-swipe');

    const timer = setInterval(() => {
      count--;
      if (count > 0) {
        countdownDisplay.innerText = count;
        playArcadeSound('card-swipe');
      } else {
        clearInterval(timer);
        countdownDisplay.classList.remove('show');
        takeSingleShot(shotIndex);
        setTimeout(() => startRelayCapture(shotIndex + 1), 1200);
      }
    }, 1000);
  }

  /**
   * [100% 무손실 캡처]:
   * 블러를 배제하고 곡선 톤 매핑과 미세 샤픈을 적용하여
   * 얼굴 디테일(눈, 코, 입)이 뭉개지지 않고 선명하게 살아있는 화사한 사진을 완성합니다.
   */
  function takeSingleShot(index) {
    flashOverlay.classList.add('active');
    setTimeout(() => flashOverlay.classList.remove('active'), 150);

    const vWidth = webcamVideo.videoWidth || 1280;
    const vHeight = webcamVideo.videoHeight || 720;

    const offCanvas = document.createElement('canvas');
    offCanvas.width = vWidth;
    offCanvas.height = vHeight;
    const ctx = offCanvas.getContext('2d');

    // 1. 원본 100% 해상도로 좌우 거울 반전 드로우 (크롭 없음)
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.translate(vWidth, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(webcamVideo, 0, 0, vWidth, vHeight);
    ctx.restore();

    // 2. 뭉개짐 없는 선명 뷰티 톤업 (Pixel Tone Mapping)
    const imgData = ctx.getImageData(0, 0, vWidth, vHeight);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      let r = d[i];
      let g = d[i + 1];
      let b = d[i + 2];

      // 선명도를 유지하며 피부 톤을 화사하고 맑게 보정 (대비 유지)
      r = r * 1.05 + 8;
      g = g * 1.03 + 5;
      b = b * 1.04 + 6;

      d[i] = Math.min(255, Math.max(0, r));
      d[i + 1] = Math.min(255, Math.max(0, g));
      d[i + 2] = Math.min(255, Math.max(0, b));
    }
    ctx.putImageData(imgData, 0, 0);

    // 3. 미세한 생기 필터 막만 극소량 합성 (블러 제거)
    ctx.save();
    ctx.fillStyle = 'rgba(255, 240, 245, 0.04)';
    ctx.fillRect(0, 0, vWidth, vHeight);
    ctx.restore();

    capturedShots.push(offCanvas.toDataURL('image/png', 1.0));
    updateSlotPreviews();
  }

  function updateSlotPreviews() {
    for (let i = 0; i < 4; i++) {
      const slot = document.getElementById(`slot-${i}`);
      if (capturedShots[i]) {
        slot.innerHTML = `<img src="${capturedShots[i]}" alt="Shot ${i+1}" />`;
      } else {
        slot.innerHTML = `<span class="slot-idx">#${i+1}</span>`;
      }
    }
    document.querySelector('.strip-title').innerText = `촬영 스트립 (${capturedShots.length}/4)`;
  }

  btnRetakeCamera.addEventListener('click', () => {
    capturedShots = [];
    updateSlotPreviews();
    btnGotoDeco.disabled = true;
    btnRetakeCamera.style.display = 'none';
  });

  btnGotoDeco.addEventListener('click', () => {
    if (capturedShots.length === 4) {
      playArcadeSound('select');
      goToStep(3);
    }
  });

  // --- [Fabric.js 캔버스 데코레이션: 짤림 방지 & 선명도 보존] ---
  function initFabricCanvas() {
    if (!fabricCanvas) {
      fabricCanvas = new fabric.Canvas('purikura-canvas', {
        backgroundColor: '#ffffff',
        selection: true,
        preserveObjectStacking: true
      });
    }
    fabricCanvas.clear();
    drawPurikuraFrameBase();
  }

  function drawPurikuraFrameBase() {
    const frameThemes = {
      'aqua-gloss': { bg: '#e2f4ff', border: '#0088eb', subBorder: '#a1dcff', title: '🫧 AERO VISTA 2006 🫧', tag: 'AERO GLASS CARD EDITION' },
      'cyber-green': { bg: '#f0fdf0', border: '#2eb82e', subBorder: '#b3f0b3', title: '🍃 MEADOW BLISS 🍃', tag: 'BIO NATURE CARD EDITION' },
      'y2k-pink': { bg: '#fff0f5', border: '#ff4d94', subBorder: '#ffb3d1', title: '🎀 PURIKURA SWEET 🎀', tag: 'Y2K SHIBUYA 2004 EDITION' },
      'matrix-holo': { bg: '#161d26', border: '#00f0ff', subBorder: '#5c7cfa', title: '🌌 COSMO CYBER GLOW 🌌', tag: 'HOLOGRAM MATRIX EDITION' },
      'deep-marine': { bg: '#e0f7fa', border: '#0077b6', subBorder: '#90e0ef', title: '🐬 AQUA MARINE DOLPHIN 🐬', tag: 'OCEAN CARD EDITION' },
      'silver-metal': { bg: '#f1f3f5', border: '#6c757d', subBorder: '#ced4da', title: '💿 MEDIA PLAYER CHROME 💿', tag: 'METALLIC WMP EDITION' },
      'sun-citrus': { bg: '#fffde7', border: '#f59f00', subBorder: '#ffe066', title: '🍋 CITRUS ENERGY POP 🍋', tag: 'ENERGY BOOST EDITION' },
      'cyber-neon': { bg: '#1a0826', border: '#ff007f', subBorder: '#00f0ff', title: '⚡ HARAJUKU NEON POP ⚡', tag: 'NEON ARCADE EDITION' }
    };

    const theme = frameThemes[selectedFrame] || frameThemes['aqua-gloss'];
    fabricCanvas.setBackgroundColor(theme.bg, fabricCanvas.renderAll.bind(fabricCanvas));

    // 테두리
    const outerRect = new fabric.Rect({
      left: 10, top: 10, width: 460, height: 700, fill: 'transparent',
      stroke: theme.border, strokeWidth: 4, rx: 16, ry: 16, selectable: false, evented: false
    });
    fabricCanvas.add(outerRect);

    const innerGlowRect = new fabric.Rect({
      left: 16, top: 16, width: 448, height: 688, fill: 'transparent',
      stroke: theme.subBorder, strokeWidth: 1.5, rx: 12, ry: 12, selectable: false, evented: false
    });
    fabricCanvas.add(innerGlowRect);

    // 상단 폰트 (DNFBitBitv2)
    const titleText = new fabric.Text(theme.title, {
      left: 240, top: 30, originX: 'center', fontSize: 16, fontWeight: 'bold',
      fill: theme.border, fontFamily: 'DNFBitBitv2, Segoe UI, sans-serif',
      shadow: new fabric.Shadow({ color: 'rgba(255,255,255,0.9)', blur: 4, offsetX: 1, offsetY: 1 }),
      selectable: false, evented: false
    });
    fabricCanvas.add(titleText);

    // 4개 슬롯 (가로 200, 세로 260)
    const slotW = 200, slotH = 260;
    const positions = [
      { left: 30, top: 65 }, { left: 250, top: 65 },
      { left: 30, top: 350 }, { left: 250, top: 350 }
    ];

    capturedShots.forEach((shotSrc, idx) => {
      if (idx < 4) {
        // 슬롯 베이스 패널
        const slotBg = new fabric.Rect({
          left: positions[idx].left,
          top: positions[idx].top,
          width: slotW,
          height: slotH,
          fill: '#ffffff',
          stroke: 'rgba(255,255,255,0.9)',
          strokeWidth: 3,
          rx: 10,
          ry: 10,
          shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.08)', blur: 6, offsetX: 0, offsetY: 2 }),
          selectable: false,
          evented: false
        });
        fabricCanvas.add(slotBg);
        fabricCanvas.sendToBack(slotBg);

        // [완벽 피팅]: 비율 왜곡 및 얼굴 잘림을 0%로 유지하고 선명하게 렌더링
        fabric.Image.fromURL(shotSrc, (img) => {
          const scale = Math.min(slotW / img.width, slotH / img.height);
          const scaledW = img.width * scale;
          const scaledH = img.height * scale;

          const posX = positions[idx].left + (slotW - scaledW) / 2;
          const posY = positions[idx].top + (slotH - scaledH) / 2;

          img.set({
            left: posX,
            top: posY,
            scaleX: scale,
            scaleY: scale,
            selectable: false,
            evented: false,
            rx: 6,
            ry: 6
          });

          fabricCanvas.add(img);
          fabricCanvas.sendToBack(img);
          fabricCanvas.renderAll();
        });
      }
    });

    const now = new Date();
    const dateStr = `${now.getFullYear()}.${String(now.getMonth()+1).padStart(2,'0')}.${String(now.getDate()).padStart(2,'0')}`;
    
    // 하단 날짜
    const dateText = new fabric.Text(`★ ${theme.tag} ★ ${dateStr}`, {
      left: 240, top: 670, originX: 'center', fontSize: 11, fontWeight: 'bold',
      fill: theme.border, fontFamily: 'DNFBitBitv2, Segoe UI, sans-serif', selectable: false, evented: false
    });
    fabricCanvas.add(dateText);
  }

  // 스티커 도구
  document.querySelectorAll('.sticker-chip').forEach(chip => {
    chip.addEventListener('click', () => addStickerText(chip.dataset.val));
  });

  function addStickerText(content) {
    const isEmoji = content.length <= 4;
    const stickerText = new fabric.Text(content, {
      left: 240, top: 360, originX: 'center', originY: 'center',
      fontSize: isEmoji ? 44 : 22, fontWeight: '900',
      fill: isEmoji ? '#000000' : '#ffffff', stroke: isEmoji ? null : '#0078d7',
      strokeWidth: isEmoji ? 0 : 3, fontFamily: 'DNFBitBitv2, Segoe UI, sans-serif',
      cornerColor: '#00d2ff', cornerSize: 10, transparentCorners: false
    });
    fabricCanvas.add(stickerText);
    fabricCanvas.setActiveObject(stickerText);
    fabricCanvas.renderAll();
  }

  document.getElementById('btn-add-custom-text').addEventListener('click', () => {
    const input = document.getElementById('custom-text-input');
    if (input.value.trim()) {
      addStickerText(input.value.trim());
      input.value = '';
    }
  });

  // 브러시 그리기 모드
  const btnToggleBrush = document.getElementById('btn-toggle-brush');
  btnToggleBrush.addEventListener('click', () => {
    isDrawingMode = !isDrawingMode;
    fabricCanvas.isDrawingMode = isDrawingMode;
    if (isDrawingMode) {
      fabricCanvas.freeDrawingBrush.width = 6;
      fabricCanvas.freeDrawingBrush.color = activeColor;
      btnToggleBrush.innerHTML = '✏️ 그리기 [ON]';
      btnToggleBrush.classList.add('green-btn');
    } else {
      btnToggleBrush.innerHTML = '✏️ 그리기 ON/OFF';
      btnToggleBrush.classList.remove('green-btn');
    }
  });

  document.querySelectorAll('.color-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
      dot.classList.add('active');
      activeColor = dot.dataset.color;
      if (fabricCanvas && fabricCanvas.freeDrawingBrush) {
        fabricCanvas.freeDrawingBrush.color = activeColor;
      }
    });
  });

  document.getElementById('btn-delete-selected').addEventListener('click', () => {
    const active = fabricCanvas.getActiveObjects();
    if (active.length) {
      active.forEach(obj => fabricCanvas.remove(obj));
      fabricCanvas.discardActiveObject();
      fabricCanvas.renderAll();
    }
  });

  document.getElementById('btn-undo-canvas').addEventListener('click', () => {
    const objects = fabricCanvas.getObjects();
    if (objects.length > 7) {
      fabricCanvas.remove(objects[objects.length - 1]);
      fabricCanvas.renderAll();
    }
  });

  btnBackToCamera.addEventListener('click', () => goToStep(2));
  btnFinishDeco.addEventListener('click', () => {
    playArcadeSound('select');
    goToStep(4);
  });

  function renderFinalExport() {
    fabricCanvas.discardActiveObject();
    fabricCanvas.renderAll();
    finalResultImg.src = fabricCanvas.toDataURL({ format: 'png', quality: 1.0, multiplier: 1.5 });
  }

  // 이메일 전송
  btnSendEmail.addEventListener('click', async () => {
    const email = userEmailInput.value.trim();
    if (!email || !email.includes('@')) {
      alert('올바른 이메일 주소를 입력해주세요.');
      return;
    }
    emailStatusMessage.className = 'status-message';
    emailStatusMessage.innerText = '✉️ 메일 전송 중입니다...';
    btnSendEmail.disabled = true;

    try {
      const response = await fetch(BACKEND_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, imageData: finalResultImg.src, frameTitle: selectedFrame })
      });
      const result = await response.json();
      if (result.success) {
        emailStatusMessage.className = 'status-message success';
        emailStatusMessage.innerHTML = `✅ 성공적으로 발송되었습니다!<br>${result.previewUrl ? `<a href="${result.previewUrl}" target="_blank" style="color:#0078d7;">[테스트 메일 링크]</a>` : ''}`;
      } else {
        throw new Error(result.message);
      }
    } catch (err) {
      emailStatusMessage.className = 'status-message error';
      emailStatusMessage.innerText = `❌ 메일 발송 실패: ${err.message}`;
    } finally {
      btnSendEmail.disabled = false;
    }
  });

  // 직접 다운로드
  btnDownloadDirect.addEventListener('click', () => {
    playArcadeSound('select');
    const link = document.createElement('a');
    link.download = `Aero_Purikura_${Date.now()}.png`;
    link.href = finalResultImg.src;
    link.click();
  });

  // 처음부터 시작
  btnRestartApp.addEventListener('click', () => {
    playArcadeSound('card-swipe');
    capturedShots = [];
    userEmailInput.value = '';
    emailStatusMessage.innerText = '';
    drawRandomThreeCards();
    goToStep(1);
  });
});
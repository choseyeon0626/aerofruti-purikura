document.addEventListener('DOMContentLoaded', () => {
  let currentStep = 1;
  let selectedFrame = 'aqua-gloss';
  let capturedShots = [];
  let webcamStream = null;
  let fabricCanvas = null;
  let isDrawingMode = false;
  let activeColor = '#00d2ff';

  // 다채로운 8종 카드 풀
  const ALL_CARDS_POOL = [
    {
      id: 'aqua-gloss',
      badge: '★ ULTRA RARE',
      cssClass: 'card-aqua',
      icon: '🫧',
      name: 'Aqua Vista 2006',
      attr: 'TYPE: WATER / AERO',
      desc: '투명한 물방울과 맑은 아쿠아 글래스 광택'
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
      id: 'sun-citrus',
      badge: '★ ENERGY BOOST',
      cssClass: 'card-citrus',
      icon: '🍋',
      name: 'Citrus Sunshine',
      attr: 'TYPE: SPARK / ENERGY',
      desc: '비타민 톡톡 튀는 투명 옐로 젤리'
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
  let isSpinning = false;

  const splashScreen = document.getElementById('splash-screen');
  const btnStartApp = document.getElementById('btn-start-app');
  const slotMachineWrapper = document.getElementById('slotMachineWrapper');
  const slotLeverAssembly = document.getElementById('slotLeverAssembly');
  const drawCardsContainer = document.getElementById('drawCardsContainer');
  const cardActionRow = document.getElementById('cardActionRow');
  const btnRespinSlot = document.getElementById('btn-respin-slot');
  const btnGotoCamera = document.getElementById('btn-goto-camera');
  const slotBannerBadge = document.getElementById('slot-banner-badge');
  const slotBannerTitle = document.getElementById('slot-banner-title');
  const slotBannerSub = document.getElementById('slot-banner-sub');

  const webcamVideo = document.getElementById('webcam');
  const flashOverlay = document.getElementById('flash-overlay');
  const countdownDisplay = document.getElementById('countdown-display');
  const btnStartCountdown = document.getElementById('btn-start-countdown');
  const btnRetakeCamera = document.getElementById('btn-retake-camera');
  const btnGotoDeco = document.getElementById('btn-goto-deco');
  const btnFinishDeco = document.getElementById('btn-finish-deco');
  const btnBackToCamera = document.getElementById('btn-back-to-camera');
  const btnSendEmail = document.getElementById('btn-send-email');
  const btnDownloadDirect = document.getElementById('btn-download-direct');
  const btnRestartApp = document.getElementById('btn-restart-app');
  const userEmailInput = document.getElementById('user-email-input');
  const emailStatusMessage = document.getElementById('email-status-message');
  const finalResultImg = document.getElementById('final-result-img');

  const BACKEND_API_URL = 'http://localhost:5000/api/send-photo';

  // --- [오디오 신시사이저 (찰칵 셔터 사운드 & 카운트다운 비프음)] ---
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  function playArcadeSound(type) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const now = audioCtx.currentTime;

    if (type === 'coin') {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(987.77, now);
      osc.frequency.setValueAtTime(1318.51, now + 0.08);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === 'lever-pull') {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(250, now);
      osc.frequency.linearRampToValueAtTime(100, now + 0.2);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === 'slot-tick') {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'square';
      osc.frequency.setValueAtTime(550, now);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.04);
      osc.start(now);
      osc.stop(now + 0.04);
    } else if (type === 'card-select') {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(1040, now + 0.14);
      gain.gain.setValueAtTime(0.14, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.14);
      osc.start(now);
      osc.stop(now + 0.14);
    } else if (type === 'slot-win') {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.08);
      osc.frequency.setValueAtTime(783.99, now + 0.16);
      osc.frequency.setValueAtTime(1046.50, now + 0.24);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === 'countdown-tick') {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
    } else if (type === 'shutter') {
      // 찰칵 기계식 셔터 사운드
      const bufferSize = audioCtx.sampleRate * 0.25;
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = audioCtx.createBufferSource();
      noise.buffer = buffer;

      const filter = audioCtx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1200, now);
      filter.Q.setValueAtTime(3, now);

      const noiseGain = audioCtx.createGain();
      noiseGain.gain.setValueAtTime(0.35, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);
      noiseGain.gain.setValueAtTime(0.4, now + 0.08);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(audioCtx.destination);

      noise.start(now);
      noise.stop(now + 0.25);

      const clickOsc = audioCtx.createOscillator();
      const clickGain = audioCtx.createGain();
      clickOsc.type = 'triangle';
      clickOsc.frequency.setValueAtTime(160, now);
      clickOsc.frequency.exponentialRampToValueAtTime(40, now + 0.07);
      clickGain.gain.setValueAtTime(0.3, now);
      clickGain.gain.exponentialRampToValueAtTime(0.01, now + 0.07);

      clickOsc.connect(clickGain);
      clickGain.connect(audioCtx.destination);
      clickOsc.start(now);
      clickOsc.stop(now + 0.08);
    }
  }

  // --- [스플래시 페이지 진입] ---
  btnStartApp.addEventListener('click', () => {
    playArcadeSound('coin');
    splashScreen.classList.remove('active');
  });

  // --- [슬롯머신 레버 동작] ---
  slotLeverAssembly.addEventListener('click', () => {
    if (isSpinning) return;
    pullLeverAndSpin();
  });

  function pullLeverAndSpin() {
    isSpinning = true;
    playArcadeSound('lever-pull');
    slotLeverAssembly.classList.add('pulled');

    setTimeout(() => {
      slotLeverAssembly.classList.remove('pulled');
    }, 350);

    const shuffled = [...ALL_CARDS_POOL].sort(() => 0.5 - Math.random());
    drawnCards = shuffled.slice(0, 3);
    selectedFrame = drawnCards[0].id;

    let spinCount = 0;
    const maxSpins = 18;
    const interval = setInterval(() => {
      spinCount++;
      playArcadeSound('slot-tick');

      for (let i = 0; i < 3; i++) {
        const randCard = ALL_CARDS_POOL[Math.floor(Math.random() * ALL_CARDS_POOL.length)];
        const reelBox = document.getElementById(`reel-${i}`);
        reelBox.innerHTML = `
          <div class="reel-strip">
            <div class="reel-item">
              <span class="reel-icon">${randCard.icon}</span>
              <span class="reel-name">${randCard.name.split(' ')[0]}</span>
            </div>
          </div>
        `;
      }

      if (spinCount >= maxSpins) {
        clearInterval(interval);
        finalizeSlotStop();
      }
    }, 80);
  }

  function finalizeSlotStop() {
    for (let i = 0; i < 3; i++) {
      const card = drawnCards[i];
      const reelBox = document.getElementById(`reel-${i}`);
      reelBox.innerHTML = `
        <div class="reel-strip">
          <div class="reel-item">
            <span class="reel-icon">${card.icon}</span>
            <span class="reel-name">${card.name.split(' ')[0]}</span>
          </div>
        </div>
      `;
    }

    playArcadeSound('slot-win');

    setTimeout(() => {
      slotMachineWrapper.classList.add('hidden-away');
      slotBannerBadge.innerText = 'CONGRATULATIONS! 🎉';
      slotBannerTitle.innerText = 'CHOOSE YOUR FRAME CARD';
      slotBannerSub.innerText = '당첨된 3개의 카드 중 마음에 드는 프레임을 골라주세요!';
      
      renderDrawnCards();
      cardActionRow.style.display = 'flex';
      isSpinning = false;
    }, 700);
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
        playArcadeSound('card-select');
        selectedFrame = card.id;
        document.querySelectorAll('.holo-card-draw').forEach(c => c.classList.remove('selected'));
        cardEl.classList.add('selected');
      });

      drawCardsContainer.appendChild(cardEl);
    });
  }

  btnRespinSlot.addEventListener('click', () => {
    drawCardsContainer.innerHTML = '';
    cardActionRow.style.display = 'none';
    slotMachineWrapper.classList.remove('hidden-away');

    slotBannerBadge.innerText = 'LUCKY SLOT MACHINE 🎰';
    slotBannerTitle.innerText = 'PULL LEVER TO SPIN!';
    slotBannerSub.innerText = '우측의 빨간 레버를 아래로 당겨 슬롯을 돌리세요!';

    setTimeout(() => {
      pullLeverAndSpin();
    }, 400);
  });

  // --- [단계 전환 & 프로그레스 바 연동 (점 마커 코드 제거)] ---
  function goToStep(stepNumber) {
    currentStep = stepNumber;

    const percentage = stepNumber * 25;
    const progressBar = document.getElementById('main-progress-bar');
    const statusText = document.getElementById('progress-status-text');
    const percentText = document.getElementById('progress-percent-text');

    const statusNames = [
      'STAGE 1 : CARD SELECT', 
      'STAGE 2 : SHOOTING', 
      'STAGE 3 : DECORATION', 
      'STAGE 4 : PRINT & GET'
    ];

    if (progressBar) progressBar.style.width = `${percentage}%`;
    if (statusText) statusText.innerText = statusNames[stepNumber - 1];
    if (percentText) percentText.innerText = `${percentage}%`;

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
    playArcadeSound('card-select');
    goToStep(2);
  });

  // --- [카메라 제어] ---
  async function startCamera() {
    try {
      webcamStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1920, min: 1280 }, height: { ideal: 1080, min: 720 }, facingMode: 'user' },
        audio: false
      });
      webcamVideo.srcObject = webcamStream;
    } catch (err) {
      try {
        webcamStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        webcamVideo.srcObject = webcamStream;
      } catch (e) {
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

  // --- [4컷 타이머 촬영 (삑 소리 재생)] ---
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
    playArcadeSound('countdown-tick');

    const timer = setInterval(() => {
      count--;
      if (count > 0) {
        countdownDisplay.innerText = count;
        playArcadeSound('countdown-tick');
      } else {
        clearInterval(timer);
        countdownDisplay.classList.remove('show');
        takeSingleShot(shotIndex);
        setTimeout(() => startRelayCapture(shotIndex + 1), 1200);
      }
    }, 1000);
  }

  // --- [촬영: 찰칵 셔터음 & 원본 100% 무손실 캡처] ---
  function takeSingleShot(index) {
    playArcadeSound('shutter');
    flashOverlay.classList.add('active');
    setTimeout(() => flashOverlay.classList.remove('active'), 150);

    const vWidth = webcamVideo.videoWidth || 1280;
    const vHeight = webcamVideo.videoHeight || 720;

    const offCanvas = document.createElement('canvas');
    offCanvas.width = vWidth;
    offCanvas.height = vHeight;
    const ctx = offCanvas.getContext('2d');

    // 1. 원본 선명 레이어
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.translate(vWidth, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(webcamVideo, 0, 0, vWidth, vHeight);
    ctx.restore();

    // 2. 화사한 피부 톤업
    const imgData = ctx.getImageData(0, 0, vWidth, vHeight);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      let r = d[i], g = d[i + 1], b = d[i + 2];
      r = r * 1.04 + 8;
      g = g * 1.02 + 5;
      b = b * 1.03 + 7;
      d[i] = Math.min(255, Math.max(0, r));
      d[i + 1] = Math.min(255, Math.max(0, g));
      d[i + 2] = Math.min(255, Math.max(0, b));
    }
    ctx.putImageData(imgData, 0, 0);

    // 3. 몽환적 소프트 블룸 글로우
    const glowCanvas = document.createElement('canvas');
    glowCanvas.width = vWidth;
    glowCanvas.height = vHeight;
    const gCtx = glowCanvas.getContext('2d');
    gCtx.drawImage(offCanvas, 0, 0);

    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.filter = 'blur(7px) brightness(1.15) contrast(90%)';
    ctx.drawImage(glowCanvas, 0, 0);
    ctx.restore();

    // 4. 미세 틴트 막
    ctx.save();
    ctx.fillStyle = 'rgba(230, 248, 255, 0.05)';
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
      playArcadeSound('card-select');
      goToStep(3);
    }
  });

  // --- [Fabric.js 캔버스 데코레이션: 오늘의 운세 각인 & SUIT 폰트] ---
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
      'aqua-gloss': { 
        bg: '#e8f6ff', border: '#008be3', subBorder: '#bfe4ff', 
        title: '🫧 AERO VISTA 2006 🫧', 
        fortune: '🔮 [오늘의 운세] 맑고 투명한 물처럼 모든 막힘이 시원하게 풀릴 하루!' 
      },
      'y2k-pink': { 
        bg: '#fff0f5', border: '#ff4d94', subBorder: '#ffb3d1', 
        title: '🎀 PURIKURA SWEET 🎀', 
        fortune: '🔮 [오늘의 운세] 달콤한 딸기우유처럼 기분 좋은 핑크빛 설렘이 가득!' 
      },
      'sun-citrus': { 
        bg: '#fffde7', border: '#f59f00', subBorder: '#ffe066', 
        title: '🍋 CITRUS ENERGY POP 🍋', 
        fortune: '🔮 [오늘의 운세] 비타민처럼 톡톡 튀는 열정으로 최고의 성과를 낼 찬스!' 
      },
      'cyber-green': { 
        bg: '#f0fdf0', border: '#2eb82e', subBorder: '#b3f0b3', 
        title: '🍃 MEADOW BLISS 🍃', 
        fortune: '🔮 [오늘의 운세] 언덕 위 솔솔 부는 바람처럼 마음이 편안하고 평온한 날.' 
      },
      'matrix-holo': { 
        bg: '#161d26', border: '#00f0ff', subBorder: '#5c7cfa', 
        title: '🌌 COSMO CYBER GLOW 🌌', 
        fortune: '🔮 [오늘의 운세] 밤하늘의 오로라처럼 반짝이는 특별한 아이디어가 떠오를 때!' 
      },
      'deep-marine': { 
        bg: '#e0f4ff', border: '#0077cc', subBorder: '#80cbff', 
        title: '🐬 AQUA DOLPHIN 🐬', 
        fortune: '🔮 [오늘의 운세] 깊은 바다를 유영하는 돌고래처럼 행운의 물결을 타게 됩니다.' 
      },
      'silver-metal': { 
        bg: '#ffffff', border: '#94a3b8', subBorder: '#e2e8f0', 
        title: '💿 CYBER CHROME 💿', 
        fortune: '🔮 [오늘의 운세] CD처럼 끊김 없이 매끄럽게 계획한 일들이 술술 진행될 예감!' 
      },
      'cyber-neon': { 
        bg: '#1a0826', border: '#ff007f', subBorder: '#00f0ff', 
        title: '⚡ HARAJUKU NEON POP ⚡', 
        fortune: '🔮 [오늘의 운세] 번뜩이는 네온사인처럼 당신의 매력이 주변 사람들을 사로잡는 날!' 
      }
    };

    const theme = frameThemes[selectedFrame] || frameThemes['aqua-gloss'];
    fabricCanvas.setBackgroundColor(theme.bg, fabricCanvas.renderAll.bind(fabricCanvas));

    // 외곽 테두리
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

    // 상단 텍스트
    const titleText = new fabric.Text(theme.title, {
      left: 240, top: 30, originX: 'center', fontSize: 16, fontWeight: '800',
      fill: theme.border, fontFamily: 'SUIT, sans-serif',
      shadow: new fabric.Shadow({ color: 'rgba(255,255,255,0.95)', blur: 4, offsetX: 1, offsetY: 1 }),
      selectable: false, evented: false
    });
    fabricCanvas.add(titleText);

    // 슬롯 4개
    const slotW = 200, slotH = 250;
    const positions = [
      { left: 30, top: 65 }, { left: 250, top: 65 },
      { left: 30, top: 335 }, { left: 250, top: 335 }
    ];

    capturedShots.forEach((shotSrc, idx) => {
      if (idx < 4) {
        const slotBg = new fabric.Rect({
          left: positions[idx].left,
          top: positions[idx].top,
          width: slotW,
          height: slotH,
          fill: '#ffffff',
          stroke: 'rgba(255,255,255,0.95)',
          strokeWidth: 3,
          rx: 10,
          ry: 10,
          shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.05)', blur: 4, offsetX: 0, offsetY: 2 }),
          selectable: false,
          evented: false
        });
        fabricCanvas.add(slotBg);
        fabricCanvas.sendToBack(slotBg);

        // 원본 비율 100% 보존 슬롯 배치 (Contain)
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
    
    // 하단 운세 문구
    const fortuneText = new fabric.Text(theme.fortune, {
      left: 240, top: 652, originX: 'center', fontSize: 10.5, fontWeight: '700',
      fill: theme.border, fontFamily: 'SUIT, sans-serif', selectable: false, evented: false
    });
    fabricCanvas.add(fortuneText);

    // 하단 날짜 태그
    const dateText = new fabric.Text(`★ AERO PURIKURA MEMORIAL ★ ${dateStr}`, {
      left: 240, top: 674, originX: 'center', fontSize: 10, fontWeight: '800',
      fill: '#84a9c0', fontFamily: 'SUIT, sans-serif', selectable: false, evented: false
    });
    fabricCanvas.add(dateText);
  }

  // 스티커 도구 (대형 스티커 크기 반영)
  document.querySelectorAll('.sticker-chip').forEach(chip => {
    chip.addEventListener('click', () => addStickerText(chip.dataset.val));
  });

  function addStickerText(content) {
    const isEmoji = content.length <= 4;
    const stickerText = new fabric.Text(content, {
      left: 240, top: 340, originX: 'center', originY: 'center',
      fontSize: isEmoji ? 58 : 26,
      fontWeight: '900',
      fill: isEmoji ? '#000000' : '#ffffff', 
      stroke: isEmoji ? null : '#008be3',
      strokeWidth: isEmoji ? 0 : 3, 
      fontFamily: 'SUIT, sans-serif',
      cornerColor: '#00d2ff', 
      cornerSize: 12, 
      transparentCorners: false,
      shadow: new fabric.Shadow({
        color: 'rgba(0, 0, 0, 0.15)',
        blur: 6,
        offsetX: 2,
        offsetY: 3
      })
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
      btnToggleBrush.classList.add('primary-btn');
      btnToggleBrush.classList.remove('secondary-btn');
    } else {
      btnToggleBrush.innerHTML = '✏️ 그리기 ON/OFF';
      btnToggleBrush.classList.remove('primary-btn');
      btnToggleBrush.classList.add('secondary-btn');
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
    playArcadeSound('card-select');
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
    playArcadeSound('card-select');
    const link = document.createElement('a');
    link.download = `Aero_Purikura_${Date.now()}.png`;
    link.href = finalResultImg.src;
    link.click();
  });

  // 처음부터 시작
  btnRestartApp.addEventListener('click', () => {
    playArcadeSound('card-select');
    capturedShots = [];
    userEmailInput.value = '';
    emailStatusMessage.innerText = '';
    drawCardsContainer.innerHTML = '';
    cardActionRow.style.display = 'none';
    slotMachineWrapper.classList.remove('hidden-away');

    slotBannerBadge.innerText = 'LUCKY SLOT MACHINE 🎰';
    slotBannerTitle.innerText = 'PULL LEVER TO SPIN!';
    slotBannerSub.innerText = '우측의 빨간 레버를 아래로 당겨 슬롯을 돌리세요!';

    goToStep(1);
  });
});
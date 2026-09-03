document.addEventListener('DOMContentLoaded', () => {
  let currentStep = 1;
  let selectedFrame = 'aqua-gloss';
  let capturedShots = [];
  let webcamStream = null;
  let fabricCanvas = null;
  let isDrawingMode = false;
  let activeColor = '#00f0ff';

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

  // 단계 전환 및 프로그레스 바 연동
  function goToStep(stepNumber) {
    currentStep = stepNumber;

    const percentage = stepNumber * 25;
    const progressBar = document.getElementById('main-progress-bar');
    const statusText = document.getElementById('progress-status-text');
    const percentText = document.getElementById('progress-percent-text');

    if (progressBar) progressBar.style.width = `${percentage}%`;
    if (statusText) statusText.innerText = `STEP ${stepNumber} / 4`;
    if (percentText) percentText.innerText = `${percentage}%`;

    document.querySelectorAll('.track-markers .marker').forEach((marker, idx) => {
      marker.classList.toggle('active', idx < stepNumber);
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

  // 프레임 선택
  document.querySelectorAll('.frame-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.frame-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      selectedFrame = card.dataset.frame;
    });
  });

  btnGotoCamera.addEventListener('click', () => goToStep(2));

  // 카메라 제어
  async function startCamera() {
    try {
      webcamStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false
      });
      webcamVideo.srcObject = webcamStream;
    } catch (err) {
      console.error('웹캠 권한 오류:', err);
      alert('카메라에 접근할 수 없습니다. 웹캠 권한을 허용했는지 확인해주세요!');
    }
  }

  function stopCamera() {
    if (webcamStream) {
      webcamStream.getTracks().forEach(t => t.stop());
      webcamStream = null;
    }
  }

  // 촬영 카운트다운
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

    const timer = setInterval(() => {
      count--;
      if (count > 0) {
        countdownDisplay.innerText = count;
      } else {
        clearInterval(timer);
        countdownDisplay.classList.remove('show');
        takeSingleShot(shotIndex);
        setTimeout(() => startRelayCapture(shotIndex + 1), 1200);
      }
    }, 1000);
  }

  // 비율 유지 크롭 및 뽀샤시 보정 촬영
  function takeSingleShot(index) {
    flashOverlay.classList.add('active');
    setTimeout(() => flashOverlay.classList.remove('active'), 150);

    const targetW = 600;
    const targetH = 780;

    const offCanvas = document.createElement('canvas');
    offCanvas.width = targetW;
    offCanvas.height = targetH;
    const ctx = offCanvas.getContext('2d');

    const vWidth = webcamVideo.videoWidth || 640;
    const vHeight = webcamVideo.videoHeight || 480;

    // 중앙 크롭 계산
    const targetAspect = targetW / targetH;
    const videoAspect = vWidth / vHeight;

    let sWidth, sHeight, sx, sy;
    if (videoAspect > targetAspect) {
      sHeight = vHeight;
      sWidth = vHeight * targetAspect;
      sx = (vWidth - sWidth) / 2;
      sy = 0;
    } else {
      sWidth = vWidth;
      sHeight = vWidth / targetAspect;
      sx = 0;
      sy = (vHeight - sHeight) / 2;
    }

    ctx.save();
    ctx.translate(targetW, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(webcamVideo, sx, sy, sWidth, sHeight, 0, 0, targetW, targetH);
    ctx.restore();

    // 뽀샤시 톤업 필터
    const imgData = ctx.getImageData(0, 0, targetW, targetH);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      let r = d[i];
      let g = d[i + 1];
      let b = d[i + 2];

      r = r + (255 - r) * 0.10 + 4;
      g = g + (255 - g) * 0.08 + 2;
      b = b + (255 - b) * 0.09 + 3;

      d[i] = Math.min(255, Math.max(0, r));
      d[i + 1] = Math.min(255, Math.max(0, g));
      d[i + 2] = Math.min(255, Math.max(0, b));
    }
    ctx.putImageData(imgData, 0, 0);

    // 소프트 블룸 필터 합성
    const bloomCanvas = document.createElement('canvas');
    bloomCanvas.width = targetW;
    bloomCanvas.height = targetH;
    const bCtx = bloomCanvas.getContext('2d');
    bCtx.drawImage(offCanvas, 0, 0);

    ctx.save();
    ctx.globalAlpha = 0.32;
    ctx.filter = 'blur(10px) brightness(1.12) contrast(95%)';
    ctx.drawImage(bloomCanvas, 0, 0);
    ctx.restore();

    // 은은한 핑크 필름 레이어
    ctx.save();
    ctx.fillStyle = 'rgba(255, 235, 240, 0.07)';
    ctx.fillRect(0, 0, targetW, targetH);
    ctx.restore();

    const shotData = offCanvas.toDataURL('image/png');
    capturedShots.push(shotData);
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
    if (capturedShots.length === 4) goToStep(3);
  });

  // Fabric.js 캔버스 초기화
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

  // 8종 프레임 테마 렌더링
  function drawPurikuraFrameBase() {
    const frameThemes = {
      'aqua-gloss': {
        bg: '#e2f4ff', border: '#0088eb', subBorder: '#a1dcff',
        title: '🫧 AERO VISTA 2006 🫧', tag: 'WINDOWS AERO GLASS EDITION'
      },
      'cyber-green': {
        bg: '#f0fdf0', border: '#2eb82e', subBorder: '#b3f0b3',
        title: '🍃 MEADOW BLISS 🍃', tag: 'ENERGY & NATURAL FUTURE'
      },
      'y2k-pink': {
        bg: '#fff0f5', border: '#ff4d94', subBorder: '#ffb3d1',
        title: '🎀 PURIKURA SWEET 🎀', tag: 'TOKYO SHIBUYA 2004 MEMORY'
      },
      'matrix-holo': {
        bg: '#161d26', border: '#00f0ff', subBorder: '#5c7cfa',
        title: '🌌 COSMO CYBER GLOW 🌌', tag: 'HOLOGRAM SPACE MATRIX'
      },
      'deep-marine': {
        bg: '#e0f7fa', border: '#0077b6', subBorder: '#90e0ef',
        title: '🐬 AQUA MARINE DOLPHIN 🐬', tag: 'OCEAN PARADISE BREEZE'
      },
      'silver-metal': {
        bg: '#f1f3f5', border: '#6c757d', subBorder: '#ced4da',
        title: '💿 MEDIA PLAYER METALLIC 💿', tag: 'CYBER CHROME DIGITAL SOUND'
      },
      'sun-citrus': {
        bg: '#fffde7', border: '#f59f00', subBorder: '#ffe066',
        title: '🍋 CITRUS ENERGY POP 🍋', tag: 'SUNSHINE VITAMIN BOOST'
      },
      'cyber-neon': {
        bg: '#1a0826', border: '#ff007f', subBorder: '#00f0ff',
        title: '⚡ HARANJUKU NEON POP ⚡', tag: 'CYBERPUNK GLOW NIGHT'
      }
    };

    const theme = frameThemes[selectedFrame] || frameThemes['aqua-gloss'];
    fabricCanvas.setBackgroundColor(theme.bg, fabricCanvas.renderAll.bind(fabricCanvas));

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

    const titleText = new fabric.Text(theme.title, {
      left: 240, top: 30, originX: 'center', fontSize: 16, fontWeight: 'bold',
      fill: theme.border, fontFamily: 'Segoe UI, sans-serif',
      shadow: new fabric.Shadow({ color: 'rgba(255,255,255,0.9)', blur: 4, offsetX: 1, offsetY: 1 }),
      selectable: false, evented: false
    });
    fabricCanvas.add(titleText);

    const slotW = 200, slotH = 260;
    const positions = [
      { left: 30, top: 65 },
      { left: 250, top: 65 },
      { left: 30, top: 350 },
      { left: 250, top: 350 }
    ];

    capturedShots.forEach((shotSrc, idx) => {
      if (idx < 4) {
        fabric.Image.fromURL(shotSrc, (img) => {
          img.set({
            left: positions[idx].left,
            top: positions[idx].top,
            scaleX: slotW / img.width,
            scaleY: slotH / img.height,
            selectable: false,
            evented: false,
            stroke: '#ffffff',
            strokeWidth: 4,
            rx: 10,
            ry: 10
          });
          fabricCanvas.add(img);
          fabricCanvas.sendToBack(img);
          fabricCanvas.renderAll();
        });
      }
    });

    const now = new Date();
    const dateStr = `${now.getFullYear()}.${String(now.getMonth()+1).padStart(2,'0')}.${String(now.getDate()).padStart(2,'0')}`;
    const dateText = new fabric.Text(`★ ${theme.tag} ★ ${dateStr}`, {
      left: 240, top: 670, originX: 'center', fontSize: 11, fontWeight: 'bold',
      fill: theme.border, fontFamily: 'Segoe UI, sans-serif',
      selectable: false, evented: false
    });
    fabricCanvas.add(dateText);
  }

  // 스티커 도구 제어
  document.querySelectorAll('.sticker-chip').forEach(chip => {
    chip.addEventListener('click', () => addStickerText(chip.dataset.val));
  });

  function addStickerText(content) {
    const isEmoji = content.length <= 4;
    const stickerText = new fabric.Text(content, {
      left: 240, top: 360, originX: 'center', originY: 'center',
      fontSize: isEmoji ? 44 : 22, fontWeight: '900',
      fill: isEmoji ? '#000000' : '#ffffff', stroke: isEmoji ? null : '#0078d7',
      strokeWidth: isEmoji ? 0 : 3, fontFamily: 'Segoe UI',
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
  btnFinishDeco.addEventListener('click', () => goToStep(4));

  function renderFinalExport() {
    fabricCanvas.discardActiveObject();
    fabricCanvas.renderAll();
    finalResultImg.src = fabricCanvas.toDataURL({ format: 'png', quality: 1.0, multiplier: 1.5 });
  }

  // 이메일 발송
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
    const link = document.createElement('a');
    link.download = `Aero_Purikura_${Date.now()}.png`;
    link.href = finalResultImg.src;
    link.click();
  });

  // 처음부터 시작
  btnRestartApp.addEventListener('click', () => {
    capturedShots = [];
    userEmailInput.value = '';
    emailStatusMessage.innerText = '';
    goToStep(1);
  });
});
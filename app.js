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

  function goToStep(stepNumber) {
    currentStep = stepNumber;
    document.querySelectorAll('.step-pill').forEach((pill, idx) => {
      pill.classList.toggle('active', idx + 1 === stepNumber);
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

  document.querySelectorAll('.frame-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.frame-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      selectedFrame = card.dataset.frame;
    });
  });

  btnGotoCamera.addEventListener('click', () => goToStep(2));

  async function startCamera() {
    try {
      webcamStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false
      });
      webcamVideo.srcObject = webcamStream;
    } catch (err) {
      console.error('웹캠 권한 오류:', err);
      alert('카메라에 접근할 수 없습니다. 권한을 확인해주세요!');
    }
  }

  function stopCamera() {
    if (webcamStream) {
      webcamStream.getTracks().forEach(t => t.stop());
      webcamStream = null;
    }
  }

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

  function takeSingleShot(index) {
    flashOverlay.classList.add('active');
    setTimeout(() => flashOverlay.classList.remove('active'), 150);

    const offCanvas = document.createElement('canvas');
    offCanvas.width = 400;
    offCanvas.height = 300;
    const ctx = offCanvas.getContext('2d');
    ctx.translate(offCanvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(webcamVideo, 0, 0, offCanvas.width, offCanvas.height);

    capturedShots.push(offCanvas.toDataURL('image/png'));
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
      'aqua-gloss': { bg: '#e2f4ff', border: '#0088eb', title: 'AERO VISTA 2006' },
      'cyber-green': { bg: '#eaffea', border: '#39c639', title: 'MEADOW BLISS' },
      'y2k-pink': { bg: '#fff0f5', border: '#ff66aa', title: 'PURIKURA SWEET' },
      'matrix-holo': { bg: '#1c2833', border: '#00e5ff', title: 'COSMO GLOW' }
    };
    const theme = frameThemes[selectedFrame] || frameThemes['aqua-gloss'];
    fabricCanvas.setBackgroundColor(theme.bg, fabricCanvas.renderAll.bind(fabricCanvas));

    const outerRect = new fabric.Rect({
      left: 10, top: 10, width: 460, height: 700, fill: 'transparent',
      stroke: theme.border, strokeWidth: 4, rx: 16, ry: 16, selectable: false, evented: false
    });
    fabricCanvas.add(outerRect);

    const titleText = new fabric.Text(`🫧 ${theme.title} 🫧`, {
      left: 240, top: 30, originX: 'center', fontSize: 16, fontWeight: 'bold',
      fill: theme.border, fontFamily: 'Segoe UI', selectable: false, evented: false
    });
    fabricCanvas.add(titleText);

    const slotW = 200, slotH = 260;
    const positions = [{ left: 30, top: 65 }, { left: 250, top: 65 }, { left: 30, top: 350 }, { left: 250, top: 350 }];

    capturedShots.forEach((shotSrc, idx) => {
      if (idx < 4) {
        fabric.Image.fromURL(shotSrc, (img) => {
          img.set({
            left: positions[idx].left, top: positions[idx].top,
            scaleX: slotW / img.width, scaleY: slotH / img.height,
            selectable: false, evented: false, stroke: '#ffffff', strokeWidth: 4, rx: 10, ry: 10
          });
          fabricCanvas.add(img);
          fabricCanvas.sendToBack(img);
          fabricCanvas.renderAll();
        });
      }
    });

    const now = new Date();
    const dateStr = `${now.getFullYear()}.${String(now.getMonth()+1).padStart(2,'0')}.${String(now.getDate()).padStart(2,'0')}`;
    const dateText = new fabric.Text(`AERO PURIKURA ★ ${dateStr}`, {
      left: 240, top: 670, originX: 'center', fontSize: 13, fontWeight: 'bold',
      fill: theme.border, fontFamily: 'Segoe UI', selectable: false, evented: false
    });
    fabricCanvas.add(dateText);
  }

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
    if (objects.length > 6) {
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

  btnDownloadDirect.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = `Aero_Purikura_${Date.now()}.png`;
    link.href = finalResultImg.src;
    link.click();
  });

  btnRestartApp.addEventListener('click', () => {
    capturedShots = [];
    userEmailInput.value = '';
    emailStatusMessage.innerText = '';
    goToStep(1);
  });
});

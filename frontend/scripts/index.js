document.addEventListener('DOMContentLoaded', async () => {
  const video = document.getElementById('video');
  const status = document.getElementById('status');
  const startCameraBtn = document.getElementById('startCameraBtn');
  const captureButton = document.getElementById('capturePhotoBtn');

  let cameraInitialized = false;

  async function initCameraAndModels() {
    if (cameraInitialized) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' }
      });
      video.srcObject = stream;
      console.log("✅ Camera initialized");
      if (status) status.textContent = "Camera ready.";
    } catch (err) {
      alert("Camera access denied or not available.");
      console.error("Camera error:", err);
      if (status) status.textContent = "Camera not available.";
      return;
    }

    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri('https://justadudewhohacks.github.io/face-api.js/models'),
      faceapi.nets.faceLandmark68Net.loadFromUri('https://justadudewhohacks.github.io/face-api.js/models'),
      faceapi.nets.faceRecognitionNet.loadFromUri('https://justadudewhohacks.github.io/face-api.js/models')
    ]);
    console.log("✅ Face API models loaded");

    // Load only what the page needs
    await import('./utils.js');
    await import('./storage.js');

    if (document.getElementById('loginBtn')) {
      console.log("🔐 Loading login logic...");
      await import('./login.js');
    }

    if (document.getElementById('saveUserBtn')) {
      console.log("📝 Loading registration logic...");
      await import('./register.js');
    }

    cameraInitialized = true;
  }

  // Enable camera from buttons
  startCameraBtn?.addEventListener('click', initCameraAndModels);
  captureButton?.addEventListener('click', initCameraAndModels);
});

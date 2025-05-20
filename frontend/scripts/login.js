import { euclideanDistance } from './utils.js';
import { sendToAPI } from './storage.js';

const video = document.getElementById('video');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const status = document.getElementById('status');

const successSound = new Audio('sounds/success.mp3');
const failSound = new Audio('sounds/fail.mp3');

let currentUser = null;

// ✅ Load models
await Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri('https://justadudewhohacks.github.io/face-api.js/models'),
  faceapi.nets.faceLandmark68Net.loadFromUri('https://justadudewhohacks.github.io/face-api.js/models'),
  faceapi.nets.faceRecognitionNet.loadFromUri('https://justadudewhohacks.github.io/face-api.js/models')
]);

startCamera();

function startCamera() {
  navigator.mediaDevices.getUserMedia({ video: {} }).then(stream => {
    video.srcObject = stream;
    video.play();
    if (status) status.textContent = '📸 Ready for face scan';
  }).catch(err => {
    console.error('Camera error:', err);
    alert("⚠️ Unable to access camera.");
  });
}

function stopCamera() {
  const stream = video?.srcObject;
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    video.srcObject = null;
  }
}

loginBtn.addEventListener('click', async () => {
  loginBtn.disabled = true;
  setTimeout(() => (loginBtn.disabled = false), 3000);

  const detection = await faceapi
    .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!detection) {
    alert("No face detected. Try again.");
    failSound.play();
    restartCameraWithNotice();
    return;
  }

  const descriptor = Array.from(detection.descriptor);
  const result = await sendToAPI('login', { descriptor });
  const matchedName = result.match;

  if (matchedName) {
    currentUser = matchedName;

    if (result.alreadyLoggedIn) {
      alert(`⚠️ You already have an open session.\nPlease log out before logging in again.`);
      failSound.play();
    } else {
      alert(`✅ Welcome back, ${matchedName}!\nLogin time: ${new Date().toLocaleTimeString()}`);
      successSound.play();
      try {
        await sendToAPI('attendance', { name: matchedName });
      } catch (err) {
        alert("⚠️ Could not save attendance.");
      }
    }

    const log = JSON.parse(localStorage.getItem('attendanceLog') || '[]');
    log.push({ name: matchedName, time: new Date().toLocaleString() });
    localStorage.setItem('attendanceLog', JSON.stringify(log));

    stopCamera();
    if (status) status.textContent = '✅ Logged in. Preparing for next user...';

    setTimeout(() => {
      if (status) status.textContent = '👤 Next person, please look at the camera...';
      startCamera();
    }, 3000);
  } else {
    alert("❌ No match found.");
    failSound.play();
    restartCameraWithNotice();
  }
});

logoutBtn?.addEventListener('click', async () => {
  const detection = await faceapi
    .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!detection) {
    alert("⚠️ No face detected. Try again.");
    failSound.play();
    restartCameraWithNotice();
    return;
  }

  const descriptor = Array.from(detection.descriptor);
  const result = await sendToAPI('login', { descriptor });

  const matchedName = result.match;
  const isLoggedIn = result.alreadyLoggedIn;

  if (!matchedName) {
    alert("❌ No match found.");
    failSound.play();
    restartCameraWithNotice();
    return;
  }

  if (!isLoggedIn) {
    alert(`⚠️ ${matchedName} is not currently logged in.`);
    failSound.play();
    restartCameraWithNotice();
    return;
  }

  const confirmLogout = confirm(`Log out ${matchedName}?`);
  if (!confirmLogout) return;

  const response = await sendToAPI('logout', { name: matchedName });
  if (response.success) {
    alert(`👋 ${matchedName} logged out successfully.`);
    successSound.play();
    currentUser = null;

    stopCamera();
    if (status) status.textContent = '✅ Logged out. Preparing for next user...';
    setTimeout(() => {
      if (status) status.textContent = '👤 Next person, please look at the camera...';
      startCamera();
    }, 3000);
  } else {
    alert(`❌ Logout failed: ${response.error}`);
    failSound.play();
    restartCameraWithNotice();
  }
});

function restartCameraWithNotice() {
  stopCamera();
  setTimeout(startCamera, 500);
}

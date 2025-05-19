import { euclideanDistance } from './utils.js';
import { sendToAPI } from './storage.js';

const canvas = document.getElementById('canvas');
const video = document.getElementById('video');
const snapshot = document.getElementById('snapshot');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const status = document.getElementById('status');

let currentUser = null; // Track logged-in user for logout

// Load face-api.js models once
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
    return;
  }

  const inputDescriptor = Array.from(detection.descriptor);
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  snapshot.src = canvas.toDataURL('image/jpeg');

  const result = await sendToAPI('login', { descriptor: inputDescriptor });
  const matchedName = result.match;
  const bestDistance = result.score;

  if (matchedName) {
    currentUser = matchedName;

    if (result.alreadyLoggedIn) {
      alert(`⚠️ You already have an open session.\nPlease log out before logging in again.`);
    } else {
      alert(`✅ Welcome back, ${matchedName}!\nLogin time: ${new Date().toLocaleTimeString()}`);

      try {
        await sendToAPI('attendance', { name: matchedName });
      } catch (err) {
        console.error('[ATTENDANCE API ERROR]', err);
        alert("⚠️ Could not save attendance.");
      }
    }

    const log = JSON.parse(localStorage.getItem('attendanceLog') || '[]');
    log.push({
      name: matchedName,
      time: new Date().toLocaleString()
    });
    localStorage.setItem('attendanceLog', JSON.stringify(log));

    stopCamera(); // ✅ Prevent stuck video
    if (status) status.textContent = '✅ Logged in. Preparing for next user...';

    setTimeout(() => {
      if (status) status.textContent = '👤 Next person, please look at the camera...';
      startCamera(); // ✅ Restart for next person
    }, 3000);
  } else {
    alert("❌ No match found.");
  }
});

logoutBtn?.addEventListener('click', async () => {
  const detection = await faceapi
    .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!detection) {
    alert("⚠️ No face detected. Try again.");
    return;
  }

  const inputDescriptor = Array.from(detection.descriptor);
  const result = await sendToAPI('login', { descriptor: inputDescriptor });

  const matchedName = result.match;
  const isLoggedIn = result.alreadyLoggedIn;

  if (!matchedName) {
    alert("❌ No match found. Please try again.");
    return;
  }

  if (!isLoggedIn) {
    alert(`⚠️ ${matchedName} is not currently logged in.\nLogout cancelled.`);
    return;
  }

  const confirmLogout = confirm(`Log out ${matchedName}?`);
  if (!confirmLogout) return;

  const response = await sendToAPI('logout', { name: matchedName });

  if (response.success) {
    alert(`👋 ${matchedName} logged out successfully.`);
    if (currentUser === matchedName) currentUser = null;
  } else {
    alert(`❌ Logout failed: ${response.error}`);
  }
});

import { euclideanDistance } from './utils.js';
import { sendToAPI } from './storage.js';

const video = document.getElementById('video');
const capturePhotoBtn = document.getElementById('capturePhotoBtn');
const saveUserBtn = document.getElementById('saveUserBtn');
const usernameInput = document.getElementById('username');
const departmentSelect = document.getElementById('department');
const joinDateInput = document.getElementById('joinDate');
const photoCount = document.getElementById('photoCount');
const status = document.getElementById('status');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');

// 🔊 Sound elements
const soundSuccess = new Audio('sounds/success.mp3');
const soundFail = new Audio('sounds/fail.mp3');

let descriptors = [];
let snapshots = [];
let isCapturing = false;
let isLoggingIn = false;
let isLoggingOut = false;

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
    if (status) status.textContent = '📸 Camera ready for registration';
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

function restartCameraWithNotice() {
  stopCamera();
  setTimeout(startCamera, 500);
}

function validateFormInputs() {
  const isReady =
    usernameInput.value.trim() &&
    departmentSelect.value &&
    joinDateInput.value &&
    descriptors.length === 3;
  saveUserBtn.disabled = !isReady;
}

usernameInput?.addEventListener('input', validateFormInputs);
departmentSelect?.addEventListener('change', validateFormInputs);
joinDateInput?.addEventListener('input', validateFormInputs);

capturePhotoBtn?.addEventListener('click', async () => {
  if (isCapturing) return;
  isCapturing = true;

  const username = usernameInput.value.trim();
  if (!username) {
    alert("Please enter a name before capturing photos.");
    isCapturing = false;
    return;
  }
  if (descriptors.length >= 3) {
    alert("You already have 3 photos. Click 'Save Registered Face'.");
    isCapturing = false;
    return;
  }

  const detection = await faceapi
    .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!detection) {
    alert("No face detected. Try again.");
    soundFail.play();
    isCapturing = false;
    restartCameraWithNotice();
    return;
  }

  const descriptor = Array.from(detection.descriptor);
  descriptors.push(descriptor);

  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const imageData = canvas.toDataURL('image/jpeg');
  snapshots.push(imageData);

  photoCount.textContent = descriptors.length;
  status.textContent = `✅ Photo ${descriptors.length} captured.`;
  validateFormInputs();

  if (descriptors.length === 3) {
    saveUserBtn.disabled = false;
    status.textContent = "✅ 3 photos captured. You can now save.";
  }

  isCapturing = false;
});

saveUserBtn?.addEventListener('click', async () => {
  const name = usernameInput.value.trim();
  const department = departmentSelect.value;
  const joinDateRaw = joinDateInput?.value;
  const joinDate = joinDateRaw ? new Date(joinDateRaw).toISOString() : '';

  if (!name || !department || descriptors.length !== 3) {
    alert("Please complete all fields and capture 3 photos.");
    return;
  }

  const result = await sendToAPI('register', {
    name,
    department,
    joinDate,
    descriptors,
    snapshots
  });

  if (result.success) {
    alert(`✅ Face data for '${name}' has been saved to the database.`);
    soundSuccess.play();
    descriptors = [];
    snapshots = [];
    photoCount.textContent = "0";
    saveUserBtn.disabled = true;
    status.textContent = "✅ Registration complete! Ready for next.";
    departmentSelect.value = "";
    usernameInput.value = "";
    joinDateInput.value = "";
  } else {
    alert(`❌ Failed to register: ${result.error || 'Unknown error'}`);
    soundFail.play();
    restartCameraWithNotice();
  }
});

loginBtn?.addEventListener('click', async () => {
  if (isLoggingIn || isLoggingOut) return;
  isLoggingIn = true;

  const detection = await faceapi
    .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!detection) {
    alert("No face detected. Try again.");
    soundFail.play();
    isLoggingIn = false;
    restartCameraWithNotice();
    return;
  }

  const descriptor = Array.from(detection.descriptor);
  const result = await sendToAPI('login', { descriptor });
  const matchedName = result.match;

  if (matchedName) {
    if (result.alreadyLoggedIn) {
      alert(`⚠️ You already have an open session.\nPlease log out before logging in again.`);
      soundFail.play();
    } else {
      alert(`✅ Welcome back, ${matchedName}!\nLogin time: ${new Date().toLocaleTimeString()}`);
      soundSuccess.play();
      try {
        await sendToAPI('attendance', { name: matchedName });
      } catch (err) {
        alert("⚠️ Could not save attendance.");
      }
    }
    stopCamera();
    setTimeout(() => {
      startCamera();
    }, 500);
  } else {
    alert("❌ No match found.");
    soundFail.play();
    restartCameraWithNotice();
  }

  isLoggingIn = false;
});

logoutBtn?.addEventListener('click', async () => {
  if (isLoggingOut || isLoggingIn) return;
  isLoggingOut = true;

  const detection = await faceapi
    .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!detection) {
    alert("⚠️ No face detected. Try again.");
    soundFail.play();
    isLoggingOut = false;
    restartCameraWithNotice();
    return;
  }

  const descriptor = Array.from(detection.descriptor);
  const result = await sendToAPI('login', { descriptor });

  const matchedName = result.match;
  const isLoggedIn = result.alreadyLoggedIn;

  if (!matchedName) {
    alert("❌ No match found.");
    soundFail.play();
    isLoggingOut = false;
    restartCameraWithNotice();
    return;
  }

  if (!isLoggedIn) {
    alert(`⚠️ ${matchedName} is not currently logged in.`);
    soundFail.play();
    isLoggingOut = false;
    restartCameraWithNotice();
    return;
  }

  const confirmLogout = confirm(`Log out ${matchedName}?`);
  if (!confirmLogout) {
    isLoggingOut = false;
    return;
  }

  const response = await sendToAPI('logout', { name: matchedName });
  if (response.success) {
    alert(`👋 ${matchedName} logged out successfully.`);
    soundSuccess.play();
    stopCamera();
    setTimeout(() => {
      startCamera();
    }, 500);
  } else {
    alert(`❌ Logout failed: ${response.error}`);
    soundFail.play();
    restartCameraWithNotice();
  }

  isLoggingOut = false;
});
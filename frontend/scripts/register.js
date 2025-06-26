// register.js

import * as faceapi from 'https://cdn.skypack.dev/face-api.js';
import { euclideanDistance } from './utils.js';
import { sendToAPI } from './storage.js';

const video = document.getElementById('video');
const capturePhotoBtn = document.getElementById('capturePhotoBtn');
const saveUserBtn = document.getElementById('saveUserBtn');
const usernameInput = document.getElementById('username');
const departmentSelect = document.getElementById('department');
const joinDateInput = document.getElementById('joinDate');
const isPartTimeSelect = document.getElementById('isPartTime');
const weeklyWorkingDaysSelect = document.getElementById('weeklyWorkingDays');
const workingDaysContainer = document.getElementById('workingDaysContainer');
const photoCount = document.getElementById('photoCount');
const status = document.getElementById('status');

const soundSuccess = new Audio('sounds/success.mp3');
const soundFail = new Audio('sounds/fail.mp3');

let descriptors = [];
let snapshots = [];
let isCapturing = false;

// ✅ Load models before anything
await Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri('https://justadudewhohacks.github.io/face-api.js/models'),
  faceapi.nets.faceLandmark68Net.loadFromUri('https://justadudewhohacks.github.io/face-api.js/models'),
  faceapi.nets.faceRecognitionNet.loadFromUri('https://justadudewhohacks.github.io/face-api.js/models')
]);

startCamera();
document.getElementById('spinner').style.display = 'none';

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
  const spinner = document.getElementById('spinner');
  const captureBtn = document.getElementById('capturePhotoBtn');
  spinner.style.display = 'flex';
  captureBtn.disabled = true;

  stopCamera();

  setTimeout(() => {
    startCamera();
    spinner.style.display = 'none';
    captureBtn.disabled = false;
  }, 800); // slightly longer wait for safety
}

function validateFormInputs() {
  const isPartTime = isPartTimeSelect.value === 'true';
  const isReady =
    usernameInput.value.trim() &&
    departmentSelect.value &&
    joinDateInput.value &&
    (!isPartTime || weeklyWorkingDaysSelect.value) &&
    descriptors.length === 3;

  saveUserBtn.disabled = !isReady;
}

usernameInput?.addEventListener('input', validateFormInputs);
departmentSelect?.addEventListener('change', validateFormInputs);
joinDateInput?.addEventListener('input', validateFormInputs);
isPartTimeSelect?.addEventListener('change', () => {
  const isPartTime = isPartTimeSelect.value === 'true';
  workingDaysContainer.style.display = isPartTime ? 'block' : 'none';
  validateFormInputs();
});
weeklyWorkingDaysSelect?.addEventListener('change', validateFormInputs);

capturePhotoBtn?.addEventListener('click', async () => {
  if (isCapturing) return;
  isCapturing = true;

  photoCount.textContent = descriptors.length; // 🧼 force UI sync at click

  try {
    // all your face detection logic here
    const username = usernameInput.value.trim();
    if (!username) {
      alert("Please enter a name before capturing photos.");
      return;
    }

    if (descriptors.length >= 3) {
      alert("You already have 3 photos. Click 'Save Registered Face'.");
      return;
    }

console.log("🟡 Starting face detection...");
let detection;

try {
  const detectionPromise = faceapi
    .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptor();

  detection = await Promise.race([
    detectionPromise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Face detection timed out")), 3000)
    )
  ]);

if (!detection || !detection.descriptor || !Array.isArray(detection.descriptor)) {
  console.warn("⚠️ No valid face descriptor returned.");
  alert("No face detected. Try again.");
  soundFail.play();
  restartCameraWithNotice();
  validateFormInputs();
  isCapturing = false; // 🛠️ allow retries
  return;
}

} catch (err) {
  console.error("❌ Face detection failed or timed out:", err);
  alert("⚠️ Face detection failed or timed out. Try again.");
  soundFail.play();
  isCapturing = false; // 🔧 added line
  restartCameraWithNotice();
  validateFormInputs(); // 🛠️ keep UI state in sync
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

  } finally {
    // Always re-enable capture even if something fails
    isCapturing = false;
  }
});

saveUserBtn?.addEventListener('click', async () => {
  const name = usernameInput.value.trim();
  const department = departmentSelect.value;
  const joinDateRaw = joinDateInput?.value;
  const joinDate = joinDateRaw ? new Date(joinDateRaw).toISOString() : '';
  const isPartTime = isPartTimeSelect.value === 'true';
  const weeklyWorkingDays = isPartTime ? Number(weeklyWorkingDaysSelect.value) : 5;

  if (!name || !department || !joinDate || descriptors.length !== 3) {
    alert("Please complete all fields and capture 3 photos.");
    return;
  }

  document.getElementById('spinner').style.display = 'flex';
  const result = await sendToAPI('register', {
    name,
    department,
    joinDate,
    descriptors,
    snapshots,
    isPartTime,
    weeklyWorkingDays
  });


  if (result.success) {
    document.getElementById('spinner').style.display = 'none';
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
    isPartTimeSelect.value = "false";
    weeklyWorkingDaysSelect.value = "1";
    workingDaysContainer.style.display = "none";
  } else {
    document.getElementById('spinner').style.display = 'none';
    alert(`❌ Failed to register: ${result.error || 'Unknown error'}`);
    soundFail.play();
    restartCameraWithNotice();
  }
});

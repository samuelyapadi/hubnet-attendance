import { euclideanDistance } from './utils.js';
import { sendToAPI } from './storage.js';

const video = document.getElementById('video');
const snapshot = document.getElementById('snapshot');
const status = document.getElementById('status');
const photoCount = document.getElementById('photoCount');
const capturePhotoBtn = document.getElementById('capturePhotoBtn');
const saveUserBtn = document.getElementById('saveUserBtn');
const usernameInput = document.getElementById('username');
const departmentSelect = document.getElementById('department');
const joinDateInput = document.getElementById('joinDate');

let descriptors = [];
let snapshots = [];

// ✅ Load face-api models
await Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri('https://justadudewhohacks.github.io/face-api.js/models'),
  faceapi.nets.faceLandmark68Net.loadFromUri('https://justadudewhohacks.github.io/face-api.js/models'),
  faceapi.nets.faceRecognitionNet.loadFromUri('https://justadudewhohacks.github.io/face-api.js/models')
]);

startCamera();

// ✅ Camera helpers
function startCamera() {
  navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
    video.srcObject = stream;
    video.play();
    if (status) status.textContent = '📸 Ready to capture face photo';
  }).catch(err => {
    alert("Failed to access camera: " + err.message);
  });
}

function stopCamera() {
  const stream = video?.srcObject;
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    video.srcObject = null;
  }
}

// ✅ Form validation
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

// ✅ Capture photo
capturePhotoBtn?.addEventListener('click', async () => {
  const username = usernameInput.value.trim();
  if (!username) {
    alert("Please enter a name before capturing photos.");
    return;
  }
  if (descriptors.length >= 3) {
    alert("You already have 3 photos. Click 'Save Registered Face'.");
    return;
  }

  const detection = await faceapi
    .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!detection) {
    alert("No face detected. Try again.");
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
  snapshot.src = imageData;
  snapshots.push(imageData);

  photoCount.textContent = descriptors.length;
  status.textContent = `✅ Photo ${descriptors.length} captured.`;
  validateFormInputs();

  if (descriptors.length === 3) {
    saveUserBtn.disabled = false;
    status.textContent = "✅ 3 photos captured. You can now save.";
  }
});

// ✅ Save user
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

    // Reset state
    descriptors = [];
    snapshots = [];
    photoCount.textContent = "0";
    saveUserBtn.disabled = true;
    departmentSelect.value = "";
    usernameInput.value = "";
    joinDateInput.value = "";
    delete joinDateInput.dataset.iso;

    // Stop camera & show message
    stopCamera();
    status.textContent = "✅ Registration complete! Preparing for next...";

    // Restart camera after delay
    setTimeout(() => {
      status.textContent = "👤 Ready for next registration.";
      startCamera();
    }, 3000);
  } else {
    alert(`❌ Failed to register: ${result.error || 'Unknown error'}`);
  }
});

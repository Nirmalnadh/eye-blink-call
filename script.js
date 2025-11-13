let blinkCount = 0;
let lastBlinkTime = 0;

const blinkThreshold = 0.25;   // Eye closed ratio threshold
const cooldown = 0.3;          // Minimum time between two blinks (seconds)
const commandTimeout = 2.0;    // Time window to detect multiple blinks
const callNumber = "9949790005"; // Replace with your number

const video = document.getElementById("video");
const statusText = document.getElementById("status");

// ---- Initialize Camera ----
async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
      audio: false
    });
    video.srcObject = stream;
    statusText.innerText = "Camera active. Blink twice to call or thrice to send message.";
  } catch (err) {
    console.error("Camera Error:", err);
    statusText.innerText = "❌ Unable to access camera: " + err.message;
  }
}

startCamera();

// ---- Initialize MediaPipe FaceMesh ----
const faceMesh = new FaceMesh({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
});

faceMesh.setOptions({
  maxNumFaces: 1,
  refineLandmarks: true,
  minDetectionConfidence: 0.6,
  minTrackingConfidence: 0.6,
});

const LEFT_EYE = [33, 160, 158, 133, 153, 144];
const RIGHT_EYE = [362, 385, 387, 263, 373, 380];

function getDistance(p1, p2) {
  return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
}

function getBlinkRatio(landmarks, eye) {
  const top = getDistance(landmarks[eye[1]], landmarks[eye[5]]);
  const bottom = getDistance(landmarks[eye[2]], landmarks[eye[4]]);
  const vertical = (top + bottom) / 2;
  const horizontal = getDistance(landmarks[eye[0]], landmarks[eye[3]]);
  return vertical / horizontal;
}

// ---- Blink Detection Logic ----
faceMesh.onResults((results) => {
  if (!results.multiFaceLandmarks) return;

  const face = results.multiFaceLandmarks[0];
  const left = getBlinkRatio(face, LEFT_EYE);
  const right = getBlinkRatio(face, RIGHT_EYE);
  const ratio = (left + right) / 2;
  const now = performance.now() / 1000;

  // Detect blink
  if (ratio < blinkThreshold && (now - lastBlinkTime) > cooldown) {
    blinkCount++;
    lastBlinkTime = now;
    statusText.innerText = `Blink ${blinkCount}`;
  }

  // Check for command
  if (blinkCount > 0 && (now - lastBlinkTime) > commandTimeout) {
    if (blinkCount === 2) {
      statusText.innerText = `📞 Calling ${callNumber}...`;
      setTimeout(() => {
        window.location.href = `tel:${callNumber}`;
      }, 600);
    } else if (blinkCount === 3) {
      statusText.innerText = `✉️ Sending message to ${callNumber}...`;
      setTimeout(() => {
        window.location.href = `sms:${callNumber}?body=I need assistance.`;
      }, 600);
    } else {
      statusText.innerText = `Detected ${blinkCount} blinks (no action)`;
    }
    blinkCount = 0;
  }
});

// ---- Start MediaPipe Camera ----
const camera = new Camera(video, {
  onFrame: async () => {
    await faceMesh.send({ image: video });
  },
  width: 320,
  height: 240,
});

camera.start();

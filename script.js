let blinkCount = 0;
let lastBlinkTime = 0;
let stableFrames = 0;
let ratioHistory = [];
const blinkThreshold = 0.22;
const cooldown = 0.5;
const commandTimeout = 2.5;
const callNumber = "9949790005";
const maxHistory = 3;

const video = document.getElementById("video");
const statusText = document.getElementById("status");

navigator.mediaDevices
  .getUserMedia({ video: true })
  .then((stream) => {
    video.srcObject = stream;
  })
  .catch((err) => {
    statusText.innerText = "❌ Camera feed not accessible";
    console.error(err);
  });

const faceMesh = new FaceMesh({
  locateFile: (file) =>
    `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
});

faceMesh.setOptions({
  maxNumFaces: 1,
  refineLandmarks: true,
  minDetectionConfidence: 0.7,
  minTrackingConfidence: 0.7,
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

faceMesh.onResults((results) => {
  if (!results.multiFaceLandmarks) return;

  const face = results.multiFaceLandmarks[0];
  const left = getBlinkRatio(face, LEFT_EYE);
  const right = getBlinkRatio(face, RIGHT_EYE);
  const ratio = (left + right) / 2;
  const now = performance.now() / 1000;

  ratioHistory.push(ratio);
  if (ratioHistory.length > maxHistory) ratioHistory.shift();
  const avgRatio = ratioHistory.reduce((a, b) => a + b, 0) / ratioHistory.length;

  if (avgRatio > 0.5) return;

  if (avgRatio < blinkThreshold) {
    stableFrames++;
  } else {
    stableFrames = 0;
  }

  if (stableFrames > 2 && now - lastBlinkTime > cooldown) {
    blinkCount++;
    lastBlinkTime = now;
    stableFrames = 0;
    statusText.innerText = `👁️ Blink ${blinkCount}`;
  }

  if (blinkCount > 0 && (now - lastBlinkTime) > commandTimeout) {
  if (blinkCount === 2) {
    statusText.innerText = `📞 Calling ${callNumber}...`;
    
    // Delay and trigger call properly for mobile browsers
    setTimeout(() => {
      const link = document.createElement("a");
      link.href = `tel:${callNumber}`;
      link.click();
    }, 1000);
  } else {
    statusText.innerText = `Detected ${blinkCount} blinks`;
  }
  blinkCount = 0;
}

});

const camera = new Camera(video, {
  onFrame: async () => {
    await faceMesh.send({ image: video });
  },
  width: 300,
  height: 220,
});
camera.start();

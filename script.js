<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Eye Blink Controlled Calling System</title>

  <!-- Load MediaPipe FaceMesh and Camera Utils -->
  <script src="https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js"></script>

  <style>
    body {
      background-color: #f7f7f7;
      text-align: center;
      font-family: "Segoe UI", sans-serif;
      margin-top: 30px;
    }
    h2 {
      color: #222;
      margin-bottom: 10px;
    }
    video {
      border: 3px solid #444;
      border-radius: 12px;
    }
    #status {
      margin-top: 15px;
      font-size: 18px;
      color: #333;
      font-weight: 500;
    }
  </style>
</head>
<body>
  <h2>Eye Blink Controlled Calling System</h2>
  <video id="video" autoplay muted playsinline width="320" height="240"></video>
  <div id="status">Initializing camera...</div>

  <script>
    let blinkCount = 0;
    let lastBlinkTime = 0;
    let stableFrames = 0;
    let ratioHistory = [];

    const blinkThreshold = 0.22;     // Eye aspect ratio threshold
    const cooldown = 0.5;            // Minimum time between blinks (seconds)
    const commandTimeout = 2.5;      // Time window for detecting double blink
    const callNumber = "9949790005"; // Your preset number
    const maxHistory = 3;

    const video = document.getElementById("video");
    const statusText = document.getElementById("status");

    // ✅ Initialize Webcam — NO Arduino, just MediaPipe
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(stream => {
        video.srcObject = stream;
        statusText.innerText = "Camera active. Please look straight.";
      })
      .catch(err => {
        statusText.innerText = "Camera access denied or not found.";
        console.error(err);
      });

    // ✅ Initialize MediaPipe FaceMesh
    const faceMesh = new FaceMesh({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });

    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.7,
    });

    // Eye landmark points (from MediaPipe docs)
    const LEFT_EYE = [33, 160, 158, 133, 153, 144];
    const RIGHT_EYE = [362, 385, 387, 263, 373, 380];

    // Helper: Distance between two points
    function getDistance(p1, p2) {
      return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
    }

    // Helper: Eye aspect ratio (vertical/horizontal)
    function getBlinkRatio(landmarks, eye) {
      const top = getDistance(landmarks[eye[1]], landmarks[eye[5]]);
      const bottom = getDistance(landmarks[eye[2]], landmarks[eye[4]]);
      const vertical = (top + bottom) / 2;
      const horizontal = getDistance(landmarks[eye[0]], landmarks[eye[3]]);
      return vertical / horizontal;
    }

    // ✅ Blink Detection + Action
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

      if (avgRatio > 0.5) return; // eyes open

      if (avgRatio < blinkThreshold) {
        stableFrames++;
      } else {
        stableFrames = 0;
      }

      // Detect blink
      if (stableFrames > 2 && now - lastBlinkTime > cooldown) {
        blinkCount++;
        lastBlinkTime = now;
        stableFrames = 0;
        statusText.innerText = `Blink Count: ${blinkCount}`;
      }

      // If timeout passed → execute command
      if (blinkCount > 0 && (now - lastBlinkTime) > commandTimeout) {
        if (blinkCount === 2) {
          statusText.innerText = `Calling ${callNumber}...`;
          setTimeout(() => {
            const link = document.createElement("a");
            link.href = `tel:${callNumber}`;
            link.click();
          }, 800);
        } else {
          statusText.innerText = `Detected ${blinkCount} blinks (no action)`;
        }
        blinkCount = 0;
      }
    });

    // ✅ Start camera feed
    const camera = new Camera(video, {
      onFrame: async () => {
        await faceMesh.send({ image: video });
      },
      width: 320,
      height: 240,
    });
    camera.start();
  </script>
</body>
</html>

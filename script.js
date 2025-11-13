<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Eye Blink Controlled Calling System</title>

  <script src="https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js"></script>

  <style>
    body {
      font-family: Arial, sans-serif;
      text-align: center;
      background: #f8f9fa;
      margin-top: 30px;
    }
    video {
      border: 2px solid #333;
      border-radius: 10px;
    }
    #status {
      margin-top: 15px;
      font-size: 18px;
      color: #111;
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

    const blinkThreshold = 0.25;  // Ratio threshold when eyes closed
    const cooldown = 0.3;         // Min time between blinks (seconds)
    const commandTimeout = 2;     // Time window for counting blinks
    const callNumber = "9949790005"; // Replace with your number

    const video = document.getElementById("video");
    const statusText = document.getElementById("status");

    // ✅ Initialize camera feed (no Arduino, just webcam)
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "user" }, audio: false })
      .then(stream => {
        video.srcObject = stream;
        statusText.innerText = "Camera feed active. Blink twice to call.";
      })
      .catch(err => {
        statusText.innerText = "Camera access denied: " + err.message;
        console.error(err);
      });

    // ✅ Setup MediaPipe FaceMesh
    const faceMesh = new FaceMesh({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });

    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    const LEFT_EYE = [33, 160, 158, 133, 153, 144];
    const RIGHT_EYE = [362, 385, 387, 263, 373, 380];

    // Helper: Distance between two landmark points
    function getDistance(p1, p2) {
      return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
    }

    // Helper: Calculate blink ratio (vertical/horizontal)
    function getBlinkRatio(landmarks, eye) {
      const top = getDistance(landmarks[eye[1]], landmarks[eye[5]]);
      const bottom = getDistance(landmarks[eye[2]], landmarks[eye[4]]);
      const vertical = (top + bottom) / 2;
      const horizontal = getDistance(landmarks[eye[0]], landmarks[eye[3]]);
      return vertical / horizontal;
    }

    // ✅ Blink detection logic
    faceMesh.onResults(results => {
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

      // Execute command after timeout
      if (blinkCount > 0 && (now - lastBlinkTime) > commandTimeout) {
        if (blinkCount === 2) {
          statusText.innerText = `📞 Calling ${callNumber}...`;
          setTimeout(() => {
            window.location.href = `tel:${callNumber}`;
          }, 500);
        } else {
          statusText.innerText = `Detected ${blinkCount} blinks (no action)`;
        }
        blinkCount = 0;
      }
    });

    // ✅ Start camera stream for MediaPipe
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

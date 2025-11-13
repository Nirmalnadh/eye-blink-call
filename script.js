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
        text-align: center;
        font-family: Arial, sans-serif;
        background: #f8f8f8;
        padding: 20px;
      }
      video {
        border: 2px solid #333;
        border-radius: 10px;
      }
      #status {
        margin-top: 15px;
        font-size: 1.2rem;
        color: #222;
      }
    </style>
  </head>
  <body>
    <h2>Eye Blink Controlled Calling System</h2>
    <video id="video" autoplay muted width="320" height="240"></video>
    <div id="status">Initializing camera...</div>

    <script>
      let blinkCount = 0;
      let lastBlinkTime = 0;
      let stableFrames = 0;
      let ratioHistory = [];

      const blinkThreshold = 0.22;
      const cooldown = 0.5;          // seconds between blinks
      const commandTimeout = 2.5;    // seconds to count multiple blinks
      const callNumber = "9949790005";
      const maxHistory = 3;

      const video = document.getElementById("video");
      const statusText = document.getElementById("status");

      // Start webcam
      navigator.mediaDevices
        .getUserMedia({ video: true })
        .then((stream) => (video.srcObject = stream))
        .catch((err) => {
          statusText.innerText = "Camera not accessible.";
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
        const avgRatio =
          ratioHistory.reduce((a, b) => a + b, 0) / ratioHistory.length;

        // Ignore if eyes open
        if (avgRatio > 0.5) return;

        // Detect eye closed frames
        if (avgRatio < blinkThreshold) {
          stableFrames++;
        } else {
          stableFrames = 0;
        }

        // Count blink
        if (stableFrames > 2 && now - lastBlinkTime > cooldown) {
          blinkCount++;
          lastBlinkTime = now;
          stableFrames = 0;
          statusText.innerText = `Blink Count: ${blinkCount}`;
        }

        // After timeout, check number of blinks
        if (blinkCount > 0 && now - lastBlinkTime > commandTimeout) {
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

      // Start camera feed to MediaPipe
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

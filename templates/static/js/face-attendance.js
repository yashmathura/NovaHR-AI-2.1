(() => {
  const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';
  let stream = null;
  let modelsReady = false;
  let enrollEmployeeId = null;

  const byId = id => document.getElementById(id);
  const setText = (id, text) => { const el = byId(id); if (el) el.textContent = text; };
  async function loadModels() {
    if (modelsReady) return;
    if (!window.faceapi) throw new Error('Face recognition library did not load. Check your internet connection and reload.');
    setText('camera-status', 'Loading face recognition models…');
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
    ]);
    modelsReady = true;
  }
  async function startCamera(videoId, statusId) {
    const video = byId(videoId);
    if (!video) throw new Error('Camera preview is not available on this page.');
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera access requires localhost or HTTPS in a supported browser.');
    if (stream) stream.getTracks().forEach(t => t.stop());
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
    video.srcObject = stream;
    await video.play();
    setText(statusId, 'Camera is live. Look straight at the camera in good light.');
    await loadModels();
  }
  async function capture(videoId, canvasId) {
    await loadModels();
    const video = byId(videoId), canvas = byId(canvasId);
    if (!video || !video.videoWidth) throw new Error('Start the camera first.');
    const result = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.55 })).withFaceLandmarks().withFaceDescriptor();
    if (!result) throw new Error('No clear face detected. Move closer, improve lighting, and try again.');
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    return { photo: canvas.toDataURL('image/jpeg', 0.88), descriptor: Array.from(result.descriptor) };
  }
  function csrf() {
    const match = document.cookie.match(/(?:^|; )csrftoken=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
  }
  async function enroll(employeeId, photo, descriptor) {
    const form = new URLSearchParams({ photo_data: photo, descriptor: JSON.stringify(descriptor) });
    const response = await fetch(`/employees/${encodeURIComponent(employeeId)}/face-enroll/`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-CSRFToken': csrf() }, body: form });
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.error || 'Face enrollment failed.');
    return data;
  }
  async function getPosition() {
    if (!navigator.geolocation) throw new Error('This browser does not support location services.');
    setText('gps-status', 'Requesting device location permission…');
    return new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, err => reject(new Error(err.code === 1 ? 'Location permission denied. Allow location access and retry.' : 'Unable to read GPS location. Check device location settings and retry.')), { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }));
  }
  async function punch(action) {
    const button = byId(action === 'check_in' ? 'face-check-in' : 'face-check-out');
    try {
      if (button) button.disabled = true;
      setText('face-status', 'Verifying live face…');
      const face = await capture('attendance-video', 'attendance-canvas');
      setText('face-status', 'Face detected. Verifying GPS location…');
      const pos = await getPosition();
      setText('gps-status', `Location acquired (accuracy ±${Math.round(pos.coords.accuracy)} m).`);
      const form = new URLSearchParams({ action, descriptor: JSON.stringify(face.descriptor), latitude: String(pos.coords.latitude), longitude: String(pos.coords.longitude), accuracy: String(pos.coords.accuracy) });
      const response = await fetch('/attendance/face/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-CSRFToken': csrf() }, body: form });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || 'Attendance could not be recorded.');
      setText('face-status', data.message);
      alert(`${data.message}\nGPS: ${data.latitude}, ${data.longitude}`);
      window.location.reload();
    } catch (err) {
      setText('face-status', err.message || 'Face attendance failed.');
      if (button) button.disabled = false;
    }
  }
  document.addEventListener('DOMContentLoaded', () => {
    const modal = byId('face-enroll-modal');
    document.querySelectorAll('.face-enroll-open').forEach(btn => btn.addEventListener('click', async () => {
      enrollEmployeeId = btn.dataset.employee;
      if (modal) modal.hidden = false;
      setText('face-enroll-label', `Enrolling: ${btn.dataset.name || enrollEmployeeId}`);
      setText('face-enroll-status', 'Starting camera and loading face models…');
      try { await startCamera('face-enroll-video', 'face-enroll-status'); } catch (err) { setText('face-enroll-status', err.message); }
    }));
    byId('face-enroll-close')?.addEventListener('click', () => { if (modal) modal.hidden = true; if (stream) stream.getTracks().forEach(t => t.stop()); stream = null; });
    byId('face-enroll-capture')?.addEventListener('click', async () => {
      const btn = byId('face-enroll-capture'); btn.disabled = true;
      try {
        setText('face-enroll-status', 'Detecting face and saving profile…');
        const data = await capture('face-enroll-video', 'face-enroll-canvas');
        const saved = await enroll(enrollEmployeeId, data.photo, data.descriptor);
        setText('face-enroll-status', saved.message + ' Refreshing…');
        window.location.reload();
      } catch (err) { setText('face-enroll-status', err.message || 'Could not save face profile.'); }
      finally { btn.disabled = false; }
    });
    byId('camera-start')?.addEventListener('click', async () => { try { await startCamera('attendance-video', 'camera-status'); } catch (err) { setText('camera-status', err.message); } });
    // When NovaHR sends the user here from the AI Agent, open the live face terminal automatically.
    if (new URLSearchParams(window.location.search).get('face') === '1' && byId('attendance-video')) {
      document.getElementById('attendance-video')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      try { await startCamera('attendance-video', 'camera-status'); } catch (err) { setText('camera-status', err.message); }
    }
    byId('face-check-in')?.addEventListener('click', () => punch('check_in'));
    byId('face-check-out')?.addEventListener('click', () => punch('check_out'));
  });
  window.addEventListener('beforeunload', () => { if (stream) stream.getTracks().forEach(t => t.stop()); });
})();

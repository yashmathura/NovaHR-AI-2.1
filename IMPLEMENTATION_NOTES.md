# NovaHR updates: face + GPS attendance, employee timeline, task status

## What changed
- Employee records now store an optional face snapshot and a 128-value face descriptor.
- HR/Admin can capture or update an employee's face from the Employees directory.
- Employee attendance has a live camera workflow. It compares the current browser-camera descriptor with the signed-in employee's enrolled descriptor, then records the punch with GPS latitude, longitude, and reported accuracy.
- Attendance records show a Google Maps link when coordinates are available.
- Team Timeline shows today's attendance, the employee's current `IN_PROGRESS` task, task counts, and the last GPS coordinates recorded by attendance. It is **not** continuous location tracking.
- Tasks can update their status. `IN_PROGRESS` is green, `DONE` is red, and `TODO` is amber.
- Existing NovaLM implementation/configuration remains in place; no fake external LLM response was added.

## Run on Windows PowerShell
From the folder containing `manage.py`:

```powershell
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

Open `http://127.0.0.1:8000/`. Camera and geolocation work on localhost in modern browsers; deployment requires HTTPS. Face model weights load from a public CDN, so internet access is needed for the first page load.

## First-use flow
1. Sign in as Admin or HR.
2. Open Employees and choose **Capture face** next to the employee. Ask for the employee's consent, start the camera, and capture a clear face.
3. Sign in as that employee in a separate browser/session, open Attendance, allow camera and location access, start camera, and choose Verify face & Check in.
4. Open Team Timeline to view tasks and the latest attendance GPS point.
5. In Tasks, change a task to Ongoing or Completed to see the color-coded status.

## Important limitations before production
- This is a browser-based proof of concept using face-api.js descriptors. It does not implement robust liveness/anti-spoof checks; a printed photo or screen replay may defeat basic face matching. Do not use it as the sole control for payroll or security-critical attendance without adding liveness checks, threshold calibration, audit/review flows, and a privacy/retention policy.
- Browser GPS can be denied or spoofed and accuracy varies. The current flow records coordinates but does not enforce a college geofence. A GPS point is not proof of presence by itself.
- Face recognition model files are downloaded from a CDN. For controlled deployments, pin and host reviewed model assets locally.
- Face images and descriptors are biometric data. Obtain informed consent, restrict database/media access, encrypt backups, define retention/deletion, and follow applicable law/policy.
- Existing database credentials/settings have not been changed. Configure secrets using environment variables before deploying.

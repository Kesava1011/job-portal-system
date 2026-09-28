const fs = require('fs');

(async () => {
  const loginRes = await fetch("http://localhost:5000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "recruiter@google.com", password: "password123" })
  });
  const login = await loginRes.json();
  const token = login.token;

  const appRes = await fetch("http://localhost:5000/api/applications/recruiter/applicants", {
    headers: { Authorization: "Bearer " + token }
  });
  const apps = await appRes.json();
  const appWithResume = apps.applicants.find(a => a.resume_file_url || a.resume_id);
  console.log("App candidate:", appWithResume.first_name, appWithResume.last_name);
  console.log("App ID:", appWithResume.application_id, "Resume ID:", appWithResume.resume_id, "Resume URL:", appWithResume.resume_file_url);

  const viewUrl = "http://localhost:5000/api/applications/" + appWithResume.application_id + "/resume/view?token=" + encodeURIComponent(token);
  const res = await fetch(viewUrl);
  console.log("View status:", res.status);
  console.log("Headers:");
  for (const [k, v] of res.headers.entries()) {
    console.log("  " + k + ": " + v);
  }
  const buf = await res.arrayBuffer();
  console.log("Buffer length:", buf.byteLength);
  const startStr = Buffer.from(buf.slice(0, 100)).toString("utf8");
  console.log("Start of payload:", JSON.stringify(startStr));
})();

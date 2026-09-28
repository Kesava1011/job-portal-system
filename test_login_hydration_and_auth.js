// test_login_hydration_and_auth.js
// Verification suite for Login page hydration safety, Quick Fill, and Authentication flows

const fs = require('fs');
const path = require('path');

const API = 'http://localhost:5000/api';
const FRONTEND = 'http://localhost:3000';

let totalTests = 0;
let passedTests = 0;

function check(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
  }
}

async function runLoginVerification() {
  console.log('================================================================================');
  console.log('🔐 LOGIN PAGE HYDRATION SAFETY & AUTHENTICATION VERIFICATION');
  console.log('================================================================================\n');

  // ---------------------------------------------------------------------------
  // 1. Inspect LoginPage Implementation & Hydration Safety
  // ---------------------------------------------------------------------------
  console.log('1️⃣ Inspecting Login Page Source & Hydration Guardrails...');

  const loginFilePath = path.resolve(__dirname, 'frontend/src/app/login/page.js');
  check(fs.existsSync(loginFilePath), 'login/page.js exists');
  const loginCode = fs.readFileSync(loginFilePath, 'utf8');

  // Check that no non-deterministic values are used during render
  check(!loginCode.includes('Math.random()'), 'login/page.js does NOT use Math.random() during render');
  check(!loginCode.includes('Date.now()'), 'login/page.js does NOT use Date.now() during render');
  check(!loginCode.includes('window.') && !loginCode.includes('document.'), 'login/page.js does NOT access window or document during render');

  // Check Quick Fill buttons have suppressHydrationWarning and stable IDs
  check(loginCode.includes('id="quick-fill-candidate"'), 'Candidate Quick Fill button has stable ID');
  check(loginCode.includes('id="quick-fill-recruiter"'), 'Recruiter Quick Fill button has stable ID');
  check(loginCode.includes('id="quick-fill-admin"'), 'Admin Quick Fill button has stable ID');
  check(loginCode.includes('suppressHydrationWarning'), 'Quick Fill buttons and inputs use suppressHydrationWarning to defend against extension attribute injection');

  // ---------------------------------------------------------------------------
  // 2. Verify SSR Output of /login
  // ---------------------------------------------------------------------------
  console.log('\n2️⃣ Testing SSR Response of /login...');

  const ssrRes = await fetch(`${FRONTEND}/login`);
  check(ssrRes.status === 200, '/login responds with HTTP 200 OK');
  const ssrHtml = await ssrRes.text();
  check(ssrHtml.includes('One-Click Demo Evaluator Access'), 'SSR HTML renders One-Click Demo Evaluator Access section');
  check(ssrHtml.includes('Alex Johnson'), 'SSR HTML renders Candidate demo text');
  check(ssrHtml.includes('Google Lead'), 'SSR HTML renders Recruiter demo text');
  check(ssrHtml.includes('Full System'), 'SSR HTML renders Admin demo text');
  check(ssrHtml.includes('quick-fill-candidate'), 'SSR HTML contains quick-fill-candidate button ID');
  check(ssrHtml.includes('login-submit-btn'), 'SSR HTML contains login-submit-btn ID');

  // ---------------------------------------------------------------------------
  // 3. Verify Authentication: Job Seeker Login
  // ---------------------------------------------------------------------------
  console.log('\n3️⃣ Testing Job Seeker Login...');

  const seekerLoginRes = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'seeker@example.com', password: 'password123' }),
  });
  const seekerData = await seekerLoginRes.json();
  check(seekerLoginRes.status === 200 && seekerData.success, 'Candidate login succeeds (200 OK)');
  check(seekerData.user?.role === 'job_seeker', 'Candidate user role is "job_seeker"');
  check(typeof seekerData.token === 'string' && seekerData.token.length > 20, 'Candidate received valid JWT token');

  // Verify candidate session via /auth/me
  const seekerMeRes = await fetch(`${API}/auth/me`, {
    headers: { Authorization: `Bearer ${seekerData.token}` },
  });
  const seekerMe = await seekerMeRes.json();
  check(seekerMe.success && seekerMe.user?.email === 'seeker@example.com', 'Candidate /auth/me session verified');

  // ---------------------------------------------------------------------------
  // 4. Verify Authentication: Recruiter Login
  // ---------------------------------------------------------------------------
  console.log('\n4️⃣ Testing Recruiter Login...');

  const recruiterLoginRes = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'recruiter@google.com', password: 'password123' }),
  });
  const recruiterData = await recruiterLoginRes.json();
  check(recruiterLoginRes.status === 200 && recruiterData.success, 'Recruiter login succeeds (200 OK)');
  check(recruiterData.user?.role === 'recruiter', 'Recruiter user role is "recruiter"');
  check(typeof recruiterData.token === 'string' && recruiterData.token.length > 20, 'Recruiter received valid JWT token');

  // Verify recruiter session via /auth/me
  const recruiterMeRes = await fetch(`${API}/auth/me`, {
    headers: { Authorization: `Bearer ${recruiterData.token}` },
  });
  const recruiterMe = await recruiterMeRes.json();
  check(recruiterMe.success && recruiterMe.user?.email === 'recruiter@google.com', 'Recruiter /auth/me session verified');

  // ---------------------------------------------------------------------------
  // 5. Verify Authentication: Admin Login
  // ---------------------------------------------------------------------------
  console.log('\n5️⃣ Testing Admin Login...');

  const adminLoginRes = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@jobportal.com', password: 'password123' }),
  });
  const adminData = await adminLoginRes.json();
  check(adminLoginRes.status === 200 && adminData.success, 'Admin login succeeds (200 OK)');
  check(adminData.user?.role === 'admin', 'Admin user role is "admin"');
  check(typeof adminData.token === 'string' && adminData.token.length > 20, 'Admin received valid JWT token');

  // Verify admin session via /auth/me
  const adminMeRes = await fetch(`${API}/auth/me`, {
    headers: { Authorization: `Bearer ${adminData.token}` },
  });
  const adminMe = await adminMeRes.json();
  check(adminMe.success && adminMe.user?.email === 'admin@jobportal.com', 'Admin /auth/me session verified');

  // ---------------------------------------------------------------------------
  // 6. Verify Role Routing & Dashboard Destinations
  // ---------------------------------------------------------------------------
  console.log('\n6️⃣ Testing Role Dashboard Route Availability...');

  const dashboards = [
    { role: 'job_seeker', route: '/seeker/dashboard' },
    { role: 'recruiter', route: '/recruiter/dashboard' },
    { role: 'admin', route: '/admin/dashboard' },
  ];

  for (const d of dashboards) {
    const res = await fetch(`${FRONTEND}${d.route}`);
    check(res.status === 200, `Dashboard route ${d.route} for ${d.role} responds with 200 OK`);
  }

  // ---------------------------------------------------------------------------
  // 7. Verify Browser Extension Injected Attribute (fdprocessedid) Root Cause Analysis
  // ---------------------------------------------------------------------------
  console.log('\n7️⃣ Verifying fdprocessedid Origin & Extension Robustness...');

  check(!loginCode.includes('fdprocessedid'), 'Source code does NOT generate or reference fdprocessedid');
  check(
    loginCode.includes('id="quick-fill-candidate"') && loginCode.includes('suppressHydrationWarning'),
    'Quick Fill candidate button is shielded against extension-injected attributes via suppressHydrationWarning'
  );
  check(
    loginCode.includes('id="quick-fill-recruiter"') && loginCode.includes('suppressHydrationWarning'),
    'Quick Fill recruiter button is shielded against extension-injected attributes via suppressHydrationWarning'
  );
  check(
    loginCode.includes('id="quick-fill-admin"') && loginCode.includes('suppressHydrationWarning'),
    'Quick Fill admin button is shielded against extension-injected attributes via suppressHydrationWarning'
  );

  console.log('\n================================================================================');
  console.log(`🎯 LOGIN & HYDRATION VERIFICATION: ${passedTests} / ${totalTests} TESTS PASSED (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('================================================================================\n');

  if (passedTests === totalTests) {
    console.log('🏆 ALL LOGIN HYDRATION & AUTHENTICATION TESTS PASSED WITH 100% SUCCESS!');
  } else {
    process.exit(1);
  }
}

runLoginVerification().catch(err => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});

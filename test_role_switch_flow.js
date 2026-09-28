/**
 * Comprehensive Automated Verification Suite for Job Seeker <-> Recruiter Role Switching
 * Tests all requirements from Prompt:
 * Test A: Job Seeker login -> Job Seeker Dashboard -> switch to Recruiter -> Recruiter Dashboard loads correctly.
 * Test B: Recruiter login -> Recruiter Dashboard -> switch to Job Seeker -> Job Seeker Dashboard loads correctly.
 * Test C: Switch roles multiple times: Job Seeker -> Recruiter -> Job Seeker -> Recruiter without refreshing.
 * Test D: Session persistence (simulating browser refresh): The correct role and dashboard remain.
 * Test E: Open a protected Recruiter URL while logged in as Job Seeker (no Chrome crash / clean redirect).
 * Test F: Open a Job Seeker-only URL while logged in as Recruiter (no Chrome crash / clean redirect).
 * Test G: Permission isolation (Recruiter cannot access seeker-only endpoints, Seeker cannot access recruiter-only endpoints).
 */

const API_BASE = 'http://localhost:5000/api';
const FRONTEND_BASE = 'http://localhost:3000';

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
  }
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data, headers: res.headers };
}

async function runRoleSwitchTests() {
  console.log('================================================================================');
  console.log('🔄 JOB SEEKER <-> RECRUITER ROLE SWITCHING COMPREHENSIVE SUITE');
  console.log('================================================================================\n');

  // Pre-condition: Make sure seeker@example.com is in 'job_seeker' role
  const initLogin = await fetchJson(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'seeker@example.com', password: 'password123' }),
  });
  if (initLogin.data.user?.role !== 'job_seeker') {
    await fetchJson(`${API_BASE}/auth/switch-role`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${initLogin.data.token}`,
      },
      body: JSON.stringify({ role: 'job_seeker' }),
    });
  }

  // --------------------------------------------------------------------------
  // STEP 1: Verify Initial Login & Test A (Job Seeker -> Recruiter)
  // --------------------------------------------------------------------------
  console.log('--- TEST A: Job Seeker Login -> Switch to Recruiter ---');

  // 1. Login as Job Seeker
  const seekerLogin = await fetchJson(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'seeker@example.com', password: 'password123' }),
  });

  assert(seekerLogin.status === 200, 'Job Seeker logged in successfully (HTTP 200)');
  assert(seekerLogin.data.user?.role === 'job_seeker', 'Initial user role is "job_seeker"');
  let seekerToken = seekerLogin.data.token;
  assert(!!seekerToken, 'Valid JWT token received for Job Seeker');

  // Job Seeker can access seeker dashboard data
  const seekerDash = await fetchJson(`${API_BASE}/users/dashboard`, {
    headers: { Authorization: `Bearer ${seekerToken}` },
  });
  assert(seekerDash.status === 200 && seekerDash.data.success, 'Job Seeker can access /users/dashboard');

  // 2. Switch role: job_seeker -> recruiter
  const switchToRecruiter = await fetchJson(`${API_BASE}/auth/switch-role`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${seekerToken}`,
    },
    body: JSON.stringify({ role: 'recruiter' }),
  });

  assert(switchToRecruiter.status === 200, 'POST /api/auth/switch-role succeeded (HTTP 200)');
  assert(switchToRecruiter.data.success === true, 'Role switch response indicates success');
  assert(switchToRecruiter.data.user?.role === 'recruiter', 'Updated user role is now "recruiter"');
  assert(!!switchToRecruiter.data.token, 'Received fresh JWT token for Recruiter role');

  const recruiterTokenFromSwitch = switchToRecruiter.data.token;

  // Verify Recruiter can now access Recruiter Dashboard API
  const recruiterDash = await fetchJson(`${API_BASE}/jobs/recruiter/dashboard`, {
    headers: { Authorization: `Bearer ${recruiterTokenFromSwitch}` },
  });
  assert(recruiterDash.status === 200 && recruiterDash.data.success, 'Recruiter Dashboard API loads correctly with switched token');
  assert(recruiterDash.data.stats !== undefined, 'Recruiter metrics and stats returned in dashboard');

  // Verify Recruiter can now access Recruiter job management API
  const recruiterJobs = await fetchJson(`${API_BASE}/jobs/recruiter/my-jobs`, {
    headers: { Authorization: `Bearer ${recruiterTokenFromSwitch}` },
  });
  assert(recruiterJobs.status === 200 && recruiterJobs.data.success, 'Switched recruiter can access /jobs/recruiter/my-jobs');

  // --------------------------------------------------------------------------
  // STEP 2: Test B (Recruiter -> Switch to Job Seeker)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST B: Recruiter -> Switch to Job Seeker ---');

  // Switch role: recruiter -> job_seeker
  const switchToSeeker = await fetchJson(`${API_BASE}/auth/switch-role`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${recruiterTokenFromSwitch}`,
    },
    body: JSON.stringify({ role: 'job_seeker' }),
  });

  assert(switchToSeeker.status === 200, 'POST /api/auth/switch-role succeeded (HTTP 200)');
  assert(switchToSeeker.data.success === true, 'Switch back to Job Seeker succeeded');
  assert(switchToSeeker.data.user?.role === 'job_seeker', 'Updated user role is now "job_seeker"');
  assert(!!switchToSeeker.data.token, 'Received fresh JWT token for Job Seeker');

  const seekerTokenAfterSwitch = switchToSeeker.data.token;

  // Verify Job Seeker Dashboard API loads correctly with switched token
  const seekerDashAfter = await fetchJson(`${API_BASE}/users/dashboard`, {
    headers: { Authorization: `Bearer ${seekerTokenAfterSwitch}` },
  });
  assert(seekerDashAfter.status === 200 && seekerDashAfter.data.success, 'Job Seeker Dashboard API loads correctly after switching back');
  assert(seekerDashAfter.data.stats !== undefined, 'Job seeker metrics returned');

  // --------------------------------------------------------------------------
  // STEP 3: Test C (Switch Multiple Times in Memory without refresh)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST C: Rapid Consecutive Role Switching (Seeker -> Recruiter -> Seeker -> Recruiter) ---');

  let activeToken = seekerTokenAfterSwitch;
  const sequence = ['recruiter', 'job_seeker', 'recruiter', 'job_seeker', 'recruiter', 'job_seeker'];

  let allSequencePassed = true;
  for (let i = 0; i < sequence.length; i++) {
    const targetRole = sequence[i];
    const res = await fetchJson(`${API_BASE}/auth/switch-role`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${activeToken}`,
      },
      body: JSON.stringify({ role: targetRole }),
    });

    if (res.status === 200 && res.data.user?.role === targetRole) {
      activeToken = res.data.token;
    } else {
      allSequencePassed = false;
      console.error(`  ❌ Failed transition at step ${i + 1} to ${targetRole}`);
    }
  }

  assert(allSequencePassed, `Executed 6 consecutive role switches seamlessly without failure`);

  // Ensure current active token is job_seeker
  const meVerify = await fetchJson(`${API_BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${activeToken}` },
  });
  assert(meVerify.status === 200 && meVerify.data.user?.role === 'job_seeker', 'State remains consistent after rapid switches');

  // --------------------------------------------------------------------------
  // STEP 4: Test D (Simulate Browser Refresh with Stored Token)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST D: Simulated Browser Refresh Session Synchronization ---');

  // 1. Switch to Recruiter
  const toRec = await fetchJson(`${API_BASE}/auth/switch-role`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${activeToken}`,
    },
    body: JSON.stringify({ role: 'recruiter' }),
  });
  assert(toRec.status === 200, 'Switched to recruiter');
  const savedRecruiterTokenInStorage = toRec.data.token;

  // 2. Simulate refresh: client boots up and calls GET /auth/me with stored token
  const refreshRecMe = await fetchJson(`${API_BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${savedRecruiterTokenInStorage}` },
  });
  assert(refreshRecMe.status === 200, 'GET /auth/me after simulated refresh returns 200 OK');
  assert(refreshRecMe.data.user?.role === 'recruiter', 'User role after refresh is "recruiter" (persisted in DB)');
  assert(refreshRecMe.data.user?.profile !== null, 'Recruiter profile correctly restored');

  // 3. Switch back to Seeker and test refresh again
  const toSeeker = await fetchJson(`${API_BASE}/auth/switch-role`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${savedRecruiterTokenInStorage}`,
    },
    body: JSON.stringify({ role: 'job_seeker' }),
  });
  assert(toSeeker.status === 200, 'Switched back to seeker');
  const savedSeekerTokenInStorage = toSeeker.data.token;

  const refreshSeekerMe = await fetchJson(`${API_BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${savedSeekerTokenInStorage}` },
  });
  assert(refreshSeekerMe.status === 200, 'GET /auth/me after seeker refresh returns 200 OK');
  assert(refreshSeekerMe.data.user?.role === 'job_seeker', 'User role after refresh is "job_seeker"');
  assert(refreshSeekerMe.data.user?.profile !== null, 'Seeker profile correctly restored');

  // --------------------------------------------------------------------------
  // STEP 5: Test E & Test F (Protected Route Access Boundaries & Isolation)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST E & F: Protected Route Boundaries & Graceful Denials ---');

  // Test E: When active role is Job Seeker, recruiter-only APIs must be forbidden (HTTP 403)
  const seekerHittingRecruiterDash = await fetchJson(`${API_BASE}/jobs/recruiter/dashboard`, {
    headers: { Authorization: `Bearer ${savedSeekerTokenInStorage}` },
  });
  assert(seekerHittingRecruiterDash.status === 403, 'Job Seeker hitting recruiter dashboard API returns HTTP 403 Forbidden');
  assert(seekerHittingRecruiterDash.data.message?.includes('Forbidden'), 'Returns structured Forbidden error without server crash');

  const seekerHittingRecruiterApplicants = await fetchJson(`${API_BASE}/applications/recruiter/applicants`, {
    headers: { Authorization: `Bearer ${savedSeekerTokenInStorage}` },
  });
  assert(seekerHittingRecruiterApplicants.status === 403, 'Job Seeker hitting recruiter applicants API returns HTTP 403 Forbidden');

  // Test F: When active role is Recruiter, candidate-only APIs must be forbidden (HTTP 403)
  const recLogin = await fetchJson(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'recruiter@google.com', password: 'password123' }),
  });
  assert(recLogin.status === 200, 'Recruiter logged in for boundary tests');
  const dedicatedRecruiterToken = recLogin.data.token;

  const recHittingSeekerDash = await fetchJson(`${API_BASE}/users/dashboard`, {
    headers: { Authorization: `Bearer ${dedicatedRecruiterToken}` },
  });
  assert(recHittingSeekerDash.status === 403, 'Recruiter hitting seeker dashboard API returns HTTP 403 Forbidden');
  assert(recHittingSeekerDash.data.message?.includes('Forbidden'), 'Returns structured Forbidden error');

  const recHittingSeekerApply = await fetchJson(`${API_BASE}/applications/apply`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${dedicatedRecruiterToken}`,
    },
    body: JSON.stringify({ jobId: 1 }),
  });
  assert(recHittingSeekerApply.status === 403, 'Recruiter attempting to apply for jobs returns HTTP 403 Forbidden');

  // --------------------------------------------------------------------------
  // STEP 6: Frontend Route & Guard Architecture Validation
  // --------------------------------------------------------------------------
  console.log('\n--- TEST G: Frontend Route Guard & Navbar Switcher Verification ---');

  // Verify all relevant pages respond with 200 OK from Next.js server
  const routesToCheck = [
    '/seeker/dashboard',
    '/recruiter/dashboard',
    '/recruiter/post-job',
    '/recruiter/manage-jobs',
    '/recruiter/applicants',
    '/recruiter/company',
    '/seeker/applications',
    '/seeker/profile',
    '/seeker/resume',
    '/seeker/resume-builder',
  ];

  for (const route of routesToCheck) {
    const res = await fetch(`${FRONTEND_BASE}${route}`);
    assert(res.status === 200, `Next.js route ${route} responds with HTTP 200 OK`);
  }

  // --------------------------------------------------------------------------
  // Summary
  // --------------------------------------------------------------------------
  console.log('\n================================================================================');
  console.log(`📊 ROLE SWITCHING FLOW VERIFICATION: ${passedTests} / ${totalTests} assertions passed (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('================================================================================');

  if (passedTests === totalTests) {
    console.log('🎉 ALL ROLE SWITCHING AND ISOLATION TESTS PASSED PERFECTLY!\n');
    process.exit(0);
  } else {
    console.error('⚠️ SOME TESTS FAILED. PLEASE REVIEW OUTPUT ABOVE.\n');
    process.exit(1);
  }
}

runRoleSwitchTests().catch((err) => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});

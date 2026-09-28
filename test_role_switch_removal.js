/**
 * test_role_switch_removal.js
 * Verification script for removal of "Switch to Recruiter" and "Switch to Job Seeker" buttons:
 * 1. Confirms removal of all role switch buttons from Navbar, Seeker Dashboard, and Recruiter Dashboard.
 * 2. Confirms Job Seeker login flow -> Seeker Dashboard.
 * 3. Confirms Recruiter login flow -> Recruiter Dashboard.
 * 4. Confirms refresh / session persistence maintains respective roles.
 * 5. Confirms role route protection / authorization barriers prevent cross-role access.
 * 6. Confirms core features remain functional.
 */

const fs = require('fs');
const path = require('path');

const API = 'http://localhost:5000/api';
const FRONTEND = 'http://localhost:3000';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ PASS: ${message}`);
  } else {
    failedTests++;
    console.error(`  ❌ FAIL: ${message}`);
  }
}

async function request(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  let data = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      data = await res.json();
    } catch {
      data = null;
    }
  }
  return { status: res.status, ok: res.ok, headers: res.headers, data, response: res };
}

async function runTests() {
  console.log('================================================================================');
  console.log('🔒 ROLE SWITCH REMOVAL & AUTHENTICATION SEPARATION VERIFICATION');
  console.log('================================================================================\n');

  try {
    // -------------------------------------------------------------------------
    // Step 1: Source Code Verification - No Role Switch Buttons in UI
    // -------------------------------------------------------------------------
    console.log('--- Step 1: Inspect Frontend Code for Removal of Role Switch Buttons ---');
    
    const navbarContent = fs.readFileSync(path.join(__dirname, 'frontend/src/components/Navbar.js'), 'utf-8');
    assert(!navbarContent.includes('Switch to Recruiter'), 'Navbar does NOT contain "Switch to Recruiter"');
    assert(!navbarContent.includes('Switch to Job Seeker'), 'Navbar does NOT contain "Switch to Job Seeker"');
    assert(!navbarContent.includes('Switch to Candidate'), 'Navbar does NOT contain "Switch to Candidate"');
    assert(!navbarContent.includes('switchRole'), 'Navbar does NOT call or reference switchRole');

    const seekerDashContent = fs.readFileSync(path.join(__dirname, 'frontend/src/app/seeker/dashboard/page.js'), 'utf-8');
    assert(!seekerDashContent.includes('Switch to Recruiter'), 'Seeker Dashboard does NOT contain "Switch to Recruiter"');
    assert(!seekerDashContent.includes('Switch to Recruiter Hub'), 'Seeker Dashboard does NOT contain "Switch to Recruiter Hub"');
    assert(!seekerDashContent.includes('dashboard-switch-to-recruiter'), 'Seeker Dashboard does NOT contain switch button ID');
    assert(!seekerDashContent.includes('switchRole'), 'Seeker Dashboard does NOT reference switchRole');

    const recruiterDashContent = fs.readFileSync(path.join(__dirname, 'frontend/src/app/recruiter/dashboard/page.js'), 'utf-8');
    assert(!recruiterDashContent.includes('Switch to Job Seeker'), 'Recruiter Dashboard does NOT contain "Switch to Job Seeker"');
    assert(!recruiterDashContent.includes('Switch to Candidate Mode'), 'Recruiter Dashboard does NOT contain "Switch to Candidate Mode"');
    assert(!recruiterDashContent.includes('dashboard-switch-to-seeker'), 'Recruiter Dashboard does NOT contain switch button ID');
    assert(!recruiterDashContent.includes('switchRole'), 'Recruiter Dashboard does NOT reference switchRole');

    const sidebarContent = fs.readFileSync(path.join(__dirname, 'frontend/src/components/Sidebar.js'), 'utf-8');
    assert(!sidebarContent.includes('Switch to Recruiter'), 'Sidebar does NOT contain "Switch to Recruiter"');
    assert(!sidebarContent.includes('Switch to Job Seeker'), 'Sidebar does NOT contain "Switch to Job Seeker"');

    // -------------------------------------------------------------------------
    // Step 2: Test Job Seeker Authentication -> Seeker Dashboard
    // -------------------------------------------------------------------------
    console.log('\n--- Step 2: Test Job Seeker Authentication Flow ---');
    const seekerLogin = await request(`${API}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'seeker@example.com', password: 'password123' })
    });
    assert(seekerLogin.status === 200 && seekerLogin.data?.success, 'Job Seeker login succeeds (HTTP 200)');
    assert(seekerLogin.data?.user?.role === 'job_seeker', 'Logged-in user role is job_seeker');
    const seekerToken = seekerLogin.data?.token;
    assert(!!seekerToken, 'Received valid JWT token for Job Seeker');

    // Job seeker accesses Seeker Dashboard API
    const seekerDashApi = await request(`${API}/users/dashboard`, {
      headers: { Authorization: `Bearer ${seekerToken}` }
    });
    assert(seekerDashApi.status === 200 && seekerDashApi.data?.success, 'Job Seeker dashboard API loads successfully');

    // Fetch Seeker Dashboard SSR/HTML
    const seekerDashHtml = await fetch(`${FRONTEND}/seeker/dashboard`);
    const seekerHtmlText = await seekerDashHtml.text();
    assert(seekerDashHtml.status === 200, 'Frontend route /seeker/dashboard responds with HTTP 200 OK');
    assert(!seekerHtmlText.includes('dashboard-switch-to-recruiter'), 'Rendered Seeker Dashboard HTML does NOT contain switch button');
    assert(!seekerHtmlText.includes('Switch to Recruiter Hub'), 'Rendered Seeker Dashboard HTML does NOT contain switch button text');

    // -------------------------------------------------------------------------
    // Step 3: Test Recruiter Authentication -> Recruiter Dashboard
    // -------------------------------------------------------------------------
    console.log('\n--- Step 3: Test Recruiter Authentication Flow ---');
    const recruiterLogin = await request(`${API}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'recruiter@google.com', password: 'password123' })
    });
    assert(recruiterLogin.status === 200 && recruiterLogin.data?.success, 'Recruiter login succeeds (HTTP 200)');
    assert(recruiterLogin.data?.user?.role === 'recruiter', 'Logged-in user role is recruiter');
    const recruiterToken = recruiterLogin.data?.token;
    assert(!!recruiterToken, 'Received valid JWT token for Recruiter');

    // Recruiter accesses Recruiter Dashboard API
    const recruiterDashApi = await request(`${API}/jobs/recruiter/dashboard`, {
      headers: { Authorization: `Bearer ${recruiterToken}` }
    });
    assert(recruiterDashApi.status === 200 && recruiterDashApi.data?.success, 'Recruiter dashboard API loads successfully');

    // Fetch Recruiter Dashboard SSR/HTML
    const recruiterDashHtml = await fetch(`${FRONTEND}/recruiter/dashboard`);
    const recruiterHtmlText = await recruiterDashHtml.text();
    assert(recruiterDashHtml.status === 200, 'Frontend route /recruiter/dashboard responds with HTTP 200 OK');
    assert(!recruiterHtmlText.includes('dashboard-switch-to-seeker'), 'Rendered Recruiter Dashboard HTML does NOT contain switch button');
    assert(!recruiterHtmlText.includes('Switch to Candidate Mode'), 'Rendered Recruiter Dashboard HTML does NOT contain switch button text');

    // -------------------------------------------------------------------------
    // Step 4: Refresh / Session Persistence Verification
    // -------------------------------------------------------------------------
    console.log('\n--- Step 4: Verify Session Persistence (Simulated Dashboard Refresh) ---');
    // Seeker refresh: /auth/me returns active seeker profile without role mutation
    const seekerMe = await request(`${API}/auth/me`, {
      headers: { Authorization: `Bearer ${seekerToken}` }
    });
    assert(seekerMe.status === 200 && seekerMe.data?.success, '/auth/me for Job Seeker succeeds');
    assert(seekerMe.data?.user?.role === 'job_seeker', 'Refreshed session role remains job_seeker');

    // Recruiter refresh: /auth/me returns active recruiter profile without role mutation
    const recruiterMe = await request(`${API}/auth/me`, {
      headers: { Authorization: `Bearer ${recruiterToken}` }
    });
    assert(recruiterMe.status === 200 && recruiterMe.data?.success, '/auth/me for Recruiter succeeds');
    assert(recruiterMe.data?.user?.role === 'recruiter', 'Refreshed session role remains recruiter');

    // -------------------------------------------------------------------------
    // Step 5: Authorization and Route Protection Enforcement
    // -------------------------------------------------------------------------
    console.log('\n--- Step 5: Verify Cross-Role Access Prevention ---');
    // Seeker attempting recruiter endpoints
    const seekerCrossPipeline = await request(`${API}/applications/recruiter/applicants`, {
      headers: { Authorization: `Bearer ${seekerToken}` }
    });
    assert(seekerCrossPipeline.status === 403, 'Job Seeker cannot access Recruiter Pipeline API (HTTP 403 Forbidden)');

    const seekerCrossMyJobs = await request(`${API}/jobs/recruiter/my-jobs`, {
      headers: { Authorization: `Bearer ${seekerToken}` }
    });
    assert(seekerCrossMyJobs.status === 403, 'Job Seeker cannot access Recruiter Manage Jobs API (HTTP 403 Forbidden)');

    // Recruiter attempting job seeker endpoints
    const recruiterCrossMyApps = await request(`${API}/applications/my-applications`, {
      headers: { Authorization: `Bearer ${recruiterToken}` }
    });
    assert(recruiterCrossMyApps.status === 403, 'Recruiter cannot access Seeker My Applications API (HTTP 403 Forbidden)');

    const recruiterCrossSeekerDash = await request(`${API}/users/dashboard`, {
      headers: { Authorization: `Bearer ${recruiterToken}` }
    });
    assert(recruiterCrossSeekerDash.status === 403, 'Recruiter cannot access Seeker Dashboard API (HTTP 403 Forbidden)');

    // Check useRoleGuard logic in frontend
    const roleGuardContent = fs.readFileSync(path.join(__dirname, 'frontend/src/hooks/useRoleGuard.js'), 'utf-8');
    assert(roleGuardContent.includes('router.replace'), 'useRoleGuard uses router.replace to prevent redirect loops');
    assert(roleGuardContent.includes('router.replace(\'/recruiter/dashboard\')'), 'useRoleGuard routes recruiters to recruiter dashboard');
    assert(roleGuardContent.includes('router.replace(\'/seeker/dashboard\')'), 'useRoleGuard routes seekers to seeker dashboard');
    assert(roleGuardContent.includes('loading: effectiveLoading'), 'useRoleGuard blocks unauthorized component execution while redirecting');

    // -------------------------------------------------------------------------
    // Step 6: Core Features Integrity Verification
    // -------------------------------------------------------------------------
    console.log('\n--- Step 6: Core Features Integrity Verification ---');
    // Find Jobs
    const jobsList = await request(`${API}/jobs`);
    assert(jobsList.status === 200 && jobsList.data?.success, 'Find Jobs API works (HTTP 200)');

    // Companies
    const companiesList = await request(`${API}/companies`);
    assert(companiesList.status === 200 && companiesList.data?.success, 'Companies API works (HTTP 200)');

    // Recruiter candidate pipeline
    const recruiterPipeline = await request(`${API}/applications/recruiter/applicants`, {
      headers: { Authorization: `Bearer ${recruiterToken}` }
    });
    assert(recruiterPipeline.status === 200 && recruiterPipeline.data?.success, 'Candidate Pipeline API works (HTTP 200)');

    // Recruiter manage jobs
    const recruiterJobs = await request(`${API}/jobs/recruiter/my-jobs`, {
      headers: { Authorization: `Bearer ${recruiterToken}` }
    });
    assert(recruiterJobs.status === 200 && recruiterJobs.data?.success, 'Recruiter Manage Jobs API works (HTTP 200)');

    // Seeker applications
    const seekerApps = await request(`${API}/applications/my-applications`, {
      headers: { Authorization: `Bearer ${seekerToken}` }
    });
    assert(seekerApps.status === 200 && seekerApps.data?.success, 'Seeker My Applications API works (HTTP 200)');

    console.log('\n================================================================================');
    console.log(`📊 FINAL RESULTS: Total: ${totalTests} | Passed: ${passedTests} | Failed: ${failedTests}`);
    console.log('================================================================================\n');

    if (failedTests > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

runTests();

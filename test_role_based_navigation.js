/**
 * test_role_based_navigation.js
 * Comprehensive validation of Role-Based Navigation:
 * 1. Recruiter navigation excludes "Find Jobs" and "Companies".
 * 2. Recruiter navigation includes Dashboard, Post a Job, Manage Jobs, Candidate Pipeline, Company Profile, Profile/Settings, Logout.
 * 3. Job Seeker navigation retains Dashboard, Find Jobs, Companies, My Applications, Profile/Resume, Notifications, Settings, Logout.
 * 4. Guest/Unauthenticated navigation renders Home, Find Jobs, Companies, Sign In, Register.
 * 5. Direct URLs and routes for all pages continue to render with HTTP 200 OK without errors.
 * 6. APIs for both roles continue functioning correctly without permission regressions.
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

async function runRoleNavigationTests() {
  console.log('================================================================================');
  console.log('🧭 ROLE-BASED NAVIGATION ARCHITECTURE & ROUTE VERIFICATION SUITE');
  console.log('================================================================================\n');

  try {
    // -------------------------------------------------------------------------
    // Step 1: Navbar.js Source Code Inspection
    // -------------------------------------------------------------------------
    console.log('--- Step 1: Inspect Navbar.js Role-Aware Logic ---');
    const navbarPath = path.resolve(__dirname, 'frontend/src/components/Navbar.js');
    assert(fs.existsSync(navbarPath), 'Navbar.js component physically exists');
    const navbarCode = fs.readFileSync(navbarPath, 'utf8');

    // Verify useAuth hook is consumed
    assert(navbarCode.includes('useAuth()'), 'Navbar imports and consumes useAuth() hook');
    assert(navbarCode.includes('isRecruiter') && navbarCode.includes('isSeeker'), 'Navbar uses isRecruiter and isSeeker role flags');

    // Section 1A: Recruiter Desktop Navigation
    const recruiterDesktop = navbarCode.split('{/* RECRUITER Navigation: Only features relevant to recruiting. Find Jobs and Companies are completely excluded */}')[1].split('{/* JOB SEEKER Navigation:')[0];
    assert(
      !recruiterDesktop.includes('Find Jobs') && !recruiterDesktop.includes('href="/jobs"'),
      'Recruiter desktop navigation completely excludes "Find Jobs"'
    );
    assert(
      !recruiterDesktop.includes('Companies') && !recruiterDesktop.includes('href="/companies"'),
      'Recruiter desktop navigation completely excludes "Companies"'
    );
    assert(
      recruiterDesktop.includes('/recruiter/dashboard') &&
      recruiterDesktop.includes('/recruiter/post-job') &&
      recruiterDesktop.includes('/recruiter/manage-jobs') &&
      recruiterDesktop.includes('/recruiter/applicants') &&
      recruiterDesktop.includes('/recruiter/company'),
      'Recruiter desktop navigation includes all recruiting features (Dashboard, Post Job, Manage Jobs, Candidate Pipeline, Company Profile)'
    );

    // Section 1B: Recruiter User Dropdown
    const recruiterDropdown = navbarCode.split('{/* Recruiter links: relevant to recruiting only */}')[1].split('{/* Seeker links:')[0];
    assert(
      !recruiterDropdown.includes('Find Jobs') && !recruiterDropdown.includes('href="/jobs"'),
      'Recruiter user dropdown completely excludes "Find Jobs"'
    );
    assert(
      !recruiterDropdown.includes('Companies') && !recruiterDropdown.includes('href="/companies"'),
      'Recruiter user dropdown completely excludes "Companies"'
    );
    assert(
      recruiterDropdown.includes('Dashboard') &&
      recruiterDropdown.includes('Post a Job') &&
      recruiterDropdown.includes('Manage Jobs') &&
      recruiterDropdown.includes('Candidate Pipeline / Applicants') &&
      recruiterDropdown.includes('Company Profile') &&
      recruiterDropdown.includes('Profile / Settings'),
      'Recruiter user dropdown contains recruiting items and Profile/Settings'
    );

    // Section 1C: Recruiter Mobile Menu
    const recruiterMobile = navbarCode.split('{/* Recruiter Mobile Menu: Excludes Find Jobs & Companies, focuses on recruiting */}')[1].split('{/* Seeker Mobile Menu:')[0];
    assert(
      !recruiterMobile.includes('Find Jobs') && !recruiterMobile.includes('href="/jobs"'),
      'Recruiter mobile menu completely excludes "Find Jobs"'
    );
    assert(
      !recruiterMobile.includes('Companies') && !recruiterMobile.includes('href="/companies"'),
      'Recruiter mobile menu completely excludes "Companies"'
    );
    assert(
      recruiterMobile.includes('Dashboard') &&
      recruiterMobile.includes('Post a Job') &&
      recruiterMobile.includes('Manage Jobs') &&
      recruiterMobile.includes('Candidate Pipeline / Applicants') &&
      recruiterMobile.includes('Company Profile') &&
      recruiterMobile.includes('Profile / Settings'),
      'Recruiter mobile menu contains all relevant recruiting features'
    );

    // Section 1D: Job Seeker Desktop Navigation
    const seekerDesktop = navbarCode.split('{/* JOB SEEKER Navigation: Keeps Find Jobs, Companies, Dashboard, Applications, and AI Matches */}')[1].split('{/* ADMIN Navigation */}')[0];
    assert(
      seekerDesktop.includes('Find Jobs') && seekerDesktop.includes('href="/jobs"'),
      'Job Seeker desktop navigation retains "Find Jobs"'
    );
    assert(
      seekerDesktop.includes('Companies') && seekerDesktop.includes('href="/companies"'),
      'Job Seeker desktop navigation retains "Companies"'
    );
    assert(
      seekerDesktop.includes('/seeker/dashboard') &&
      seekerDesktop.includes('/seeker/applications') &&
      seekerDesktop.includes('/seeker/recommendations'),
      'Job Seeker desktop navigation includes Dashboard, My Applications, and AI Matches'
    );

    // Section 1E: Job Seeker User Dropdown
    const seekerDropdown = navbarCode.split('{/* Seeker links: keeps Dashboard, Find Jobs, Companies, Applications, Profile, Notifications, Settings */}')[1].split('{/* Admin links */}')[0];
    assert(
      seekerDropdown.includes('Find Jobs') && seekerDropdown.includes('href="/jobs"'),
      'Job Seeker dropdown retains "Find Jobs"'
    );
    assert(
      seekerDropdown.includes('Companies') && seekerDropdown.includes('href="/companies"'),
      'Job Seeker dropdown retains "Companies"'
    );
    assert(
      seekerDropdown.includes('Dashboard') &&
      seekerDropdown.includes('My Applications') &&
      seekerDropdown.includes('Profile / Resume') &&
      seekerDropdown.includes('Notifications') &&
      seekerDropdown.includes('Settings'),
      'Job Seeker dropdown contains Dashboard, Applications, Profile, Notifications, and Settings'
    );

    // Section 1F: Job Seeker Mobile Menu
    const seekerMobile = navbarCode.split('{/* Seeker Mobile Menu: Keeps Find Jobs, Companies, Dashboard, Applications, Profile, Notifications, Settings */}')[1].split('{/* Admin Mobile Menu */}')[0];
    assert(
      seekerMobile.includes('Find Jobs') && seekerMobile.includes('Companies') && seekerMobile.includes('Dashboard'),
      'Job Seeker mobile menu retains Find Jobs, Companies, and Dashboard'
    );

    // Section 1G: Guest Unauthenticated Navigation
    const guestDesktop = navbarCode.split('{/* GUEST Navigation (Unauthenticated) */}')[1].split('{/* Right Action buttons */}')[0];
    assert(
      guestDesktop.includes('Find Jobs') && guestDesktop.includes('Companies'),
      'Guest unauthenticated navigation retains Find Jobs and Companies'
    );

    // -------------------------------------------------------------------------
    // Step 2: Sidebar.js Source Code Inspection
    // -------------------------------------------------------------------------
    console.log('\n--- Step 2: Inspect Sidebar.js Role-Aware Logic ---');
    const sidebarPath = path.resolve(__dirname, 'frontend/src/components/Sidebar.js');
    assert(fs.existsSync(sidebarPath), 'Sidebar.js component physically exists');
    const sidebarCode = fs.readFileSync(sidebarPath, 'utf8');

    // Check recruiter items in Sidebar
    const recruiterSidebarPart = sidebarCode.split("else if (role === 'recruiter') {")[1].split("else if (role === 'admin')")[0];
    assert(
      !recruiterSidebarPart.includes("href: '/jobs'") && !recruiterSidebarPart.includes("label: 'Find Jobs'"),
      'Recruiter sidebar completely excludes "Find Jobs"'
    );
    assert(
      !recruiterSidebarPart.includes("href: '/companies'") && !recruiterSidebarPart.includes("label: 'Companies'"),
      'Recruiter sidebar completely excludes "Companies"'
    );
    assert(
      recruiterSidebarPart.includes("href: '/recruiter/dashboard'") &&
      recruiterSidebarPart.includes("href: '/recruiter/post-job'") &&
      recruiterSidebarPart.includes("href: '/recruiter/manage-jobs'") &&
      recruiterSidebarPart.includes("href: '/recruiter/applicants'") &&
      recruiterSidebarPart.includes("href: '/recruiter/company'"),
      'Recruiter sidebar includes Dashboard, Post Job, Manage Jobs, Candidate Pipeline, Company Profile, Profile/Settings'
    );

    // Check job seeker items in Sidebar
    const seekerSidebarPart = sidebarCode.split("if (role === 'job_seeker') {")[1].split("else if (role === 'recruiter')")[0];
    assert(
      seekerSidebarPart.includes("href: '/jobs'") && seekerSidebarPart.includes("label: 'Find Jobs'"),
      'Job Seeker sidebar includes "Find Jobs"'
    );
    assert(
      seekerSidebarPart.includes("href: '/companies'") && seekerSidebarPart.includes("label: 'Companies'"),
      'Job Seeker sidebar includes "Companies"'
    );
    assert(
      seekerSidebarPart.includes("href: '/seeker/dashboard'") &&
      seekerSidebarPart.includes("href: '/seeker/applications'") &&
      seekerSidebarPart.includes("href: '/seeker/profile'") &&
      seekerSidebarPart.includes("href: '/seeker/notifications'"),
      'Job Seeker sidebar includes Dashboard, Applications, Profile/Resume, Notifications, Settings'
    );

    // -------------------------------------------------------------------------
    // Step 3: Frontend Route Accessibility (HTTP 200 OK)
    // -------------------------------------------------------------------------
    console.log('\n--- Step 3: Verify Frontend Routes Render with 200 OK ---');
    const routesToTest = [
      { path: '/', label: 'Home Page' },
      { path: '/jobs', label: 'Find Jobs Page' },
      { path: '/companies', label: 'Companies Directory Page' },
      { path: '/recruiter/dashboard', label: 'Recruiter Dashboard Page' },
      { path: '/recruiter/post-job', label: 'Recruiter Post Job Page' },
      { path: '/recruiter/manage-jobs', label: 'Recruiter Manage Jobs Page' },
      { path: '/recruiter/applicants', label: 'Recruiter Applicants / Candidate Pipeline Page' },
      { path: '/recruiter/company', label: 'Recruiter Company Profile Page' },
      { path: '/seeker/dashboard', label: 'Seeker Dashboard Page' },
      { path: '/seeker/applications', label: 'Seeker Applications Page' },
      { path: '/seeker/profile', label: 'Seeker Profile Page' },
      { path: '/seeker/notifications', label: 'Seeker Notifications Page' },
    ];

    for (const r of routesToTest) {
      const res = await request(`${FRONTEND}${r.path}`);
      assert(res.status === 200, `Direct route ${r.path} (${r.label}) responds with HTTP 200 OK`);
      const bodyText = await res.response.text();
      assert(!bodyText.includes('Internal Server Error') && !bodyText.includes('Unhandled Runtime Error'), `No runtime server crashes on ${r.path}`);
    }

    // -------------------------------------------------------------------------
    // Step 4: Authentication & Backend Permission Invariance
    // -------------------------------------------------------------------------
    console.log('\n--- Step 4: Backend API Functionality & Permission Invariance ---');
    const recAuth = await request(`${API}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'recruiter@google.com', password: 'password123' }),
    });
    assert(recAuth.status === 200 && recAuth.data?.token, 'Recruiter authenticated successfully');
    const recToken = recAuth.data.token;
    const recHeaders = { Authorization: `Bearer ${recToken}` };

    const seekerAuth = await request(`${API}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'seeker@example.com', password: 'password123' }),
    });
    assert(seekerAuth.status === 200 && seekerAuth.data?.token, 'Job Seeker authenticated successfully');
    const seekerToken = seekerAuth.data.token;
    const seekerHeaders = { Authorization: `Bearer ${seekerToken}` };

    // Recruiter can access recruitment APIs
    const recJobsRes = await request(`${API}/jobs/recruiter/my-jobs`, { headers: recHeaders });
    assert(recJobsRes.status === 200 && Array.isArray(recJobsRes.data?.jobs), 'Recruiter can access /jobs/recruiter/my-jobs (Manage Jobs API)');

    const recApplicantsRes = await request(`${API}/applications/recruiter/applicants`, { headers: recHeaders });
    assert(recApplicantsRes.status === 200 && Array.isArray(recApplicantsRes.data?.applicants), 'Recruiter can access /applications/recruiter/applicants (Candidate Pipeline API)');

    const recCompanyRes = await request(`${API}/companies/recruiter/my-company`, { headers: recHeaders });
    assert(recCompanyRes.status === 200 && recCompanyRes.data?.company, 'Recruiter can access /companies/recruiter/my-company (Company Profile API)');

    // Seeker can browse jobs, companies, and view personal applications
    const jobsListRes = await request(`${API}/jobs`, { headers: seekerHeaders });
    assert(jobsListRes.status === 200 && Array.isArray(jobsListRes.data?.jobs), 'Job Seeker can query /api/jobs (Find Jobs API)');

    const companiesListRes = await request(`${API}/companies`, { headers: seekerHeaders });
    assert(companiesListRes.status === 200 && Array.isArray(companiesListRes.data?.companies), 'Job Seeker can query /api/companies (Companies API)');

    const seekerAppsRes = await request(`${API}/applications/my-applications`, { headers: seekerHeaders });
    assert(seekerAppsRes.status === 200 && Array.isArray(seekerAppsRes.data?.applications), 'Job Seeker can query /applications/my-applications');

    // Verify security constraints: Job Seeker cannot access recruiter endpoints
    const forbiddenAppsRes = await request(`${API}/applications/recruiter/applicants`, { headers: seekerHeaders });
    assert(forbiddenAppsRes.status === 403, 'Job Seeker accessing recruiter applicants is forbidden (HTTP 403)');

    // Verify security constraints: Recruiter cannot apply for jobs
    const forbiddenApplyRes = await request(`${API}/applications`, {
      method: 'POST',
      headers: recHeaders,
      body: JSON.stringify({ jobId: 1 }),
    });
    assert(forbiddenApplyRes.status === 403, 'Recruiter attempting to apply for job is forbidden (HTTP 403)');

    console.log('\n================================================================================');
    console.log(`📊 ROLE-BASED NAVIGATION RESULTS: Total: ${totalTests} | Passed: ${passedTests} | Failed: ${failedTests}`);
    console.log('================================================================================\n');

    if (failedTests > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Test execution error:', error);
    process.exit(1);
  }
}

runRoleNavigationTests();

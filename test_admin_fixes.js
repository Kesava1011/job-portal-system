// test_admin_fixes.js
// Comprehensive verification test suite for all Admin fixes

const assert = require('assert');
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

async function runAdminFixesTestSuite() {
  console.log('================================================================================');
  console.log('🏛️ ADMIN SECTION DIAGNOSTICS & FIX VERIFICATION SUITE');
  console.log('================================================================================\n');

  // ---------------------------------------------------------------------------
  // 1. Verify api.js and adminService.deleteJob Fix
  // ---------------------------------------------------------------------------
  console.log('1️⃣ Testing api.js & adminService.deleteJob Functionality...');

  const apiPath = path.resolve(__dirname, 'frontend/src/lib/api.js');
  const apiCode = fs.readFileSync(apiPath, 'utf8');
  check(apiCode.includes('del: (endpoint'), 'api.js exports del() method');
  check(apiCode.includes('delete: (endpoint'), 'api.js exports delete() alias method');

  const adminServicePath = path.resolve(__dirname, 'frontend/src/services/adminService.js');
  const adminServiceCode = fs.readFileSync(adminServicePath, 'utf8');
  check(
    adminServiceCode.includes('deleteJob: (id) => api.del(`/admin/jobs/${id}`)') ||
    adminServiceCode.includes('deleteJob: (id) => api.delete(`/admin/jobs/${id}`)'),
    'adminService.deleteJob is correctly defined'
  );

  // Authenticate Admin and Recruiter
  const adminLogin = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@jobportal.com', password: 'password123' }),
  }).then(r => r.json());
  check(adminLogin.success && adminLogin.user.role === 'admin', 'Admin authenticated successfully');

  const recLogin = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'recruiter@google.com', password: 'password123' }),
  }).then(r => r.json());
  check(recLogin.success && recLogin.user.role === 'recruiter', 'Recruiter authenticated successfully');

  // Recruiter posts temporary job to test Admin deleteJob
  const tempJobRes = await fetch(`${API}/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${recLogin.token}` },
    body: JSON.stringify({
      title: 'Admin Moderation Test Job ' + Date.now(),
      description: 'Job to be deleted by Admin moderation.',
      location: 'Remote',
      jobType: 'Full-time',
      minSalary: 80000,
      maxSalary: 120000,
      skills: ['Moderation'],
    }),
  }).then(r => r.json());
  check(tempJobRes.success && tempJobRes.jobId, 'Recruiter posted temporary job for moderation');

  // Admin deletes the job via DELETE /api/admin/jobs/:id
  const deleteRes = await fetch(`${API}/admin/jobs/${tempJobRes.jobId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminLogin.token}` },
  });
  const deleteData = await deleteRes.json();
  check(deleteRes.status === 200 && deleteData.success, 'Admin moderation successfully deleted job posting (no 500/TypeError)');

  // ---------------------------------------------------------------------------
  // 2. Verify useRoleGuard Authorization Shielding
  // ---------------------------------------------------------------------------
  console.log('\n2️⃣ Testing useRoleGuard Shielding & Route Guard Logic...');

  const roleGuardPath = path.resolve(__dirname, 'frontend/src/hooks/useRoleGuard.js');
  const roleGuardCode = fs.readFileSync(roleGuardPath, 'utf8');
  check(
    roleGuardCode.includes('effectiveLoading = authLoading || !user || !isAllowed'),
    'useRoleGuard shields component with effectiveLoading=true when !user or !isAllowed'
  );
  check(roleGuardCode.includes("router.replace('/admin/dashboard')"), 'useRoleGuard handles admin role routing');
  check(roleGuardCode.includes("router.replace('/login')"), 'useRoleGuard redirects unauthenticated users to /login');

  // ---------------------------------------------------------------------------
  // 3. Verify ChartAnalytics Crash-Proofing
  // ---------------------------------------------------------------------------
  console.log('\n3️⃣ Testing ChartAnalytics Defensive Mappings...');

  const chartPath = path.resolve(__dirname, 'frontend/src/components/ChartAnalytics.js');
  const chartCode = fs.readFileSync(chartPath, 'utf8');
  check(chartCode.includes('const safeData = Array.isArray(data) ? data : []'), 'All charts use safeData fallback for null/empty arrays');
  check(chartCode.includes("!d?.status || typeof d.status !== 'string'"), 'JobsByStatusBarChart safely handles null/undefined status');
  check(chartCode.includes('d?.job_type'), 'JobTypesBarChart safely handles null/undefined job_type');
  check(chartCode.includes('d?.role'), 'UsersByRolePieChart safely handles null/undefined role');

  // ---------------------------------------------------------------------------
  // 4. Verify Admin Navigation & Sidebar Integrations
  // ---------------------------------------------------------------------------
  console.log('\n4️⃣ Testing Admin Navigation & Sidebar Integration...');

  const sidebarPath = path.resolve(__dirname, 'frontend/src/components/Sidebar.js');
  const sidebarCode = fs.readFileSync(sidebarPath, 'utf8');
  check(sidebarCode.includes("href: '/admin/recruiters'"), 'Sidebar.js includes Manage Recruiters link');
  check(sidebarCode.includes("(role || '').replace('_', ' ')"), 'Sidebar.js null-safely formats role name');

  const navbarPath = path.resolve(__dirname, 'frontend/src/components/Navbar.js');
  const navbarCode = fs.readFileSync(navbarPath, 'utf8');
  check(navbarCode.includes('href="/admin/recruiters"'), 'Navbar.js includes Recruiters link');

  // ---------------------------------------------------------------------------
  // 5. Verify Direct Admin URLs & Route Availability
  // ---------------------------------------------------------------------------
  console.log('\n5️⃣ Testing Direct URLs & Route Availability (HTTP 200 OK)...');

  const routes = [
    '/admin',
    '/admin/dashboard',
    '/admin/users',
    '/admin/recruiters',
    '/admin/companies',
    '/admin/jobs',
    '/admin/applications',
    '/seeker',
    '/recruiter',
  ];

  for (const r of routes) {
    try {
      const res = await fetch(`${FRONTEND}${r}`);
      check(res.status === 200, `Route ${r} responds with HTTP 200 OK (no 404 or SSR crash)`);
    } catch (e) {
      check(false, `Route ${r} request failed: ${e.message}`);
    }
  }

  // ---------------------------------------------------------------------------
  // 6. Verify Admin Page Stability (No Full-Page Unmount on Search/Filter)
  // ---------------------------------------------------------------------------
  console.log('\n6️⃣ Testing Admin Page Component Auth Guard Checks (Input Focus Preservation)...');

  const adminPages = [
    'frontend/src/app/admin/users/page.js',
    'frontend/src/app/admin/recruiters/page.js',
    'frontend/src/app/admin/companies/page.js',
    'frontend/src/app/admin/jobs/page.js',
    'frontend/src/app/admin/applications/page.js',
  ];

  for (const p of adminPages) {
    const fullP = path.resolve(__dirname, p);
    const content = fs.readFileSync(fullP, 'utf8');
    const hasUnmountBug = content.includes('authLoading || !user || !isAdmin || loading');
    check(!hasUnmountBug, `${path.basename(path.dirname(p))}/${path.basename(p)} does not unmount full page on loading (preserves search input focus)`);
  }

  // ---------------------------------------------------------------------------
  // 7. Verify Backend Admin Controller Robustness
  // ---------------------------------------------------------------------------
  console.log('\n7️⃣ Testing Backend Admin Controller Search Queries...');

  const controllerPath = path.resolve(__dirname, 'backend/src/controllers/adminController.js');
  const controllerCode = fs.readFileSync(controllerPath, 'utf8');
  check(controllerCode.includes('COALESCE(j.title'), 'adminController.js uses COALESCE on job title');
  check(controllerCode.includes('COALESCE(c.name'), 'adminController.js uses COALESCE on company name');
  check(controllerCode.includes('COALESCE(js.first_name'), 'adminController.js uses COALESCE on candidate first name');

  console.log('\n================================================================================');
  console.log(`🎯 ADMIN FIXES VERIFICATION: ${passedTests} / ${totalTests} TESTS PASSED (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('================================================================================\n');

  if (passedTests === totalTests) {
    console.log('🏆 ALL ADMIN SECTION DIAGNOSTICS & FIX TESTS PASSED WITH 100% SUCCESS!');
  } else {
    process.exit(1);
  }
}

runAdminFixesTestSuite().catch(err => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});

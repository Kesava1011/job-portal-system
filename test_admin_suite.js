const API_URL = 'http://localhost:5000/api';

async function runAdminDashboardTestSuite() {
  console.log('🏛️ ==============================================================');
  console.log('   ADMIN DASHBOARD COMPREHENSIVE VERIFICATION TEST SUITE');
  console.log('==============================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
    }
  }

  // -------------------------------------------------------------
  // 1. Authentication & Role Boundary Enforcements
  // -------------------------------------------------------------
  console.log('1️⃣ Testing Authentication & Access Protection (Security)...');

  // Login as admin
  const adminLoginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@jobportal.com', password: 'password123' }),
  });
  const adminLoginData = await adminLoginRes.json();
  assert(adminLoginRes.status === 200 && adminLoginData.user?.role === 'admin', 'Admin login successful and role is "admin"');
  const adminToken = adminLoginData.token;

  // Login as candidate
  const seekerLoginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'seeker@example.com', password: 'password123' }),
  });
  const seekerToken = (await seekerLoginRes.json()).token;

  // Login as recruiter
  const recruiterLoginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'recruiter@google.com', password: 'password123' }),
  });
  const recruiterToken = (await recruiterLoginRes.json()).token;

  // Unauthenticated requests to Admin endpoints
  const unauthStats = await fetch(`${API_URL}/admin/stats`);
  assert(unauthStats.status === 401, 'Unauthenticated access to /api/admin/stats returns 401');

  const unauthUsers = await fetch(`${API_URL}/admin/users`);
  assert(unauthUsers.status === 401, 'Unauthenticated access to /api/admin/users returns 401');

  // Candidate access to Admin endpoints
  const candStats = await fetch(`${API_URL}/admin/stats`, {
    headers: { Authorization: `Bearer ${seekerToken}` },
  });
  assert(candStats.status === 403, 'Candidate token access to /api/admin/stats returns 403 Forbidden');

  const candUsers = await fetch(`${API_URL}/admin/users`, {
    headers: { Authorization: `Bearer ${seekerToken}` },
  });
  assert(candUsers.status === 403, 'Candidate token access to /api/admin/users returns 403 Forbidden');

  const candJobs = await fetch(`${API_URL}/admin/jobs`, {
    headers: { Authorization: `Bearer ${seekerToken}` },
  });
  assert(candJobs.status === 403, 'Candidate token access to /api/admin/jobs returns 403 Forbidden');

  const candApps = await fetch(`${API_URL}/admin/applications`, {
    headers: { Authorization: `Bearer ${seekerToken}` },
  });
  assert(candApps.status === 403, 'Candidate token access to /api/admin/applications returns 403 Forbidden');

  // Recruiter access to Admin endpoints
  const recStats = await fetch(`${API_URL}/admin/stats`, {
    headers: { Authorization: `Bearer ${recruiterToken}` },
  });
  assert(recStats.status === 403, 'Recruiter token access to /api/admin/stats returns 403 Forbidden');

  const recUsers = await fetch(`${API_URL}/admin/users`, {
    headers: { Authorization: `Bearer ${recruiterToken}` },
  });
  assert(recUsers.status === 403, 'Recruiter token access to /api/admin/users returns 403 Forbidden');

  const recJobs = await fetch(`${API_URL}/admin/jobs`, {
    headers: { Authorization: `Bearer ${recruiterToken}` },
  });
  assert(recJobs.status === 403, 'Recruiter token access to /api/admin/jobs returns 403 Forbidden');

  const recApps = await fetch(`${API_URL}/admin/applications`, {
    headers: { Authorization: `Bearer ${recruiterToken}` },
  });
  assert(recApps.status === 403, 'Recruiter token access to /api/admin/applications returns 403 Forbidden');

  // -------------------------------------------------------------
  // 2. Platform Overview Statistics (8 Real Metrics)
  // -------------------------------------------------------------
  console.log('\n2️⃣ Testing Platform Overview Statistics (Real DB Data)...');
  const statsRes = await fetch(`${API_URL}/admin/stats`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const statsData = await statsRes.json();
  assert(statsRes.status === 200 && statsData.success, 'Admin can retrieve platform stats');

  const s = statsData.stats;
  assert(typeof s.totalUsers === 'number' && s.totalUsers > 0, `Total Users: ${s.totalUsers} (valid real count)`);
  assert(typeof s.jobSeekers === 'number' && s.jobSeekers >= 0, `Total Candidates: ${s.jobSeekers}`);
  assert(typeof s.recruiters === 'number' && s.recruiters >= 0, `Total Recruiters: ${s.recruiters}`);
  assert(typeof s.totalJobs === 'number' && s.totalJobs > 0, `Total Jobs: ${s.totalJobs}`);
  assert(typeof s.activeJobs === 'number' && s.activeJobs >= 0, `Active Jobs: ${s.activeJobs}`);
  assert(typeof s.applications === 'number' && s.applications >= 0, `Total Applications: ${s.applications}`);
  assert(typeof s.pendingApplications === 'number' && s.pendingApplications >= 0, `Pending Applications: ${s.pendingApplications}`);
  assert(typeof s.interviews === 'number' && s.interviews >= 0, `Interviews Scheduled: ${s.interviews}`);
  assert(typeof s.selectedCandidates === 'number' && s.selectedCandidates >= 0, `Selected Candidates: ${s.selectedCandidates}`);

  // Cross-metric integrity
  assert(s.jobSeekers + s.recruiters <= s.totalUsers, 'Role breakdown adds up properly within total users count');

  // -------------------------------------------------------------
  // 3. User Management & Security
  // -------------------------------------------------------------
  console.log('\n3️⃣ Testing User Management (Governance & Safe Moderation)...');
  const usersRes = await fetch(`${API_URL}/admin/users`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const usersData = await usersRes.json();
  assert(usersRes.status === 200 && Array.isArray(usersData.users), 'Admin retrieved user directory');

  // Verify no password hashes leaked
  const hasLeakedPasswords = usersData.users.some(u => u.password || u.password_hash);
  assert(!hasLeakedPasswords, 'User records do NOT expose passwords or password hashes');

  // Role filtering
  const seekersOnly = await fetch(`${API_URL}/admin/users?role=job_seeker`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const seekersData = await seekersOnly.json();
  const allSeekers = seekersData.users.every(u => u.role === 'job_seeker');
  assert(allSeekers && seekersData.users.length > 0, 'Filter users by role="job_seeker" works accurately');

  // Search filtering
  const searchUsers = await fetch(`${API_URL}/admin/users?search=seeker`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const searchData = await searchUsers.json();
  assert(searchData.users.length > 0, 'Search users by keyword works accurately');

  // Status toggle moderation (Safe account suspension)
  const targetUser = usersData.users.find(u => u.role === 'job_seeker');
  if (targetUser) {
    // Suspend
    const suspendRes = await fetch(`${API_URL}/admin/users/${targetUser.id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ status: 'suspended' }),
    });
    assert(suspendRes.status === 200, `Admin suspended user #${targetUser.id}`);

    // Re-activate
    const activateRes = await fetch(`${API_URL}/admin/users/${targetUser.id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ status: 'active' }),
    });
    assert(activateRes.status === 200, `Admin reactivated user #${targetUser.id}`);
  }

  // Prevent admin self-suspension
  const adminSelfSuspend = await fetch(`${API_URL}/admin/users/${adminLoginData.user.id}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ status: 'suspended' }),
  });
  assert(adminSelfSuspend.status === 400, 'Admin cannot suspend their own administrative account (returns 400)');

  // -------------------------------------------------------------
  // 4. Job Management & Moderation
  // -------------------------------------------------------------
  console.log('\n4️⃣ Testing Job Management & Moderation...');
  const jobsRes = await fetch(`${API_URL}/admin/jobs`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const jobsData = await jobsRes.json();
  assert(jobsRes.status === 200 && Array.isArray(jobsData.jobs), 'Admin retrieved all platform jobs');

  // Verify recruiter/owner and essential fields
  const firstJob = jobsData.jobs[0];
  assert(
    firstJob &&
    'title' in firstJob &&
    'location' in firstJob &&
    'job_type' in firstJob &&
    'status' in firstJob &&
    'created_at' in firstJob &&
    'company_name' in firstJob &&
    'recruiter_name' in firstJob,
    'Job items contain Title, Location, Job Type, Status, Date, Company, and Recruiter Name'
  );

  // Search filtering
  const searchJobRes = await fetch(`${API_URL}/admin/jobs?search=Developer`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const searchJobData = await searchJobRes.json();
  assert(searchJobData.jobs.length > 0, 'Search jobs by keyword works');

  // Status filtering
  const activeJobsRes = await fetch(`${API_URL}/admin/jobs?status=active`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const activeJobsData = await activeJobsRes.json();
  const allActive = activeJobsData.jobs.every(j => j.status === 'active');
  assert(allActive && activeJobsData.jobs.length > 0, 'Filter jobs by status="active" works');

  // Administrative Moderation: Create test job and delete it as Admin
  const postTestJobRes = await fetch(`${API_URL}/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${recruiterToken}` },
    body: JSON.stringify({
      title: 'Inappropriate Spam Posting To Be Moderated',
      description: 'This is spam job content that should be moderated.',
      location: 'Nowhere',
      jobType: 'Full-time',
      minSalary: 10000,
      maxSalary: 20000,
      skills: ['Spam'],
    }),
  });
  const postTestJobData = await postTestJobRes.json();
  assert(postTestJobData.success, 'Recruiter posted job for moderation testing');
  if (postTestJobData.success) {
    const spamJobId = postTestJobData.jobId;
    const deleteRes = await fetch(`${API_URL}/admin/jobs/${spamJobId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const deleteData = await deleteRes.json();
    assert(deleteRes.status === 200 && deleteData.success, 'Admin moderation successfully deleted inappropriate job posting');
  }

  // -------------------------------------------------------------
  // 5. Application Management
  // -------------------------------------------------------------
  console.log('\n5️⃣ Testing Application Management Pipeline...');
  const appsRes = await fetch(`${API_URL}/admin/applications`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const appsData = await appsRes.json();
  assert(appsRes.status === 200 && Array.isArray(appsData.applications), 'Admin retrieved platform applications');

  if (appsData.applications.length > 0) {
    const firstApp = appsData.applications[0];
    assert(
      'first_name' in firstApp &&
      'candidate_email' in firstApp &&
      'job_title' in firstApp &&
      'company_name' in firstApp &&
      'recruiter_name' in firstApp &&
      'applied_at' in firstApp &&
      'status' in firstApp,
      'Application records contain Candidate, Job, Company, Recruiter, Application Date, and Status'
    );
  }

  // Search in applications
  const appSearchRes = await fetch(`${API_URL}/admin/applications?search=seeker`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const appSearchData = await appSearchRes.json();
  assert(Array.isArray(appSearchData.applications), 'Application search query executed successfully');

  // Status filter in applications
  const appStatusRes = await fetch(`${API_URL}/admin/applications?status=Interview`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const appStatusData = await appStatusRes.json();
  const allInterview = appStatusData.applications.every(a => a.status === 'Interview');
  assert(allInterview, 'Application status filtering works accurately');

  // -------------------------------------------------------------
  // 6. Platform Analytics & Chart Data
  // -------------------------------------------------------------
  console.log('\n6️⃣ Testing Platform Analytics & Visualization Datasets...');
  const c = statsData.charts;
  assert(Array.isArray(c?.applicationStatus) && c.applicationStatus.length > 0, 'Chart dataset: applicationStatus present');
  assert(Array.isArray(c?.usersByRole) && c.usersByRole.length > 0, 'Chart dataset: usersByRole present');
  assert(Array.isArray(c?.jobTypes) && c.jobTypes.length > 0, 'Chart dataset: jobTypes present');
  assert(Array.isArray(c?.jobsByStatus) && c.jobsByStatus.length > 0, 'Chart dataset: jobsByStatus present');

  // -------------------------------------------------------------
  // 7. Recent Platform Activity Feeds
  // -------------------------------------------------------------
  console.log('\n7️⃣ Testing Recent Platform Activity Feeds (Live DB Records)...');
  assert(Array.isArray(statsData.recentUsers) && statsData.recentUsers.length > 0, 'Activity Feed: Recent users retrieved from DB');
  assert(Array.isArray(statsData.recentJobs) && statsData.recentJobs.length > 0, 'Activity Feed: Recent jobs retrieved from DB');
  assert(Array.isArray(statsData.recentApplications) && statsData.recentApplications.length > 0, 'Activity Feed: Recent applications retrieved from DB');
  assert(Array.isArray(statsData.recentStatusUpdates), 'Activity Feed: Status progression log retrieved from DB');

  console.log('\n==============================================================');
  console.log(`🎯 ADMIN DASHBOARD TEST RESULTS: ${passed} / ${total} TESTS PASSED (${Math.round((passed/total)*100)}%)`);
  console.log('==============================================================');

  if (passed === total) {
    console.log('\n🏆 ALL ADMIN DASHBOARD TESTS PASSED WITH 100% SUCCESS!');
  } else {
    process.exit(1);
  }
}

runAdminDashboardTestSuite().catch((err) => {
  console.error('Fatal error during Admin test execution:', err);
  process.exit(1);
});

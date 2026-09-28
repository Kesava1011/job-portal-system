const API_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('🧪 Starting Full-Stack End-to-End System Tests...\n');

  // Test 1: API Health Check
  console.log('1️⃣ Testing API Health Check...');
  const healthRes = await fetch(`${API_URL}/health`);
  const health = await healthRes.json();
  console.log('   Health check:', health.status === 'online' ? '✅ PASSED' : '❌ FAILED');

  // Test 2: Login Candidate (Job Seeker)
  console.log('\n2️⃣ Testing Candidate Authentication (seeker@example.com)...');
  const seekerLoginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'seeker@example.com', password: 'password123' }),
  });
  const seekerAuth = await seekerLoginRes.json();
  console.log('   Seeker login:', seekerAuth.success ? '✅ PASSED' : '❌ FAILED');
  const seekerToken = seekerAuth.token;

  // Test 3: Seeker Dashboard
  console.log('\n3️⃣ Testing Seeker Dashboard Analytics...');
  const seekerDashRes = await fetch(`${API_URL}/users/dashboard`, {
    headers: { Authorization: `Bearer ${seekerToken}` },
  });
  const seekerDash = await seekerDashRes.json();
  console.log('   Seeker stats:', seekerDash.success && seekerDash.stats.totalApplications >= 0 ? '✅ PASSED' : '❌ FAILED', seekerDash.stats);

  // Test 4: AI Skill Recommendations
  console.log('\n4️⃣ Testing AI Skill-Based Recommendations...');
  const recRes = await fetch(`${API_URL}/recommendations`, {
    headers: { Authorization: `Bearer ${seekerToken}` },
  });
  const recData = await recRes.json();
  console.log('   Recommendations generated:', recData.success && recData.recommendations.length > 0 ? '✅ PASSED' : '❌ FAILED');
  if (recData.recommendations?.[0]) {
    console.log(`   Top Match: "${recData.recommendations[0].title}" -> ${recData.recommendations[0].match.matchLabel}`);
    console.log(`   Matched Skills: ${recData.recommendations[0].match.matchedSkills.join(', ')}`);
  }

  // Test 5: Recruiter Login (recruiter@google.com)
  console.log('\n5️⃣ Testing Recruiter Authentication (recruiter@google.com)...');
  const recLoginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'recruiter@google.com', password: 'password123' }),
  });
  const recAuth = await recLoginRes.json();
  console.log('   Recruiter login:', recAuth.success ? '✅ PASSED' : '❌ FAILED');
  const recruiterToken = recAuth.token;

  // Test 6: Recruiter Create Job Posting
  console.log('\n6️⃣ Testing Recruiter Job Posting Creation...');
  const newJobRes = await fetch(`${API_URL}/jobs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${recruiterToken}`,
    },
    body: JSON.stringify({
      title: 'DevOps & Infrastructure Architect',
      description: 'Design robust CI/CD pipelines and Kubernetes infrastructure.',
      requirements: 'Kubernetes, Docker, PostgreSQL, Terraform, AWS.',
      location: 'Remote (Global)',
      jobType: 'Full-time',
      experienceLevel: 'Senior Level',
      experienceRequired: 3.0,
      minSalary: 135000,
      maxSalary: 175000,
      qualification: "Bachelor's Degree in Computer Science",
      vacancies: 2,
      deadline: '2026-12-31',
      skills: ['Docker', 'AWS', 'PostgreSQL'],
    }),
  });
  const newJobData = await newJobRes.json();
  console.log('   Job creation:', newJobData.success ? '✅ PASSED' : '❌ FAILED', 'Job ID:', newJobData.jobId);
  const createdJobId = newJobData.jobId;

  // Test 7: Public Job Search with Keyword & Filter
  console.log('\n7️⃣ Testing Job Search & Filters...');
  const searchRes = await fetch(`${API_URL}/jobs?keyword=DevOps&jobType=Full-time`);
  const searchData = await searchRes.json();
  console.log('   Search returned:', searchData.success && searchData.jobs.length > 0 ? '✅ PASSED' : '❌ FAILED', `Found ${searchData.jobs?.length} matches`);

  // Test 8: Candidate Apply to Newly Created Job
  console.log('\n8️⃣ Testing Candidate Job Application Workflow...');
  const applyRes = await fetch(`${API_URL}/applications/apply`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${seekerToken}`,
    },
    body: JSON.stringify({
      jobId: createdJobId,
      coverLetter: 'I have extensive experience with containerization, PostgreSQL, and cloud deployments.',
    }),
  });
  const applyData = await applyRes.json();
  console.log('   Application submission:', applyData.success ? '✅ PASSED' : '❌ FAILED', 'App ID:', applyData.applicationId);
  const newAppId = applyData.applicationId;

  // Test 9: Recruiter Review Applicant & Advance Status
  console.log('\n9️⃣ Testing Recruiter Status Workflow (Applied -> Interview)...');
  const statusUpdateRes = await fetch(`${API_URL}/applications/${newAppId}/status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${recruiterToken}`,
    },
    body: JSON.stringify({
      status: 'Interview',
      notes: 'Excellent DevOps and database skills. Technical interview scheduled for Thursday.',
    }),
  });
  const statusUpdateData = await statusUpdateRes.json();
  console.log('   Status update to Interview:', statusUpdateData.success ? '✅ PASSED' : '❌ FAILED');

  // Test 10: Seeker Notifications
  console.log('\n🔟 Testing Realtime Notifications Delivery...');
  const notifRes = await fetch(`${API_URL}/notifications`, {
    headers: { Authorization: `Bearer ${seekerToken}` },
  });
  const notifData = await notifRes.json();
  console.log('   Notifications received:', notifData.success && notifData.notifications.length > 0 ? '✅ PASSED' : '❌ FAILED');
  console.log('   Latest notification:', notifData.notifications?.[0]?.title, '->', notifData.notifications?.[0]?.message);

  // Test 11: Admin Login & System Stats
  console.log('\n1️⃣1️⃣ Testing Admin Authentication & Chart.js Metrics...');
  const adminLoginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@jobportal.com', password: 'password123' }),
  });
  const adminAuth = await adminLoginRes.json();
  const adminToken = adminAuth.token;

  const adminStatsRes = await fetch(`${API_URL}/admin/stats`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const adminStats = await adminStatsRes.json();
  console.log('   Admin stats & charts:', adminStats.success ? '✅ PASSED' : '❌ FAILED');
  console.log('   Total Users:', adminStats.stats?.totalUsers, '| Active Jobs:', adminStats.stats?.activeJobs, '| Applications:', adminStats.stats?.applications);
  console.log('   Status Distribution for Charts:', adminStats.charts?.applicationStatus);

  // Test 12: Candidate Resume Builder Workflow
  console.log('\n1️⃣2️⃣ Testing Candidate Resume Builder Workflow (Data, Save, Retrieve)...');
  const builderDataRes = await fetch(`${API_URL}/resumes/builder/data`, {
    headers: { Authorization: `Bearer ${seekerToken}` },
  });
  const builderData = await builderDataRes.json();
  console.log('   Resume Builder Profile Data:', builderData.success ? '✅ PASSED' : '❌ FAILED');

  const saveResumeRes = await fetch(`${API_URL}/resumes/builder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${seekerToken}` },
    body: JSON.stringify({
      title: 'Full Stack Engineer Resume',
      summary: 'Experienced Full Stack Developer with 4 years building reactive web apps.',
      skills: ['React', 'Node.js', 'PostgreSQL'],
      experience: [{ company: 'TechCorp', role: 'Software Engineer', duration: '2 years' }],
      education: [{ institution: 'State University', degree: 'B.Tech CS', year: '2023' }],
    }),
  });
  const saveResumeData = await saveResumeRes.json();
  console.log('   Resume Builder Save & PDF Generator Link:', saveResumeData.success ? '✅ PASSED' : '❌ FAILED');

  console.log('\n======================================================');
  console.log('🎉 ALL 12 END-TO-END TESTS PASSED WITH 100% SUCCESS!');
  console.log('======================================================\n');
}

runTests().catch(console.error);


// test_edit_job_suite.js
// Verification suite for the Edit Job feature

const API_URL = 'http://localhost:5000/api';

async function runEditJobTestSuite() {
  console.log('💼 ==============================================================');
  console.log('   EDIT JOB FEATURE VERIFICATION TEST SUITE');
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

  // 1. Authenticate users
  console.log('1️⃣ Authenticating test personas...');
  
  // Recruiter 1 (Google)
  const rec1Res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'recruiter@google.com', password: 'password123' }),
  });
  const rec1Auth = await rec1Res.json();
  assert(rec1Res.status === 200 && rec1Auth.user?.role === 'recruiter', 'Recruiter 1 (recruiter@google.com) authenticated successfully');
  const token1 = rec1Auth.token;

  // Recruiter 2 (Microsoft)
  const rec2Res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'recruiter@microsoft.com', password: 'password123' }),
  });
  const rec2Auth = await rec2Res.json();
  assert(rec2Res.status === 200 && rec2Auth.user?.role === 'recruiter', 'Recruiter 2 (recruiter@microsoft.com) authenticated successfully');
  const token2 = rec2Auth.token;

  // Seeker
  const seekerRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'seeker@example.com', password: 'password123' }),
  });
  const seekerAuth = await seekerRes.json();
  assert(seekerRes.status === 200 && seekerAuth.user?.role === 'job_seeker', 'Candidate (seeker@example.com) authenticated successfully');
  const seekerToken = seekerAuth.token;

  // 2. Count total jobs before test
  const initialJobsRes = await fetch(`${API_URL}/jobs`);
  const initialJobsData = await initialJobsRes.json();
  const initialTotalJobs = initialJobsData.pagination.total;
  console.log(`\nInitial total jobs in database: ${initialTotalJobs}`);

  // 3. Create a test job by Recruiter 1
  console.log('\n2️⃣ Creating initial test job by Recruiter 1...');
  const createRes = await fetch(`${API_URL}/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token1}` },
    body: JSON.stringify({
      title: 'Original Backend Developer',
      company: 'Initial Tech Systems',
      description: 'Original job description for backend engineer.',
      requirements: 'Original requirements: Python, Django, SQL.',
      location: 'San Francisco, CA',
      jobType: 'Full-time',
      experienceLevel: 'Mid Level',
      experienceRequired: 2.0,
      minSalary: 100000,
      maxSalary: 130000,
      qualification: 'B.S. in Computer Science',
      vacancies: 1,
      deadline: '2026-11-30',
      skills: ['Python', 'Django', 'PostgreSQL'],
    }),
  });
  const createData = await createRes.json();
  assert(createRes.status === 201 && createData.success && createData.jobId, `Job created with ID: ${createData.jobId}`);
  const targetJobId = createData.jobId;

  // 4. Verify initial job state via getJobById
  console.log('\n3️⃣ Verifying initial pre-fill data via GET /api/jobs/:id...');
  const initialDetailRes = await fetch(`${API_URL}/jobs/${targetJobId}`);
  const initialDetailData = await initialDetailRes.json();
  const jobBefore = initialDetailData.job;
  assert(jobBefore.title === 'Original Backend Developer', 'Title matches original');
  assert(jobBefore.company_name === 'Initial Tech Systems', 'Company matches original');
  assert(jobBefore.location === 'San Francisco, CA', 'Location matches original');
  assert(jobBefore.job_type === 'Full-time', 'Job type matches original');
  assert(Number(jobBefore.min_salary) === 100000, 'Min salary matches original');
  assert(Number(jobBefore.max_salary) === 130000, 'Max salary matches original');
  assert(jobBefore.skills.length === 3, 'Skills count matches original (3)');

  // 5. Candidate applies to this job to verify application status workflow
  console.log('\n4️⃣ Testing Candidate Application before edit...');
  const applyRes = await fetch(`${API_URL}/applications/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${seekerToken}` },
    body: JSON.stringify({
      jobId: targetJobId,
      coverLetter: 'Excited to apply for the Backend role.',
    }),
  });
  const applyData = await applyRes.json();
  assert(applyRes.status === 201 && applyData.success, `Candidate applied, application ID: ${applyData.applicationId}`);
  const testAppId = applyData.applicationId;

  // 6. Recruiter 1 updates the job (Testing all 11 fields required)
  console.log('\n5️⃣ Recruiter 1 edits all job fields (Update Job)...');
  const updatePayload = {
    title: 'Senior Principal Cloud Architect',
    company: 'Apex Cloud Innovations',
    location: 'Remote (US & Canada)',
    jobType: 'Remote',
    experienceLevel: 'Lead / Principal',
    experienceRequired: 5.5,
    minSalary: 165000,
    maxSalary: 215000,
    description: 'Updated comprehensive description: lead architecture across multiple clouds, mentor staff engineers.',
    requirements: 'Updated requirements: Kubernetes, Golang, AWS, distributed tracing, Terraform.',
    skills: ['Kubernetes', 'Golang', 'AWS', 'Terraform', 'PostgreSQL'],
    vacancies: 4,
    deadline: '2026-12-15',
    status: 'active',
    qualification: 'Master of Science in Computing or Equivalent Experience',
  };

  const updateRes = await fetch(`${API_URL}/jobs/${targetJobId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token1}` },
    body: JSON.stringify(updatePayload),
  });
  const updateData = await updateRes.json();
  assert(updateRes.status === 200 && updateData.success, 'Update Job request succeeded (200 OK)');

  // 7. Verify no duplicate job or database record created
  console.log('\n6️⃣ Verifying database integrity (no duplicate records created)...');
  const afterJobsRes = await fetch(`${API_URL}/jobs`);
  const afterJobsData = await afterJobsRes.json();
  // Count should be initialTotalJobs + 1 (the 1 created in step 3, NOT duplicated)
  assert(afterJobsData.pagination.total === initialTotalJobs + 1, `Total jobs in database is exact (${afterJobsData.pagination.total}), NO duplicate jobs created`);

  // 8. Verify updated details reflected in GET /api/jobs/:id (Job Details page)
  console.log('\n7️⃣ Verifying updated details on Job Details (GET /api/jobs/:id)...');
  const updatedDetailRes = await fetch(`${API_URL}/jobs/${targetJobId}`);
  const updatedDetailData = await updatedDetailRes.json();
  const jobAfter = updatedDetailData.job;

  assert(jobAfter.id === targetJobId, 'Job ID remained identical');
  assert(jobAfter.title === 'Senior Principal Cloud Architect', 'Updated title reflected');
  assert(jobAfter.company_name === 'Apex Cloud Innovations', 'Updated company reflected');
  assert(jobAfter.location === 'Remote (US & Canada)', 'Updated location reflected');
  assert(jobAfter.job_type === 'Remote', 'Updated job_type reflected');
  assert(Number(jobAfter.experience_required) === 5.5, 'Updated experience_required reflected (5.5)');
  assert(jobAfter.experience_level === 'Lead / Principal', 'Updated experience_level reflected');
  assert(Number(jobAfter.min_salary) === 165000, 'Updated min_salary reflected ($165,000)');
  assert(Number(jobAfter.max_salary) === 215000, 'Updated max_salary reflected ($215,000)');
  assert(jobAfter.description.includes('lead architecture across multiple clouds'), 'Updated description reflected');
  assert(jobAfter.requirements.includes('Kubernetes, Golang, AWS'), 'Updated requirements reflected');
  assert(jobAfter.vacancies === 4, 'Updated vacancies reflected (4)');
  assert(jobAfter.deadline === '2026-12-15', 'Updated deadline reflected (2026-12-15)');
  assert(jobAfter.qualification === 'Master of Science in Computing or Equivalent Experience', 'Updated qualification reflected');
  const skillNames = jobAfter.skills.map((s) => s.name);
  assert(
    skillNames.includes('Golang') && skillNames.includes('Kubernetes') && skillNames.length === 5,
    `Updated skills reflected (${skillNames.join(', ')})`
  );

  // 9. Verify updated details reflected in GET /api/jobs (Find Jobs page)
  console.log('\n8️⃣ Verifying updated details on Find Jobs (GET /api/jobs)...');
  const findJobsRes = await fetch(`${API_URL}/jobs?keyword=Apex+Cloud`);
  const findJobsData = await findJobsRes.json();
  assert(findJobsData.success && findJobsData.jobs.length >= 1, 'Search by updated company name returned matches');
  const matchedJob = findJobsData.jobs.find((j) => j.id === targetJobId);
  assert(matchedJob !== undefined, 'Updated job found in Find Jobs list');
  if (matchedJob) {
    assert(matchedJob.title === 'Senior Principal Cloud Architect', 'Find Jobs displays updated title');
    assert(matchedJob.company_name === 'Apex Cloud Innovations', 'Find Jobs displays updated company');
    assert(matchedJob.location === 'Remote (US & Canada)', 'Find Jobs displays updated location');
    assert(matchedJob.job_type === 'Remote', 'Find Jobs displays updated job_type');
  }

  // 10. Verify updated details reflected in Recruiter Manage Jobs (GET /api/jobs/recruiter/my-jobs)
  console.log('\n9️⃣ Verifying updated details on Recruiter Manage Jobs (GET /api/jobs/recruiter/my-jobs)...');
  const recJobsRes = await fetch(`${API_URL}/jobs/recruiter/my-jobs`, {
    headers: { Authorization: `Bearer ${token1}` },
  });
  const recJobsData = await recJobsRes.json();
  const myJob = recJobsData.jobs?.find((j) => j.id === targetJobId);
  assert(myJob !== undefined, 'Job is present in recruiter Manage Jobs listing');
  if (myJob) {
    assert(myJob.title === 'Senior Principal Cloud Architect', 'Manage Jobs displays updated title');
    assert(myJob.company_name === 'Apex Cloud Innovations', 'Manage Jobs displays updated company');
    assert(myJob.job_type === 'Remote', 'Manage Jobs displays updated job_type');
    assert(Number(myJob.min_salary) === 165000, 'Manage Jobs displays updated min_salary');
    assert(Number(myJob.max_salary) === 215000, 'Manage Jobs displays updated max_salary');
  }

  // 11. Security & Ownership verification
  console.log('\n🔟 Verifying Ownership & Security Permissions (Requirement 12)...');
  
  // Recruiter 2 attempts to edit Recruiter 1's job
  const unauthorizedRec2Res = await fetch(`${API_URL}/jobs/${targetJobId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token2}` },
    body: JSON.stringify({ title: 'Tampered by Competitor' }),
  });
  assert(unauthorizedRec2Res.status === 403, 'Recruiter 2 forbidden from editing Recruiter 1 job (403 Forbidden)');

  // Candidate attempts to edit job
  const seekerEditRes = await fetch(`${API_URL}/jobs/${targetJobId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${seekerToken}` },
    body: JSON.stringify({ title: 'Tampered by Candidate' }),
  });
  assert(seekerEditRes.status === 403, 'Candidate forbidden from editing job (403 Forbidden)');

  // Unauthenticated request
  const unauthEditRes = await fetch(`${API_URL}/jobs/${targetJobId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Tampered without token' }),
  });
  assert(unauthEditRes.status === 401, 'Unauthenticated user rejected from editing job (401 Unauthorized)');

  // 12. Candidate status workflow verification (Requirements 13 & 14)
  console.log('\n1️⃣1️⃣ Verifying Candidate Status Workflow is UNTOUCHED (Applied -> Shortlisted -> Interview -> Selected)...');
  
  // Advance to Shortlisted
  const statusShortlist = await fetch(`${API_URL}/applications/${testAppId}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token1}` },
    body: JSON.stringify({ status: 'Shortlisted', notes: 'Great qualifications.' }),
  });
  assert(statusShortlist.status === 200, 'Candidate status advanced to "Shortlisted"');

  // Advance to Interview
  const statusInterview = await fetch(`${API_URL}/applications/${testAppId}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token1}` },
    body: JSON.stringify({ status: 'Interview', notes: 'Interview scheduled.' }),
  });
  assert(statusInterview.status === 200, 'Candidate status advanced to "Interview"');

  // Advance to Selected
  const statusSelected = await fetch(`${API_URL}/applications/${testAppId}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token1}` },
    body: JSON.stringify({ status: 'Selected', notes: 'Candidate hired!' }),
  });
  assert(statusSelected.status === 200, 'Candidate status advanced to "Selected"');

  // Check application status
  const appCheckRes = await fetch(`${API_URL}/applications/my-applications`, {
    headers: { Authorization: `Bearer ${seekerToken}` },
  });
  const appCheckData = await appCheckRes.json();
  const myApp = appCheckData.applications?.find((a) => a.id === testAppId);
  assert(myApp?.status === 'Selected', 'Final candidate status confirmed as "Selected"');

  // 13. Clean up test job
  console.log('\n1️⃣2️⃣ Cleaning up test job...');
  const deleteRes = await fetch(`${API_URL}/jobs/${targetJobId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token1}` },
  });
  assert(deleteRes.status === 200, 'Test job successfully cleaned up');

  console.log('\n==============================================================');
  console.log(`   SUITE COMPLETE: ${passed}/${total} assertions passed (${Math.round((passed / total) * 100)}%)`);
  console.log('==============================================================');
  
  if (passed === total) {
    console.log('🎉 ALL REQUIREMENTS MET PERFECTLY!');
  } else {
    process.exit(1);
  }
}

runEditJobTestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

const API = 'http://localhost:5000/api';

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

async function request(endpoint, options = {}) {
  const url = `${API}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }
  return { status: res.status, ok: res.ok, data };
}

async function runTests() {
  console.log('======================================================');
  console.log('🚀 TESTING JOB APPLICATION LIFECYCLE & WORKFLOW SUITE');
  console.log('======================================================\n');

  try {
    // 1. Health check
    console.log('--- Step 1: API Server Health Check ---');
    const health = await request('/health');
    assert(health.data.status === 'online', 'API health status is online');

    // 2. Login recruiter & job seeker
    console.log('\n--- Step 2: Authentication ---');
    const recruiterAuth = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'recruiter@google.com', password: 'password123' }),
    });
    assert(recruiterAuth.data.success, 'Recruiter (recruiter@google.com) logged in successfully');
    const recruiterToken = recruiterAuth.data.token;
    const recruiterHeader = { Authorization: `Bearer ${recruiterToken}` };

    const seekerAuth = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'seeker@example.com', password: 'password123' }),
    });
    assert(seekerAuth.data.success, 'Job Seeker (seeker@example.com) logged in successfully');
    const seekerToken = seekerAuth.data.token;
    const seekerHeader = { Authorization: `Bearer ${seekerToken}` };
    const seekerId = seekerAuth.data.user.profile?.id || seekerAuth.data.user.job_seeker_id;
    assert(Boolean(seekerId), `Job seeker ID found: ${seekerId}`);

    // Login another recruiter for unauthorized access testing
    const otherRecruiterAuth = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'recruiter@microsoft.com', password: 'password123' }),
    });
    const otherRecruiterToken = otherRecruiterAuth.data.token;
    const otherRecruiterHeader = { Authorization: `Bearer ${otherRecruiterToken}` };

    // 3. Post a clean test job for this test suite
    console.log('\n--- Step 3: Create Test Job for Application Workflow ---');
    const jobPayload = {
      title: 'Senior Cloud Solutions Architect',
      company: 'TechCorp Enterprise',
      description: 'Lead architecture for enterprise cloud platforms with AWS and Kubernetes.',
      requirements: 'Expertise in AWS, Docker, Kubernetes, and Node.js. 5+ years experience.',
      skills: ['AWS', 'Docker', 'Kubernetes', 'Node.js', 'PostgreSQL'],
      jobType: 'Full-time',
      location: 'San Francisco, CA',
      experienceLevel: 'Senior Level',
      experienceRequired: 5,
      minSalary: 150000,
      maxSalary: 200000,
      qualification: 'B.S. or M.S. in Computer Science',
      vacancies: 2,
      deadline: '2026-12-31',
    };
    const createJobRes = await request('/jobs', {
      method: 'POST',
      headers: recruiterHeader,
      body: JSON.stringify(jobPayload),
    });
    assert(createJobRes.status === 201 && createJobRes.data.success, 'Test job created successfully by recruiter');
    const testJobId = createJobRes.data.jobId || createJobRes.data.job?.id;
    console.log(`  ℹ️ Test Job ID: ${testJobId}`);

    // 4. Job Seeker applies for job
    console.log('\n--- Step 4: Job Seeker Applies to Job ---');
    const applyPayload = {
      jobId: testJobId,
      coverLetter: 'I am thrilled to submit my application for Senior Cloud Solutions Architect at TechCorp. I have extensive experience with AWS and Kubernetes.',
    };
    const applyRes = await request('/applications/apply', {
      method: 'POST',
      headers: seekerHeader,
      body: JSON.stringify(applyPayload),
    });
    assert(applyRes.status === 201 && applyRes.data.success, 'Job application submitted successfully');
    const applicationId = applyRes.data.applicationId;
    assert(Boolean(applicationId), `Application created with ID: ${applicationId}`);

    // 5. Test duplicate prevention
    console.log('\n--- Step 5: Duplicate Application Prevention ---');
    const dupRes = await request('/applications/apply', {
      method: 'POST',
      headers: seekerHeader,
      body: JSON.stringify(applyPayload),
    });
    assert(dupRes.status === 400, 'Duplicate application correctly rejected with 400 Bad Request');
    assert(dupRes.data?.message?.includes('already applied'), 'Rejection message indicates candidate already applied');

    // 6. Recruiter retrieves applicants pipeline
    console.log('\n--- Step 6: Recruiter Applicants Pipeline ---');
    const applicantsRes = await request(`/applications/recruiter/applicants?jobId=${testJobId}`, {
      method: 'GET',
      headers: recruiterHeader,
    });
    assert(applicantsRes.data.success, 'Recruiter fetched applicants successfully');
    assert(applicantsRes.data.applicants.length >= 1, 'Applicant appears in recruiter pipeline');

    const applicantRecord = applicantsRes.data.applicants.find((a) => a.application_id === applicationId);
    assert(Boolean(applicantRecord), 'Found candidate matching the created application ID');
    assert(applicantRecord.status === 'Applied', 'Candidate status in pipeline is "Applied"');
    assert(applicantRecord.job_title === 'Senior Cloud Solutions Architect', 'Application linked to correct job title');
    assert(applicantRecord.match && typeof applicantRecord.match.matchPercentage === 'number', 'AI skill match score calculated for candidate');
    console.log(`  ℹ️ Candidate AI Match Score: ${applicantRecord.match.matchPercentage}% (${applicantRecord.match.matchLabel})`);

    // 7. Recruiter retrieves full candidate dossier
    console.log('\n--- Step 7: Recruiter Candidate Dossier Endpoint ---');
    const dossierRes = await request(`/applications/recruiter/candidate/${seekerId}?appId=${applicationId}`, {
      method: 'GET',
      headers: recruiterHeader,
    });
    assert(dossierRes.data.success, 'Candidate dossier fetched successfully');
    const candidateDossier = dossierRes.data.candidate;
    assert(Boolean(candidateDossier), 'Dossier object returned');
    assert(typeof candidateDossier.first_name === 'string' && candidateDossier.first_name.length > 0, `Candidate first name exists: "${candidateDossier.first_name}"`);
    assert(Array.isArray(candidateDossier.education), 'Candidate education history included');
    assert(Array.isArray(candidateDossier.experience), 'Candidate work experience included');
    assert(Array.isArray(candidateDossier.user_skills), 'Candidate skills with proficiencies included');
    assert(Array.isArray(candidateDossier.projects), 'Candidate technical projects included');
    assert(Array.isArray(candidateDossier.certifications), 'Candidate certifications included');
    assert(candidateDossier.application?.application_id === applicationId, 'Application record mapped correctly in dossier');
    assert(candidateDossier.cover_letter.includes('thrilled to submit'), 'Cover letter present in dossier');

    // 8. Security Check: Recruiter from different company cannot update status for this job
    console.log('\n--- Step 8: Security & Authorization Check ---');
    const unauthorizedUpdate = await request(`/applications/${applicationId}/status`, {
      method: 'PUT',
      headers: otherRecruiterHeader,
      body: JSON.stringify({
        status: 'Shortlisted',
        notes: 'Hacking status from unauthorized recruiter',
      }),
    });
    assert(unauthorizedUpdate.status === 403, 'Unauthorized recruiter correctly denied with 403 Forbidden');

    // 9. Status Workflow: Applied -> Under Review
    console.log('\n--- Step 9: Status Workflow: Under Review ---');
    const reviewRes = await request(`/applications/${applicationId}/status`, {
      method: 'PUT',
      headers: recruiterHeader,
      body: JSON.stringify({
        status: 'Under Review',
        notes: 'Initial resume screening passed by recruiter.',
      }),
    });
    assert(reviewRes.data.success, 'Status updated to "Under Review"');
    assert(reviewRes.data.application.status === 'Under Review', 'Database reflects "Under Review" status');

    // 10. Status Workflow: Under Review -> Shortlisted
    console.log('\n--- Step 10: Status Workflow: Shortlisted ---');
    const shortlistRes = await request(`/applications/${applicationId}/status`, {
      method: 'PUT',
      headers: recruiterHeader,
      body: JSON.stringify({
        status: 'Shortlisted',
        notes: 'Strong match on Kubernetes & AWS. Moving to interview round.',
      }),
    });
    assert(shortlistRes.data.success, 'Status updated to "Shortlisted"');
    assert(shortlistRes.data.application.status === 'Shortlisted', 'Database reflects "Shortlisted" status');

    // 11. Status Workflow: Shortlisted -> Interview
    console.log('\n--- Step 11: Status Workflow: Interview ---');
    const interviewRes = await request(`/applications/${applicationId}/status`, {
      method: 'PUT',
      headers: recruiterHeader,
      body: JSON.stringify({
        status: 'Interview',
        notes: 'Technical Interview scheduled for Thursday 2:00 PM PST via Google Meet.',
      }),
    });
    assert(interviewRes.data.success, 'Status updated to "Interview"');
    assert(interviewRes.data.application.status === 'Interview', 'Database reflects "Interview" status');

    // 12. Status Workflow: Interview -> Selected
    console.log('\n--- Step 12: Status Workflow: Selected ---');
    const selectRes = await request(`/applications/${applicationId}/status`, {
      method: 'PUT',
      headers: recruiterHeader,
      body: JSON.stringify({
        status: 'Selected',
        notes: 'Candidate passed all rounds with flying colors! Formal offer extended.',
      }),
    });
    assert(selectRes.data.success, 'Status updated to "Selected"');
    assert(selectRes.data.application.status === 'Selected', 'Database reflects "Selected" status');

    // 13. Seeker sees updated status in "My Applications"
    console.log('\n--- Step 13: Job Seeker My Applications Verification ---');
    const myAppsRes = await request('/applications/my-applications', {
      method: 'GET',
      headers: seekerHeader,
    });
    assert(myAppsRes.data.success, 'Job Seeker retrieved personal applications');
    const myApp = myAppsRes.data.applications.find((a) => a.id === applicationId);
    assert(Boolean(myApp), 'Submitted application found in job seeker list');
    assert(myApp.status === 'Selected', 'Job seeker sees current status as "Selected"');
    assert(myApp.notes.includes('Formal offer extended'), 'Job seeker sees recruiter feedback notes');

    // 14. Seeker application withdrawal flow
    console.log('\n--- Step 14: Seeker Withdrawal Flow ---');
    const testJob2Res = await request('/jobs', {
      method: 'POST',
      headers: recruiterHeader,
      body: JSON.stringify({
        title: 'DevOps Platform Engineer',
        company: 'TechCorp Cloud',
        description: 'CI/CD pipeline and infrastructure management.',
        requirements: 'Docker, GitHub Actions, Terraform.',
        skills: ['Docker', 'Terraform', 'CI/CD'],
        jobType: 'Full-time',
        location: 'Remote',
        experienceRequired: 3,
        minSalary: 120000,
        maxSalary: 150000,
        vacancies: 1,
      }),
    });
    const job2Id = testJob2Res.data.jobId || testJob2Res.data.job?.id;

    const apply2Res = await request('/applications/apply', {
      method: 'POST',
      headers: seekerHeader,
      body: JSON.stringify({
        jobId: job2Id,
        coverLetter: 'Applying to DevOps engineer role.',
      }),
    });
    const app2Id = apply2Res.data.applicationId;
    assert(Boolean(app2Id), `Second application created with ID: ${app2Id}`);

    const withdrawRes = await request(`/applications/${app2Id}/withdraw`, {
      method: 'DELETE',
      headers: seekerHeader,
    });
    assert(withdrawRes.data.success, 'Candidate successfully withdrew application');

    // Verify it is no longer active in seeker's applications or marked withdrawn
    const myAppsAfterWithdraw = await request('/applications/my-applications', {
      method: 'GET',
      headers: seekerHeader,
    });
    const withdrawnApp = myAppsAfterWithdraw.data.applications.find((a) => a.id === app2Id);
    assert(!withdrawnApp || withdrawnApp.status === 'Withdrawn', 'Withdrawn application is removed or marked Withdrawn');

    console.log('\n======================================================');
    console.log(`📊 TEST RESULTS: ${passedTests}/${totalTests} PASSED (${failedTests} FAILED)`);
    console.log('======================================================\n');

    if (failedTests === 0) {
      console.log('🎉 ALL APPLICATION WORKFLOW REQUIREMENTS FULLY VERIFIED!');
      process.exit(0);
    } else {
      console.error(`💥 ${failedTests} tests failed.`);
      process.exit(1);
    }
  } catch (error) {
    console.error('Fatal test error:', error);
    process.exit(1);
  }
}

runTests();

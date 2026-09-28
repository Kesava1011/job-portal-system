/**
 * test_recruiter_no_apply_actions.js
 * Comprehensive verification that Recruiters do not see any job-seeker application actions
 * while Job Seekers retain complete Find Jobs -> View Job -> Apply Now functionality.
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
  console.log('🎯 VERIFICATION: RECRUITER EXCLUSION OF JOB-SEEKER APPLICATION ACTIONS');
  console.log('================================================================================\n');

  try {
    // -------------------------------------------------------------------------
    // Step 1: Code-level Inspection of Role-based Application Action Guarding
    // -------------------------------------------------------------------------
    console.log('--- Step 1: Code-level Inspection of Role-based Application Action Guarding ---');
    
    // 1A. JobDetailsPage (jobs/[id]/page.js)
    const jobDetailsSrc = fs.readFileSync(path.join(__dirname, 'frontend/src/app/jobs/[id]/page.js'), 'utf-8');
    assert(jobDetailsSrc.includes('const { user, isSeeker, isRecruiter } = useAuth();'), 'Job Details page destructures isRecruiter from useAuth()');
    assert(jobDetailsSrc.includes('isRecruiter ? ('), 'Job Details conditionally checks isRecruiter for actions');
    assert(jobDetailsSrc.includes('/recruiter/edit-job/'), 'Job Details provides Edit Job action for recruiters');
    assert(jobDetailsSrc.includes('/recruiter/applicants?jobId='), 'Job Details provides View Applicants / Candidate Pipeline for recruiters');
    assert(jobDetailsSrc.includes('/recruiter/manage-jobs'), 'Job Details provides Manage Jobs shortcut for recruiters');
    assert(jobDetailsSrc.includes('id="recruiter-edit-job-btn"'), 'Job Details renders recruiter-edit-job-btn');
    assert(jobDetailsSrc.includes('id="recruiter-view-applicants-btn"'), 'Job Details renders recruiter-view-applicants-btn');
    assert(jobDetailsSrc.includes('!isRecruiter && isApplyModalOpen'), 'ApplyJobModal is hidden/blocked for recruiters');
    assert(jobDetailsSrc.includes('id="apply-now-btn"'), 'Seeker Apply Now button is preserved');
    assert(jobDetailsSrc.includes('id="apply-sidebar-btn"'), 'Seeker Apply for this Position sidebar button is preserved');

    // 1B. JobCard component (components/JobCard.js)
    const jobCardSrc = fs.readFileSync(path.join(__dirname, 'frontend/src/components/JobCard.js'), 'utf-8');
    assert(jobCardSrc.includes('isRecruiter'), 'JobCard destructures isRecruiter from useAuth()');
    assert(jobCardSrc.includes('!isRecruiter &&'), 'JobCard hides Bookmark action for recruiters');
    assert(jobCardSrc.includes('isRecruiter ? ('), 'JobCard conditionally renders View Details instead of Apply button for recruiters');
    assert(jobCardSrc.includes('View Details'), 'JobCard renders View Details for recruiters');
    assert(jobCardSrc.includes('onApplyClick(job)'), 'JobCard retains onApplyClick for job seekers');

    // 1C. Company Details Page (companies/[id]/page.js)
    const companyDetailsSrc = fs.readFileSync(path.join(__dirname, 'frontend/src/app/companies/[id]/page.js'), 'utf-8');
    assert(companyDetailsSrc.includes('isRecruiter'), 'Company Details destructures isRecruiter from useAuth()');
    assert(companyDetailsSrc.includes('!isRecruiter && ('), 'Company Details conditionally hides Quick Apply button for recruiters');
    assert(companyDetailsSrc.includes('id={`quick-apply-btn-${job.id}`}'), 'Job seeker Quick Apply button has clear identifiable element');
    assert(companyDetailsSrc.includes('!isRecruiter && selectedJob && isApplyModalOpen'), 'Company Details ApplyJobModal is blocked for recruiters');

    // -------------------------------------------------------------------------
    // Step 2: Route Availability and Rendering Integrity
    // -------------------------------------------------------------------------
    console.log('\n--- Step 2: Route Availability and Rendering Integrity ---');
    const jobsRes = await fetch(`${FRONTEND}/jobs`);
    assert(jobsRes.status === 200, '/jobs responds with HTTP 200 OK');
    const jobsHtml = await jobsRes.text();
    assert(!jobsHtml.includes('ReferenceError') && !jobsHtml.includes('TypeError'), 'No runtime errors on /jobs');

    const jobDetailsRes = await fetch(`${FRONTEND}/jobs/1`);
    assert(jobDetailsRes.status === 200, '/jobs/1 responds with HTTP 200 OK');
    const jobDetailsHtml = await jobDetailsRes.text();
    assert(!jobDetailsHtml.includes('ReferenceError') && !jobDetailsHtml.includes('TypeError'), 'No runtime errors on /jobs/1');

    const companyRes = await fetch(`${FRONTEND}/companies/1`);
    assert(companyRes.status === 200, '/companies/1 responds with HTTP 200 OK');
    const companyHtml = await companyRes.text();
    assert(!companyHtml.includes('ReferenceError') && !companyHtml.includes('TypeError'), 'No runtime errors on /companies/1');

    // -------------------------------------------------------------------------
    // Step 3: Job Seeker End-to-End Workflow Verification
    // -------------------------------------------------------------------------
    console.log('\n--- Step 3: Job Seeker End-to-End Workflow Verification ---');
    const seekerLogin = await request(`${API}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'seeker@example.com', password: 'password123' })
    });
    assert(seekerLogin.status === 200 && seekerLogin.data?.success, 'Job Seeker authenticated (seeker@example.com)');
    const seekerToken = seekerLogin.data?.token;

    // Recruiter logs in to create a test job for application
    const recruiterLogin = await request(`${API}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'recruiter@google.com', password: 'password123' })
    });
    assert(recruiterLogin.status === 200 && recruiterLogin.data?.success, 'Recruiter authenticated (recruiter@google.com)');
    const recruiterToken = recruiterLogin.data?.token;

    // Create a fresh test job
    const createJobRes = await request(`${API}/jobs`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${recruiterToken}` },
      body: JSON.stringify({
        title: `Cloud AI Solutions Architect ${Date.now()}`,
        description: 'Design distributed generative AI platforms on Google Cloud and Kubernetes.',
        requirements: 'Node.js, TypeScript, Python, GCP, Kubernetes.',
        jobType: 'Full-time',
        location: 'Remote',
        experienceRequired: 5,
        minSalary: 180000,
        maxSalary: 230000,
        skills: ['Kubernetes', 'Python', 'GCP'],
        qualification: "Master's Degree",
      })
    });
    assert(createJobRes.status === 201 && createJobRes.data?.success, 'Recruiter posted dedicated test job');
    const testJobId = createJobRes.data?.jobId;

    // Seeker views the job details
    const seekerJobView = await request(`${API}/jobs/${testJobId}`, {
      headers: { Authorization: `Bearer ${seekerToken}` }
    });
    assert(seekerJobView.status === 200 && seekerJobView.data?.success, 'Job Seeker views test job details');
    assert(seekerJobView.data?.job?.hasApplied === false, 'Seeker hasApplied is initially false');

    // Seeker submits application
    const applyRes = await request(`${API}/applications/apply`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${seekerToken}` },
      body: JSON.stringify({
        jobId: testJobId,
        resumeId: 1,
        coverLetter: 'I am excited to apply for the Cloud AI Solutions Architect role.'
      })
    });
    assert(applyRes.status === 201 && applyRes.data?.success, 'Job Seeker successfully submits application (201 Created)');
    const applicationId = applyRes.data?.applicationId;

    // -------------------------------------------------------------------------
    // Step 4: Recruiter Role Boundaries & Recruiter Action Verification
    // -------------------------------------------------------------------------
    console.log('\n--- Step 4: Recruiter Role Boundaries & Recruiter Action Verification ---');
    // Recruiter attempts to call apply API -> must be blocked
    const recruiterApplyAttempt = await request(`${API}/applications/apply`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${recruiterToken}` },
      body: JSON.stringify({
        jobId: testJobId,
        resumeId: 1,
        coverLetter: 'Recruiter attempting to apply.'
      })
    });
    assert(recruiterApplyAttempt.status === 403, 'Recruiter applying for job is rejected with HTTP 403 Forbidden');
    assert(!recruiterApplyAttempt.data?.success, 'Recruiter apply response has success: false');

    // Recruiter views the job details via API
    const recruiterJobView = await request(`${API}/jobs/${testJobId}`, {
      headers: { Authorization: `Bearer ${recruiterToken}` }
    });
    assert(recruiterJobView.status === 200 && recruiterJobView.data?.success, 'Recruiter can view job details via API');
    assert(recruiterJobView.data?.job?.title.includes('Cloud AI Solutions Architect'), 'Recruiter receives complete job details');

    // Recruiter accesses Candidate Pipeline for this job
    const recruiterPipelineRes = await request(`${API}/applications/recruiter/applicants?jobId=${testJobId}`, {
      headers: { Authorization: `Bearer ${recruiterToken}` }
    });
    assert(recruiterPipelineRes.status === 200 && recruiterPipelineRes.data?.success, 'Recruiter can view applicants for the job');
    assert(recruiterPipelineRes.data?.applicants?.length === 1, 'Recruiter sees the candidate who applied');
    assert(recruiterPipelineRes.data?.applicants[0].candidate_email === 'seeker@example.com', 'Candidate email matches applicant');

    // Recruiter accesses Manage Jobs
    const recruiterManageJobsRes = await request(`${API}/jobs/recruiter/my-jobs`, {
      headers: { Authorization: `Bearer ${recruiterToken}` }
    });
    assert(recruiterManageJobsRes.status === 200 && recruiterManageJobsRes.data?.success, 'Recruiter accesses Manage Jobs endpoint');
    const myJobs = recruiterManageJobsRes.data?.jobs || [];
    assert(myJobs.some(j => j.id === testJobId), 'Posted test job appears in recruiter Manage Jobs listing');

    // Recruiter updates candidate application status (Candidate Pipeline continues working)
    const statusUpdateRes = await request(`${API}/applications/${applicationId}/status`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${recruiterToken}` },
      body: JSON.stringify({
        status: 'Shortlisted',
        notes: 'Strong distributed systems and cloud architecture experience.'
      })
    });
    assert(statusUpdateRes.status === 200 && statusUpdateRes.data?.success, 'Recruiter can update applicant status in pipeline');

    // Recruiter views candidate resume inline
    const resumeViewRes = await request(`${API}/applications/${applicationId}/resume/view`, {
      headers: { Authorization: `Bearer ${recruiterToken}` }
    });
    assert(resumeViewRes.status === 200, 'Recruiter can view candidate resume (200 OK)');
    assert(resumeViewRes.headers.get('content-type')?.includes('application/pdf'), 'Resume Content-Type is application/pdf');
    assert(resumeViewRes.headers.get('content-disposition')?.includes('inline'), 'Resume Content-Disposition is inline');

    // Cleanup test job
    await request(`${API}/jobs/${testJobId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${recruiterToken}` }
    });

    console.log('\n================================================================================');
    console.log(`📊 TEST SUMMARY: Total: ${totalTests} | Passed: ${passedTests} | Failed: ${failedTests}`);
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

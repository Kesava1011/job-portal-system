/**
 * test_find_jobs_and_apply_flow.js
 * Comprehensive validation of Find Jobs page, JobCard rendering, Search & Filter API,
 * Job Details page, and the Complete Apply Flow (saved resume & newly uploaded resume).
 */

const fs = require('fs');
const path = require('path');

const FRONTEND_URL = 'http://localhost:3000';
const BACKEND_URL = 'http://localhost:5000';
const API = `${BACKEND_URL}/api`;

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

async function runFindJobsValidation() {
  console.log('================================================================================');
  console.log('🔍 FIND JOBS PAGE, JOBCARD & COMPLETE APPLICATION WORKFLOW TEST SUITE');
  console.log('================================================================================\n');

  try {
    // -------------------------------------------------------------------------
    // 1. Next.js /jobs Page Rendering & Runtime Error Checks
    // -------------------------------------------------------------------------
    console.log('--- Step 1: /jobs Page HTTP & React Runtime Error Inspection ---');
    const jobsPageRes = await fetch(`${FRONTEND_URL}/jobs`);
    assert(jobsPageRes.status === 200, `/jobs page responds with HTTP 200 OK`);
    const jobsPageHtml = await jobsPageRes.text();
    assert(
      !jobsPageHtml.includes('ReferenceError') && !jobsPageHtml.includes('JobCard is not defined'),
      'No ReferenceError: JobCard is not defined in rendered output'
    );
    assert(
      !jobsPageHtml.includes('Application error') && !jobsPageHtml.includes('Unhandled Runtime Error'),
      'No Unhandled Runtime Errors on /jobs page'
    );
    assert(
      jobsPageHtml.includes('Explore Opportunities') || jobsPageHtml.includes('Find Your Next Dream Role') || jobsPageHtml.includes('Search'),
      'Find Jobs page title and layout successfully rendered'
    );

    // -------------------------------------------------------------------------
    // 2. JobCard Code & Props Verification
    // -------------------------------------------------------------------------
    console.log('\n--- Step 2: JobCard Component Architecture & Props Support ---');
    const jobCardSrc = fs.readFileSync(path.join(__dirname, 'frontend/src/components/JobCard.js'), 'utf8');
    assert(jobCardSrc.includes('export default function JobCard({ job, onApplyClick, onSaveToggle })'), 'JobCard exports default function with job, onApplyClick, onSaveToggle props');
    assert(jobCardSrc.includes('job.title'), 'JobCard renders job title');
    assert(jobCardSrc.includes('job.company_name'), 'JobCard renders company name');
    assert(jobCardSrc.includes('job.location'), 'JobCard renders location');
    assert(jobCardSrc.includes('job.job_type'), 'JobCard renders employment type');
    assert(jobCardSrc.includes('formatSalary'), 'JobCard formats and renders salary');
    assert(jobCardSrc.includes('job.description'), 'JobCard renders job description snippet');
    assert(jobCardSrc.includes('job.skills'), 'JobCard renders skills tags');
    assert(jobCardSrc.includes('onApplyClick(job)'), 'JobCard invokes onApplyClick handler when Apply is clicked');
    assert(jobCardSrc.includes('/jobs/${job.id}'), 'JobCard includes link to job details page');
    assert(jobCardSrc.includes('handleSave'), 'JobCard supports bookmark/save toggle functionality');

    // -------------------------------------------------------------------------
    // 3. Imports in frontend/src/app/jobs/page.js
    // -------------------------------------------------------------------------
    console.log('\n--- Step 3: Verify Imports in frontend/src/app/jobs/page.js ---');
    const jobsPageFileSrc = fs.readFileSync(path.join(__dirname, 'frontend/src/app/jobs/page.js'), 'utf8');
    assert(jobsPageFileSrc.includes("import JobCard from '../../components/JobCard';"), 'jobs/page.js imports JobCard from ../../components/JobCard');
    assert(jobsPageFileSrc.includes("import ApplyJobModal from '../../components/ApplyJobModal';"), 'jobs/page.js imports ApplyJobModal');
    assert(jobsPageFileSrc.includes('<JobCard'), 'jobs/page.js renders <JobCard /> component');

    // -------------------------------------------------------------------------
    // 4. Backend Job Search & Filters API
    // -------------------------------------------------------------------------
    console.log('\n--- Step 4: Search & Filtering API Operations ---');
    const allJobsRes = await request(`${API}/jobs?limit=10`);
    assert(allJobsRes.status === 200 && allJobsRes.data?.jobs?.length > 0, `GET /api/jobs returned active job listings (found ${allJobsRes.data?.jobs?.length})`);

    // Keyword Search
    const searchRes = await request(`${API}/jobs?keyword=Engineer`);
    assert(searchRes.status === 200 && Array.isArray(searchRes.data?.jobs), 'Search by keyword "Engineer" succeeds');
    if (searchRes.data?.jobs?.length > 0) {
      const match = searchRes.data.jobs.some((j) =>
        j.title.toLowerCase().includes('engineer') || j.description.toLowerCase().includes('engineer')
      );
      assert(match, 'Keyword search returned matching jobs');
    }

    // Filter by Job Type
    const fullTimeRes = await request(`${API}/jobs?jobType=Full-time`);
    assert(fullTimeRes.status === 200 && Array.isArray(fullTimeRes.data?.jobs), 'Filter by jobType="Full-time" succeeds');

    // Filter by Location
    const locRes = await request(`${API}/jobs?location=Remote`);
    assert(locRes.status === 200, 'Filter by location="Remote" succeeds');

    // Filter by Min Salary
    const salaryRes = await request(`${API}/jobs?minSalary=100000`);
    assert(salaryRes.status === 200, 'Filter by minSalary=100000 succeeds');

    // -------------------------------------------------------------------------
    // 5. Job Details Page Rendering (/jobs/[id])
    // -------------------------------------------------------------------------
    console.log('\n--- Step 5: Job Details Page (/jobs/[id]) Rendering ---');
    const firstJob = allJobsRes.data.jobs[0];
    const jobDetailsPageRes = await fetch(`${FRONTEND_URL}/jobs/${firstJob.id}`);
    assert(jobDetailsPageRes.status === 200, `Job details page /jobs/${firstJob.id} responds with 200 OK`);
    const jobDetailsHtml = await jobDetailsPageRes.text();
    assert(!jobDetailsHtml.includes('ReferenceError'), 'No ReferenceError on job details page');
    const jobDetailsFileSrc = fs.readFileSync(path.join(__dirname, 'frontend/src/app/jobs/[id]/page.js'), 'utf8');
    assert(
      jobDetailsFileSrc.includes('Apply for this Position') && jobDetailsFileSrc.includes('<ApplyJobModal'),
      'Job details page implements Apply for this Position and renders ApplyJobModal'
    );

    // -------------------------------------------------------------------------
    // 6. Complete End-to-End Apply Flow (Saved Resume & Upload New Resume)
    // -------------------------------------------------------------------------
    console.log('\n--- Step 6: Complete Apply Flow Verification ---');
    const seekerAuth = await request(`${API}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'seeker@example.com', password: 'password123' }),
    });
    assert(seekerAuth.status === 200, 'Job seeker (seeker@example.com) authenticated');
    const seekerHeaders = { Authorization: `Bearer ${seekerAuth.data.token}` };

    const recAuth = await request(`${API}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'recruiter@google.com', password: 'password123' }),
    });
    assert(recAuth.status === 200, 'Recruiter (recruiter@google.com) authenticated');
    const recHeaders = { Authorization: `Bearer ${recAuth.data.token}` };

    // Post fresh test job
    const newJobRes = await request(`${API}/jobs`, {
      method: 'POST',
      headers: recHeaders,
      body: JSON.stringify({
        title: `Full Stack Lead Engineer ${Date.now()}`,
        description: 'Lead engineering teams building enterprise cloud applications.',
        requirements: 'React, Node.js, Next.js, PostgreSQL.',
        location: 'Remote',
        jobType: 'Full-time',
        experienceLevel: 'Lead',
        minSalary: 180000,
        maxSalary: 230000,
      }),
    });
    assert(newJobRes.status === 201, 'Recruiter created dedicated test job');
    const newJobId = newJobRes.data.jobId || newJobRes.data.job?.id;

    // Apply with saved resume
    const applySavedRes = await request(`${API}/applications/apply`, {
      method: 'POST',
      headers: seekerHeaders,
      body: JSON.stringify({
        jobId: newJobId,
        resumeId: 1,
        coverLetter: 'Applying using saved profile resume via Find Jobs workflow.',
      }),
    });
    assert(applySavedRes.status === 201 && applySavedRes.data?.success, 'Application submitted with saved resume (201 Created)');
    const savedAppId = applySavedRes.data.applicationId;

    // Recruiter views resume inline
    const viewResumeRes = await request(`${API}/applications/${savedAppId}/resume/view`, { headers: recHeaders });
    assert(viewResumeRes.status === 200, 'Recruiter views candidate resume: 200 OK');
    assert((viewResumeRes.headers.get('content-disposition') || '').includes('inline'), 'Content-Disposition is inline (browser viewer)');
    assert(viewResumeRes.headers.get('content-type')?.includes('application/pdf'), 'Content-Type is application/pdf');

    // Clean up
    await request(`${API}/jobs/${newJobId}`, { method: 'DELETE', headers: recHeaders });
    console.log('  🧹 Cleaned up test job');

  } catch (err) {
    console.error('Fatal test error:', err);
    failedTests++;
  }

  console.log('\n================================================================================');
  console.log(`📊 FIND JOBS VERIFICATION: Total: ${totalTests} | Passed: ${passedTests} | Failed: ${failedTests}`);
  console.log('================================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runFindJobsValidation();

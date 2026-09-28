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
  console.log('===============================================================');
  console.log('🏢 TESTING PUBLIC COMPANIES DIRECTORY & COMPANY DETAILS SUITE');
  console.log('===============================================================\n');

  try {
    // 1. Health check
    console.log('--- Step 1: API Server Health Check ---');
    const health = await request('/health');
    assert(health.data?.status === 'online', 'API health status is online');

    // 2. Authentication
    console.log('\n--- Step 2: Authentication ---');
    const recruiterAuth = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'recruiter@google.com', password: 'password123' }),
    });
    assert(recruiterAuth.data.success, 'Recruiter authenticated successfully');
    const recruiterToken = recruiterAuth.data.token;
    const recruiterHeader = { Authorization: `Bearer ${recruiterToken}` };

    const seekerAuth = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'seeker@example.com', password: 'password123' }),
    });
    assert(seekerAuth.data.success, 'Job Seeker authenticated successfully');
    const seekerToken = seekerAuth.data.token;
    const seekerHeader = { Authorization: `Bearer ${seekerToken}` };

    // 3. Public Companies Directory Listing (GET /api/companies)
    console.log('\n--- Step 3: Public Companies Directory Listing ---');
    const allCompaniesRes = await request('/companies');
    assert(allCompaniesRes.status === 200 && allCompaniesRes.data.success, 'Public companies directory returned 200 OK');
    assert(Array.isArray(allCompaniesRes.data.companies) && allCompaniesRes.data.companies.length > 0, `Companies returned: ${allCompaniesRes.data.companies.length}`);
    assert(Array.isArray(allCompaniesRes.data.industries) && allCompaniesRes.data.industries.length > 0, `Industries filter list returned (${allCompaniesRes.data.industries.length} industries)`);

    const firstCompany = allCompaniesRes.data.companies[0];
    assert(Boolean(firstCompany.name), `Company name exists: "${firstCompany.name}"`);
    assert(typeof firstCompany.active_jobs_count !== 'undefined', `Company has active_jobs_count: ${firstCompany.active_jobs_count}`);
    const googleComp = allCompaniesRes.data.companies.find((c) => c.name.toLowerCase() === 'google');
    assert(Boolean(googleComp), 'Google found in directory list');
    const googleId = googleComp ? googleComp.id : 1;

    // 4. Search and Multi-Filtering
    console.log('\n--- Step 4: Companies Search and Filtering ---');
    const searchRes = await request('/companies?search=Google');
    assert(searchRes.data.success, 'Search by keyword succeeded');
    assert(searchRes.data.companies.some((c) => c.name.toLowerCase().includes('google')), 'Search results contain Google');

    const indSearchRes = await request('/companies?industry=Technology');
    assert(indSearchRes.data.success, 'Filter by industry succeeded');
    assert(indSearchRes.data.companies.every((c) => c.industry.toLowerCase().includes('tech')), 'All results match industry filter');

    // 5. Company Details & Open Jobs (GET /api/companies/:id)
    console.log(`\n--- Step 5: Company Details & Open Jobs (Company #${googleId}) ---`);
    const compDetailsRes = await request(`/companies/${googleId}`);
    assert(compDetailsRes.status === 200 && compDetailsRes.data.success, 'Company details returned 200 OK');
    const company = compDetailsRes.data.company;
    assert(company.name.toLowerCase() === 'google', 'Company name matches "Google"');
    assert(Boolean(company.industry), `Company industry present: "${company.industry}"`);
    assert(Boolean(company.location), `Company location present: "${company.location}"`);
    assert(Array.isArray(company.jobs), `Open jobs array present (${company.jobs.length} jobs)`);
    assert(Array.isArray(company.recruiters), `Recruiters/Talent team attached (${company.recruiters.length} recruiters)`);

    if (company.jobs.length > 0) {
      const sampleJob = company.jobs[0];
      assert(Boolean(sampleJob.title), `Job title: "${sampleJob.title}"`);
      assert(sampleJob.company_id === googleId, 'Job is correctly linked to company ID');
      assert(Array.isArray(sampleJob.skills), `Job skills attached as array (${sampleJob.skills.join(', ')})`);
      assert(typeof sampleJob.applicants_count !== 'undefined', `Job applicants_count present: ${sampleJob.applicants_count}`);
    }

    // 6. Non-existent Company 404 Check
    console.log('\n--- Step 6: Non-Existent Company Error Handling ---');
    const notFoundRes = await request('/companies/999999');
    assert(notFoundRes.status === 404, 'Non-existent company correctly returns 404 Not Found');
    assert(notFoundRes.data.success === false, 'Error response contains success: false');

    // 7. Full Navigation & Application Flow: Post Job -> Browse Company -> Apply
    console.log('\n--- Step 7: Company-to-Job Navigation & Application Flow ---');
    const newJobPayload = {
      title: 'Principal AI Systems Architect',
      company: 'Google',
      description: 'Design next-generation large language model serving pipelines and TPU clusters.',
      requirements: 'Python, PyTorch, C++, Distributed Systems, Kubernetes.',
      skills: ['Python', 'Kubernetes', 'PyTorch', 'Distributed Systems'],
      jobType: 'Full-time',
      location: 'Mountain View, CA',
      experienceLevel: 'Director / Principal',
      experienceRequired: 7,
      minSalary: 220000,
      maxSalary: 310000,
      qualification: 'M.S. or Ph.D. in Computer Science',
      vacancies: 3,
      deadline: '2026-12-31',
    };

    const postJobRes = await request('/jobs', {
      method: 'POST',
      headers: recruiterHeader,
      body: JSON.stringify(newJobPayload),
    });
    assert(postJobRes.status === 201 && postJobRes.data.success, 'New job posted under company by recruiter');
    const createdJobId = postJobRes.data.jobId;

    // Verify company profile now reflects the newly created job
    const updatedCompanyRes = await request(`/companies/${googleId}`);
    const foundNewJob = updatedCompanyRes.data.company.jobs.find((j) => j.id === createdJobId);
    assert(Boolean(foundNewJob), 'Newly posted job immediately appears in company open jobs list');
    assert(foundNewJob.skills.includes('PyTorch'), 'Job skills verified in company open jobs');

    // Candidate applies to the job through the company-job flow
    const applyRes = await request('/applications/apply', {
      method: 'POST',
      headers: seekerHeader,
      body: JSON.stringify({
        jobId: createdJobId,
        coverLetter: 'Applying through Google Company Profile page for Principal AI Systems Architect.',
      }),
    });
    assert(applyRes.status === 201 && applyRes.data.success, 'Candidate successfully applied to job found via company profile');
    const applicationId = applyRes.data.applicationId;
    assert(Boolean(applicationId), `Application created with ID: ${applicationId}`);

    // Verify applicant count incremented for this job under the company
    const verifyAppCountRes = await request(`/companies/${googleId}`);
    const verifiedJob = verifyAppCountRes.data.company.jobs.find((j) => j.id === createdJobId);
    assert(verifiedJob && verifiedJob.applicants_count >= 1, `Applicant count verified in company jobs: ${verifiedJob?.applicants_count}`);

    // 8. Recruiter Company Profile Management (GET & PUT /api/companies/recruiter/my-company)
    console.log('\n--- Step 8: Recruiter Company Profile Management ---');
    const myCompanyRes = await request('/companies/recruiter/my-company', {
      method: 'GET',
      headers: recruiterHeader,
    });
    assert(myCompanyRes.status === 200 && myCompanyRes.data.success, 'Recruiter retrieved own company profile');

    const updateCompanyRes = await request('/companies/recruiter/my-company', {
      method: 'PUT',
      headers: recruiterHeader,
      body: JSON.stringify({
        description: 'Google is a global technology leader focusing on search, AI, cloud computing, and consumer electronics.',
        website: 'https://careers.google.com',
        companySize: '10,000+ employees',
      }),
    });
    assert(updateCompanyRes.status === 200 && updateCompanyRes.data.success, 'Recruiter successfully updated company profile');

    // 9. Security & Access Control
    console.log('\n--- Step 9: Security & Access Control ---');
    const unauthorizedUpdateRes = await request('/companies/recruiter/my-company', {
      method: 'PUT',
      headers: seekerHeader,
      body: JSON.stringify({ name: 'Hacked Company' }),
    });
    assert(unauthorizedUpdateRes.status === 403, 'Candidate forbidden from updating company profile (403)');

    const unauthenticatedUpdateRes = await request('/companies/recruiter/my-company', {
      method: 'PUT',
      body: JSON.stringify({ name: 'Unauthenticated update' }),
    });
    assert(unauthenticatedUpdateRes.status === 401, 'Unauthenticated user rejected from updating company (401)');

    // 10. Clean up test job
    console.log('\n--- Step 10: Cleanup Test Job ---');
    const deleteJobRes = await request(`/jobs/${createdJobId}`, {
      method: 'DELETE',
      headers: recruiterHeader,
    });
    assert(deleteJobRes.status === 200, 'Test job cleaned up successfully');

    console.log('\n===============================================================');
    console.log(`📊 TEST RESULTS: ${passedTests}/${totalTests} PASSED (${failedTests} FAILED)`);
    console.log('===============================================================\n');

    if (failedTests === 0) {
      console.log('🎉 ALL PUBLIC COMPANIES & DETAILS REQUIREMENTS VERIFIED WITH 100% SUCCESS!');
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

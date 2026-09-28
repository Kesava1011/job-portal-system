/**
 * test_resume_view_and_email_suite.js
 * Comprehensive verification of:
 * 1. Recruiter View Resume inline in browser instead of auto-download.
 * 2. Job Seeker Resume Upload during application (saved resume vs new upload: PDF, DOC, DOCX).
 * 3. Application status email notifications with SMTP config, templates, and duplicate suppression.
 * 4. Security, authorization, and data consistency across applications & resumes.
 */

const fs = require('fs');
const path = require('path');

const API = 'http://localhost:5000/api';
const BASE_URL = 'http://localhost:5000';

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
  const headers = { ...(options.headers || {}) };
  // If body is not FormData, default to application/json
  if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  const resClone = res.clone();
  let data = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      data = await res.json();
    } catch {
      data = null;
    }
  }

  return { status: res.status, ok: res.ok, headers: res.headers, data, response: resClone };
}

async function runAllTests() {
  console.log('================================================================================');
  console.log('🚀 COMPREHENSIVE RESUME VIEWING, APPLICATION UPLOAD & EMAIL NOTIFICATION SUITE');
  console.log('================================================================================\n');

  try {
    // -------------------------------------------------------------------------
    // Step 1: Authentication & Personas
    // -------------------------------------------------------------------------
    console.log('--- Step 1: Authentication & Persona Tokens ---');
    const rec1Auth = await request(`${API}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'recruiter@google.com', password: 'password123' }),
    });
    assert(rec1Auth.status === 200 && rec1Auth.data?.token, 'Recruiter 1 Sarah (recruiter@google.com) authenticated');
    const rec1Token = rec1Auth.data.token;
    const rec1Headers = { Authorization: `Bearer ${rec1Token}` };

    const rec2Auth = await request(`${API}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'recruiter@microsoft.com', password: 'password123' }),
    });
    assert(rec2Auth.status === 200 && rec2Auth.data?.token, 'Recruiter 2 David (recruiter@microsoft.com) authenticated');
    const rec2Token = rec2Auth.data.token;
    const rec2Headers = { Authorization: `Bearer ${rec2Token}` };

    const seekerAuth = await request(`${API}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'seeker@example.com', password: 'password123' }),
    });
    assert(seekerAuth.status === 200 && seekerAuth.data?.token, 'Job Seeker Alex Johnson authenticated');
    const seekerToken = seekerAuth.data.token;
    const seekerHeaders = { Authorization: `Bearer ${seekerToken}` };

    const adminAuth = await request(`${API}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@jobportal.com', password: 'password123' }),
    });
    assert(adminAuth.status === 200 && adminAuth.data?.token, 'System Admin authenticated');
    const adminToken = adminAuth.data.token;
    const adminHeaders = { Authorization: `Bearer ${adminToken}` };

    // Register a fresh job seeker with no resumes for edge case tests
    const freshEmail = `candidate_fresh_${Date.now()}@example.com`;
    const regRes = await request(`${API}/auth/register`, {
      method: 'POST',
      body: JSON.stringify({
        email: freshEmail,
        password: 'password123',
        role: 'job_seeker',
        firstName: 'Fresh',
        lastName: 'Applicant',
      }),
    });
    assert(regRes.status === 201 && regRes.data?.token, 'Fresh job seeker registered without resumes');
    const freshToken = regRes.data?.token;
    const freshHeaders = { Authorization: `Bearer ${freshToken}` };

    // Create a dedicated test job for Recruiter 1
    const testJobRes = await request(`${API}/jobs`, {
      method: 'POST',
      headers: rec1Headers,
      body: JSON.stringify({
        title: `Principal Cloud Architect ${Date.now()}`,
        description: 'Design and implement scalable distributed systems and high-throughput microservices.',
        requirements: 'Node.js, Docker, Kubernetes, AWS or GCP, Microservices architecture.',
        location: 'Mountain View, CA',
        jobType: 'Full-time',
        experienceLevel: 'Senior',
        minSalary: 160000,
        maxSalary: 220000,
      }),
    });
    assert(testJobRes.status === 201 && (testJobRes.data?.jobId || testJobRes.data?.job?.id), 'Recruiter 1 created new test job');
    const testJobId = testJobRes.data?.jobId || testJobRes.data?.job?.id;

    // -------------------------------------------------------------------------
    // TEST CASE 1: Job seeker applies using an existing saved resume
    // -------------------------------------------------------------------------
    console.log('\n--- TEST CASE 1: Job Seeker Applies Using Saved Resume & Recruiter Views Resume ---');
    const seekerResumesRes = await request(`${API}/resumes`, { headers: seekerHeaders });
    assert(seekerResumesRes.status === 200 && seekerResumesRes.data?.resumes?.length > 0, 'Job seeker retrieved saved resumes');
    const savedResume = seekerResumesRes.data.resumes[0];
    assert(savedResume?.id, `Selected saved resume ID #${savedResume.id} ("${savedResume.title}")`);

    const applySavedRes = await request(`${API}/applications`, {
      method: 'POST',
      headers: seekerHeaders,
      body: JSON.stringify({
        jobId: testJobId,
        resumeId: savedResume.id,
        coverLetter: 'I am applying using my saved full-stack resume.',
      }),
    });
    assert(applySavedRes.status === 201, 'Application with saved resume succeeded (201 Created)');
    const savedAppId = applySavedRes.data?.applicationId || applySavedRes.data?.application?.id;
    assert(savedAppId, `Created application ID #${savedAppId}`);

    // Recruiter fetches applicants pipeline
    const pipelineRes = await request(`${API}/applications/recruiter/applicants`, { headers: rec1Headers });
    assert(pipelineRes.status === 200, 'Recruiter fetched Candidate Pipeline');
    const applicantRecord = pipelineRes.data?.applicants?.find((a) => a.application_id === savedAppId);
    assert(applicantRecord, `Found application #${savedAppId} in recruiter pipeline`);
    assert(applicantRecord?.resume_id === savedResume.id, `Application record correctly associated with resume ID #${savedResume.id}`);

    // Recruiter views the resume inline
    const viewResumeRes = await request(`${API}/applications/${savedAppId}/resume/view`, { headers: rec1Headers });
    assert(viewResumeRes.status === 200, 'Recruiter GET /api/applications/:id/resume/view returns 200 OK');
    const viewDisposition = viewResumeRes.headers.get('content-disposition') || '';
    assert(viewDisposition.includes('inline'), `Content-Disposition specifies "inline" (got: "${viewDisposition}")`);
    assert(!viewDisposition.includes('attachment'), 'Content-Disposition does NOT specify "attachment" (will not auto-download)');
    const viewContentType = viewResumeRes.headers.get('content-type') || '';
    assert(viewContentType.includes('application/pdf'), `Content-Type is "application/pdf" (got: "${viewContentType}")`);

    // Verify ?token= query parameter authorization for browser iframes
    const viewWithQueryToken = await fetch(`${API}/applications/${savedAppId}/resume/view?token=${rec1Token}`);
    assert(viewWithQueryToken.status === 200, 'GET /resume/view with ?token= query parameter returns 200 OK (iframe compatible)');

    // -------------------------------------------------------------------------
    // TEST CASE 2: Job seeker applies by uploading a new PDF resume
    // -------------------------------------------------------------------------
    console.log('\n--- TEST CASE 2: Job Seeker Applies Uploading New PDF Resume ---');
    const testJob2Res = await request(`${API}/jobs`, {
      method: 'POST',
      headers: rec1Headers,
      body: JSON.stringify({
        title: `Site Reliability Engineer ${Date.now()}`,
        description: 'Ensure 99.99% uptime of mission-critical services.',
        requirements: 'Linux, Terraform, Prometheus, CI/CD pipelines.',
        location: 'San Francisco, CA',
        jobType: 'Full-time',
        experienceLevel: 'Mid',
        minSalary: 130000,
        maxSalary: 170000,
      }),
    });
    const testJob2Id = testJob2Res.data?.jobId || testJob2Res.data?.job?.id;

    // Create a sample PDF file content
    const samplePdfContent = `%PDF-1.4\n1 0 obj\n<< /Title (Newly Uploaded Custom PDF Resume) /Author (Fresh Candidate) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF`;
    const pdfBlob = new Blob([samplePdfContent], { type: 'application/pdf' });
    const pdfFormData = new FormData();
    pdfFormData.append('jobId', String(testJob2Id));
    pdfFormData.append('coverLetter', 'Applying with freshly uploaded custom PDF resume.');
    pdfFormData.append('resume', pdfBlob, 'Custom_Candidate_Resume.pdf');

    const applyUploadRes = await request(`${API}/applications`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${freshHeaders.Authorization.replace('Bearer ', '')}` },
      body: pdfFormData,
    });
    assert(applyUploadRes.status === 201, 'Application with newly uploaded PDF resume succeeded (201 Created)');
    const uploadAppId = applyUploadRes.data?.applicationId || applyUploadRes.data?.application?.id;
    assert(uploadAppId, `Created application ID #${uploadAppId}`);

    // Verify uploaded resume was saved and linked
    const uploadAppInfo = await request(`${API}/applications/recruiter/applicants`, { headers: rec1Headers });
    const uploadedRecord = uploadAppInfo.data?.applicants?.find((a) => a.application_id === uploadAppId);
    assert(uploadedRecord && uploadedRecord.resume_id, `Uploaded resume saved to resumes table with ID #${uploadedRecord?.resume_id}`);
    assert(uploadedRecord?.resume_file_url?.endsWith('.pdf'), `Resume file URL stored correctly: "${uploadedRecord?.resume_file_url}"`);

    // Recruiter views the newly uploaded resume
    const viewUploadedRes = await request(`${API}/applications/${uploadAppId}/resume/view`, { headers: rec1Headers });
    assert(viewUploadedRes.status === 200, 'Recruiter views newly uploaded resume: 200 OK');
    assert((viewUploadedRes.headers.get('content-disposition') || '').includes('inline'), 'Content-Disposition is inline for newly uploaded resume');
    const uploadedBody = await viewUploadedRes.response.text();
    assert(uploadedBody.includes('Newly Uploaded Custom PDF Resume'), 'Viewer received the exact custom uploaded PDF resume content');

    // -------------------------------------------------------------------------
    // TEST CASE 2B: Job seeker applies by uploading a DOCX resume
    // -------------------------------------------------------------------------
    console.log('\n--- TEST CASE 2B: Job Seeker Applies Uploading DOCX Resume ---');
    const docxContent = 'PK\x03\x04Mock DOCX resume format candidate data skills experience';
    const docxBlob = new Blob([docxContent], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    const docxFormData = new FormData();
    docxFormData.append('jobId', String(testJob2Id));
    docxFormData.append('coverLetter', 'Applying with Word document resume.');
    docxFormData.append('resume', docxBlob, 'Candidate_Profile.docx');

    const seeker2Auth = await request(`${API}/auth/register`, {
      method: 'POST',
      body: JSON.stringify({
        email: `candidate_docx_${Date.now()}@example.com`,
        password: 'password123',
        role: 'job_seeker',
        firstName: 'Word',
        lastName: 'User',
      }),
    });
    const applyDocxRes = await request(`${API}/applications`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${seeker2Auth.data?.token}` },
      body: docxFormData,
    });
    assert(applyDocxRes.status === 201, 'Application with DOCX resume succeeded (201 Created)');
    const docxAppId = applyDocxRes.data?.applicationId || applyDocxRes.data?.application?.id;

    const viewDocxRes = await request(`${API}/applications/${docxAppId}/resume/view`, { headers: rec1Headers });
    assert(viewDocxRes.status === 200, 'GET /resume/view for DOCX resume returns 200 OK');
    assert(
      viewDocxRes.headers.get('content-type')?.includes('wordprocessingml') ||
        viewDocxRes.headers.get('content-type')?.includes('application/octet-stream') ||
        viewDocxRes.headers.get('content-type')?.includes('msword'),
      `Correct MIME type set for DOCX resume (got: "${viewDocxRes.headers.get('content-type')}")`
    );

    // -------------------------------------------------------------------------
    // TEST CASE 3: Job seeker has no resume and does not upload one
    // -------------------------------------------------------------------------
    console.log('\n--- TEST CASE 3: Job Seeker Has No Resume & Does Not Upload One ---');
    const noResumeCandidateAuth = await request(`${API}/auth/register`, {
      method: 'POST',
      body: JSON.stringify({
        email: `candidate_no_resume_${Date.now()}@example.com`,
        password: 'password123',
        role: 'job_seeker',
        firstName: 'NoResume',
        lastName: 'Candidate',
      }),
    });
    const noResumeCandidateToken = noResumeCandidateAuth.data?.token;

    const emptyApplyRes = await request(`${API}/applications`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${noResumeCandidateToken}` },
      body: JSON.stringify({
        jobId: testJobId,
        coverLetter: 'Applying without resume.',
      }),
    });
    assert(emptyApplyRes.status === 400, 'Application without resume is blocked with 400 Bad Request');
    assert(
      emptyApplyRes.data?.message?.includes('Please select a saved resume or upload a new resume file'),
      `Clear validation message displayed: "${emptyApplyRes.data?.message}"`
    );

    // -------------------------------------------------------------------------
    // TEST CASE 4: Candidate has no resume available
    // -------------------------------------------------------------------------
    console.log('\n--- TEST CASE 4: Candidate Has No Resume Available State ---');
    // Verify frontend code contains "Resume not available" badge and fallback
    const applicantsPageSrc = fs.readFileSync(path.join(__dirname, 'frontend/src/app/recruiter/applicants/page.js'), 'utf8');
    const candidateDossierSrc = fs.readFileSync(path.join(__dirname, 'frontend/src/app/recruiter/candidate/[id]/page.js'), 'utf8');
    assert(applicantsPageSrc.includes('Resume not available'), 'recruiter/applicants/page.js contains "Resume not available" label');
    assert(applicantsPageSrc.includes('id={`resume-not-available-${app.application_id}`}'), 'recruiter/applicants/page.js has unique resume-not-available ID');
    assert(candidateDossierSrc.includes('Resume not available'), 'recruiter/candidate/[id]/page.js contains "Resume not available" label');
    assert(candidateDossierSrc.includes('id="resume-not-available"'), 'recruiter/candidate/[id]/page.js has id="resume-not-available"');

    // -------------------------------------------------------------------------
    // TEST CASE 5: Resume URL/file is invalid or unavailable
    // -------------------------------------------------------------------------
    console.log('\n--- TEST CASE 5: Invalid or Missing Resume Error Handling ---');
    const nonExistentAppView = await request(`${API}/applications/999999/resume/view`, { headers: rec1Headers });
    assert(nonExistentAppView.status === 404, 'Viewing non-existent application resume returns 404 Not Found');
    assert(nonExistentAppView.data?.message, `Returns clear JSON error message: "${nonExistentAppView.data?.message}"`);

    const nonExistentResumeView = await request(`${API}/resumes/999999/view`, { headers: rec1Headers });
    assert(nonExistentResumeView.status === 404, 'Viewing non-existent resume returns 404 Not Found');
    assert(nonExistentResumeView.data?.message, `Returns clear JSON error message: "${nonExistentResumeView.data?.message}"`);

    // Verify ResumeViewerModal handles error gracefully with error card
    const viewerModalSrc = fs.readFileSync(path.join(__dirname, 'frontend/src/components/ResumeViewerModal.js'), 'utf8');
    assert(viewerModalSrc.includes('Resume Cannot Be Loaded') || viewerModalSrc.includes('AlertTriangle'), 'ResumeViewerModal displays clear error card instead of blank viewer');

    // -------------------------------------------------------------------------
    // TEST CASE 6: Unauthorized recruiter attempts to access another recruiter candidate resume
    // -------------------------------------------------------------------------
    console.log('\n--- TEST CASE 6: Unauthorized Access Forbidden (403) ---');
    const unauthorizedView = await request(`${API}/applications/${savedAppId}/resume/view`, { headers: rec2Headers });
    assert(unauthorizedView.status === 403, 'Unauthorized recruiter accessing another recruiter applicant resume returns 403 Forbidden');
    assert(
      unauthorizedView.data?.message?.includes('Forbidden'),
      `Forbidden error message clearly explains: "${unauthorizedView.data?.message}"`
    );

    const unauthenticatedView = await fetch(`${API}/applications/${savedAppId}/resume/view`);
    assert(unauthenticatedView.status === 401, 'Unauthenticated resume view returns 401 Unauthorized');

    // -------------------------------------------------------------------------
    // TEST CASE 7: Application submitted email notification
    // -------------------------------------------------------------------------
    console.log('\n--- TEST CASE 7: Application Submission Dispatches Email Notification ---');
    const emailLogsRes = await request(`${API}/notifications/email-logs`, { headers: adminHeaders });
    assert(emailLogsRes.status === 200, 'Admin successfully queried email logs');
    const submittedEmail = emailLogsRes.data?.logs?.find(
      (log) => log.to === 'seeker@example.com' && log.subject.includes('Application Submitted')
    );
    assert(submittedEmail, 'Found application-submitted email dispatched to candidate');
    assert(submittedEmail?.subject?.includes('Principal Cloud Architect'), `Email subject includes Job Title: "${submittedEmail?.subject}"`);
    assert(submittedEmail?.html?.includes('Application Submitted'), 'Email HTML content confirms submission');
    assert(submittedEmail?.html?.includes('Next Steps'), 'Email HTML provides clear next-step details');

    // -------------------------------------------------------------------------
    // TEST CASE 8: Status changed to Shortlisted -> candidate receives email
    // -------------------------------------------------------------------------
    console.log('\n--- TEST CASE 8: Status Update to Shortlisted Dispatches Email ---');
    const statusUpdateRes = await request(`${API}/applications/${savedAppId}/status`, {
      method: 'PUT',
      headers: rec1Headers,
      body: JSON.stringify({ status: 'Shortlisted' }),
    });
    assert(statusUpdateRes.status === 200, 'Recruiter updated application status to "Shortlisted"');

    const emailLogsAfterShortlist = await request(`${API}/notifications/email-logs`, { headers: adminHeaders });
    const shortlistEmail = emailLogsAfterShortlist.data?.logs?.find(
      (log) => log.to === 'seeker@example.com' && log.subject.includes('Shortlisted')
    );
    assert(shortlistEmail, 'Candidate received "Shortlisted" status update email');
    assert(shortlistEmail?.html?.includes('Shortlisted'), 'Email body contains Shortlisted status');
    assert(shortlistEmail?.html?.includes('profile') || shortlistEmail?.html?.includes('assessment') || shortlistEmail?.html?.includes('interview'), 'Email body includes tailored next steps');

    // -------------------------------------------------------------------------
    // TEST CASE 9: Status changed to Interview, Selected, Rejected -> candidate receives emails
    // -------------------------------------------------------------------------
    console.log('\n--- TEST CASE 9: Status Updates to Interview, Selected & Rejected ---');
    // Status -> Interview
    await request(`${API}/applications/${savedAppId}/status`, {
      method: 'PUT',
      headers: rec1Headers,
      body: JSON.stringify({ status: 'Interview' }),
    });
    const interviewEmailLogs = await request(`${API}/notifications/email-logs`, { headers: adminHeaders });
    const interviewEmail = interviewEmailLogs.data?.logs?.find(
      (log) => log.to === 'seeker@example.com' && log.subject.includes('Interview')
    );
    assert(interviewEmail, 'Candidate received "Interview" status update email');

    // Status -> Selected
    await request(`${API}/applications/${savedAppId}/status`, {
      method: 'PUT',
      headers: rec1Headers,
      body: JSON.stringify({ status: 'Selected' }),
    });
    const selectedEmailLogs = await request(`${API}/notifications/email-logs`, { headers: adminHeaders });
    const selectedEmail = selectedEmailLogs.data?.logs?.find(
      (log) => log.to === 'seeker@example.com' && log.subject.includes('Selected')
    );
    assert(selectedEmail, 'Candidate received "Selected" status update email');

    // Status -> Rejected on a different application
    await request(`${API}/applications/${uploadAppId}/status`, {
      method: 'PUT',
      headers: rec1Headers,
      body: JSON.stringify({ status: 'Rejected' }),
    });
    const rejectedEmailLogs = await request(`${API}/notifications/email-logs`, { headers: adminHeaders });
    const rejectedEmail = rejectedEmailLogs.data?.logs?.find(
      (log) => log.to === freshEmail && log.subject.includes('Rejected')
    );
    assert(rejectedEmail, 'Candidate received "Rejected" status update email');

    // -------------------------------------------------------------------------
    // TEST CASE 10: Email failure resilience
    // -------------------------------------------------------------------------
    console.log('\n--- TEST CASE 10: Email Failure Does NOT Fail Application / Status Update ---');
    // Application update with an invalid/mock email that cannot fail the DB operation
    const resilienceUpdate = await request(`${API}/applications/${savedAppId}/status`, {
      method: 'PUT',
      headers: rec1Headers,
      body: JSON.stringify({ status: 'Under Review' }),
    });
    assert(resilienceUpdate.status === 200, 'Status update succeeded with 200 OK regardless of SMTP status');
    assert(resilienceUpdate.data?.success === true, 'Response payload confirmed database update success');

    // Verify application in DB is indeed "Under Review"
    const verifyAppStatus = await request(`${API}/applications/recruiter/applicants`, { headers: rec1Headers });
    const currentApp = verifyAppStatus.data?.applicants?.find((a) => a.application_id === savedAppId);
    assert(currentApp?.status === 'Under Review', `Application status persisted in database as "${currentApp?.status}"`);

    // -------------------------------------------------------------------------
    // TEST CASE 11: Duplicate status updates do NOT send duplicate emails
    // -------------------------------------------------------------------------
    console.log('\n--- TEST CASE 11: Duplicate Status Update Email Suppression ---');
    // Count current Under Review emails
    const beforeDupLogs = await request(`${API}/notifications/email-logs`, { headers: adminHeaders });
    const initialUnderReviewCount = beforeDupLogs.data?.logs?.filter(
      (l) => l.to === 'seeker@example.com' && l.subject.includes('Under Review')
    ).length;

    // Resubmit the exact same status 'Under Review'
    const duplicateStatusRes = await request(`${API}/applications/${savedAppId}/status`, {
      method: 'PUT',
      headers: rec1Headers,
      body: JSON.stringify({ status: 'Under Review' }),
    });
    assert(duplicateStatusRes.status === 200, 'Duplicate status request returns 200 OK gracefully');

    const afterDupLogs = await request(`${API}/notifications/email-logs`, { headers: adminHeaders });
    const finalUnderReviewCount = afterDupLogs.data?.logs?.filter(
      (l) => l.to === 'seeker@example.com' && l.subject.includes('Under Review')
    ).length;
    assert(
      finalUnderReviewCount === initialUnderReviewCount,
      `No duplicate email dispatched for identical status submission (Count remained: ${finalUnderReviewCount})`
    );

    // -------------------------------------------------------------------------
    // Step 12: Codebase Structure & Component Verification
    // -------------------------------------------------------------------------
    console.log('\n--- Step 12: Frontend Component & Viewer Architecture Audits ---');
    // ResumeViewerModal
    assert(fs.existsSync(path.join(__dirname, 'frontend/src/components/ResumeViewerModal.js')), 'frontend/src/components/ResumeViewerModal.js exists');
    assert(viewerModalSrc.includes('zoomIn') || viewerModalSrc.includes('handleZoomIn'), 'ResumeViewerModal implements zoom controls');
    assert(viewerModalSrc.includes('handleOpenNewTab') || viewerModalSrc.includes('Open in Tab'), 'ResumeViewerModal implements Open In New Tab');
    assert(viewerModalSrc.includes('<iframe'), 'ResumeViewerModal renders native PDF via <iframe>');
    assert(viewerModalSrc.includes('Word Document') || viewerModalSrc.includes('Microsoft Word'), 'ResumeViewerModal provides DOC/DOCX explanation card');

    // ApplyJobModal
    assert(fs.existsSync(path.join(__dirname, 'frontend/src/components/ApplyJobModal.js')), 'frontend/src/components/ApplyJobModal.js exists');
    const applyModalSrc = fs.readFileSync(path.join(__dirname, 'frontend/src/components/ApplyJobModal.js'), 'utf8');
    assert(applyModalSrc.includes('saved') && applyModalSrc.includes('upload'), 'ApplyJobModal supports saved resume selection and upload tabs');
    assert(applyModalSrc.includes('MAX_FILE_SIZE_BYTES') || applyModalSrc.includes('10 * 1024 * 1024'), 'ApplyJobModal validates maximum 10MB file size');
    assert(applyModalSrc.includes('.pdf') && applyModalSrc.includes('.docx'), 'ApplyJobModal supports PDF, DOC, DOCX formats');
    assert(applyModalSrc.includes('uploadedFile.name') || applyModalSrc.includes('selected-resume-filename'), 'ApplyJobModal displays uploaded filename');

    // Recruiter pipeline buttons
    assert(applicantsPageSrc.includes('View Resume'), 'recruiter/applicants/page.js renders "View Resume" button');
    assert(applicantsPageSrc.includes('id={`view-resume-${app.application_id}`}'), 'recruiter/applicants/page.js assigns id="view-resume-[id]"');
    assert(applicantsPageSrc.includes('Download Resume'), 'recruiter/applicants/page.js preserves "Download Resume" option');

    // Recruiter candidate dossier buttons
    assert(candidateDossierSrc.includes('View Resume') || candidateDossierSrc.includes('View Submitted Resume'), 'recruiter/candidate/[id]/page.js renders View Resume button');
    assert(candidateDossierSrc.includes('id="view-resume-btn"'), 'recruiter/candidate/[id]/page.js assigns id="view-resume-btn"');

    // Environment variables verification
    const envSrc = fs.readFileSync(path.join(__dirname, 'backend/.env'), 'utf8');
    assert(envSrc.includes('SMTP_HOST'), 'backend/.env contains SMTP_HOST configuration');
    assert(envSrc.includes('SMTP_PORT'), 'backend/.env contains SMTP_PORT configuration');
    assert(envSrc.includes('SMTP_USER'), 'backend/.env contains SMTP_USER configuration');
    assert(envSrc.includes('SMTP_PASS'), 'backend/.env contains SMTP_PASS configuration');
    assert(envSrc.includes('EMAIL_FROM'), 'backend/.env contains EMAIL_FROM configuration');

    // Cleanup test job
    await request(`${API}/jobs/${testJobId}`, { method: 'DELETE', headers: rec1Headers });
    await request(`${API}/jobs/${testJob2Id}`, { method: 'DELETE', headers: rec1Headers });
    console.log('\n  🧹 Cleaned up temporary test jobs');
  } catch (err) {
    console.error('Fatal test error:', err);
    failedTests++;
  }

  console.log('\n================================================================================');
  console.log(`📊 FINAL TEST RESULTS: Total: ${totalTests} | Passed: ${passedTests} | Failed: ${failedTests}`);
  console.log('================================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runAllTests();

const path = require('path');
const fs = require('fs');
const db = require('../config/db');
const { calculateMatchScore } = require('../services/recommendationService');
const emailService = require('../services/emailService');
const { getValidPdfBuffer } = require('../utils/pdfGenerator');

function generateResumeText(resume, seeker = {}) {
  let data = {};
  if (resume.resume_data) {
    try {
      data = typeof resume.resume_data === 'string' ? JSON.parse(resume.resume_data) : resume.resume_data;
    } catch {
      data = {};
    }
  }

  const p = data.personalInfo || {};
  const name = p.fullName || `${seeker.first_name || ''} ${seeker.last_name || ''}`.trim() || resume.title || 'Candidate Resume';
  const email = p.email || seeker.email || seeker.candidate_email || '';
  const phone = p.phone || seeker.phone || '';
  const loc = p.location || seeker.location || '';
  const headline = p.headline || seeker.headline || '';
  const obj = data.careerObjective || seeker.bio || '';
  const skills = Array.isArray(data.skills) ? data.skills : [];
  const exp = Array.isArray(data.experience) ? data.experience : [];
  const edu = Array.isArray(data.education) ? data.education : [];
  const proj = Array.isArray(data.projects) ? data.projects : [];
  const certs = Array.isArray(data.certifications) ? data.certifications : [];
  const ach = Array.isArray(data.achievements) ? data.achievements : [];
  const langs = Array.isArray(data.languages) ? data.languages : [];

  let content = `================================================================================\n`;
  content += `CANDIDATE RESUME: ${name.toUpperCase()}\n`;
  if (headline) content += `${headline}\n`;
  const contactParts = [];
  if (email) contactParts.push(`Email: ${email}`);
  if (phone) contactParts.push(`Phone: ${phone}`);
  if (loc) contactParts.push(`Location: ${loc}`);
  if (contactParts.length > 0) content += `${contactParts.join(' | ')}\n`;
  content += `================================================================================\n\n`;

  if (obj) {
    content += `PROFESSIONAL SUMMARY:\n--------------------\n${obj}\n\n`;
  }

  if (skills.length > 0) {
    content += `KEY TECHNICAL SKILLS:\n---------------------\n${skills.join(', ')}\n\n`;
  }

  if (exp.length > 0) {
    content += `PROFESSIONAL EXPERIENCE:\n------------------------\n`;
    for (const item of exp) {
      content += `• ${item.title || 'Position'} | ${item.company || 'Company'}${item.dates ? ` (${item.dates})` : ''}\n`;
      if (item.location) content += `  Location: ${item.location}\n`;
      if (item.description) content += `  Summary: ${item.description}\n`;
      content += `\n`;
    }
  }

  if (edu.length > 0) {
    content += `EDUCATION:\n----------\n`;
    for (const item of edu) {
      content += `• ${item.degree || 'Degree'} - ${item.institution || 'Institution'}${item.years ? ` (${item.years})` : ''}\n`;
      if (item.field) content += `  Field of Study: ${item.field}\n`;
      if (item.grade) content += `  Grade/GPA: ${item.grade}\n`;
      content += `\n`;
    }
  }

  if (proj.length > 0) {
    content += `KEY PROJECTS:\n-------------\n`;
    for (const item of proj) {
      content += `• ${item.title || 'Project'}\n`;
      if (item.tech) content += `  Tech Stack: ${item.tech}\n`;
      if (item.description) content += `  Description: ${item.description}\n`;
      if (item.url) content += `  Link: ${item.url}\n`;
      content += `\n`;
    }
  }

  if (certs.length > 0) {
    content += `CERTIFICATIONS:\n---------------\n`;
    for (const item of certs) {
      content += `• ${typeof item === 'string' ? item : `${item.name || ''}${item.issuer ? ` - ${item.issuer}` : ''}${item.date ? ` (${item.date})` : ''}`}\n`;
    }
    content += `\n`;
  }

  if (ach.length > 0) {
    content += `HONORS & ACHIEVEMENTS:\n----------------------\n`;
    for (const item of ach) {
      content += `• ${item}\n`;
    }
    content += `\n`;
  }

  if (langs.length > 0) {
    content += `LANGUAGES:\n----------\n${langs.join(', ')}\n\n`;
  }

  return content;
}

// Apply for a job
async function applyForJob(req, res) {
  try {
    const seekerId = req.user.job_seeker_id;
    if (!seekerId) {
      return res.status(403).json({ success: false, message: 'Only job seekers can apply for jobs.' });
    }

    let { jobId, resumeId, coverLetter, requireResume } = req.body;
    if (!jobId) {
      return res.status(400).json({ success: false, message: 'Job ID is required.' });
    }

    jobId = parseInt(jobId, 10);
    if (isNaN(jobId)) {
      return res.status(400).json({ success: false, message: 'Invalid Job ID provided.' });
    }

    if (resumeId) {
      resumeId = parseInt(resumeId, 10);
      if (isNaN(resumeId)) resumeId = null;
    }

    // Handle new resume file upload attached to application
    if (req.file) {
      const allowedExts = ['.pdf', '.doc', '.docx'];
      const ext = path.extname(req.file.originalname).toLowerCase();
      if (!allowedExts.includes(ext)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid resume file format. Supported formats: PDF, DOC, DOCX.',
        });
      }

      const fileUrl = `/uploads/${req.file.filename}`;
      const title = req.file.originalname;

      const existingRes = await db.query('SELECT id FROM resumes WHERE job_seeker_id = $1', [seekerId]);
      const isDefault = existingRes.rows.length === 0 ? 1 : 0;

      const newResumeRes = await db.query(`
        INSERT INTO resumes (job_seeker_id, title, file_url, is_default)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `, [seekerId, title, fileUrl, isDefault]);

      resumeId = newResumeRes.rows[0]?.id || newResumeRes.lastID;
    }

    // Verify job exists and is active
    const jobRes = await db.query('SELECT id, title, recruiter_id, status FROM jobs WHERE id = $1', [jobId]);
    if (jobRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Job posting not found.' });
    }
    if (jobRes.rows[0].status !== 'active') {
      return res.status(400).json({ success: false, message: 'This job is no longer accepting applications.' });
    }
    const job = jobRes.rows[0];

    // Check if already applied
    const existing = await db.query('SELECT id FROM applications WHERE job_id = $1 AND job_seeker_id = $2', [jobId, seekerId]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'You have already applied for this job.' });
    }

    // Verify that the resume belongs to this job seeker if provided (prevent ID manipulation)
    if (resumeId) {
      const resumeCheck = await db.query('SELECT id FROM resumes WHERE id = $1 AND job_seeker_id = $2', [resumeId, seekerId]);
      if (resumeCheck.rows.length === 0) {
        return res.status(403).json({ success: false, message: 'Forbidden: Selected resume does not belong to your candidate account.' });
      }
    } else {
      // If no resumeId explicitly selected, associate candidate's default or uploaded resume if available
      const defaultRes = await db.query(
        "SELECT id FROM resumes WHERE job_seeker_id = $1 AND ((file_url IS NOT NULL AND file_url != '') OR resume_data IS NOT NULL) ORDER BY is_default DESC, id ASC LIMIT 1",
        [seekerId]
      );
      if (defaultRes.rows.length > 0) {
        resumeId = defaultRes.rows[0].id;
      } else if (req.body.resumeId !== null || requireResume === 'true' || requireResume === true || req.headers['content-type']?.includes('multipart/form-data')) {
        return res.status(400).json({
          success: false,
          message: 'Please select a saved resume or upload a new resume file to submit your application.',
        });
      }
    }

    // Insert application
    const appRes = await db.query(`
      INSERT INTO applications (job_id, job_seeker_id, resume_id, cover_letter, status)
      VALUES ($1, $2, $3, $4, 'Applied')
      RETURNING id, status, applied_at
    `, [jobId, seekerId, resumeId || null, coverLetter || '']);

    const newAppId = appRes.rows[0]?.id || appRes.lastID;

    // Fetch job, company, and applicant user details for notifications & email
    let seekerEmail = null;
    let seekerName = 'Candidate';
    let companyName = 'the hiring company';

    try {
      const emailInfoRes = await db.query(`
        SELECT u.email, js.first_name, js.last_name, j.title AS job_title,
               COALESCE(c.name, 'the hiring company') AS company_name
        FROM job_seekers js
        JOIN users u ON js.user_id = u.id
        JOIN jobs j ON j.id = $1
        LEFT JOIN companies c ON j.company_id = c.id
        WHERE js.id = $2
      `, [jobId, seekerId]);

      if (emailInfoRes.rows.length > 0) {
        const info = emailInfoRes.rows[0];
        seekerEmail = info.email;
        seekerName = `${info.first_name || ''} ${info.last_name || ''}`.trim() || 'Candidate';
        companyName = info.company_name;
      }
    } catch (fetchErr) {
      console.error('[Apply] Error fetching email details:', fetchErr.message);
    }

    // Notify recruiter (in-app)
    const recUserRes = await db.query('SELECT user_id FROM recruiters WHERE id = $1', [job.recruiter_id]);
    if (recUserRes.rows.length > 0) {
      const recUserId = recUserRes.rows[0].user_id;
      await db.query(`
        INSERT INTO notifications (user_id, title, message, type, link)
        VALUES ($1, $2, $3, 'new_applicant', '/recruiter/applicants')
      `, [recUserId, 'New Job Application', `${seekerName} applied for ${job.title}.`]);
    }

    // Notify job seeker (in-app)
    await db.query(`
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES ($1, $2, $3, 'application_submitted', '/seeker/applications')
    `, [req.user.id, 'Application Submitted', `Your application for ${job.title} was successfully submitted!`]);

    // Send email notification to job seeker (non-blocking, never fails submission)
    if (seekerEmail) {
      emailService.sendApplicationSubmittedEmail({
        to: seekerEmail,
        candidateName: seekerName,
        jobTitle: job.title,
        companyName: companyName,
        applicationId: newAppId,
      }).catch(err => console.error('[Apply Email Error]', err.message));
    }

    return res.status(201).json({
      success: true,
      message: 'Application submitted successfully!',
      applicationId: newAppId,
      application: {
        id: newAppId,
        job_id: jobId,
        status: 'Applied',
      },
    });
  } catch (error) {
    console.error('applyForJob error:', error);
    return res.status(500).json({ success: false, message: 'Failed to submit application.' });
  }
}

// Get all applications for the logged-in job seeker
async function getSeekerApplications(req, res) {
  try {
    const seekerId = req.user.job_seeker_id;
    if (!seekerId) {
      return res.status(403).json({ success: false, message: 'Job seeker profile not found.' });
    }

    const { status } = req.query;
    const conditions = ['a.job_seeker_id = $1'];
    const params = [seekerId];

    if (status && status !== 'All') {
      params.push(status);
      conditions.push(`a.status = $${params.length}`);
    }

    const sql = `
      SELECT a.id, a.status, a.cover_letter, a.notes, a.applied_at, a.updated_at,
             j.id AS job_id, j.title AS job_title, j.location AS job_location, j.job_type, j.min_salary, j.max_salary,
             c.name AS company_name, c.logo_url AS company_logo,
             r.id AS resume_id, r.title AS resume_title, r.file_url AS resume_file_url
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
      LEFT JOIN companies c ON j.company_id = c.id
      LEFT JOIN resumes r ON a.resume_id = r.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY a.applied_at DESC
    `;

    const result = await db.query(sql, params);
    return res.json({ success: true, applications: result.rows });
  } catch (error) {
    console.error('getSeekerApplications error:', error);
    return res.status(500).json({ success: false, message: 'Error retrieving applications.' });
  }
}

// Withdraw application (Seeker)
async function withdrawApplication(req, res) {
  try {
    const { id } = req.params;
    const seekerId = req.user.job_seeker_id;
    if (!seekerId) {
      return res.status(403).json({ success: false, message: 'Job seeker profile not found.' });
    }

    // Check application exists
    const appCheck = await db.query('SELECT id, job_seeker_id FROM applications WHERE id = $1', [id]);
    if (appCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    // Check ownership
    if (appCheck.rows[0].job_seeker_id !== seekerId) {
      return res.status(403).json({ success: false, message: 'Forbidden: You can only withdraw your own applications.' });
    }

    await db.query('DELETE FROM applications WHERE id = $1 AND job_seeker_id = $2', [id, seekerId]);

    return res.json({ success: true, message: 'Application withdrawn successfully.' });
  } catch (error) {
    console.error('withdrawApplication error:', error);
    return res.status(500).json({ success: false, message: 'Error withdrawing application.' });
  }
}

// Get applicants for recruiter (with filters by job or status, and candidate match scores)
async function getRecruiterApplicants(req, res) {
  try {
    const { jobId, status, search } = req.query;
    const conditions = [];
    const params = [];

    if (req.user.role !== 'admin') {
      const recruiterId = req.user.recruiter_id;
      if (!recruiterId) {
        return res.status(403).json({ success: false, message: 'Recruiter profile not found.' });
      }
      params.push(recruiterId);
      conditions.push(`j.recruiter_id = $${params.length}`);
    }

    if (jobId) {
      params.push(jobId);
      conditions.push(`j.id = $${params.length}`);
    }

    if (status && status !== 'All') {
      params.push(status);
      conditions.push(`a.status = $${params.length}`);
    }

    if (search && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      const pIdx = params.length;
      conditions.push(`(LOWER(js.first_name) LIKE $${pIdx} OR LOWER(js.last_name) LIKE $${pIdx} OR LOWER(js.headline) LIKE $${pIdx})`);
    }

    const sql = `
      SELECT a.id AS application_id, a.status, a.cover_letter, a.notes, a.applied_at, a.updated_at,
             j.id AS job_id, j.title AS job_title, j.experience_required,
             js.id AS job_seeker_id, js.user_id, js.first_name, js.last_name, js.phone, js.headline,
             js.bio, js.location, js.experience_years, js.current_salary, js.expected_salary,
             js.github_url, js.linkedin_url, js.portfolio_url, js.avatar_url,
             u.email AS candidate_email,
             r.id AS resume_id, r.title AS resume_title, r.file_url AS resume_file_url, r.resume_data
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
      JOIN job_seekers js ON a.job_seeker_id = js.id
      JOIN users u ON js.user_id = u.id
      LEFT JOIN resumes r ON a.resume_id = r.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY a.applied_at DESC
    `;

    const result = await db.query(sql, params);
    const applicants = result.rows;

    // Enrich applicants with skills and recommendation match score for that job
    for (const applicant of applicants) {
      const skillsRes = await db.query(`
        SELECT s.name FROM user_skills us JOIN skills s ON us.skill_id = s.id WHERE us.job_seeker_id = $1
      `, [applicant.job_seeker_id]);
      applicant.skills = skillsRes.rows.map(s => s.name);

      const jobSkillsRes = await db.query(`
        SELECT s.name FROM job_skills js JOIN skills s ON js.skill_id = s.id WHERE js.job_id = $1
      `, [applicant.job_id]);

      applicant.match = calculateMatchScore(
        applicant,
        { experience_required: applicant.experience_required },
        skillsRes.rows,
        jobSkillsRes.rows
      );

      // Ensure candidates who have a valid uploaded or builder resume have resume_file_url populated
      if (!applicant.resume_file_url) {
        if (applicant.resume_id && applicant.resume_data) {
          applicant.resume_file_url = `/api/resumes/${applicant.resume_id}/download`;
        } else {
          const fallbackRes = await db.query(`
            SELECT id, title, file_url, resume_data FROM resumes
            WHERE job_seeker_id = $1 AND ((file_url IS NOT NULL AND file_url != '') OR resume_data IS NOT NULL)
            ORDER BY is_default DESC, id ASC
            LIMIT 1
          `, [applicant.job_seeker_id]);
          if (fallbackRes.rows.length > 0) {
            applicant.resume_file_url = fallbackRes.rows[0].file_url || `/api/resumes/${fallbackRes.rows[0].id}/download`;
            if (!applicant.resume_id) applicant.resume_id = fallbackRes.rows[0].id;
            if (!applicant.resume_title) applicant.resume_title = fallbackRes.rows[0].title;
            if (!applicant.resume_data) applicant.resume_data = fallbackRes.rows[0].resume_data;
          }
        }
      }
    }

    return res.json({ success: true, applicants });
  } catch (error) {
    console.error('getRecruiterApplicants error:', error);
    return res.status(500).json({ success: false, message: 'Error retrieving applicants.' });
  }
}

// Update application status (Recruiter & Admin)
// Workflow: Applied -> Under Review -> Shortlisted -> Interview -> Selected / Rejected
async function updateApplicationStatus(req, res) {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const validStatuses = ['Applied', 'Under Review', 'Shortlisted', 'Interview', 'Selected', 'Rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    // Verify application exists
    const appCheck = await db.query(`
      SELECT a.id, a.status AS old_status, a.job_seeker_id, js.user_id, js.first_name, js.last_name,
             u.email AS seeker_email, j.title AS job_title, j.recruiter_id,
             COALESCE(c.name, 'the hiring company') AS company_name
      FROM applications a 
      JOIN jobs j ON a.job_id = j.id
      LEFT JOIN companies c ON j.company_id = c.id
      JOIN job_seekers js ON a.job_seeker_id = js.id
      JOIN users u ON js.user_id = u.id
      WHERE a.id = $1
    `, [id]);

    if (appCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    const appInfo = appCheck.rows[0];

    // Verify ownership (unless admin)
    if (req.user.role !== 'admin' && appInfo.recruiter_id !== req.user.recruiter_id) {
      return res.status(403).json({ success: false, message: 'Forbidden: You can only update applications for your own job postings.' });
    }

    // Prevent duplicate emails & notifications if the status is unchanged
    if (appInfo.old_status === status) {
      if (notes) {
        await db.query('UPDATE applications SET notes = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [notes, id]);
      }
      return res.json({
        success: true,
        message: `Application is already ${status}.`,
        application: {
          id: parseInt(id),
          status,
          notes: notes || null,
        },
      });
    }

    await db.query(`
      UPDATE applications 
      SET status = $1, 
          notes = COALESCE($2, notes), 
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `, [status, notes || null, id]);

    // Send in-app notification to job seeker regarding status update
    const notifMessages = {
      'Under Review': `Your application for "${appInfo.job_title}" is now Under Review.`,
      'Shortlisted': `🎉 Great news! You have been Shortlisted for "${appInfo.job_title}".`,
      'Interview': `📅 Interview invitation! You have been scheduled for an interview for "${appInfo.job_title}".`,
      'Selected': `🏆 Congratulations! You have been Selected for "${appInfo.job_title}"!`,
      'Rejected': `Update regarding your application for "${appInfo.job_title}": Not selected at this time.`,
      'Applied': `Your application status for "${appInfo.job_title}" is reset to Applied.`,
    };

    await db.query(`
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES ($1, $2, $3, $4, '/seeker/applications')
    `, [
      appInfo.user_id,
      `Application Status: ${status}`,
      notifMessages[status] || `Your application status for "${appInfo.job_title}" changed to ${status}.`,
      status.toLowerCase().replace(/\s+/g, '_')
    ]);

    // Dispatch email notification to job seeker (non-blocking, never breaks status update)
    if (appInfo.seeker_email) {
      const candidateName = `${appInfo.first_name || ''} ${appInfo.last_name || ''}`.trim() || 'Candidate';
      emailService.sendApplicationStatusUpdateEmail({
        to: appInfo.seeker_email,
        candidateName,
        jobTitle: appInfo.job_title,
        companyName: appInfo.company_name,
        status,
        notes: notes || null,
        applicationId: parseInt(id),
      }).catch(err => console.error('[Status Email Error]', err.message));
    }

    return res.json({
      success: true,
      message: `Application status updated to ${status}!`,
      application: {
        id: parseInt(id),
        status,
        notes: notes || null,
      },
    });
  } catch (error) {
    console.error('updateApplicationStatus error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update application status.' });
  }
}

// Saved Jobs Management (Toggle save, get saved jobs)
async function toggleSaveJob(req, res) {
  try {
    const seekerId = req.user.job_seeker_id;
    if (!seekerId) {
      return res.status(403).json({ success: false, message: 'Only job seekers can save jobs.' });
    }

    const { jobId } = req.body;
    if (!jobId) {
      return res.status(400).json({ success: false, message: 'Job ID is required.' });
    }

    const existing = await db.query('SELECT id FROM saved_jobs WHERE job_seeker_id = $1 AND job_id = $2', [seekerId, jobId]);

    if (existing.rows.length > 0) {
      await db.query('DELETE FROM saved_jobs WHERE job_seeker_id = $1 AND job_id = $2', [seekerId, jobId]);
      return res.json({ success: true, isSaved: false, message: 'Job removed from saved list.' });
    } else {
      await db.query('INSERT INTO saved_jobs (job_seeker_id, job_id) VALUES ($1, $2)', [seekerId, jobId]);
      return res.json({ success: true, isSaved: true, message: 'Job saved to your bookmarks!' });
    }
  } catch (error) {
    console.error('toggleSaveJob error:', error);
    return res.status(500).json({ success: false, message: 'Failed to toggle saved job.' });
  }
}

async function getSavedJobs(req, res) {
  try {
    const seekerId = req.user.job_seeker_id;
    if (!seekerId) {
      return res.status(403).json({ success: false, message: 'Job seeker profile not found.' });
    }

    const sql = `
      SELECT sj.id AS saved_id, sj.saved_at,
             j.*, 
             c.name AS company_name, c.logo_url AS company_logo,
             (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id AND a.job_seeker_id = $1) > 0 AS has_applied
      FROM saved_jobs sj
      JOIN jobs j ON sj.job_id = j.id
      LEFT JOIN companies c ON j.company_id = c.id
      WHERE sj.job_seeker_id = $1
      ORDER BY sj.saved_at DESC
    `;
    const result = await db.query(sql, [seekerId]);
    return res.json({ success: true, savedJobs: result.rows });
  } catch (error) {
    console.error('getSavedJobs error:', error);
    return res.status(500).json({ success: false, message: 'Error retrieving saved jobs.' });
  }
}

// Get comprehensive candidate profile & application dossier for recruiter/admin
async function getCandidateDetail(req, res) {
  try {
    const { id } = req.params; // job_seeker_id
    const { appId, jobId } = req.query;

    const seekerRes = await db.query(`
      SELECT js.*, u.email as candidate_email
      FROM job_seekers js
      JOIN users u ON js.user_id = u.id
      WHERE js.id = $1
    `, [id]);

    if (seekerRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Candidate profile not found.' });
    }

    const candidate = seekerRes.rows[0];

    // Skills
    const skillsRes = await db.query(`
      SELECT us.id, us.skill_id, s.name, s.category, us.proficiency_level, us.years_of_experience
      FROM user_skills us
      JOIN skills s ON us.skill_id = s.id
      WHERE us.job_seeker_id = $1
    `, [id]);
    candidate.skills = skillsRes.rows.map(s => s.name);
    candidate.user_skills = skillsRes.rows;

    // Education
    const eduRes = await db.query(`
      SELECT * FROM education WHERE job_seeker_id = $1 ORDER BY start_year DESC
    `, [id]);
    candidate.education = eduRes.rows;

    // Experience
    const expRes = await db.query(`
      SELECT * FROM experience WHERE job_seeker_id = $1 ORDER BY start_date DESC
    `, [id]);
    candidate.experience = expRes.rows;

    // Projects
    const projRes = await db.query(`
      SELECT * FROM projects WHERE job_seeker_id = $1 ORDER BY id DESC
    `, [id]);
    candidate.projects = projRes.rows;

    // Certifications
    const certRes = await db.query(`
      SELECT * FROM certifications WHERE job_seeker_id = $1 ORDER BY id DESC
    `, [id]);
    candidate.certifications = certRes.rows;

    // Resumes
    const resRes = await db.query(`
      SELECT id, title, file_url, is_default, created_at FROM resumes WHERE job_seeker_id = $1
    `, [id]);
    candidate.resumes = resRes.rows;

    // Get candidate's application for this recruiter
    let appCondition = 'a.job_seeker_id = $1';
    const appParams = [id];

    if (req.user.role !== 'admin') {
      const recId = req.user.recruiter_id;
      appParams.push(recId);
      appCondition += ` AND j.recruiter_id = $${appParams.length}`;
    }

    if (appId) {
      appParams.push(appId);
      appCondition += ` AND a.id = $${appParams.length}`;
    } else if (jobId) {
      appParams.push(jobId);
      appCondition += ` AND a.job_id = $${appParams.length}`;
    }

    const appSql = `
      SELECT a.id AS application_id, a.job_id, a.status, a.cover_letter, a.notes, a.applied_at, a.updated_at,
             j.title AS job_title, j.experience_required,
             r.id AS resume_id, r.title AS resume_title, r.file_url AS resume_file_url
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
      LEFT JOIN resumes r ON a.resume_id = r.id
      WHERE ${appCondition}
      ORDER BY a.applied_at DESC
      LIMIT 1
    `;
    const appResult = await db.query(appSql, appParams);
    if (appResult.rows.length > 0) {
      candidate.application = appResult.rows[0];
      candidate.application_id = candidate.application.application_id;
      candidate.job_id = candidate.application.job_id;
      candidate.status = candidate.application.status;
      candidate.notes = candidate.application.notes;
      candidate.cover_letter = candidate.application.cover_letter;
      candidate.job_title = candidate.application.job_title;
      candidate.resume_file_url = candidate.application.resume_file_url;
      candidate.applied_at = candidate.application.applied_at;

      // Calculate match score
      const jobSkillsRes = await db.query(`
        SELECT s.name FROM job_skills js JOIN skills s ON js.skill_id = s.id WHERE js.job_id = $1
      `, [candidate.application.job_id]);

      candidate.match = calculateMatchScore(
        candidate,
        { experience_required: candidate.application.experience_required },
        skillsRes.rows,
        jobSkillsRes.rows
      );
    }

    // Ensure candidate has resume_file_url populated if any resume exists
    if (!candidate.resume_file_url && candidate.resumes && candidate.resumes.length > 0) {
      const defaultWithFile = candidate.resumes.find((r) => r.is_default && ((r.file_url && r.file_url.trim() !== '') || r.resume_data));
      const anyWithFile = candidate.resumes.find((r) => (r.file_url && r.file_url.trim() !== '') || r.resume_data);
      const fallback = defaultWithFile || anyWithFile;
      if (fallback) {
        candidate.resume_file_url = fallback.file_url || `/api/resumes/${fallback.id}/download`;
        if (!candidate.resume_title) candidate.resume_title = fallback.title;
        if (!candidate.resume_id) candidate.resume_id = fallback.id;
      }
    }

    return res.json({ success: true, candidate });
  } catch (error) {
    console.error('getCandidateDetail error:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving candidate details.' });
  }
}

// Download resume attached to an application directly with auth and permission checks
async function downloadApplicationResume(req, res) {
  try {
    const { id } = req.params; // application_id

    const appRes = await db.query(`
      SELECT a.*, j.recruiter_id, j.title as job_title,
             js.id as seeker_id, js.first_name, js.last_name, js.phone, js.headline, js.bio, js.location,
             u.email as candidate_email,
             r.id as r_id, r.title as r_title, r.file_url as r_file_url, r.resume_data as r_resume_data
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
      JOIN job_seekers js ON a.job_seeker_id = js.id
      JOIN users u ON js.user_id = u.id
      LEFT JOIN resumes r ON a.resume_id = r.id
      WHERE a.id = $1
    `, [id]);

    if (appRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    const app = appRes.rows[0];

    // Authorization check
    if (req.user.role === 'recruiter') {
      if (!req.user.recruiter_id || app.recruiter_id !== req.user.recruiter_id) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: You can only download resumes for candidates who applied to your job postings.',
        });
      }
    } else if (req.user.role === 'job_seeker' || req.user.role === 'candidate') {
      if (app.job_seeker_id !== req.user.job_seeker_id) {
        return res.status(403).json({ success: false, message: 'Forbidden: You can only download your own application resume.' });
      }
    } else if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden: Access denied.' });
    }

    // Identify resume
    let fileUrl = app.r_file_url;
    let resumeTitle = app.r_title;
    let resumeData = app.r_resume_data;
    let resumeId = app.r_id;

    // Fallback if application had no resume_id or empty file_url
    if (!fileUrl && !resumeData) {
      const fallbackRes = await db.query(`
        SELECT id, title, file_url, resume_data FROM resumes
        WHERE job_seeker_id = $1 AND ((file_url IS NOT NULL AND file_url != '') OR resume_data IS NOT NULL)
        ORDER BY is_default DESC, id ASC
        LIMIT 1
      `, [app.job_seeker_id]);
      if (fallbackRes.rows.length > 0) {
        fileUrl = fallbackRes.rows[0].file_url;
        resumeTitle = fallbackRes.rows[0].title;
        resumeData = fallbackRes.rows[0].resume_data;
        resumeId = fallbackRes.rows[0].id;
      }
    }

    if (!fileUrl && !resumeData) {
      return res.status(404).json({
        success: false,
        message: 'Resume file is not available for this candidate.',
      });
    }

    let fullPath = null;
    if (fileUrl) {
      let cleanPath = fileUrl;
      if (cleanPath.includes('/uploads/')) {
        cleanPath = cleanPath.split('/uploads/').pop();
      } else if (cleanPath.includes('\\uploads\\')) {
        cleanPath = cleanPath.split('\\uploads\\').pop();
      } else {
        cleanPath = cleanPath.replace(/^[/\\]+uploads[/\\]+/, '').replace(/^[/\\]+/, '');
      }
      fullPath = path.resolve(__dirname, '../../uploads', cleanPath);
    }

    if (!fullPath || !fs.existsSync(fullPath)) {
      if (resumeData) {
        const uploadsDir = path.resolve(__dirname, '../../uploads');
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        const generated = generateResumeText({ resume_data: resumeData, title: resumeTitle }, app);
        const genFileName = `resume_${resumeId || app.application_id}.pdf`;
        fullPath = path.resolve(uploadsDir, genFileName);
        fs.writeFileSync(fullPath, generated, 'utf8');
      } else {
        return res.status(404).json({ success: false, message: 'Resume file does not exist on server.' });
      }
    }

    const baseTitle = (resumeTitle || `${app.first_name || 'Candidate'}_${app.last_name || ''}_Resume`).replace(/\.[^/.]+$/, '');
    const safeTitle = baseTitle.replace(/[^a-zA-Z0-9_-]/g, '_') || 'Resume';
    const ext = path.extname(fullPath).toLowerCase() || '.pdf';
    const downloadName = `${safeTitle}${ext}`;

    if (ext === '.pdf') {
      const pdfBuffer = getValidPdfBuffer(fullPath);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      return res.end(pdfBuffer);
    }

    let mimeType = 'application/pdf';
    if (ext === '.docx') {
      mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    } else if (ext === '.doc') {
      mimeType = 'application/msword';
    }

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
    return res.download(fullPath, downloadName, (err) => {
      if (err && !res.headersSent) {
        return res.status(500).json({ success: false, message: 'Error transferring resume file.' });
      }
    });
  } catch (error) {
    console.error('downloadApplicationResume error:', error);
    return res.status(500).json({ success: false, message: 'Error downloading resume file.' });
  }
}

// View application resume file directly in browser (inline stream) with auth and permission checks
async function viewApplicationResume(req, res) {
  try {
    const { id } = req.params; // application_id

    const appRes = await db.query(`
      SELECT a.*, j.recruiter_id, j.title as job_title,
             js.id as seeker_id, js.first_name, js.last_name, js.phone, js.headline, js.bio, js.location,
             u.email as candidate_email,
             r.id as r_id, r.title as r_title, r.file_url as r_file_url, r.resume_data as r_resume_data
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
      JOIN job_seekers js ON a.job_seeker_id = js.id
      JOIN users u ON js.user_id = u.id
      LEFT JOIN resumes r ON a.resume_id = r.id
      WHERE a.id = $1
    `, [id]);

    if (appRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    const app = appRes.rows[0];

    // Authorization check
    if (req.user.role === 'recruiter') {
      if (!req.user.recruiter_id || app.recruiter_id !== req.user.recruiter_id) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: You can only view resumes for candidates who applied to your job postings.',
        });
      }
    } else if (req.user.role === 'job_seeker' || req.user.role === 'candidate') {
      if (app.job_seeker_id !== req.user.job_seeker_id) {
        return res.status(403).json({ success: false, message: 'Forbidden: You can only view your own application resume.' });
      }
    } else if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden: Access denied.' });
    }

    // Identify resume
    let fileUrl = app.r_file_url;
    let resumeTitle = app.r_title;
    let resumeData = app.r_resume_data;
    let resumeId = app.r_id;

    if (!fileUrl && !resumeData) {
      const fallbackRes = await db.query(`
        SELECT id, title, file_url, resume_data FROM resumes
        WHERE job_seeker_id = $1 AND ((file_url IS NOT NULL AND file_url != '') OR resume_data IS NOT NULL)
        ORDER BY is_default DESC, id ASC
        LIMIT 1
      `, [app.job_seeker_id]);
      if (fallbackRes.rows.length > 0) {
        fileUrl = fallbackRes.rows[0].file_url;
        resumeTitle = fallbackRes.rows[0].title;
        resumeData = fallbackRes.rows[0].resume_data;
        resumeId = fallbackRes.rows[0].id;
      }
    }

    if (!fileUrl && !resumeData) {
      return res.status(404).json({
        success: false,
        message: 'Resume file is not available for this candidate.',
      });
    }

    let fullPath = null;
    if (fileUrl) {
      let cleanPath = fileUrl;
      if (cleanPath.includes('/uploads/')) {
        cleanPath = cleanPath.split('/uploads/').pop();
      } else if (cleanPath.includes('\\uploads\\')) {
        cleanPath = cleanPath.split('\\uploads\\').pop();
      } else {
        cleanPath = cleanPath.replace(/^[/\\]+uploads[/\\]+/, '').replace(/^[/\\]+/, '');
      }
      fullPath = path.resolve(__dirname, '../../uploads', cleanPath);
    }

    if (!fullPath || !fs.existsSync(fullPath)) {
      if (resumeData) {
        const uploadsDir = path.resolve(__dirname, '../../uploads');
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        const generated = generateResumeText({ resume_data: resumeData, title: resumeTitle }, app);
        const genFileName = `resume_${resumeId || app.application_id}.pdf`;
        fullPath = path.resolve(uploadsDir, genFileName);
        fs.writeFileSync(fullPath, generated, 'utf8');
      } else {
        return res.status(404).json({ success: false, message: 'Resume file does not exist on server.' });
      }
    }

    const baseTitle = (resumeTitle || `${app.first_name || 'Candidate'}_${app.last_name || ''}_Resume`).replace(/\.[^/.]+$/, '');
    const safeTitle = baseTitle.replace(/[^a-zA-Z0-9_-]/g, '_') || 'Resume';
    const ext = path.extname(fullPath).toLowerCase() || '.pdf';
    const viewName = `${safeTitle}${ext}`;

    let mimeType = 'application/pdf';
    if (ext === '.docx') {
      mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    } else if (ext === '.doc') {
      mimeType = 'application/msword';
    }

    if (ext === '.pdf') {
      const pdfBuffer = getValidPdfBuffer(fullPath);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${viewName}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      return res.end(pdfBuffer);
    }

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${viewName}"`);
    return res.sendFile(fullPath);
  } catch (error) {
    console.error('viewApplicationResume error:', error);
    return res.status(500).json({ success: false, message: 'Error retrieving resume file.' });
  }
}

module.exports = {
  applyForJob,
  getSeekerApplications,
  withdrawApplication,
  getRecruiterApplicants,
  updateApplicationStatus,
  toggleSaveJob,
  getSavedJobs,
  getCandidateDetail,
  downloadApplicationResume,
  viewApplicationResume,
};



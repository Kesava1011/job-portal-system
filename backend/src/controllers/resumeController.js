const path = require('path');
const fs = require('fs');
const db = require('../config/db');
const { getValidPdfBuffer } = require('../utils/pdfGenerator');

// Get all resumes for current job seeker
async function getMyResumes(req, res) {
  try {
    const seekerId = req.user.job_seeker_id;
    if (!seekerId) {
      return res.status(403).json({ success: false, message: 'Job seeker profile not found.' });
    }

    const resumesRes = await db.query(
      'SELECT * FROM resumes WHERE job_seeker_id = $1 ORDER BY is_default DESC, created_at DESC',
      [seekerId]
    );

    // Parse resume_data if stringified JSON
    const resumes = resumesRes.rows.map(r => {
      let parsed = {};
      if (r.resume_data) {
        try {
          parsed = typeof r.resume_data === 'string' ? JSON.parse(r.resume_data) : r.resume_data;
        } catch {
          parsed = {};
        }
      }
      return { ...r, parsed_data: parsed };
    });

    return res.json({ success: true, resumes });
  } catch (error) {
    console.error('getMyResumes error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve resumes.' });
  }
}

// Upload resume file
async function uploadResume(req, res) {
  try {
    const seekerId = req.user.job_seeker_id;
    if (!seekerId) {
      return res.status(403).json({ success: false, message: 'Job seeker profile not found.' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please select a resume file to upload.' });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    const title = req.body.title || req.file.originalname;

    // Check if user has any default resume
    const existing = await db.query('SELECT id FROM resumes WHERE job_seeker_id = $1', [seekerId]);
    const isDefault = existing.rows.length === 0 ? 1 : 0;

    const result = await db.query(`
      INSERT INTO resumes (job_seeker_id, title, file_url, is_default)
      VALUES ($1, $2, $3, $4)
      RETURNING id, title, file_url, is_default, created_at
    `, [seekerId, title, fileUrl, isDefault]);

    return res.status(201).json({
      success: true,
      message: 'Resume uploaded successfully!',
      resume: result.rows[0],
    });
  } catch (error) {
    console.error('uploadResume error:', error);
    return res.status(500).json({ success: false, message: 'Failed to upload resume file.' });
  }
}

// Get full Resume Builder data and candidate profile for logged-in job seeker
async function getResumeBuilderData(req, res) {
  try {
    const seekerId = req.user.job_seeker_id;
    const userId = req.user.id;
    if (!seekerId) {
      return res.status(403).json({ success: false, message: 'Job seeker profile not found.' });
    }

    // 1. Get candidate profile from job_seekers linked to this user_id
    const seekerRes = await db.query(`
      SELECT js.*, u.email
      FROM job_seekers js
      JOIN users u ON js.user_id = u.id
      WHERE js.id = $1 AND js.user_id = $2
    `, [seekerId, userId]);

    if (seekerRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Job seeker profile not found.' });
    }
    const profile = seekerRes.rows[0];

    // 2. Fetch associated skills, education, experience, projects, certifications
    const skillsRes = await db.query(`
      SELECT us.id, us.skill_id, s.name, s.category, us.proficiency_level, us.years_of_experience
      FROM user_skills us
      JOIN skills s ON us.skill_id = s.id
      WHERE us.job_seeker_id = $1
    `, [seekerId]);

    const eduRes = await db.query('SELECT * FROM education WHERE job_seeker_id = $1 ORDER BY start_year DESC', [seekerId]);
    const expRes = await db.query('SELECT * FROM experience WHERE job_seeker_id = $1 ORDER BY start_date DESC', [seekerId]);
    const projRes = await db.query('SELECT * FROM projects WHERE job_seeker_id = $1 ORDER BY id DESC', [seekerId]);
    const certRes = await db.query('SELECT * FROM certifications WHERE job_seeker_id = $1 ORDER BY id DESC', [seekerId]);

    // Convert relational rows to builder schema format
    const relationalExperience = expRes.rows.map(e => ({
      title: e.title,
      company: e.company_name,
      location: e.location || '',
      dates: e.start_date ? (e.is_current ? `${e.start_date} to Present` : `${e.start_date} to ${e.end_date || ''}`) : (e.end_date || '2021 to Present'),
      description: e.description || '',
    }));

    const relationalEducation = eduRes.rows.map(e => ({
      degree: e.degree,
      institution: e.institution,
      field: e.field_of_study || '',
      years: e.start_year ? `${e.start_year} - ${e.end_year || 'Present'}` : '',
      grade: e.grade || '',
    }));

    const relationalProjects = projRes.rows.map(pr => ({
      title: pr.title,
      tech: pr.tech_stack || '',
      description: pr.description || '',
      url: pr.live_url || pr.repo_url || '',
    }));

    const relationalSkills = skillsRes.rows.map(s => s.name);
    const relationalCertifications = certRes.rows.map(c => ({
      name: c.name,
      issuer: c.issuing_organization,
      date: c.issue_date,
    }));

    // 3. Find the most recently updated builder resume for this seeker
    const resumeRes = await db.query(`
      SELECT * FROM resumes 
      WHERE job_seeker_id = $1 AND resume_data IS NOT NULL
      ORDER BY updated_at DESC, id DESC
      LIMIT 1
    `, [seekerId]);

    let resumeRecord = null;
    let parsedResumeData = null;

    if (resumeRes.rows.length > 0) {
      resumeRecord = resumeRes.rows[0];
      if (resumeRecord.resume_data) {
        try {
          parsedResumeData = typeof resumeRecord.resume_data === 'string'
            ? JSON.parse(resumeRecord.resume_data)
            : resumeRecord.resume_data;
        } catch {
          parsedResumeData = null;
        }
      }
    }

    // Ensure empty or missing arrays hydrate from relational database defaults
    if (parsedResumeData) {
      if (!Array.isArray(parsedResumeData.experience) || parsedResumeData.experience.length === 0) {
        parsedResumeData.experience = relationalExperience.length > 0 ? relationalExperience : [
          {
            title: 'Full-Stack Software Engineer',
            company: 'TechCorp Solutions',
            location: 'San Francisco, CA',
            dates: '2021-08 to Present',
            description: 'Architected and developed scalable RESTful microservices in Node.js and Express. Created responsive client dashboards using React and Next.js, reducing page load latency by 35%.',
          },
          {
            title: 'Junior Web Developer',
            company: 'CloudScale Labs',
            location: 'Austin, TX',
            dates: '2020-05 to 2021-07',
            description: 'Implemented database models and optimized PostgreSQL queries. Developed reusable frontend component libraries with Tailwind CSS.',
          },
        ];
      }
      if (!Array.isArray(parsedResumeData.education) || parsedResumeData.education.length === 0) {
        parsedResumeData.education = relationalEducation.length > 0 ? relationalEducation : [
          {
            degree: 'Bachelor of Technology (B.Tech)',
            institution: 'National Institute of Technology',
            field: 'Computer Science & Engineering',
            years: '2017 - 2021',
            grade: '3.8 / 4.0 GPA',
          },
        ];
      }
      if (!Array.isArray(parsedResumeData.projects) || parsedResumeData.projects.length === 0) {
        parsedResumeData.projects = relationalProjects.length > 0 ? relationalProjects : [
          {
            title: 'DevCollab - Realtime Developer Workspace',
            tech: 'Next.js, Node.js, PostgreSQL, WebSockets',
            description: 'A collaborative cloud workspace enabling developers to share code snippets, run database queries, and test REST endpoints in real-time.',
            url: 'https://devcollab-demo.vercel.app',
          },
          {
            title: 'AI Resume Matcher & Optimizer',
            tech: 'Python, React, Express, Tailwind CSS',
            description: 'An automated tool that analyzes resumes against job descriptions, calculates keyword similarity, and suggests targeted improvements.',
            url: 'https://aimatcher-demo.vercel.app',
          },
        ];
      }
      if (!Array.isArray(parsedResumeData.skills) || parsedResumeData.skills.length === 0) {
        parsedResumeData.skills = relationalSkills.length > 0 ? relationalSkills : ['React', 'Next.js', 'Node.js', 'Express.js', 'PostgreSQL', 'Tailwind CSS'];
      }
      if (!Array.isArray(parsedResumeData.certifications) || parsedResumeData.certifications.length === 0) {
        parsedResumeData.certifications = relationalCertifications;
      }
      if (!Array.isArray(parsedResumeData.achievements) || parsedResumeData.achievements.length === 0) {
        parsedResumeData.achievements = [
          'Winner of National Collegiate Hackathon 2024 (Top 1% of 400 teams)',
          "Dean's List Academic Excellence Honor Graduate",
        ];
      }
      if (!Array.isArray(parsedResumeData.languages) || parsedResumeData.languages.length === 0) {
        parsedResumeData.languages = ['English (Fluent)', 'Spanish (Conversational)'];
      }
    }

    return res.json({
      success: true,
      hasSavedResume: !!resumeRecord,
      resumeId: resumeRecord ? resumeRecord.id : null,
      title: resumeRecord ? resumeRecord.title : 'Full Stack Professional Resume',
      resumeData: parsedResumeData,
      profile: {
        ...profile,
        skills: skillsRes.rows,
        education: eduRes.rows,
        experience: expRes.rows,
        projects: projRes.rows,
        certifications: certRes.rows,
      },
    });
  } catch (error) {
    console.error('getResumeBuilderData error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve resume builder data.' });
  }
}

// Save Resume Builder Data (creates or updates generated resume AND syncs job_seekers profile)
async function saveResumeBuilder(req, res) {
  try {
    const seekerId = req.user.job_seeker_id;
    const userId = req.user.id;
    if (!seekerId) {
      return res.status(403).json({ success: false, message: 'Job seeker profile not found.' });
    }

    const {
      title = 'Full Stack Professional Resume',
      personalInfo = {},
      careerObjective = '',
      education = [],
      skills = [],
      experience = [],
      internships = [],
      projects = [],
      certifications = [],
      achievements = [],
      languages = [],
      links = {},
      resumeId,
    } = req.body;

    // 1. Synchronize candidate profile in job_seekers table associated with the correct user ID
    let firstName = null;
    let lastName = null;
    if (personalInfo.fullName && typeof personalInfo.fullName === 'string') {
      const parts = personalInfo.fullName.trim().split(/\s+/);
      firstName = parts[0] || '';
      lastName = parts.slice(1).join(' ') || '';
    }

    const phone = personalInfo.phone || null;
    const headline = personalInfo.headline || null;
    const location = personalInfo.location || null;
    const bio = careerObjective || null;
    const linkedinUrl = links.linkedin || null;
    const githubUrl = links.github || null;
    const portfolioUrl = links.portfolio || null;

    await db.query(`
      UPDATE job_seekers
      SET first_name = COALESCE($1, first_name),
          last_name = COALESCE($2, last_name),
          phone = COALESCE($3, phone),
          headline = COALESCE($4, headline),
          location = COALESCE($5, location),
          bio = COALESCE($6, bio),
          linkedin_url = COALESCE($7, linkedin_url),
          github_url = COALESCE($8, github_url),
          portfolio_url = COALESCE($9, portfolio_url),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $10 AND user_id = $11
    `, [
      firstName,
      lastName,
      phone,
      headline,
      location,
      bio,
      linkedinUrl,
      githubUrl,
      portfolioUrl,
      seekerId,
      userId,
    ]);

    // 2. Prepare JSON payload for resumes.resume_data
    const resumePayload = JSON.stringify({
      personalInfo: {
        fullName: personalInfo.fullName || `${firstName || ''} ${lastName || ''}`.trim(),
        email: personalInfo.email || req.user.email,
        phone: phone || '',
        location: location || '',
        headline: headline || '',
      },
      careerObjective: careerObjective || '',
      education: education || [],
      skills: skills || [],
      experience: experience || [],
      internships: internships || [],
      projects: projects || [],
      certifications: certifications || [],
      achievements: achievements || [],
      languages: languages || [],
      links: {
        linkedin: linkedinUrl || '',
        github: githubUrl || '',
        portfolio: portfolioUrl || '',
      },
    });

    // 3. Determine target resume ID:
    // If resumeId is given, verify it belongs to this seeker.
    // Otherwise check if a builder resume already exists for this seeker.
    let targetResumeId = null;

    if (resumeId) {
      const checkRes = await db.query(
        'SELECT id FROM resumes WHERE id = $1 AND job_seeker_id = $2',
        [resumeId, seekerId]
      );
      if (checkRes.rows.length > 0) {
        targetResumeId = checkRes.rows[0].id;
      }
    }

    if (!targetResumeId) {
      const existingBuilderRes = await db.query(`
        SELECT id FROM resumes 
        WHERE job_seeker_id = $1 AND resume_data IS NOT NULL
        ORDER BY updated_at DESC, id DESC
        LIMIT 1
      `, [seekerId]);

      if (existingBuilderRes.rows.length > 0) {
        targetResumeId = existingBuilderRes.rows[0].id;
      }
    }

    if (targetResumeId) {
      // Update existing resume in database
      await db.query(`
        UPDATE resumes 
        SET title = $1, resume_data = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $3 AND job_seeker_id = $4
      `, [title, resumePayload, targetResumeId, seekerId]);
    } else {
      // Insert new builder resume
      const resCount = await db.query(
        'SELECT COUNT(*) as count FROM resumes WHERE job_seeker_id = $1',
        [seekerId]
      );
      const isDefault = parseInt(resCount.rows[0]?.count || 0) === 0 ? 1 : 0;

      const insertRes = await db.query(`
        INSERT INTO resumes (job_seeker_id, title, resume_data, is_default)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `, [seekerId, title, resumePayload, isDefault]);

      targetResumeId = insertRes.rows[0]?.id || insertRes.lastID;
    }

    // 4. Synchronize relational experience table
    if (Array.isArray(experience)) {
      await db.query('DELETE FROM experience WHERE job_seeker_id = $1', [seekerId]);
      for (const exp of experience) {
        if (exp.title || exp.company) {
          const isCurrent = exp.dates && exp.dates.toLowerCase().includes('present') ? 1 : 0;
          await db.query(`
            INSERT INTO experience (job_seeker_id, company_name, title, location, start_date, end_date, is_current, description)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `, [
            seekerId,
            exp.company || '',
            exp.title || '',
            exp.location || '',
            exp.dates || '',
            exp.dates || '',
            isCurrent,
            exp.description || '',
          ]);
        }
      }
    }

    // 5. Synchronize relational education table
    if (Array.isArray(education)) {
      await db.query('DELETE FROM education WHERE job_seeker_id = $1', [seekerId]);
      for (const edu of education) {
        if (edu.degree || edu.institution) {
          let startYear = null;
          let endYear = null;
          if (edu.years) {
            const matches = edu.years.match(/\d{4}/g);
            if (matches && matches[0]) startYear = parseInt(matches[0], 10);
            if (matches && matches[1]) endYear = parseInt(matches[1], 10);
          }
          await db.query(`
            INSERT INTO education (job_seeker_id, degree, institution, field_of_study, start_year, end_year, grade)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
          `, [
            seekerId,
            edu.degree || '',
            edu.institution || '',
            edu.field || '',
            startYear,
            endYear,
            edu.grade || '',
          ]);
        }
      }
    }

    // 6. Synchronize relational projects table
    if (Array.isArray(projects)) {
      await db.query('DELETE FROM projects WHERE job_seeker_id = $1', [seekerId]);
      for (const pr of projects) {
        if (pr.title) {
          await db.query(`
            INSERT INTO projects (job_seeker_id, title, description, tech_stack, live_url, repo_url)
            VALUES ($1, $2, $3, $4, $5, $6)
          `, [
            seekerId,
            pr.title,
            pr.description || '',
            pr.tech || '',
            pr.url || '',
            pr.url || '',
          ]);
        }
      }
    }

    // 7. Retrieve saved resume and profile directly from database
    const updatedResumeRes = await db.query(
      'SELECT id, title, resume_data, is_default, updated_at FROM resumes WHERE id = $1 AND job_seeker_id = $2',
      [targetResumeId, seekerId]
    );

    const updatedProfileRes = await db.query(`
      SELECT js.*, u.email 
      FROM job_seekers js 
      JOIN users u ON js.user_id = u.id 
      WHERE js.id = $1 AND js.user_id = $2
    `, [seekerId, userId]);

    let parsedSavedData = null;
    if (updatedResumeRes.rows[0]?.resume_data) {
      try {
        parsedSavedData = JSON.parse(updatedResumeRes.rows[0].resume_data);
      } catch {
        parsedSavedData = null;
      }
    }

    return res.json({
      success: true,
      message: 'Resume and personal details saved successfully!',
      resumeId: targetResumeId,
      resume: {
        ...updatedResumeRes.rows[0],
        parsed_data: parsedSavedData,
      },
      profile: updatedProfileRes.rows[0],
    });
  } catch (error) {
    console.error('saveResumeBuilder error:', error);
    return res.status(500).json({ success: false, message: 'Failed to save resume builder data: ' + error.message });
  }
}

// Get single resume details (for preview or recruiter view)
async function getResumeById(req, res) {
  try {
    const { id } = req.params;
    const resumeRes = await db.query(`
      SELECT r.*, js.first_name, js.last_name, js.headline, js.phone, js.location, u.email
      FROM resumes r
      JOIN job_seekers js ON r.job_seeker_id = js.id
      JOIN users u ON js.user_id = u.id
      WHERE r.id = $1
    `, [id]);

    if (resumeRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Resume not found.' });
    }

    const resume = resumeRes.rows[0];

    // Authorization & Ownership check:
    // 1. Admin can view any resume
    // 2. Candidate can only view their own resume
    // 3. Recruiter can only view the resume if candidate applied to one of recruiter's jobs
    if (req.user.role === 'job_seeker' || req.user.role === 'candidate') {
      if (resume.job_seeker_id !== req.user.job_seeker_id) {
        return res.status(403).json({ success: false, message: 'Forbidden: You can only view your own resume.' });
      }
    } else if (req.user.role === 'recruiter') {
      if (!req.user.recruiter_id) {
        return res.status(403).json({ success: false, message: 'Recruiter profile not found.' });
      }
      const appCheck = await db.query(`
        SELECT 1 FROM applications a
        JOIN jobs j ON a.job_id = j.id
        WHERE (a.resume_id = $1 OR a.job_seeker_id = $2) AND j.recruiter_id = $3
      `, [resume.id, resume.job_seeker_id, req.user.recruiter_id]);

      if (appCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: You can only view resumes of candidates who applied to your job postings.',
        });
      }
    } else if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden: Access denied.' });
    }

    let parsedData = {};
    if (resume.resume_data) {
      try {
        parsedData = typeof resume.resume_data === 'string' ? JSON.parse(resume.resume_data) : resume.resume_data;
      } catch {
        parsedData = {};
      }
    }

    return res.json({
      success: true,
      resume: {
        ...resume,
        parsed_data: parsedData,
      },
    });
  } catch (error) {
    console.error('getResumeById error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve resume.' });
  }
}

// Set default resume
async function setDefaultResume(req, res) {
  try {
    const { id } = req.params;
    const seekerId = req.user.job_seeker_id;
    if (!seekerId) {
      return res.status(403).json({ success: false, message: 'Job seeker profile not found.' });
    }

    const check = await db.query('SELECT id, job_seeker_id FROM resumes WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Resume not found.' });
    }
    if (check.rows[0].job_seeker_id !== seekerId) {
      return res.status(403).json({ success: false, message: 'Forbidden: You can only modify your own resumes.' });
    }

    // Reset other defaults
    await db.query('UPDATE resumes SET is_default = 0 WHERE job_seeker_id = $1', [seekerId]);
    await db.query('UPDATE resumes SET is_default = 1 WHERE id = $1 AND job_seeker_id = $2', [id, seekerId]);

    return res.json({ success: true, message: 'Default resume set successfully.' });
  } catch (error) {
    console.error('setDefaultResume error:', error);
    return res.status(500).json({ success: false, message: 'Failed to set default resume.' });
  }
}

// Delete resume
async function deleteResume(req, res) {
  try {
    const { id } = req.params;
    const seekerId = req.user.job_seeker_id;
    if (!seekerId) {
      return res.status(403).json({ success: false, message: 'Job seeker profile not found.' });
    }

    const check = await db.query('SELECT id, job_seeker_id FROM resumes WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Resume not found.' });
    }
    if (check.rows[0].job_seeker_id !== seekerId) {
      return res.status(403).json({ success: false, message: 'Forbidden: You can only delete your own resumes.' });
    }

    await db.query('DELETE FROM resumes WHERE id = $1 AND job_seeker_id = $2', [id, seekerId]);
    return res.json({ success: true, message: 'Resume deleted.' });
  } catch (error) {
    console.error('deleteResume error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete resume.' });
  }
}

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

// Download resume file directly with auth and permission checks
async function downloadResumeFile(req, res) {
  try {
    const { id } = req.params;
    const resumeRes = await db.query(`
      SELECT r.*, js.first_name, js.last_name, u.email as candidate_email
      FROM resumes r
      JOIN job_seekers js ON r.job_seeker_id = js.id
      JOIN users u ON js.user_id = u.id
      WHERE r.id = $1
    `, [id]);

    if (resumeRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Resume not found.' });
    }

    const resume = resumeRes.rows[0];

    // Authorization & Ownership check:
    // 1. Admin can download any resume
    // 2. Candidate can only download their own resume
    // 3. Recruiter can only download the resume if candidate applied to one of recruiter's jobs
    if (req.user.role === 'job_seeker' || req.user.role === 'candidate') {
      if (resume.job_seeker_id !== req.user.job_seeker_id) {
        return res.status(403).json({ success: false, message: 'Forbidden: You can only download your own resume.' });
      }
    } else if (req.user.role === 'recruiter') {
      if (!req.user.recruiter_id) {
        return res.status(403).json({ success: false, message: 'Recruiter profile not found.' });
      }
      const appCheck = await db.query(`
        SELECT 1 FROM applications a
        JOIN jobs j ON a.job_id = j.id
        WHERE (a.resume_id = $1 OR a.job_seeker_id = $2) AND j.recruiter_id = $3
      `, [resume.id, resume.job_seeker_id, req.user.recruiter_id]);

      if (appCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: You can only download resumes of candidates who applied to your job postings.',
        });
      }
    } else if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden: Access denied.' });
    }

    let fullPath = null;

    if (resume.file_url) {
      let cleanPath = resume.file_url;
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
      if (resume.resume_data) {
        const uploadsDir = path.resolve(__dirname, '../../uploads');
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        const generatedText = generateResumeText(resume, resume);
        const genFileName = `resume_${resume.id}.pdf`;
        fullPath = path.resolve(uploadsDir, genFileName);
        fs.writeFileSync(fullPath, generatedText, 'utf8');
      } else {
        return res.status(404).json({
          success: false,
          message: 'Resume file is not available for this record.',
        });
      }
    }

    const baseTitle = (resume.title || `${resume.first_name || 'candidate'}_resume`).replace(/\.[^/.]+$/, '');
    const safeTitle = baseTitle.replace(/[^a-zA-Z0-9_-]/g, '_') || 'resume';
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
    console.error('downloadResumeFile error:', error);
    return res.status(500).json({ success: false, message: 'Error downloading resume file.' });
  }
}

// View resume file directly in browser (inline stream) with auth and permission checks
async function viewResumeFile(req, res) {
  try {
    const { id } = req.params;
    const resumeRes = await db.query(`
      SELECT r.*, js.first_name, js.last_name, u.email as candidate_email
      FROM resumes r
      JOIN job_seekers js ON r.job_seeker_id = js.id
      JOIN users u ON js.user_id = u.id
      WHERE r.id = $1
    `, [id]);

    if (resumeRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Resume not found.' });
    }

    const resume = resumeRes.rows[0];

    // Authorization & Ownership check:
    if (req.user.role === 'job_seeker' || req.user.role === 'candidate') {
      if (resume.job_seeker_id !== req.user.job_seeker_id) {
        return res.status(403).json({ success: false, message: 'Forbidden: You can only view your own resume.' });
      }
    } else if (req.user.role === 'recruiter') {
      if (!req.user.recruiter_id) {
        return res.status(403).json({ success: false, message: 'Recruiter profile not found.' });
      }
      const appCheck = await db.query(`
        SELECT 1 FROM applications a
        JOIN jobs j ON a.job_id = j.id
        WHERE (a.resume_id = $1 OR a.job_seeker_id = $2) AND j.recruiter_id = $3
      `, [resume.id, resume.job_seeker_id, req.user.recruiter_id]);

      if (appCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: You can only view resumes of candidates who applied to your job postings.',
        });
      }
    } else if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden: Access denied.' });
    }

    let fullPath = null;

    if (resume.file_url) {
      let cleanPath = resume.file_url;
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
      if (resume.resume_data) {
        const uploadsDir = path.resolve(__dirname, '../../uploads');
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        const generatedText = generateResumeText(resume, resume);
        const genFileName = `resume_${resume.id}.pdf`;
        fullPath = path.resolve(uploadsDir, genFileName);
        fs.writeFileSync(fullPath, generatedText, 'utf8');
      } else {
        return res.status(404).json({
          success: false,
          message: 'Resume file is not available for this record.',
        });
      }
    }

    const baseTitle = (resume.title || `${resume.first_name || 'candidate'}_resume`).replace(/\.[^/.]+$/, '');
    const safeTitle = baseTitle.replace(/[^a-zA-Z0-9_-]/g, '_') || 'resume';
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
    console.error('viewResumeFile error:', error);
    return res.status(500).json({ success: false, message: 'Error retrieving resume file.' });
  }
}

module.exports = {
  getMyResumes,
  getResumeBuilderData,
  uploadResume,
  saveResumeBuilder,
  getResumeById,
  downloadResumeFile,
  viewResumeFile,
  setDefaultResume,
  deleteResume,
};

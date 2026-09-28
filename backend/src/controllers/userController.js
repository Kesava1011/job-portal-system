const db = require('../config/db');

// Get full job seeker profile (including skills, education, experience, projects, certifications)
async function getProfile(req, res) {
  try {
    const userId = req.user.id;
    const seekerRes = await db.query('SELECT * FROM job_seekers WHERE user_id = $1', [userId]);

    if (seekerRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Job seeker profile not found.' });
    }

    const seeker = seekerRes.rows[0];

    // Skills
    const skillsRes = await db.query(`
      SELECT us.id, us.skill_id, s.name, s.category, us.proficiency_level, us.years_of_experience
      FROM user_skills us
      JOIN skills s ON us.skill_id = s.id
      WHERE us.job_seeker_id = $1
    `, [seeker.id]);

    // Education
    const eduRes = await db.query('SELECT * FROM education WHERE job_seeker_id = $1 ORDER BY start_year DESC', [seeker.id]);

    // Experience
    const expRes = await db.query('SELECT * FROM experience WHERE job_seeker_id = $1 ORDER BY start_date DESC', [seeker.id]);

    // Projects
    const projRes = await db.query('SELECT * FROM projects WHERE job_seeker_id = $1 ORDER BY id DESC', [seeker.id]);

    // Certifications
    const certRes = await db.query('SELECT * FROM certifications WHERE job_seeker_id = $1 ORDER BY id DESC', [seeker.id]);

    // Resumes
    const resRes = await db.query('SELECT id, title, file_url, is_default, created_at FROM resumes WHERE job_seeker_id = $1', [seeker.id]);

    return res.json({
      success: true,
      profile: {
        ...seeker,
        skills: skillsRes.rows,
        education: eduRes.rows,
        experience: expRes.rows,
        projects: projRes.rows,
        certifications: certRes.rows,
        resumes: resRes.rows,
      },
    });
  } catch (error) {
    console.error('getProfile error:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving profile.' });
  }
}

// Update basic profile details
async function updateProfile(req, res) {
  try {
    const userId = req.user.id;
    const {
      firstName,
      lastName,
      phone,
      headline,
      bio,
      location,
      experienceYears,
      currentSalary,
      expectedSalary,
      githubUrl,
      linkedinUrl,
      portfolioUrl,
    } = req.body;

    const seekerRes = await db.query('SELECT id FROM job_seekers WHERE user_id = $1', [userId]);
    if (seekerRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Profile not found.' });
    }

    const seekerId = seekerRes.rows[0].id;

    await db.query(`
      UPDATE job_seekers
      SET first_name = COALESCE($1, first_name),
          last_name = COALESCE($2, last_name),
          phone = COALESCE($3, phone),
          headline = COALESCE($4, headline),
          bio = COALESCE($5, bio),
          location = COALESCE($6, location),
          experience_years = COALESCE($7, experience_years),
          current_salary = COALESCE($8, current_salary),
          expected_salary = COALESCE($9, expected_salary),
          github_url = COALESCE($10, github_url),
          linkedin_url = COALESCE($11, linkedin_url),
          portfolio_url = COALESCE($12, portfolio_url),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $13
    `, [
      firstName,
      lastName,
      phone,
      headline,
      bio,
      location,
      experienceYears !== undefined ? parseFloat(experienceYears) : null,
      currentSalary !== undefined ? parseFloat(currentSalary) : null,
      expectedSalary !== undefined ? parseFloat(expectedSalary) : null,
      githubUrl,
      linkedinUrl,
      portfolioUrl,
      seekerId,
    ]);

    return res.json({ success: true, message: 'Profile updated successfully!' });
  } catch (error) {
    console.error('updateProfile error:', error);
    return res.status(500).json({ success: false, message: 'Server error updating profile.' });
  }
}

// Upload avatar
async function uploadAvatar(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }

    const avatarUrl = `/uploads/${req.file.filename}`;
    await db.query('UPDATE job_seekers SET avatar_url = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2', [avatarUrl, req.user.id]);

    return res.json({ success: true, message: 'Profile picture updated!', avatarUrl });
  } catch (error) {
    console.error('uploadAvatar error:', error);
    return res.status(500).json({ success: false, message: 'Failed to upload profile picture.' });
  }
}

// Skills Management
async function addSkill(req, res) {
  try {
    const { skillName, proficiencyLevel, yearsOfExperience, category } = req.body;
    if (!skillName) {
      return res.status(400).json({ success: false, message: 'Skill name is required.' });
    }

    const seekerId = req.user.job_seeker_id;

    // Check or create skill in master list
    let skillId;
    const existing = await db.query('SELECT id FROM skills WHERE LOWER(name) = $1', [skillName.toLowerCase().trim()]);
    if (existing.rows.length > 0) {
      skillId = existing.rows[0].id;
    } else {
      const newSkill = await db.query(
        'INSERT INTO skills (name, category) VALUES ($1, $2) RETURNING id',
        [skillName.trim(), category || 'Technical']
      );
      skillId = newSkill.rows[0]?.id || newSkill.lastID;
    }

    // Link to user
    await db.query(`
      INSERT INTO user_skills (job_seeker_id, skill_id, proficiency_level, years_of_experience)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT(job_seeker_id, skill_id) DO UPDATE 
      SET proficiency_level = EXCLUDED.proficiency_level,
          years_of_experience = EXCLUDED.years_of_experience
    `, [seekerId, skillId, proficiencyLevel || 'Intermediate', parseFloat(yearsOfExperience || 1)]);

    return res.json({ success: true, message: 'Skill added successfully!' });
  } catch (error) {
    console.error('addSkill error:', error);
    return res.status(500).json({ success: false, message: 'Failed to add skill.' });
  }
}

async function removeSkill(req, res) {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM user_skills WHERE id = $1 AND job_seeker_id = $2', [id, req.user.job_seeker_id]);
    return res.json({ success: true, message: 'Skill removed.' });
  } catch (error) {
    console.error('removeSkill error:', error);
    return res.status(500).json({ success: false, message: 'Failed to remove skill.' });
  }
}

// Education Management
async function addEducation(req, res) {
  try {
    const { degree, institution, fieldOfStudy, startYear, endYear, grade } = req.body;
    if (!degree || !institution) {
      return res.status(400).json({ success: false, message: 'Degree and institution are required.' });
    }

    const result = await db.query(`
      INSERT INTO education (job_seeker_id, degree, institution, field_of_study, start_year, end_year, grade)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `, [
      req.user.job_seeker_id,
      degree.trim(),
      institution.trim(),
      fieldOfStudy || '',
      startYear ? parseInt(startYear) : null,
      endYear ? parseInt(endYear) : null,
      grade || '',
    ]);

    return res.status(201).json({ success: true, message: 'Education added successfully!', id: result.rows[0]?.id || result.lastID });
  } catch (error) {
    console.error('addEducation error:', error);
    return res.status(500).json({ success: false, message: 'Failed to add education.' });
  }
}

async function deleteEducation(req, res) {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM education WHERE id = $1 AND job_seeker_id = $2', [id, req.user.job_seeker_id]);
    return res.json({ success: true, message: 'Education entry deleted.' });
  } catch (error) {
    console.error('deleteEducation error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete education.' });
  }
}

// Experience Management
async function addExperience(req, res) {
  try {
    const { companyName, title, location, startDate, endDate, isCurrent, description } = req.body;
    if (!companyName || !title) {
      return res.status(400).json({ success: false, message: 'Company name and title are required.' });
    }

    const result = await db.query(`
      INSERT INTO experience (job_seeker_id, company_name, title, location, start_date, end_date, is_current, description)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `, [
      req.user.job_seeker_id,
      companyName.trim(),
      title.trim(),
      location || '',
      startDate || '',
      endDate || '',
      isCurrent ? 1 : 0,
      description || '',
    ]);

    return res.status(201).json({ success: true, message: 'Experience added successfully!', id: result.rows[0]?.id || result.lastID });
  } catch (error) {
    console.error('addExperience error:', error);
    return res.status(500).json({ success: false, message: 'Failed to add experience.' });
  }
}

async function deleteExperience(req, res) {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM experience WHERE id = $1 AND job_seeker_id = $2', [id, req.user.job_seeker_id]);
    return res.json({ success: true, message: 'Experience entry deleted.' });
  } catch (error) {
    console.error('deleteExperience error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete experience.' });
  }
}

// Projects Management
async function addProject(req, res) {
  try {
    const { title, description, techStack, liveUrl, repoUrl } = req.body;
    if (!title) {
      return res.status(400).json({ success: false, message: 'Project title is required.' });
    }

    const result = await db.query(`
      INSERT INTO projects (job_seeker_id, title, description, tech_stack, live_url, repo_url)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `, [
      req.user.job_seeker_id,
      title.trim(),
      description || '',
      techStack || '',
      liveUrl || '',
      repoUrl || '',
    ]);

    return res.status(201).json({ success: true, message: 'Project added successfully!', id: result.rows[0]?.id || result.lastID });
  } catch (error) {
    console.error('addProject error:', error);
    return res.status(500).json({ success: false, message: 'Failed to add project.' });
  }
}

async function deleteProject(req, res) {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM projects WHERE id = $1 AND job_seeker_id = $2', [id, req.user.job_seeker_id]);
    return res.json({ success: true, message: 'Project entry deleted.' });
  } catch (error) {
    console.error('deleteProject error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete project.' });
  }
}

// Certifications Management
async function addCertification(req, res) {
  try {
    const { name, issuingOrganization, issueDate, expirationDate, credentialId, credentialUrl } = req.body;
    if (!name || !issuingOrganization) {
      return res.status(400).json({ success: false, message: 'Certification name and issuer are required.' });
    }

    const result = await db.query(`
      INSERT INTO certifications (job_seeker_id, name, issuing_organization, issue_date, expiration_date, credential_id, credential_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `, [
      req.user.job_seeker_id,
      name.trim(),
      issuingOrganization.trim(),
      issueDate || '',
      expirationDate || '',
      credentialId || '',
      credentialUrl || '',
    ]);

    return res.status(201).json({ success: true, message: 'Certification added successfully!', id: result.rows[0]?.id || result.lastID });
  } catch (error) {
    console.error('addCertification error:', error);
    return res.status(500).json({ success: false, message: 'Failed to add certification.' });
  }
}

async function deleteCertification(req, res) {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM certifications WHERE id = $1 AND job_seeker_id = $2', [id, req.user.job_seeker_id]);
    return res.json({ success: true, message: 'Certification deleted.' });
  } catch (error) {
    console.error('deleteCertification error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete certification.' });
  }
}

// Job Seeker Dashboard Analytics
async function getSeekerDashboard(req, res) {
  try {
    const seekerId = req.user.job_seeker_id;
    if (!seekerId) {
      return res.status(400).json({ success: false, message: 'Job seeker profile not found.' });
    }

    // Counts
    const totalAppsRes = await db.query('SELECT COUNT(*) as count FROM applications WHERE job_seeker_id = $1', [seekerId]);
    const shortlistedRes = await db.query("SELECT COUNT(*) as count FROM applications WHERE job_seeker_id = $1 AND status = 'Shortlisted'", [seekerId]);
    const interviewRes = await db.query("SELECT COUNT(*) as count FROM applications WHERE job_seeker_id = $1 AND status = 'Interview'", [seekerId]);
    const savedRes = await db.query('SELECT COUNT(*) as count FROM saved_jobs WHERE job_seeker_id = $1', [seekerId]);

    // Recent applications
    const recentAppsRes = await db.query(`
      SELECT a.id, a.status, a.applied_at, a.notes,
             j.id AS job_id, j.title AS job_title, j.location AS job_location, j.job_type,
             c.name AS company_name, c.logo_url AS company_logo
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
      LEFT JOIN companies c ON j.company_id = c.id
      WHERE a.job_seeker_id = $1
      ORDER BY a.applied_at DESC
      LIMIT 5
    `, [seekerId]);

    // Recommended count
    const totalJobsRes = await db.query("SELECT COUNT(*) as count FROM jobs WHERE status = 'active'");

    return res.json({
      success: true,
      stats: {
        totalApplications: parseInt(totalAppsRes.rows[0]?.count || 0),
        shortlistedCount: parseInt(shortlistedRes.rows[0]?.count || 0),
        interviewsCount: parseInt(interviewRes.rows[0]?.count || 0),
        savedCount: parseInt(savedRes.rows[0]?.count || 0),
        activeJobsAvailable: parseInt(totalJobsRes.rows[0]?.count || 0),
      },
      recentApplications: recentAppsRes.rows,
    });
  } catch (error) {
    console.error('getSeekerDashboard error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load dashboard statistics.' });
  }
}

// Get all master skills
async function getAllMasterSkills(req, res) {
  try {
    const result = await db.query('SELECT * FROM skills ORDER BY name ASC');
    return res.json({ success: true, skills: result.rows });
  } catch (error) {
    console.error('getAllMasterSkills error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load skills.' });
  }
}

module.exports = {
  getProfile,
  updateProfile,
  uploadAvatar,
  addSkill,
  removeSkill,
  addEducation,
  deleteEducation,
  addExperience,
  deleteExperience,
  addProject,
  deleteProject,
  addCertification,
  deleteCertification,
  getSeekerDashboard,
  getAllMasterSkills,
};

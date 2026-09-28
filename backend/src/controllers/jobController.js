const db = require('../config/db');
const { calculateMatchScore } = require('../services/recommendationService');

// Get all jobs with search, filters, pagination, and sorting
async function getJobs(req, res) {
  try {
    const {
      keyword,
      location,
      jobType,
      experience,
      minSalary,
      skill,
      sort = 'latest',
      page = 1,
      limit = 10,
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = ["j.status = 'active'"];
    const params = [];

    // Keyword search (title, description, or company name)
    if (keyword && keyword.trim()) {
      params.push(`%${keyword.trim().toLowerCase()}%`);
      const pIdx = params.length;
      conditions.push(`(LOWER(j.title) LIKE $${pIdx} OR LOWER(j.description) LIKE $${pIdx} OR LOWER(c.name) LIKE $${pIdx})`);
    }

    // Location filter
    if (location && location.trim()) {
      params.push(`%${location.trim().toLowerCase()}%`);
      conditions.push(`LOWER(j.location) LIKE $${params.length}`);
    }

    // Job Type filter
    if (jobType && jobType !== 'All') {
      params.push(jobType);
      conditions.push(`j.job_type = $${params.length}`);
    }

    // Experience filter (jobs requiring <= specified years)
    if (experience && !isNaN(experience)) {
      params.push(parseFloat(experience));
      conditions.push(`j.experience_required <= $${params.length}`);
    }

    // Min Salary filter
    if (minSalary && !isNaN(minSalary)) {
      params.push(parseFloat(minSalary));
      conditions.push(`(j.max_salary >= $${params.length} OR j.min_salary >= $${params.length})`);
    }

    // Skill filter
    if (skill && skill.trim()) {
      params.push(`%${skill.trim().toLowerCase()}%`);
      conditions.push(`j.id IN (
        SELECT js.job_id FROM job_skills js 
        JOIN skills s ON js.skill_id = s.id 
        WHERE LOWER(s.name) LIKE $${params.length}
      )`);
    }

    // Sorting
    let orderByClause = 'j.created_at DESC';
    if (sort === 'salary') {
      orderByClause = 'j.max_salary DESC NULLS LAST';
    } else if (sort === 'oldest') {
      orderByClause = 'j.created_at ASC';
    } else if (sort === 'deadline') {
      orderByClause = 'j.deadline ASC NULLS LAST';
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Total count query
    const countSql = `
      SELECT COUNT(DISTINCT j.id) as total
      FROM jobs j
      LEFT JOIN companies c ON j.company_id = c.id
      ${whereClause}
    `;
    const countRes = await db.query(countSql, params);
    const totalJobs = parseInt(countRes.rows[0]?.total || 0);

    // Jobs query
    const jobsSql = `
      SELECT j.*, 
             c.name AS company_name, 
             c.logo_url AS company_logo, 
             c.location AS company_location,
             c.website AS company_website,
             (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id) AS applicants_count
      FROM jobs j
      LEFT JOIN companies c ON j.company_id = c.id
      ${whereClause}
      ORDER BY ${orderByClause}
      LIMIT ${parseInt(limit)} OFFSET ${offset}
    `;
    const jobsRes = await db.query(jobsSql, params);
    const jobs = jobsRes.rows;

    // Fetch skills for these jobs
    if (jobs.length > 0) {
      const jobIds = jobs.map(j => j.id);
      const skillsSql = `
        SELECT js.job_id, s.id, s.name, s.category, js.is_required
        FROM job_skills js
        JOIN skills s ON js.skill_id = s.id
        WHERE js.job_id IN (${jobIds.join(',')})
      `;
      const jobSkillsRes = await db.query(skillsSql);
      const skillsByJob = {};
      jobSkillsRes.rows.forEach(s => {
        if (!skillsByJob[s.job_id]) skillsByJob[s.job_id] = [];
        skillsByJob[s.job_id].push(s);
      });

      // If user is authenticated as job seeker, calculate their match percentage & check if saved/applied
      let candidateSkills = [];
      let candidate = null;
      let appliedJobIds = new Set();
      let savedJobIds = new Set();

      if (req.user && req.user.job_seeker_id) {
        const seekerId = req.user.job_seeker_id;
        const seekerRes = await db.query('SELECT * FROM job_seekers WHERE id = $1', [seekerId]);
        candidate = seekerRes.rows[0];

        const userSkillsRes = await db.query(`
          SELECT s.id, s.name FROM user_skills us JOIN skills s ON us.skill_id = s.id WHERE us.job_seeker_id = $1
        `, [seekerId]);
        candidateSkills = userSkillsRes.rows;

        const appliedRes = await db.query('SELECT job_id FROM applications WHERE job_seeker_id = $1', [seekerId]);
        appliedJobIds = new Set(appliedRes.rows.map(a => a.job_id));

        const savedRes = await db.query('SELECT job_id FROM saved_jobs WHERE job_seeker_id = $1', [seekerId]);
        savedJobIds = new Set(savedRes.rows.map(s => s.job_id));
      }

      jobs.forEach(job => {
        job.skills = skillsByJob[job.id] || [];
        if (candidate) {
          job.match = calculateMatchScore(candidate, job, candidateSkills, job.skills);
          job.hasApplied = appliedJobIds.has(job.id);
          job.isSaved = savedJobIds.has(job.id);
        }
      });
    }

    return res.json({
      success: true,
      jobs,
      pagination: {
        total: totalJobs,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalJobs / parseInt(limit)) || 1,
      },
    });
  } catch (error) {
    console.error('getJobs error:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving jobs.' });
  }
}

// Get single job details
async function getJobById(req, res) {
  try {
    const { id } = req.params;

    const jobSql = `
      SELECT j.*, 
             c.name AS company_name, 
             c.logo_url AS company_logo, 
             c.website AS company_website,
             c.industry AS company_industry,
             c.company_size,
             c.location AS company_headquarters,
             c.description AS company_description,
             r.first_name AS recruiter_first_name,
             r.last_name AS recruiter_last_name,
             r.designation AS recruiter_designation,
             (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id) AS applicants_count
      FROM jobs j
      LEFT JOIN companies c ON j.company_id = c.id
      LEFT JOIN recruiters r ON j.recruiter_id = r.id
      WHERE j.id = $1
    `;
    const jobRes = await db.query(jobSql, [id]);

    if (jobRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Job not found.' });
    }

    const job = jobRes.rows[0];

    // Get skills
    const skillsRes = await db.query(`
      SELECT s.id, s.name, s.category, js.is_required
      FROM job_skills js
      JOIN skills s ON js.skill_id = s.id
      WHERE js.job_id = $1
    `, [id]);
    job.skills = skillsRes.rows;

    // Check if user is logged in
    job.hasApplied = false;
    job.isSaved = false;
    job.applicationStatus = null;

    if (req.user && req.user.job_seeker_id) {
      const seekerId = req.user.job_seeker_id;
      const appRes = await db.query('SELECT id, status, applied_at FROM applications WHERE job_id = $1 AND job_seeker_id = $2', [id, seekerId]);
      if (appRes.rows.length > 0) {
        job.hasApplied = true;
        job.applicationStatus = appRes.rows[0].status;
        job.appliedAt = appRes.rows[0].applied_at;
      }

      const savedRes = await db.query('SELECT id FROM saved_jobs WHERE job_id = $1 AND job_seeker_id = $2', [id, seekerId]);
      job.isSaved = savedRes.rows.length > 0;

      // Calculate match score
      const seekerRes = await db.query('SELECT * FROM job_seekers WHERE id = $1', [seekerId]);
      const candidate = seekerRes.rows[0];
      const userSkillsRes = await db.query(`
        SELECT s.id, s.name FROM user_skills us JOIN skills s ON us.skill_id = s.id WHERE us.job_seeker_id = $1
      `, [seekerId]);
      job.match = calculateMatchScore(candidate, job, userSkillsRes.rows, job.skills);
    }

    return res.json({ success: true, job });
  } catch (error) {
    console.error('getJobById error:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving job details.' });
  }
}

// Create a new job posting (Recruiter only)
async function createJob(req, res) {
  try {
    const recruiterId = req.user.recruiter_id;
    if (!recruiterId) {
      return res.status(403).json({ success: false, message: 'Only registered recruiters can post jobs.' });
    }

    const {
      title,
      description,
      requirements,
      location,
      jobType,
      experienceLevel,
      experienceRequired,
      minSalary,
      maxSalary,
      qualification,
      vacancies,
      deadline,
      skills, // Array of skill names or IDs
    } = req.body;

    if (!title || !description || !location || !jobType) {
      return res.status(400).json({ success: false, message: 'Title, description, location, and job type are required.' });
    }

    // Get company ID from recruiter
    const recRes = await db.query('SELECT company_id FROM recruiters WHERE id = $1', [recruiterId]);
    let companyId = recRes.rows[0]?.company_id || null;

    const resolvedCompName = req.body.company || req.body.companyName;
    if (resolvedCompName && typeof resolvedCompName === 'string' && resolvedCompName.trim()) {
      const compTrimmed = resolvedCompName.trim();
      const compRes = await db.query('SELECT id FROM companies WHERE LOWER(name) = $1', [compTrimmed.toLowerCase()]);
      if (compRes.rows.length > 0) {
        companyId = compRes.rows[0].id;
      } else {
        const newComp = await db.query(
          `INSERT INTO companies (name, description) VALUES ($1, $2) RETURNING id`,
          [compTrimmed, `Company profile for ${compTrimmed}`]
        );
        companyId = newComp.rows[0]?.id || newComp.lastID;
      }
    }

    const result = await db.query(`
      INSERT INTO jobs (
        recruiter_id, company_id, title, description, requirements,
        location, job_type, experience_level, experience_required,
        min_salary, max_salary, qualification, vacancies, deadline, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'active')
      RETURNING id
    `, [
      recruiterId,
      companyId,
      title.trim(),
      description.trim(),
      requirements || '',
      location.trim(),
      jobType,
      experienceLevel || 'Mid Level',
      parseFloat(experienceRequired || 0),
      minSalary ? parseFloat(minSalary) : null,
      maxSalary ? parseFloat(maxSalary) : null,
      qualification || 'Bachelor\'s Degree',
      vacancies ? parseInt(vacancies) : 1,
      deadline || null,
    ]);

    const jobId = result.rows[0]?.id || result.lastID;

    // Attach skills
    if (skills && Array.isArray(skills)) {
      for (const skillItem of skills) {
        let skillId = null;
        if (typeof skillItem === 'number') {
          skillId = skillItem;
        } else if (typeof skillItem === 'string' && skillItem.trim()) {
          const sName = skillItem.trim();
          const existing = await db.query('SELECT id FROM skills WHERE LOWER(name) = $1', [sName.toLowerCase()]);
          if (existing.rows.length > 0) {
            skillId = existing.rows[0].id;
          } else {
            const newS = await db.query('INSERT INTO skills (name) VALUES ($1) RETURNING id', [sName]);
            skillId = newS.rows[0]?.id || newS.lastID;
          }
        }

        if (skillId) {
          await db.query(`
            INSERT INTO job_skills (job_id, skill_id, is_required)
            VALUES ($1, $2, 1)
            ON CONFLICT (job_id, skill_id) DO NOTHING
          `, [jobId, skillId]);
        }
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Job posted successfully!',
      jobId,
    });
  } catch (error) {
    console.error('createJob error:', error);
    return res.status(500).json({ success: false, message: 'Server error creating job posting.' });
  }
}

// Update existing job posting
async function updateJob(req, res) {
  try {
    const { id } = req.params;
    const {
      title,
      company,
      companyName,
      description,
      requirements,
      location,
      jobType,
      experienceLevel,
      experienceRequired,
      minSalary,
      maxSalary,
      qualification,
      vacancies,
      deadline,
      status,
      skills,
    } = req.body;

    if (req.user.role === 'recruiter' && !req.user.recruiter_id) {
      return res.status(403).json({ success: false, message: 'Recruiter profile not found.' });
    }

    // Verify job exists
    const jobRes = await db.query('SELECT id, recruiter_id, company_id FROM jobs WHERE id = $1', [id]);
    if (jobRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Job posting not found.' });
    }

    // Verify ownership (unless admin)
    if (req.user.role !== 'admin' && jobRes.rows[0].recruiter_id !== req.user.recruiter_id) {
      return res.status(403).json({ success: false, message: 'Forbidden: You can only modify your own job postings.' });
    }

    // Handle company update if provided
    let companyId = undefined;
    const resolvedCompName = company || companyName || req.body.company_name;
    if (resolvedCompName && typeof resolvedCompName === 'string' && resolvedCompName.trim()) {
      const compTrimmed = resolvedCompName.trim();
      const compRes = await db.query('SELECT id FROM companies WHERE LOWER(name) = $1', [compTrimmed.toLowerCase()]);
      if (compRes.rows.length > 0) {
        companyId = compRes.rows[0].id;
      } else {
        const newComp = await db.query(
          `INSERT INTO companies (name, description) VALUES ($1, $2) RETURNING id`,
          [compTrimmed, `Company profile for ${compTrimmed}`]
        );
        companyId = newComp.rows[0]?.id || newComp.lastID;
      }
    } else if (req.body.companyId || req.body.company_id) {
      companyId = req.body.companyId || req.body.company_id;
    }

    const updates = [];
    const params = [];

    if (title !== undefined) {
      params.push(title.trim());
      updates.push(`title = $${params.length}`);
    }
    if (description !== undefined) {
      params.push(description.trim());
      updates.push(`description = $${params.length}`);
    }
    if (requirements !== undefined) {
      params.push(requirements !== null ? requirements.trim() : '');
      updates.push(`requirements = $${params.length}`);
    }
    if (location !== undefined) {
      params.push(location.trim());
      updates.push(`location = $${params.length}`);
    }
    const resolvedJobType = jobType !== undefined ? jobType : req.body.job_type;
    if (resolvedJobType !== undefined) {
      params.push(resolvedJobType);
      updates.push(`job_type = $${params.length}`);
    }
    const resolvedExpLevel = experienceLevel !== undefined ? experienceLevel : req.body.experience_level;
    if (resolvedExpLevel !== undefined) {
      params.push(resolvedExpLevel);
      updates.push(`experience_level = $${params.length}`);
    }
    const resolvedExpReq = experienceRequired !== undefined ? experienceRequired : req.body.experience_required;
    if (resolvedExpReq !== undefined) {
      const exp = parseFloat(resolvedExpReq);
      params.push(isNaN(exp) ? 0 : exp);
      updates.push(`experience_required = $${params.length}`);
    }
    const resolvedMinSal = minSalary !== undefined ? minSalary : req.body.min_salary;
    if (resolvedMinSal !== undefined) {
      const minSal = resolvedMinSal !== '' && resolvedMinSal !== null ? parseFloat(resolvedMinSal) : null;
      params.push(isNaN(minSal) ? null : minSal);
      updates.push(`min_salary = $${params.length}`);
    }
    const resolvedMaxSal = maxSalary !== undefined ? maxSalary : req.body.max_salary;
    if (resolvedMaxSal !== undefined) {
      const maxSal = resolvedMaxSal !== '' && resolvedMaxSal !== null ? parseFloat(resolvedMaxSal) : null;
      params.push(isNaN(maxSal) ? null : maxSal);
      updates.push(`max_salary = $${params.length}`);
    }
    if (qualification !== undefined) {
      params.push(qualification !== null ? qualification.trim() : '');
      updates.push(`qualification = $${params.length}`);
    }
    if (vacancies !== undefined) {
      const vac = parseInt(vacancies, 10);
      params.push(isNaN(vac) ? 1 : vac);
      updates.push(`vacancies = $${params.length}`);
    }
    if (deadline !== undefined) {
      params.push(deadline && typeof deadline === 'string' && deadline.trim() ? deadline.trim() : null);
      updates.push(`deadline = $${params.length}`);
    }
    if (status !== undefined) {
      params.push(status);
      updates.push(`status = $${params.length}`);
    }
    if (companyId !== undefined) {
      params.push(companyId);
      updates.push(`company_id = $${params.length}`);
    }

    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP');
      params.push(id);
      await db.query(`
        UPDATE jobs SET ${updates.join(', ')} WHERE id = $${params.length}
      `, params);
    }

    // Update skills if provided
    if (skills !== undefined && Array.isArray(skills)) {
      await db.query('DELETE FROM job_skills WHERE job_id = $1', [id]);
      for (const skillItem of skills) {
        let skillId = null;
        if (typeof skillItem === 'number') {
          skillId = skillItem;
        } else if (typeof skillItem === 'string' && skillItem.trim()) {
          const sName = skillItem.trim();
          const existing = await db.query('SELECT id FROM skills WHERE LOWER(name) = $1', [sName.toLowerCase()]);
          if (existing.rows.length > 0) {
            skillId = existing.rows[0].id;
          } else {
            const newS = await db.query('INSERT INTO skills (name) VALUES ($1) RETURNING id', [sName]);
            skillId = newS.rows[0]?.id || newS.lastID;
          }
        }
        if (skillId) {
          await db.query(`
            INSERT INTO job_skills (job_id, skill_id, is_required)
            VALUES ($1, $2, 1)
            ON CONFLICT (job_id, skill_id) DO NOTHING
          `, [id, skillId]);
        }
      }
    }

    return res.json({ success: true, message: 'Job updated successfully!' });
  } catch (error) {
    console.error('updateJob error:', error);
    return res.status(500).json({ success: false, message: 'Server error updating job.' });
  }
}

// Delete job posting
async function deleteJob(req, res) {
  try {
    const { id } = req.params;

    if (req.user.role === 'recruiter' && !req.user.recruiter_id) {
      return res.status(403).json({ success: false, message: 'Recruiter profile not found.' });
    }

    // Verify job exists
    const jobRes = await db.query('SELECT id, recruiter_id FROM jobs WHERE id = $1', [id]);
    if (jobRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Job posting not found.' });
    }

    // Verify ownership or admin
    if (req.user.role !== 'admin' && jobRes.rows[0].recruiter_id !== req.user.recruiter_id) {
      return res.status(403).json({ success: false, message: 'Forbidden: You can only delete your own job postings.' });
    }

    await db.query('DELETE FROM jobs WHERE id = $1', [id]);
    return res.json({ success: true, message: 'Job posting deleted successfully.' });
  } catch (error) {
    console.error('deleteJob error:', error);
    return res.status(500).json({ success: false, message: 'Server error deleting job.' });
  }
}

// Get all jobs posted by the logged-in recruiter
async function getRecruiterJobs(req, res) {
  try {
    const recruiterId = req.user.recruiter_id;
    if (!recruiterId) {
      return res.status(403).json({ success: false, message: 'Recruiter profile not found.' });
    }

    const jobsRes = await db.query(`
      SELECT j.*, 
             c.name AS company_name,
             (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id) AS applicants_count,
             (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id AND a.status = 'Shortlisted') AS shortlisted_count,
             (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id AND a.status = 'Interview') AS interview_count,
             (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id AND a.status = 'Selected') AS selected_count
      FROM jobs j
      LEFT JOIN companies c ON j.company_id = c.id
      WHERE j.recruiter_id = $1
      ORDER BY j.created_at DESC
    `, [recruiterId]);

    return res.json({ success: true, jobs: jobsRes.rows });
  } catch (error) {
    console.error('getRecruiterJobs error:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving recruiter jobs.' });
  }
}

// Recruiter Dashboard Analytics
async function getRecruiterDashboard(req, res) {
  try {
    const recruiterId = req.user.recruiter_id;
    if (!recruiterId) {
      return res.status(403).json({ success: false, message: 'Recruiter profile not found.' });
    }

    const jobsPostedRes = await db.query('SELECT COUNT(*) as count FROM jobs WHERE recruiter_id = $1', [recruiterId]);
    const totalAppsRes = await db.query(`
      SELECT COUNT(*) as count FROM applications a 
      JOIN jobs j ON a.job_id = j.id 
      WHERE j.recruiter_id = $1
    `, [recruiterId]);

    const shortlistedRes = await db.query(`
      SELECT COUNT(*) as count FROM applications a 
      JOIN jobs j ON a.job_id = j.id 
      WHERE j.recruiter_id = $1 AND a.status = 'Shortlisted'
    `, [recruiterId]);

    const interviewRes = await db.query(`
      SELECT COUNT(*) as count FROM applications a 
      JOIN jobs j ON a.job_id = j.id 
      WHERE j.recruiter_id = $1 AND a.status = 'Interview'
    `, [recruiterId]);

    const selectedRes = await db.query(`
      SELECT COUNT(*) as count FROM applications a 
      JOIN jobs j ON a.job_id = j.id 
      WHERE j.recruiter_id = $1 AND a.status = 'Selected'
    `, [recruiterId]);

    // Recent applications across recruiter's jobs
    const recentAppsRes = await db.query(`
      SELECT a.id, a.status, a.applied_at, a.cover_letter,
             j.id AS job_id, j.title AS job_title,
             js.id AS job_seeker_id, js.first_name, js.last_name, js.headline, js.avatar_url,
             u.email AS candidate_email
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
      JOIN job_seekers js ON a.job_seeker_id = js.id
      JOIN users u ON js.user_id = u.id
      WHERE j.recruiter_id = $1
      ORDER BY a.applied_at DESC
      LIMIT 6
    `, [recruiterId]);

    return res.json({
      success: true,
      stats: {
        jobsPosted: parseInt(jobsPostedRes.rows[0]?.count || 0),
        totalApplications: parseInt(totalAppsRes.rows[0]?.count || 0),
        shortlistedCandidates: parseInt(shortlistedRes.rows[0]?.count || 0),
        interviewsScheduled: parseInt(interviewRes.rows[0]?.count || 0),
        selectedCandidates: parseInt(selectedRes.rows[0]?.count || 0),
      },
      recentApplications: recentAppsRes.rows,
    });
  } catch (error) {
    console.error('getRecruiterDashboard error:', error);
    return res.status(500).json({ success: false, message: 'Server error loading recruiter dashboard.' });
  }
}

module.exports = {
  getJobs,
  getJobById,
  createJob,
  updateJob,
  deleteJob,
  getRecruiterJobs,
  getRecruiterDashboard,
};

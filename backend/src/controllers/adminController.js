const db = require('../config/db');

// Get high-level system statistics for Admin Dashboard
async function getAdminStats(req, res) {
  try {
    const totalUsers = await db.query('SELECT COUNT(*) as count FROM users');
    const seekersCount = await db.query("SELECT COUNT(*) as count FROM users WHERE role = 'job_seeker'");
    const recruitersCount = await db.query("SELECT COUNT(*) as count FROM users WHERE role = 'recruiter'");
    const companiesCount = await db.query('SELECT COUNT(*) as count FROM companies');
    const activeJobsCount = await db.query("SELECT COUNT(*) as count FROM jobs WHERE status = 'active'");
    const totalJobsCount = await db.query('SELECT COUNT(*) as count FROM jobs');
    const applicationsCount = await db.query('SELECT COUNT(*) as count FROM applications');
    const pendingAppsCount = await db.query("SELECT COUNT(*) as count FROM applications WHERE status IN ('Applied', 'Under Review')");
    const interviewsCount = await db.query("SELECT COUNT(*) as count FROM applications WHERE status = 'Interview'");
    const selectedCount = await db.query("SELECT COUNT(*) as count FROM applications WHERE status = 'Selected'");

    // Application status distribution (for Chart.js donut/pie chart)
    const statusDistRes = await db.query(`
      SELECT status, COUNT(*) as count
      FROM applications
      GROUP BY status
    `);

    // Job types breakdown (for Chart.js bar chart)
    const jobTypesRes = await db.query(`
      SELECT job_type, COUNT(*) as count
      FROM jobs
      GROUP BY job_type
    `);

    // Jobs by status breakdown
    const jobsByStatusRes = await db.query(`
      SELECT status, COUNT(*) as count
      FROM jobs
      GROUP BY status
    `);

    // Users by role breakdown
    const usersByRoleRes = await db.query(`
      SELECT role, COUNT(*) as count
      FROM users
      GROUP BY role
    `);

    // Recent 5 jobs
    const recentJobs = await db.query(`
      SELECT j.id, j.title, j.job_type, j.location, j.status, j.created_at, c.name AS company_name
      FROM jobs j
      LEFT JOIN companies c ON j.company_id = c.id
      ORDER BY j.created_at DESC
      LIMIT 5
    `);

    // Recent 5 users
    const recentUsers = await db.query(`
      SELECT u.id, u.email, u.role, u.status, u.created_at,
             COALESCE(js.first_name, r.first_name, '') AS first_name,
             COALESCE(js.last_name, r.last_name, '') AS last_name
      FROM users u
      LEFT JOIN job_seekers js ON u.id = js.user_id
      LEFT JOIN recruiters r ON u.id = r.user_id
      ORDER BY u.created_at DESC
      LIMIT 5
    `);

    // Recent 5 applications
    const recentApplications = await db.query(`
      SELECT a.id, a.status, a.applied_at, a.updated_at,
             j.id AS job_id, j.title AS job_title,
             c.name AS company_name,
             js.first_name, js.last_name, u.email AS candidate_email
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
      LEFT JOIN companies c ON j.company_id = c.id
      JOIN job_seekers js ON a.job_seeker_id = js.id
      JOIN users u ON js.user_id = u.id
      ORDER BY a.applied_at DESC
      LIMIT 5
    `);

    // Recent 5 status changes / workflow updates
    const recentStatusUpdates = await db.query(`
      SELECT a.id, a.status, a.updated_at, a.applied_at,
             j.title AS job_title,
             c.name AS company_name,
             js.first_name, js.last_name
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
      LEFT JOIN companies c ON j.company_id = c.id
      JOIN job_seekers js ON a.job_seeker_id = js.id
      WHERE a.status != 'Applied'
      ORDER BY COALESCE(a.updated_at, a.applied_at) DESC
      LIMIT 5
    `);

    return res.json({
      success: true,
      stats: {
        totalUsers: parseInt(totalUsers.rows[0]?.count || 0),
        jobSeekers: parseInt(seekersCount.rows[0]?.count || 0),
        recruiters: parseInt(recruitersCount.rows[0]?.count || 0),
        companies: parseInt(companiesCount.rows[0]?.count || 0),
        activeJobs: parseInt(activeJobsCount.rows[0]?.count || 0),
        totalJobs: parseInt(totalJobsCount.rows[0]?.count || 0),
        applications: parseInt(applicationsCount.rows[0]?.count || 0),
        pendingApplications: parseInt(pendingAppsCount.rows[0]?.count || 0),
        interviews: parseInt(interviewsCount.rows[0]?.count || 0),
        selectedCandidates: parseInt(selectedCount.rows[0]?.count || 0),
      },
      charts: {
        applicationStatus: statusDistRes.rows,
        jobTypes: jobTypesRes.rows,
        jobsByStatus: jobsByStatusRes.rows,
        usersByRole: usersByRoleRes.rows,
      },
      recentJobs: recentJobs.rows,
      recentUsers: recentUsers.rows,
      recentApplications: recentApplications.rows,
      recentStatusUpdates: recentStatusUpdates.rows,
    });
  } catch (error) {
    console.error('getAdminStats error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve admin system statistics.' });
  }
}

// Get all users with filters
async function getAllUsers(req, res) {
  try {
    const { role, status, search } = req.query;
    const conditions = [];
    const params = [];

    if (role && role !== 'All') {
      params.push(role);
      conditions.push(`u.role = $${params.length}`);
    }

    if (status && status !== 'All') {
      params.push(status);
      conditions.push(`u.status = $${params.length}`);
    }

    if (search && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      const pIdx = params.length;
      conditions.push(`(LOWER(u.email) LIKE $${pIdx} OR LOWER(COALESCE(js.first_name, r.first_name, '')) LIKE $${pIdx} OR LOWER(COALESCE(js.last_name, r.last_name, '')) LIKE $${pIdx})`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT u.id, u.email, u.role, u.status, u.created_at,
             COALESCE(js.first_name, r.first_name) AS first_name,
             COALESCE(js.last_name, r.last_name) AS last_name,
             COALESCE(js.phone, r.phone) AS phone,
             c.name AS company_name
      FROM users u
      LEFT JOIN job_seekers js ON u.id = js.user_id
      LEFT JOIN recruiters r ON u.id = r.user_id
      LEFT JOIN companies c ON r.company_id = c.id
      ${whereClause}
      ORDER BY u.created_at DESC
    `;

    const result = await db.query(sql, params);
    return res.json({ success: true, users: result.rows });
  } catch (error) {
    console.error('getAllUsers error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve users.' });
  }
}

// Update user status (active / suspended / inactive)
async function updateUserStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'suspended', 'inactive'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value.' });
    }

    // Do not allow suspending the main admin
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot change your own status.' });
    }

    const userCheck = await db.query('SELECT id, role FROM users WHERE id = $1', [id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    await db.query('UPDATE users SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [status, id]);
    return res.json({ success: true, message: `User status changed to ${status}.` });
  } catch (error) {
    console.error('updateUserStatus error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update user status.' });
  }
}

// Get all jobs for admin management
async function getAllJobsAdmin(req, res) {
  try {
    const { search, status } = req.query;
    const conditions = [];
    const params = [];

    if (status && status !== 'All') {
      params.push(status);
      conditions.push(`j.status = $${params.length}`);
    }

    if (search && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      const pIdx = params.length;
      conditions.push(`(
        LOWER(COALESCE(j.title, '')) LIKE $${pIdx} OR 
        LOWER(COALESCE(c.name, '')) LIKE $${pIdx} OR 
        LOWER(COALESCE(r.first_name, '')) LIKE $${pIdx} OR 
        LOWER(COALESCE(r.last_name, '')) LIKE $${pIdx}
      )`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT j.*, c.name AS company_name,
             COALESCE(r.first_name || ' ' || r.last_name, r.first_name, '') AS recruiter_name,
             ru.email AS recruiter_email,
             (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id) AS applicants_count
      FROM jobs j
      LEFT JOIN companies c ON j.company_id = c.id
      LEFT JOIN recruiters r ON j.recruiter_id = r.id
      LEFT JOIN users ru ON r.user_id = ru.id
      ${whereClause}
      ORDER BY j.created_at DESC
    `;

    const result = await db.query(sql, params);
    return res.json({ success: true, jobs: result.rows });
  } catch (error) {
    console.error('getAllJobsAdmin error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve jobs.' });
  }
}

// Delete / remove inappropriate job posting
async function deleteJobAdmin(req, res) {
  try {
    const { id } = req.params;
    // Maintain database relational integrity
    await db.query('DELETE FROM applications WHERE job_id = $1', [id]);
    await db.query('DELETE FROM saved_jobs WHERE job_id = $1', [id]);
    await db.query('DELETE FROM job_skills WHERE job_id = $1', [id]);
    const result = await db.query('DELETE FROM jobs WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Job not found.' });
    }
    return res.json({ success: true, message: 'Job posting permanently deleted by Admin.' });
  } catch (error) {
    console.error('deleteJobAdmin error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete job.' });
  }
}

// Get all applications for admin management
async function getAllApplicationsAdmin(req, res) {
  try {
    const { status, search } = req.query;
    const conditions = [];
    const params = [];

    if (status && status !== 'All') {
      params.push(status);
      conditions.push(`a.status = $${params.length}`);
    }

    if (search && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      const pIdx = params.length;
      conditions.push(`(
        LOWER(COALESCE(j.title, '')) LIKE $${pIdx} OR 
        LOWER(COALESCE(c.name, '')) LIKE $${pIdx} OR 
        LOWER(COALESCE(js.first_name, '')) LIKE $${pIdx} OR 
        LOWER(COALESCE(js.last_name, '')) LIKE $${pIdx} OR 
        LOWER(COALESCE(u.email, '')) LIKE $${pIdx} OR 
        LOWER(COALESCE(r.first_name, '')) LIKE $${pIdx} OR 
        LOWER(COALESCE(r.last_name, '')) LIKE $${pIdx}
      )`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT a.id, a.status, a.applied_at, a.updated_at,
             j.id AS job_id, j.title AS job_title, j.location AS job_location, j.job_type,
             c.name AS company_name,
             js.first_name, js.last_name, u.email AS candidate_email,
             COALESCE(r.first_name || ' ' || r.last_name, r.first_name, '') AS recruiter_name,
             ru.email AS recruiter_email
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
      LEFT JOIN companies c ON j.company_id = c.id
      JOIN job_seekers js ON a.job_seeker_id = js.id
      JOIN users u ON js.user_id = u.id
      LEFT JOIN recruiters r ON j.recruiter_id = r.id
      LEFT JOIN users ru ON r.user_id = ru.id
      ${whereClause}
      ORDER BY a.applied_at DESC
    `;
    const result = await db.query(sql, params);
    return res.json({ success: true, applications: result.rows });
  } catch (error) {
    console.error('getAllApplicationsAdmin error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve applications.' });
  }
}

module.exports = {
  getAdminStats,
  getAllUsers,
  updateUserStatus,
  getAllJobsAdmin,
  deleteJobAdmin,
  getAllApplicationsAdmin,
};

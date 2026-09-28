const db = require('../config/db');

// Get all companies (public)
async function getCompanies(req, res) {
  try {
    const { search, industry, location } = req.query;
    let sql = `
      SELECT c.*, 
             (SELECT COUNT(*) FROM jobs j WHERE j.company_id = c.id AND j.status = 'active') AS active_jobs_count
      FROM companies c
    `;
    const conditions = [];
    const params = [];

    if (search && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      const pIdx = params.length;
      conditions.push(`(LOWER(c.name) LIKE $${pIdx} OR LOWER(c.description) LIKE $${pIdx} OR LOWER(c.industry) LIKE $${pIdx})`);
    }

    if (industry && industry !== 'All' && industry.trim()) {
      params.push(`%${industry.trim().toLowerCase()}%`);
      conditions.push(`LOWER(c.industry) LIKE $${params.length}`);
    }

    if (location && location.trim()) {
      params.push(`%${location.trim().toLowerCase()}%`);
      conditions.push(`LOWER(c.location) LIKE $${params.length}`);
    }

    if (conditions.length > 0) {
      sql += ` WHERE ` + conditions.join(' AND ');
    }

    sql += ` ORDER BY active_jobs_count DESC, c.name ASC`;

    const result = await db.query(sql, params);

    // Fetch distinct industries for client filter dropdown
    const indRes = await db.query(`
      SELECT DISTINCT industry FROM companies WHERE industry IS NOT NULL AND TRIM(industry) != '' ORDER BY industry ASC
    `);
    const industries = indRes.rows.map(r => r.industry);

    return res.json({
      success: true,
      companies: result.rows,
      industries,
      total: result.rows.length,
    });
  } catch (error) {
    console.error('getCompanies error:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving companies.' });
  }
}

// Get single company profile and its jobs
async function getCompanyById(req, res) {
  try {
    const { id } = req.params;
    const compRes = await db.query('SELECT * FROM companies WHERE id = $1', [id]);
    if (compRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Company not found.' });
    }

    const company = compRes.rows[0];
    const jobsRes = await db.query(`
      SELECT j.*, 
             c.name AS company_name, c.logo_url AS company_logo,
             (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id) AS applicants_count
      FROM jobs j
      JOIN companies c ON j.company_id = c.id
      WHERE j.company_id = $1 AND j.status = 'active'
      ORDER BY j.created_at DESC
    `, [id]);

    for (const job of jobsRes.rows) {
      const skillsRes = await db.query(`
        SELECT s.name FROM job_skills js 
        JOIN skills s ON js.skill_id = s.id 
        WHERE js.job_id = $1
      `, [job.id]);
      job.skills = skillsRes.rows.map(s => s.name);
    }

    // Associated recruiters
    const recRes = await db.query(`
      SELECT r.id, r.first_name, r.last_name, r.designation, u.email
      FROM recruiters r
      JOIN users u ON r.user_id = u.id
      WHERE r.company_id = $1
    `, [id]);
    company.recruiters = recRes.rows;

    company.jobs = jobsRes.rows;
    return res.json({ success: true, company });
  } catch (error) {
    console.error('getCompanyById error:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving company.' });
  }
}

// Get recruiter's company profile
async function getMyCompany(req, res) {
  try {
    const recRes = await db.query('SELECT company_id FROM recruiters WHERE user_id = $1', [req.user.id]);
    const companyId = recRes.rows[0]?.company_id;

    if (!companyId) {
      return res.status(404).json({ success: false, message: 'No company associated with this recruiter profile.' });
    }

    const compRes = await db.query('SELECT * FROM companies WHERE id = $1', [companyId]);
    return res.json({ success: true, company: compRes.rows[0] });
  } catch (error) {
    console.error('getMyCompany error:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving your company.' });
  }
}

// Update recruiter's company profile
async function updateMyCompany(req, res) {
  try {
    const recRes = await db.query('SELECT id, company_id FROM recruiters WHERE user_id = $1', [req.user.id]);
    if (recRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Recruiter profile not found.' });
    }

    let companyId = recRes.rows[0].company_id;
    const {
      name,
      logoUrl,
      website,
      industry,
      companySize,
      location,
      description,
      foundedYear,
    } = req.body;

    if (!companyId) {
      // Create new company if recruiter didn't have one
      const newComp = await db.query(`
        INSERT INTO companies (name, logo_url, website, industry, company_size, location, description, founded_year)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
      `, [name || 'My Company', logoUrl || '', website || '', industry || '', companySize || '', location || '', description || '', foundedYear ? parseInt(foundedYear) : null]);
      companyId = newComp.rows[0]?.id || newComp.lastID;

      await db.query('UPDATE recruiters SET company_id = $1 WHERE id = $2', [companyId, recRes.rows[0].id]);
      return res.json({ success: true, message: 'Company profile created successfully!', companyId });
    }

    await db.query(`
      UPDATE companies SET
        name = COALESCE($1, name),
        logo_url = COALESCE($2, logo_url),
        website = COALESCE($3, website),
        industry = COALESCE($4, industry),
        company_size = COALESCE($5, company_size),
        location = COALESCE($6, location),
        description = COALESCE($7, description),
        founded_year = COALESCE($8, founded_year),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $9
    `, [
      name,
      logoUrl,
      website,
      industry,
      companySize,
      location,
      description,
      foundedYear !== undefined ? parseInt(foundedYear) : null,
      companyId,
    ]);

    return res.json({ success: true, message: 'Company details updated successfully!' });
  } catch (error) {
    console.error('updateMyCompany error:', error);
    return res.status(500).json({ success: false, message: 'Server error updating company details.' });
  }
}

module.exports = {
  getCompanies,
  getCompanyById,
  getMyCompany,
  updateMyCompany,
};

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const config = require('../config/config');

// Generate JWT token
function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
}

// Register
async function register(req, res) {
  try {
    const { email, password, role, firstName, lastName, phone, companyName, designation } = req.body;

    if (!email || !password || !role || !firstName || !lastName) {
      return res.status(400).json({ success: false, message: 'All required fields must be provided.' });
    }

    let normalizedRole = role;
    if (normalizedRole === 'candidate') normalizedRole = 'job_seeker';

    if (!['job_seeker', 'recruiter'].includes(normalizedRole)) {
      return res.status(400).json({ success: false, message: 'Role must be either candidate or recruiter.' });
    }

    if (typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }

    // Check existing email
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insert user
    const userRes = await db.query(
      `INSERT INTO users (email, password_hash, role, status) VALUES ($1, $2, $3, 'active') RETURNING id, email, role, status`,
      [email.toLowerCase().trim(), passwordHash, normalizedRole]
    );
    const newUser = userRes.rows[0];
    const userId = newUser.id || userRes.lastID;

    let profileData = {};

    if (normalizedRole === 'job_seeker') {
      const seekerRes = await db.query(
        `INSERT INTO job_seekers (user_id, first_name, last_name, phone) VALUES ($1, $2, $3, $4) RETURNING id`,
        [userId, firstName.trim(), lastName.trim(), phone || '']
      );
      const seekerId = seekerRes.rows[0]?.id || seekerRes.lastID;
      profileData = { job_seeker_id: seekerId, firstName, lastName };

      // Welcome notification
      await db.query(
        `INSERT INTO notifications (user_id, title, message, type, link) VALUES ($1, $2, $3, 'welcome', '/seeker/profile')`,
        [userId, 'Welcome to Job Portal!', 'Complete your profile to discover matched jobs and start applying.']
      );
    } else if (normalizedRole === 'recruiter') {
      let companyId = null;
      if (companyName) {
        // Find or create company
        const compRes = await db.query('SELECT id FROM companies WHERE LOWER(name) = $1', [companyName.toLowerCase().trim()]);
        if (compRes.rows.length > 0) {
          companyId = compRes.rows[0].id;
        } else {
          const newComp = await db.query(
            `INSERT INTO companies (name, description) VALUES ($1, $2) RETURNING id`,
            [companyName.trim(), `Company profile for ${companyName.trim()}`]
          );
          companyId = newComp.rows[0]?.id || newComp.lastID;
        }
      }

      const recRes = await db.query(
        `INSERT INTO recruiters (user_id, company_id, first_name, last_name, designation, phone) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [userId, companyId, firstName.trim(), lastName.trim(), designation || 'Hiring Manager', phone || '']
      );
      const recId = recRes.rows[0]?.id || recRes.lastID;
      profileData = { recruiter_id: recId, company_id: companyId, firstName, lastName, companyName };

      // Welcome notification
      await db.query(
        `INSERT INTO notifications (user_id, title, message, type, link) VALUES ($1, $2, $3, 'welcome', '/recruiter/dashboard')`,
        [userId, 'Welcome Recruiter!', 'Start by posting your first job vacancy or searching candidates.']
      );
    }

    const token = generateToken({ id: userId, email: newUser.email, role: newUser.role });

    return res.status(201).json({
      success: true,
      message: 'Registration successful!',
      token,
      user: {
        id: userId,
        email: newUser.email,
        role: newUser.role,
        ...profileData,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ success: false, message: 'Server error during registration.' });
  }
}

// Login
async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const userRes = await db.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (userRes.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const user = userRes.rows[0];

    if (user.status !== 'active') {
      return res.status(403).json({ success: false, message: 'Your account is deactivated or suspended. Please contact support.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    let profile = {};
    if (user.role === 'job_seeker') {
      const seekerRes = await db.query('SELECT * FROM job_seekers WHERE user_id = $1', [user.id]);
      if (seekerRes.rows.length > 0) {
        profile = seekerRes.rows[0];
      }
    } else if (user.role === 'recruiter') {
      const recRes = await db.query(`
        SELECT r.*, c.name AS company_name, c.logo_url AS company_logo
        FROM recruiters r
        LEFT JOIN companies c ON r.company_id = c.id
        WHERE r.user_id = $1
      `, [user.id]);
      if (recRes.rows.length > 0) {
        profile = recRes.rows[0];
      }
    }

    const token = generateToken(user);

    return res.json({
      success: true,
      message: 'Login successful!',
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        profile,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Server error during login.' });
  }
}

// Get current user (me)
async function getMe(req, res) {
  try {
    const userId = req.user.id;
    const userRes = await db.query('SELECT id, email, role, status, created_at FROM users WHERE id = $1', [userId]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const user = userRes.rows[0];
    let profile = null;

    if (user.role === 'job_seeker') {
      const seekerRes = await db.query('SELECT * FROM job_seekers WHERE user_id = $1', [userId]);
      profile = seekerRes.rows[0] || null;
    } else if (user.role === 'recruiter') {
      const recRes = await db.query(`
        SELECT r.*, c.name AS company_name, c.logo_url AS company_logo, c.website AS company_website
        FROM recruiters r
        LEFT JOIN companies c ON r.company_id = c.id
        WHERE r.user_id = $1
      `, [userId]);
      profile = recRes.rows[0] || null;
    }

    return res.json({
      success: true,
      user: {
        ...user,
        profile,
      },
    });
  } catch (error) {
    console.error('getMe error:', error);
    return res.status(500).json({ success: false, message: 'Server error getting user profile.' });
  }
}

// Update password
async function updatePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current and new password are required.' });
    }
    if (typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long.' });
    }

    const userRes = await db.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    const user = userRes.rows[0];

    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);

    await db.query('UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [newHash, req.user.id]);

    return res.json({ success: true, message: 'Password updated successfully!' });
  } catch (error) {
    console.error('Update password error:', error);
    return res.status(500).json({ success: false, message: 'Error updating password.' });
  }
}

// Switch user role between Job Seeker and Recruiter
async function switchRole(req, res) {
  try {
    const userId = req.user.id;
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({ success: false, message: 'Target role is required.' });
    }

    let targetRole = role;
    if (targetRole === 'candidate') targetRole = 'job_seeker';

    if (!['job_seeker', 'recruiter'].includes(targetRole)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid target role. Allowed roles are job_seeker (or candidate) and recruiter.',
      });
    }

    const userRes = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const currentUser = userRes.rows[0];
    if (currentUser.status !== 'active') {
      return res.status(403).json({ success: false, message: 'Your account is deactivated or suspended.' });
    }

    // Ensure corresponding role profile exists
    if (targetRole === 'recruiter') {
      const recCheck = await db.query('SELECT id FROM recruiters WHERE user_id = $1', [userId]);
      if (recCheck.rows.length === 0) {
        const seekerRes = await db.query('SELECT first_name, last_name, phone FROM job_seekers WHERE user_id = $1', [userId]);
        const seeker = seekerRes.rows[0] || {};
        const firstName = seeker.first_name || currentUser.email.split('@')[0] || 'Recruiter';
        const lastName = seeker.last_name || 'Hiring';
        const phone = seeker.phone || '';

        await db.query(
          `INSERT INTO recruiters (user_id, company_id, first_name, last_name, designation, phone)
           VALUES ($1, NULL, $2, $3, 'Hiring Manager', $4)`,
          [userId, firstName, lastName, phone]
        );
      }
    } else if (targetRole === 'job_seeker') {
      const seekerCheck = await db.query('SELECT id FROM job_seekers WHERE user_id = $1', [userId]);
      if (seekerCheck.rows.length === 0) {
        const recRes = await db.query('SELECT first_name, last_name, phone FROM recruiters WHERE user_id = $1', [userId]);
        const rec = recRes.rows[0] || {};
        const firstName = rec.first_name || currentUser.email.split('@')[0] || 'Candidate';
        const lastName = rec.last_name || 'Member';
        const phone = rec.phone || '';

        await db.query(
          `INSERT INTO job_seekers (user_id, first_name, last_name, phone)
           VALUES ($1, $2, $3, $4)`,
          [userId, firstName, lastName, phone]
        );
      }
    }

    // Update active role in database
    await db.query('UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [targetRole, userId]);

    // Fetch updated user
    const updatedUserRes = await db.query('SELECT id, email, role, status, created_at FROM users WHERE id = $1', [userId]);
    const updatedUser = updatedUserRes.rows[0];

    // Fetch relevant profile
    let profile = null;
    if (targetRole === 'job_seeker') {
      const sRes = await db.query('SELECT * FROM job_seekers WHERE user_id = $1', [userId]);
      profile = sRes.rows[0] || null;
    } else if (targetRole === 'recruiter') {
      const rRes = await db.query(`
        SELECT r.*, c.name AS company_name, c.logo_url AS company_logo, c.website AS company_website
        FROM recruiters r
        LEFT JOIN companies c ON r.company_id = c.id
        WHERE r.user_id = $1
      `, [userId]);
      profile = rRes.rows[0] || null;
    }

    // Sign new JWT token containing the updated role
    const token = generateToken(updatedUser);

    return res.json({
      success: true,
      message: `Role switched to ${targetRole === 'recruiter' ? 'Recruiter' : 'Job Seeker'} successfully!`,
      token,
      user: {
        ...updatedUser,
        profile,
      },
    });
  } catch (error) {
    console.error('Role switch error:', error);
    return res.status(500).json({ success: false, message: 'Server error while switching role.' });
  }
}

module.exports = {
  register,
  login,
  getMe,
  updatePassword,
  switchRole,
};

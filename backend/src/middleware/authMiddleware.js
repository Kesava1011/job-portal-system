const jwt = require('jsonwebtoken');
const config = require('../config/config');
const db = require('../config/db');

// Verify token and attach user to request
async function authenticate(req, res, next) {
  try {
    let token = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.query && req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
    }
    let decoded;
    try {
      decoded = jwt.verify(token, config.jwtSecret);
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
    }

    // Fetch user from DB to verify active status
    const result = await db.query('SELECT id, email, role, status FROM users WHERE id = $1', [decoded.id]);
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'User not found.' });
    }

    const user = result.rows[0];
    if (user.status !== 'active') {
      return res.status(403).json({ success: false, message: 'Your account has been deactivated or suspended.' });
    }

    // Attach profile IDs if applicable
    if (user.role === 'job_seeker') {
      const seekerRes = await db.query('SELECT id FROM job_seekers WHERE user_id = $1', [user.id]);
      user.job_seeker_id = seekerRes.rows[0]?.id || null;
    } else if (user.role === 'recruiter') {
      const recRes = await db.query('SELECT id, company_id FROM recruiters WHERE user_id = $1', [user.id]);
      user.recruiter_id = recRes.rows[0]?.id || null;
      user.company_id = recRes.rows[0]?.company_id || null;
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ success: false, message: 'Internal authentication error.' });
  }
}

// Optional authentication (for public pages that can show personalized recommendations/saved status if logged in)
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwtSecret);
    const result = await db.query('SELECT id, email, role, status FROM users WHERE id = $1', [decoded.id]);
    if (result.rows.length > 0 && result.rows[0].status === 'active') {
      const user = result.rows[0];
      if (user.role === 'job_seeker') {
        const seekerRes = await db.query('SELECT id FROM job_seekers WHERE user_id = $1', [user.id]);
        user.job_seeker_id = seekerRes.rows[0]?.id || null;
      } else if (user.role === 'recruiter') {
        const recRes = await db.query('SELECT id, company_id FROM recruiters WHERE user_id = $1', [user.id]);
        user.recruiter_id = recRes.rows[0]?.id || null;
        user.company_id = recRes.rows[0]?.company_id || null;
      }
      req.user = user;
    }
  } catch {
    // Ignore invalid optional tokens
  }
  next();
}

// Role-based access control
function normalizeRole(r) {
  if (r === 'candidate') return 'job_seeker';
  return r;
}

function authorize(...roles) {
  const normalizedAllowed = roles.map(normalizeRole);
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    const userRole = normalizeRole(req.user.role);
    if (!normalizedAllowed.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access restricted to [${roles.join(', ')}] roles.`,
      });
    }
    next();
  };
}

module.exports = {
  authenticate,
  optionalAuth,
  authorize,
};

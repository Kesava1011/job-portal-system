const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

module.exports = {
  port: process.env.PORT || 5000,
  jwtSecret: process.env.JWT_SECRET || 'jobportal_super_secret_jwt_key_2026_college_project',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || '',
  pgHost: process.env.PGHOST || 'localhost',
  pgPort: process.env.PGPORT || 5432,
  pgDatabase: process.env.PGDATABASE || 'job_portal',
  pgUser: process.env.PGUSER || 'postgres',
  pgPassword: process.env.PGPASSWORD || 'postgres',
  uploadDir: path.resolve(__dirname, '../../uploads'),
  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: process.env.SMTP_PORT || '587',
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  smtpSecure: process.env.SMTP_SECURE || 'false',
  emailFrom: process.env.EMAIL_FROM || 'Job Portal System <no-reply@jobportal.com>',
};

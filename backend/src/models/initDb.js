const db = require('../config/db');
const fs = require('fs');
const path = require('path');

const schemaSqlite = `
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('job_seeker', 'recruiter', 'admin')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'inactive')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS companies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    logo_url TEXT,
    website TEXT,
    industry TEXT,
    company_size TEXT,
    location TEXT,
    description TEXT,
    founded_year INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS job_seekers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT,
    headline TEXT,
    bio TEXT,
    location TEXT,
    experience_years REAL DEFAULT 0,
    current_salary REAL,
    expected_salary REAL,
    github_url TEXT,
    linkedin_url TEXT,
    portfolio_url TEXT,
    avatar_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS recruiters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    designation TEXT,
    phone TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recruiter_id INTEGER NOT NULL REFERENCES recruiters(id) ON DELETE CASCADE,
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    requirements TEXT,
    location TEXT NOT NULL,
    job_type TEXT NOT NULL CHECK (job_type IN ('Full-time', 'Part-time', 'Internship', 'Remote', 'Hybrid', 'Contract')),
    experience_level TEXT,
    experience_required REAL DEFAULT 0,
    min_salary REAL,
    max_salary REAL,
    qualification TEXT,
    vacancies INTEGER DEFAULT 1,
    deadline TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed', 'draft')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS skills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    category TEXT DEFAULT 'Technical',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_skills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_seeker_id INTEGER NOT NULL REFERENCES job_seekers(id) ON DELETE CASCADE,
    skill_id INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    proficiency_level TEXT DEFAULT 'Intermediate',
    years_of_experience REAL DEFAULT 1,
    UNIQUE(job_seeker_id, skill_id)
);

CREATE TABLE IF NOT EXISTS job_skills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    skill_id INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    is_required INTEGER DEFAULT 1,
    UNIQUE(job_id, skill_id)
);

CREATE TABLE IF NOT EXISTS resumes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_seeker_id INTEGER NOT NULL REFERENCES job_seekers(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    file_url TEXT,
    resume_data TEXT,
    is_default INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    job_seeker_id INTEGER NOT NULL REFERENCES job_seekers(id) ON DELETE CASCADE,
    resume_id INTEGER REFERENCES resumes(id) ON DELETE SET NULL,
    cover_letter TEXT,
    status TEXT DEFAULT 'Applied' CHECK (status IN ('Applied', 'Under Review', 'Shortlisted', 'Interview', 'Selected', 'Rejected')),
    notes TEXT,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(job_id, job_seeker_id)
);

CREATE TABLE IF NOT EXISTS saved_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_seeker_id INTEGER NOT NULL REFERENCES job_seekers(id) ON DELETE CASCADE,
    job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    saved_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(job_seeker_id, job_id)
);

CREATE TABLE IF NOT EXISTS education (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_seeker_id INTEGER NOT NULL REFERENCES job_seekers(id) ON DELETE CASCADE,
    degree TEXT NOT NULL,
    institution TEXT NOT NULL,
    field_of_study TEXT,
    start_year INTEGER,
    end_year INTEGER,
    grade TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS experience (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_seeker_id INTEGER NOT NULL REFERENCES job_seekers(id) ON DELETE CASCADE,
    company_name TEXT NOT NULL,
    title TEXT NOT NULL,
    location TEXT,
    start_date TEXT,
    end_date TEXT,
    is_current INTEGER DEFAULT 0,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_seeker_id INTEGER NOT NULL REFERENCES job_seekers(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    tech_stack TEXT,
    live_url TEXT,
    repo_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS certifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_seeker_id INTEGER NOT NULL REFERENCES job_seekers(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    issuing_organization TEXT NOT NULL,
    issue_date TEXT,
    expiration_date TEXT,
    credential_id TEXT,
    credential_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    is_read INTEGER DEFAULT 0,
    link TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`;

async function seedData() {
  const check = await db.query('SELECT COUNT(*) as count FROM users');
  const count = parseInt(check.rows[0]?.count || 0, 10);
  if (count > 0) {
    console.log(`ℹ️ [Database] Found existing database with ${count} users. Skipping seed.`);
    return;
  }

  console.log('🌱 [Database] Seeding initial demo data...');
  const passwordHash = '$2b$10$tMaB9BEUVEcVLIJkHwlAvuN3G409uZX.owLnLDL67t/KnEm5z29fu'; // password123

  // 1. Users
  await db.query(`INSERT INTO users (id, email, password_hash, role, status) VALUES 
    (1, 'admin@jobportal.com', $1, 'admin', 'active'),
    (2, 'recruiter@google.com', $2, 'recruiter', 'active'),
    (3, 'recruiter@microsoft.com', $3, 'recruiter', 'active'),
    (4, 'seeker@example.com', $4, 'job_seeker', 'active'),
    (5, 'jane@example.com', $5, 'job_seeker', 'active')`, 
    [passwordHash, passwordHash, passwordHash, passwordHash, passwordHash]
  );

  // 2. Companies
  await db.query(`INSERT INTO companies (id, name, logo_url, website, industry, company_size, location, description, founded_year) VALUES 
    (1, 'Google', 'https://images.unsplash.com/photo-1573804633927-bfcbcd909acd?w=128&auto=format&fit=crop&q=80', 'https://google.com', 'Technology & Cloud', '10,000+ employees', 'Mountain View, CA / Bangalore', 'Google is a global technology leader focusing on search, cloud computing, software, and AI.', 1998),
    (2, 'Microsoft', 'https://images.unsplash.com/photo-1642132652075-2b23a9d9016c?w=128&auto=format&fit=crop&q=80', 'https://microsoft.com', 'Software & Cloud', '10,000+ employees', 'Redmond, WA / Hyderabad', 'Microsoft enables digital transformation for the era of an intelligent cloud.', 1975),
    (3, 'Spotify', 'https://images.unsplash.com/photo-1614680376593-902f749f7ffc?w=128&auto=format&fit=crop&q=80', 'https://spotify.com', 'Audio & Streaming', '5,000-10,000 employees', 'Stockholm, Sweden / Remote', 'Spotify transforms music and podcast listening forever.', 2006),
    (4, 'Stripe', 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=128&auto=format&fit=crop&q=80', 'https://stripe.com', 'Financial Technology', '1,000-5,000 employees', 'San Francisco, CA / Remote', 'Stripe is an economic infrastructure suite powering commerce worldwide.', 2010)`);

  // 3. Recruiters
  await db.query(`INSERT INTO recruiters (id, user_id, company_id, first_name, last_name, designation, phone) VALUES 
    (1, 2, 1, 'Sarah', 'Davis', 'Lead Technical Recruiter', '+1 (555) 234-5678'),
    (2, 3, 2, 'David', 'Miller', 'Senior Engineering Talent Partner', '+1 (555) 876-5432')`);

  // 4. Job Seekers
  await db.query(`INSERT INTO job_seekers (id, user_id, first_name, last_name, phone, headline, bio, location, experience_years, current_salary, expected_salary, github_url, linkedin_url, portfolio_url) VALUES 
    (1, 4, 'Alex', 'Johnson', '+1 (555) 345-6789', 'Full-Stack Developer | React, Node.js & PostgreSQL', 'Passionate full-stack developer with 3.5 years of experience building modern scalable web applications with Next.js, Node.js, and relational databases.', 'San Francisco, CA (Open to Remote)', 3.5, 95000, 125000, 'https://github.com/alexjohnson-dev', 'https://linkedin.com/in/alexjohnson-dev', 'https://alexjohnson.dev'),
    (2, 5, 'Jane', 'Smith', '+1 (555) 987-6543', 'Frontend Specialist | UI/UX & React Enthusiast', 'Frontend developer focused on creating delightful, accessible, and fast web experiences with React, Tailwind CSS, and TypeScript.', 'Austin, TX', 2.0, 75000, 95000, 'https://github.com/janesmith-ui', 'https://linkedin.com/in/janesmith-ui', 'https://janesmith.design')`);

  // 5. Skills
  await db.query(`INSERT INTO skills (id, name, category) VALUES 
    (1, 'React', 'Frontend'),
    (2, 'Next.js', 'Frontend'),
    (3, 'Node.js', 'Backend'),
    (4, 'Express.js', 'Backend'),
    (5, 'PostgreSQL', 'Database'),
    (6, 'JavaScript', 'Language'),
    (7, 'TypeScript', 'Language'),
    (8, 'Tailwind CSS', 'Frontend'),
    (9, 'Docker', 'DevOps'),
    (10, 'AWS', 'Cloud'),
    (11, 'Git', 'Tools'),
    (12, 'REST APIs', 'Backend'),
    (13, 'GraphQL', 'Backend'),
    (14, 'Python', 'Language'),
    (15, 'System Design', 'Architecture'),
    (16, 'SQL', 'Database'),
    (17, 'MongoDB', 'Database'),
    (18, 'UI/UX Design', 'Design')`);

  // 6. User Skills
  await db.query(`INSERT INTO user_skills (job_seeker_id, skill_id, proficiency_level, years_of_experience) VALUES 
    (1, 1, 'Expert', 3.5),
    (1, 2, 'Advanced', 2.5),
    (1, 3, 'Expert', 3.5),
    (1, 4, 'Expert', 3.5),
    (1, 5, 'Advanced', 3.0),
    (1, 6, 'Expert', 4.0),
    (1, 8, 'Advanced', 3.0),
    (1, 11, 'Advanced', 4.0),
    (1, 12, 'Expert', 3.5),
    (2, 1, 'Advanced', 2.0),
    (2, 2, 'Intermediate', 1.5),
    (2, 6, 'Advanced', 2.5),
    (2, 7, 'Intermediate', 1.5),
    (2, 8, 'Expert', 2.5),
    (2, 18, 'Advanced', 2.0)`);

  // 7. Jobs
  await db.query(`INSERT INTO jobs (id, recruiter_id, company_id, title, description, requirements, location, job_type, experience_level, experience_required, min_salary, max_salary, qualification, vacancies, deadline, status) VALUES 
    (1, 1, 1, 'Senior Full-Stack Developer', 'We are seeking a talented Senior Full-Stack Engineer to design and build mission-critical web applications with React, Node.js and PostgreSQL.', 'Strong proficiency in React, Node.js, and PostgreSQL. Experience building RESTful APIs, distributed systems, and modern frontends.', 'Mountain View, CA (Hybrid)', 'Full-time', 'Senior Level', 3.0, 125000, 165000, 'B.Tech / B.S. in Computer Science', 3, '2026-12-31', 'active'),
    (2, 2, 2, 'Frontend React Engineer', 'Join Microsoft''s developer experience team to build world-class web applications used by millions. You will build component systems and optimize web performance.', 'Proven experience with React, Next.js, and modern CSS/Tailwind. Strong understanding of JavaScript/TypeScript.', 'Remote (US / Global)', 'Remote', 'Mid Level', 2.0, 95000, 130000, 'Bachelor''s Degree in Engineering or equivalent', 2, '2026-11-30', 'active'),
    (3, 1, 1, 'Backend Node.js & Database Architect', 'Google Cloud is looking for an experienced backend developer to architect resilient REST and GraphQL APIs backed by high-throughput PostgreSQL databases.', 'Deep knowledge of Node.js event loop, asynchronous patterns, Express/Fastify, SQL query optimization, and containerization using Docker.', 'Bangalore, India (Hybrid)', 'Hybrid', 'Lead / Staff', 4.0, 140000, 185000, 'B.Tech / M.Tech in CS / IT', 1, '2026-10-31', 'active'),
    (4, 2, 2, 'Software Engineering Intern', 'Kickstart your career with Microsoft! Our summer internship program gives college students hands-on experience building cutting-edge software alongside experienced mentors.', 'Currently enrolled in a Computer Science or related degree. Basic familiarity with JavaScript, Git, data structures, and web fundamentals.', 'Hyderabad, India', 'Internship', 'Entry Level', 0.0, 35000, 50000, 'Pursuing B.Tech / B.S. Computer Science', 5, '2026-12-15', 'active'),
    (5, 1, 4, 'Full-Stack Fintech Engineer', 'At Stripe, you will engineer critical financial infrastructure and delightful merchant dashboards. We value clean code, strong tests, and security-first development.', 'Experience with React, TypeScript, Node.js, and PostgreSQL. Familiarity with financial transactions and idempotent APIs.', 'Remote', 'Full-time', 'Mid-Senior Level', 3.0, 130000, 175000, 'Bachelor''s in Computer Science', 2, '2026-12-20', 'active')`);

  // 8. Job Skills
  await db.query(`INSERT INTO job_skills (job_id, skill_id, is_required) VALUES 
    (1, 1, 1), (1, 3, 1), (1, 4, 1), (1, 5, 1), (1, 9, 0),
    (2, 1, 1), (2, 2, 1), (2, 8, 1), (2, 7, 0),
    (3, 3, 1), (3, 4, 1), (3, 5, 1), (3, 15, 1),
    (4, 6, 1), (4, 11, 1), (4, 1, 0),
    (5, 1, 1), (5, 3, 1), (5, 5, 1), (5, 7, 0)`);

  // 9. Resumes
  const resumeJsonAlex = JSON.stringify({
    careerObjective: 'Driven full-stack engineer seeking high-impact software engineering roles where I can leverage my React, Node.js, and PostgreSQL skills to architect robust systems.',
    languages: ['English (Fluent)', 'Spanish (Conversational)'],
    achievements: ['Winner of National Hackathon 2024', 'Dean\'s List Honor Graduate']
  });
  const resumeJsonJane = JSON.stringify({
    careerObjective: 'Frontend engineer focused on intuitive user experiences, accessibility, and high performance web applications.',
    languages: ['English (Native)'],
    achievements: ['Published UI Design System on GitHub with 1k+ stars']
  });
  await db.query(`INSERT INTO resumes (id, job_seeker_id, title, file_url, resume_data, is_default) VALUES 
    (1, 1, 'Alex_Johnson_FullStack_Resume.pdf', '/uploads/sample_resume_alex.pdf', $1, 1),
    (2, 2, 'Jane_Smith_Frontend_Resume.pdf', '/uploads/sample_resume_jane.pdf', $2, 1)`, [resumeJsonAlex, resumeJsonJane]);

  // 10. Applications
  await db.query(`INSERT INTO applications (id, job_id, job_seeker_id, resume_id, cover_letter, status, notes) VALUES 
    (1, 1, 1, 1, 'I am excited to apply for the Senior Full-Stack Developer position at Google. With over 3.5 years building resilient full-stack applications with React, Node.js, and PostgreSQL, I am confident in my ability to immediately contribute.', 'Under Review', 'Impressive background in PostgreSQL and Node.js.'),
    (2, 2, 1, 1, 'Hello Microsoft Team, I would love to bring my expertise in modern React and component architecture to your developer tooling division.', 'Interview', 'Technical screening scheduled for next Tuesday.'),
    (3, 2, 2, 2, 'Dear Hiring Manager, As a passionate frontend developer obsessed with clean UI, responsive layouts, and Tailwind CSS, I am eager to contribute to Microsoft web products.', 'Shortlisted', 'Strong portfolio and design sensibility.')`);

  // 11. Saved Jobs
  await db.query(`INSERT INTO saved_jobs (job_seeker_id, job_id) VALUES (1, 3), (1, 5), (2, 1)`);

  // 12. Education
  await db.query(`INSERT INTO education (job_seeker_id, degree, institution, field_of_study, start_year, end_year, grade) VALUES 
    (1, 'Bachelor of Technology (B.Tech)', 'National Institute of Technology', 'Computer Science & Engineering', 2017, 2021, '3.8 / 4.0 GPA'),
    (2, 'Bachelor of Science (B.S.)', 'University of Texas', 'Software Engineering & Design', 2018, 2022, '3.9 / 4.0 GPA')`);

  // 13. Experience
  await db.query(`INSERT INTO experience (job_seeker_id, company_name, title, location, start_date, end_date, is_current, description) VALUES 
    (1, 'TechCorp Solutions', 'Full-Stack Software Engineer', 'San Francisco, CA', '2021-08', 'Present', 1, 'Architected and developed scalable RESTful microservices in Node.js and Express. Created responsive client dashboards using React and Next.js, reducing page load latency by 35%.'),
    (1, 'CloudScale Labs', 'Junior Web Developer', 'Austin, TX', '2020-05', '2021-07', 0, 'Implemented database models and optimized PostgreSQL queries. Developed reusable frontend component libraries with Tailwind CSS.'),
    (2, 'PixelCraft Media', 'Frontend Developer', 'Austin, TX', '2022-07', 'Present', 1, 'Designed and built modern web interfaces with React and Tailwind CSS. Collaborated with UI/UX team on user flow testing and WCAG accessibility standards.')`);

  // 14. Projects
  await db.query(`INSERT INTO projects (job_seeker_id, title, description, tech_stack, live_url, repo_url) VALUES 
    (1, 'DevCollab - Realtime Developer Workspace', 'A collaborative cloud workspace enabling developers to share code snippets, run database queries, and test REST endpoints in real-time.', 'Next.js, Node.js, PostgreSQL, WebSockets', 'https://devcollab-demo.vercel.app', 'https://github.com/alexjohnson-dev/devcollab'),
    (1, 'AI Resume Matcher & Optimizer', 'An automated tool that analyzes resumes against job descriptions, calculates keyword similarity, and suggests targeted improvements.', 'Python, React, Express, Tailwind CSS', 'https://aimatcher-demo.vercel.app', 'https://github.com/alexjohnson-dev/ai-matcher'),
    (2, 'SaaS Design System UI Kit', 'An open-source accessible React and Tailwind CSS component system containing 50+ accessible components with light and dark mode.', 'React, Tailwind CSS, Storybook', 'https://uikit-demo.vercel.app', 'https://github.com/janesmith-ui/saas-ui-kit')`);

  // 15. Certifications
  await db.query(`INSERT INTO certifications (job_seeker_id, name, issuing_organization, issue_date, expiration_date, credential_id, credential_url) VALUES 
    (1, 'AWS Certified Solutions Architect – Associate', 'Amazon Web Services', '2023-04', '2026-04', 'AWS-ARCH-984321', 'https://aws.amazon.com/verify'),
    (1, 'Meta Frontend Developer Professional Certificate', 'Meta (Coursera)', '2022-09', '', 'META-FE-781923', 'https://coursera.org/verify/meta-fe'),
    (2, 'Google UX Design Professional Certificate', 'Google', '2023-01', '', 'GOOG-UX-482019', 'https://coursera.org/verify/goog-ux')`);

  // 16. Notifications
  await db.query(`INSERT INTO notifications (user_id, title, message, type, is_read, link) VALUES 
    (4, 'Application Update', 'Your application for Senior Full-Stack Developer at Google is now Under Review.', 'status_change', 0, '/seeker/applications'),
    (4, 'Interview Scheduled', 'Congratulations! Microsoft has scheduled your interview for Frontend React Engineer.', 'interview', 0, '/seeker/applications'),
    (5, 'Application Shortlisted', 'Great news! Your application for Frontend React Engineer at Microsoft has been shortlisted.', 'shortlisted', 0, '/seeker/applications'),
    (2, 'New Applicant', 'Alex Johnson applied for Senior Full-Stack Developer.', 'new_applicant', 0, '/recruiter/applicants'),
    (3, 'New Applicant', 'Jane Smith applied for Frontend React Engineer.', 'new_applicant', 1, '/recruiter/applicants')`);

  console.log('✅ [Database] Seed data successfully populated!');
}

async function setupDatabase() {
  await db.initDatabase();
  const driver = db.getDriver();

  if (driver === 'pg') {
    // If connected to PostgreSQL, execute schema.sql if tables don't exist
    try {
      const check = await db.query("SELECT to_regclass('public.users') as tbl");
      if (!check.rows[0]?.tbl) {
        console.log('📦 [Database] Creating PostgreSQL tables from schema.sql...');
        const schemaPath = path.resolve(__dirname, 'schema.sql');
        const schemaFile = fs.readFileSync(schemaPath, 'utf8');
        await db.query(schemaFile);
        console.log('✅ [Database] PostgreSQL tables created successfully.');
      }
    } catch (e) {
      console.warn('⚠️ Error checking PG tables, running fallback creation:', e.message);
    }
  } else {
    // SQLite execution
    const statements = schemaSqlite
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const stmt of statements) {
      await db.query(stmt);
    }
    console.log('✅ [Database] Relational tables verified / created.');
  }

  await seedData();
}

// Allow running directly: node src/models/initDb.js
if (require.main === module) {
  setupDatabase()
    .then(() => {
      console.log('🎉 [Database] Database initialization complete!');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ [Database] Database initialization failed:', err);
      process.exit(1);
    });
}

module.exports = {
  setupDatabase,
  seedData,
};

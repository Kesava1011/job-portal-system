-- ============================================================================
-- JOB PORTAL SYSTEM - SEED DEMO DATA
-- Pre-configured accounts, companies, skills, jobs, profiles, and applications
-- Default password for all seed accounts: password123
-- Hash: $2b$10$tMaB9BEUVEcVLIJkHwlAvuN3G409uZX.owLnLDL67t/KnEm5z29fu
-- ============================================================================

-- 1. USERS
INSERT INTO users (id, email, password_hash, role, status) VALUES
(1, 'admin@jobportal.com', '$2b$10$tMaB9BEUVEcVLIJkHwlAvuN3G409uZX.owLnLDL67t/KnEm5z29fu', 'admin', 'active'),
(2, 'recruiter@google.com', '$2b$10$tMaB9BEUVEcVLIJkHwlAvuN3G409uZX.owLnLDL67t/KnEm5z29fu', 'recruiter', 'active'),
(3, 'recruiter@microsoft.com', '$2b$10$tMaB9BEUVEcVLIJkHwlAvuN3G409uZX.owLnLDL67t/KnEm5z29fu', 'recruiter', 'active'),
(4, 'seeker@example.com', '$2b$10$tMaB9BEUVEcVLIJkHwlAvuN3G409uZX.owLnLDL67t/KnEm5z29fu', 'job_seeker', 'active'),
(5, 'jane@example.com', '$2b$10$tMaB9BEUVEcVLIJkHwlAvuN3G409uZX.owLnLDL67t/KnEm5z29fu', 'job_seeker', 'active')
ON CONFLICT (email) DO NOTHING;

-- 2. COMPANIES
INSERT INTO companies (id, name, logo_url, website, industry, company_size, location, description, founded_year) VALUES
(1, 'Google', 'https://images.unsplash.com/photo-1573804633927-bfcbcd909acd?w=128&auto=format&fit=crop&q=80', 'https://google.com', 'Technology & Cloud', '10,000+ employees', 'Mountain View, CA / Bangalore', 'Google is a global technology leader focusing on search, cloud computing, software, and hardware innovation.', 1998),
(2, 'Microsoft', 'https://images.unsplash.com/photo-1642132652075-2b23a9d9016c?w=128&auto=format&fit=crop&q=80', 'https://microsoft.com', 'Software & Cloud', '10,000+ employees', 'Redmond, WA / Hyderabad', 'Microsoft enables digital transformation for the era of an intelligent cloud and an intelligent edge.', 1975),
(3, 'Spotify', 'https://images.unsplash.com/photo-1614680376593-902f749f7ffc?w=128&auto=format&fit=crop&q=80', 'https://spotify.com', 'Audio & Media Streaming', '5,000-10,000 employees', 'Stockholm, Sweden / Remote', 'Spotify transforms music listening forever. Millions of tracks and podcasts at your fingertips.', 2006),
(4, 'Stripe', 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=128&auto=format&fit=crop&q=80', 'https://stripe.com', 'Financial Technology', '1,000-5,000 employees', 'San Francisco, CA / Remote', 'Stripe is a suite of payment APIs powering commerce for online businesses of all sizes worldwide.', 2010)
ON CONFLICT (id) DO NOTHING;

-- 3. RECRUITERS
INSERT INTO recruiters (id, user_id, company_id, first_name, last_name, designation, phone) VALUES
(1, 2, 1, 'Sarah', 'Davis', 'Lead Technical Recruiter', '+1 (555) 234-5678'),
(2, 3, 2, 'David', 'Miller', 'Senior Engineering Talent Partner', '+1 (555) 876-5432')
ON CONFLICT (user_id) DO NOTHING;

-- 4. JOB SEEKERS
INSERT INTO job_seekers (id, user_id, first_name, last_name, phone, headline, bio, location, experience_years, current_salary, expected_salary, github_url, linkedin_url, portfolio_url) VALUES
(1, 4, 'Alex', 'Johnson', '+1 (555) 345-6789', 'Full-Stack Developer | React, Node.js & PostgreSQL', 'Passionate full-stack developer with 3.5 years of experience building modern scalable web applications with Next.js, Node.js, and relational databases. Enthusiastic about clean code and architecture.', 'San Francisco, CA (Open to Remote)', 3.5, 95000, 125000, 'https://github.com/alexjohnson-dev', 'https://linkedin.com/in/alexjohnson-dev', 'https://alexjohnson.dev'),
(2, 5, 'Jane', 'Smith', '+1 (555) 987-6543', 'Frontend Specialist | UI/UX & React Enthusiast', 'Frontend developer focused on creating delightful, accessible, and fast web experiences with React, Tailwind CSS, and TypeScript.', 'Austin, TX', 2.0, 75000, 95000, 'https://github.com/janesmith-ui', 'https://linkedin.com/in/janesmith-ui', 'https://janesmith.design')
ON CONFLICT (user_id) DO NOTHING;

-- 5. SKILLS
INSERT INTO skills (id, name, category) VALUES
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
(18, 'UI/UX Design', 'Design')
ON CONFLICT (name) DO NOTHING;

-- 6. USER SKILLS
INSERT INTO user_skills (job_seeker_id, skill_id, proficiency_level, years_of_experience) VALUES
(1, 1, 'Expert', 3.5),       -- React
(1, 2, 'Advanced', 2.5),     -- Next.js
(1, 3, 'Expert', 3.5),       -- Node.js
(1, 4, 'Expert', 3.5),       -- Express.js
(1, 5, 'Advanced', 3.0),     -- PostgreSQL
(1, 6, 'Expert', 4.0),       -- JavaScript
(1, 8, 'Advanced', 3.0),     -- Tailwind CSS
(1, 11, 'Advanced', 4.0),    -- Git
(1, 12, 'Expert', 3.5),      -- REST APIs
(2, 1, 'Advanced', 2.0),     -- React
(2, 2, 'Intermediate', 1.5), -- Next.js
(2, 6, 'Advanced', 2.5),     -- JavaScript
(2, 7, 'Intermediate', 1.5), -- TypeScript
(2, 8, 'Expert', 2.5),       -- Tailwind CSS
(2, 18, 'Advanced', 2.0)     -- UI/UX Design
ON CONFLICT (job_seeker_id, skill_id) DO NOTHING;

-- 7. JOBS
INSERT INTO jobs (id, recruiter_id, company_id, title, description, requirements, location, job_type, experience_level, experience_required, min_salary, max_salary, qualification, vacancies, deadline, status) VALUES
(1, 1, 1, 'Senior Full-Stack Developer', 
'We are seeking a talented Senior Full-Stack Engineer to design and build mission-critical web applications. You will collaborate with cross-functional teams to deliver high-performance user interfaces and resilient backend microservices.',
'Bachelor''s or Master''s degree in Computer Science or related field. Strong proficiency in React, Node.js, and PostgreSQL. Experience building RESTful APIs, distributed systems, and modern frontends.',
'Mountain View, CA (Hybrid)', 'Full-time', 'Senior Level', 3.0, 125000, 165000, 'B.Tech / B.S. in Computer Science', 3, '2026-12-31', 'active'),

(2, 2, 2, 'Frontend React Engineer',
'Join Microsoft''s developer experience team to build world-class web applications used by millions. You will build component systems, optimize web performance, and work closely with product designers.',
'Proven experience with React, Next.js, and modern CSS/Tailwind. Strong understanding of JavaScript/TypeScript, accessibility, and state management.',
'Remote (US / Global)', 'Remote', 'Mid Level', 2.0, 95000, 130000, 'Bachelor''s Degree in Engineering or equivalent', 2, '2026-11-30', 'active'),

(3, 1, 1, 'Backend Node.js & Database Architect',
'Google Cloud is looking for an experienced backend developer to architect resilient REST and GraphQL APIs backed by high-throughput PostgreSQL databases.',
'Deep knowledge of Node.js event loop, asynchronous patterns, Express/Fastify, SQL query optimization, and containerization using Docker.',
'Bangalore, India (Hybrid)', 'Hybrid', 'Lead / Staff', 4.0, 140000, 185000, 'B.Tech / M.Tech in CS / IT', 1, '2026-10-31', 'active'),

(4, 2, 2, 'Software Engineering Intern',
'Kickstart your career with Microsoft! Our summer internship program gives college students hands-on experience building cutting-edge software alongside experienced mentors.',
'Currently enrolled in a Computer Science or related degree. Basic familiarity with JavaScript, Git, data structures, and web fundamentals. Eagerness to learn.',
'Hyderabad, India', 'Internship', 'Entry Level', 0.0, 35000, 50000, 'Pursuing B.Tech / B.S. Computer Science', 5, '2026-12-15', 'active'),

(5, 1, 4, 'Full-Stack Fintech Engineer',
'At Stripe, you will engineer critical financial infrastructure and delightful merchant dashboards. We value clean code, strong tests, and security-first development.',
'Experience with React, TypeScript, Node.js, and PostgreSQL. Familiarity with financial transactions, idempotent APIs, and webhooks is a plus.',
'Remote', 'Full-time', 'Mid-Senior Level', 3.0, 130000, 175000, 'Bachelor''s in Computer Science', 2, '2026-12-20', 'active')
ON CONFLICT (id) DO NOTHING;

-- 8. JOB SKILLS
INSERT INTO job_skills (job_id, skill_id, is_required) VALUES
(1, 1, TRUE),  -- Job 1 requires React
(1, 3, TRUE),  -- Job 1 requires Node.js
(1, 4, TRUE),  -- Job 1 requires Express.js
(1, 5, TRUE),  -- Job 1 requires PostgreSQL
(1, 9, FALSE), -- Job 1 optional Docker
(2, 1, TRUE),  -- Job 2 requires React
(2, 2, TRUE),  -- Job 2 requires Next.js
(2, 8, TRUE),  -- Job 2 requires Tailwind CSS
(2, 7, FALSE), -- Job 2 optional TypeScript
(3, 3, TRUE),  -- Job 3 requires Node.js
(3, 4, TRUE),  -- Job 3 requires Express.js
(3, 5, TRUE),  -- Job 3 requires PostgreSQL
(3, 15, TRUE), -- Job 3 requires System Design
(4, 6, TRUE),  -- Job 4 requires JavaScript
(4, 11, TRUE), -- Job 4 requires Git
(4, 1, FALSE), -- Job 4 optional React
(5, 1, TRUE),  -- Job 5 requires React
(5, 3, TRUE),  -- Job 5 requires Node.js
(5, 5, TRUE),  -- Job 5 requires PostgreSQL
(5, 7, FALSE)  -- Job 5 optional TypeScript
ON CONFLICT (job_id, skill_id) DO NOTHING;

-- 9. RESUMES
INSERT INTO resumes (id, job_seeker_id, title, file_url, resume_data, is_default) VALUES
(1, 1, 'Alex_Johnson_FullStack_Resume.pdf', '/uploads/sample_resume_alex.pdf', '{"careerObjective":"Driven full-stack engineer seeking high-impact software engineering roles.","languages":["English (Fluent)","Spanish (Conversational)"],"achievements":["Winner of Hackathon 2024","Dean''s List Honor Graduate"]}', TRUE),
(2, 2, 'Jane_Smith_Frontend_Resume.pdf', '/uploads/sample_resume_jane.pdf', '{"careerObjective":"Frontend engineer focused on intuitive user experiences.","languages":["English (Native)"],"achievements":["Published UI Design System on GitHub with 1k+ stars"]}', TRUE)
ON CONFLICT (id) DO NOTHING;

-- 10. APPLICATIONS
INSERT INTO applications (id, job_id, job_seeker_id, resume_id, cover_letter, status, notes) VALUES
(1, 1, 1, 1, 'I am excited to apply for the Senior Full-Stack Developer position at Google. With over 3.5 years building resilient full-stack applications with React, Node.js, and PostgreSQL, I am confident in my ability to immediately contribute to your engineering objectives.', 'Under Review', 'Impressive background in PostgreSQL and Node.js.'),
(2, 2, 1, 1, 'Hello Microsoft Team, I would love to bring my expertise in modern React and component architecture to your developer tooling division.', 'Interview', 'Technical screening scheduled for next Tuesday.'),
(3, 2, 2, 2, 'Dear Hiring Manager, As a passionate frontend developer obsessed with clean UI, responsive layouts, and Tailwind CSS, I am eager to contribute to Microsoft''s web products.', 'Shortlisted', 'Strong portfolio and design sensibility.')
ON CONFLICT (job_id, job_seeker_id) DO NOTHING;

-- 11. SAVED JOBS
INSERT INTO saved_jobs (job_seeker_id, job_id) VALUES
(1, 3),
(1, 5),
(2, 1)
ON CONFLICT (job_seeker_id, job_id) DO NOTHING;

-- 12. EDUCATION
INSERT INTO education (job_seeker_id, degree, institution, field_of_study, start_year, end_year, grade) VALUES
(1, 'Bachelor of Technology (B.Tech)', 'National Institute of Technology', 'Computer Science & Engineering', 2017, 2021, '3.8 / 4.0 GPA'),
(2, 'Bachelor of Science (B.S.)', 'University of Texas', 'Software Engineering & Design', 2018, 2022, '3.9 / 4.0 GPA');

-- 13. EXPERIENCE
INSERT INTO experience (job_seeker_id, company_name, title, location, start_date, end_date, is_current, description) VALUES
(1, 'TechCorp Solutions', 'Full-Stack Software Engineer', 'San Francisco, CA', '2021-08', 'Present', TRUE, 'Architected and developed scalable RESTful microservices in Node.js and Express. Created responsive client dashboards using React and Next.js, reducing page load latency by 35%.'),
(1, 'CloudScale Labs', 'Junior Web Developer', 'Austin, TX', '2020-05', '2021-07', FALSE, 'Implemented database models and optimized PostgreSQL queries. Developed reusable frontend component libraries with Tailwind CSS.'),
(2, 'PixelCraft Media', 'Frontend Developer', 'Austin, TX', '2022-07', 'Present', TRUE, 'Designed and built modern web interfaces with React and Tailwind CSS. Collaborated with UI/UX team on user flow testing and WCAG accessibility standards.');

-- 14. PROJECTS
INSERT INTO projects (job_seeker_id, title, description, tech_stack, live_url, repo_url) VALUES
(1, 'DevCollab - Realtime Developer Workspace', 'A collaborative cloud workspace enabling developers to share code snippets, run database queries, and test REST endpoints in real-time.', 'Next.js, Node.js, PostgreSQL, WebSockets', 'https://devcollab-demo.vercel.app', 'https://github.com/alexjohnson-dev/devcollab'),
(1, 'AI Resume Matcher & Optimizer', 'An automated tool that analyzes resumes against job descriptions, calculates keyword similarity, and suggests targeted improvements.', 'Python, React, Express, Tailwind CSS', 'https://aimatcher-demo.vercel.app', 'https://github.com/alexjohnson-dev/ai-matcher'),
(2, 'SaaS Design System UI Kit', 'An open-source accessible React and Tailwind CSS component system containing 50+ accessible components with light and dark mode.', 'React, Tailwind CSS, Storybook', 'https://uikit-demo.vercel.app', 'https://github.com/janesmith-ui/saas-ui-kit');

-- 15. CERTIFICATIONS
INSERT INTO certifications (job_seeker_id, name, issuing_organization, issue_date, expiration_date, credential_id, credential_url) VALUES
(1, 'AWS Certified Solutions Architect – Associate', 'Amazon Web Services', '2023-04', '2026-04', 'AWS-ARCH-984321', 'https://aws.amazon.com/verify'),
(1, 'Meta Frontend Developer Professional Certificate', 'Meta (Coursera)', '2022-09', '', 'META-FE-781923', 'https://coursera.org/verify/meta-fe'),
(2, 'Google UX Design Professional Certificate', 'Google', '2023-01', '', 'GOOG-UX-482019', 'https://coursera.org/verify/goog-ux');

-- 16. NOTIFICATIONS
INSERT INTO notifications (user_id, title, message, type, is_read, link) VALUES
(4, 'Application Update', 'Your application for Senior Full-Stack Developer at Google is now Under Review.', 'status_change', FALSE, '/seeker/applications'),
(4, 'Interview Scheduled', 'Congratulations! Microsoft has scheduled your interview for Frontend React Engineer.', 'interview', FALSE, '/seeker/applications'),
(5, 'Application Shortlisted', 'Great news! Your application for Frontend React Engineer at Microsoft has been shortlisted.', 'shortlisted', FALSE, '/seeker/applications'),
(2, 'New Applicant', 'Alex Johnson applied for Senior Full-Stack Developer.', 'new_applicant', FALSE, '/recruiter/applicants'),
(3, 'New Applicant', 'Jane Smith applied for Frontend React Engineer.', 'new_applicant', TRUE, '/recruiter/applicants');

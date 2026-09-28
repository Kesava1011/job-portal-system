# 🌟 Job Portal System - Full-Stack Web Development Project

A comprehensive, production-ready, full-stack **Job Portal System** engineered with **Next.js**, **Tailwind CSS**, **Node.js**, **Express.js**, **PostgreSQL**, **JWT Authentication**, and **Chart.js** analytics.

---

## 🚀 Key Features by User Role

### 1. 👨‍💻 Job Seeker (Candidate)
- **Authentication**: Secure registration, JWT-based login, role protection, and password management.
- **Seeker Dashboard**: Real-time numerical stats for submitted applications, shortlisted count, scheduled interviews, bookmarked jobs, and recent applications.
- **Profile Management**: Full CRUD for Education, Technical Skills with proficiencies, Work Experience, Projects with live/repo links, and Certifications.
- **AI / Skill-Based Job Recommendations**: Transparent algorithm comparing Candidate Skills (60%), Experience (25%), and Education (15%) to calculate exact compatibility (e.g., *"88% Match"*) alongside matched and missing skills badges.
- **Resume Management**: Upload external PDF/DOC resumes and select default application resume.
- **Interactive 12-Section Resume Builder**:
  1. Personal Information & Headline
  2. Professional Summary & Career Objective
  3. Technical Skills
  4. Education
  5. Work Experience
  6. Internships
  7. Technical Projects & Repositories
  8. Certifications & Credentials
  9. Honors & Achievements
  10. Languages
  11. LinkedIn Profile
  12. GitHub Profile
  - Includes **One-Click Live CV Preview** and **Print to PDF** (`window.print()`).
- **Job Search & Advanced Filtering**: Keyword search, location, job type, experience slider, salary threshold, skill filters, and sorting (latest, salary, deadline).
- **Application Tracking**: Live lifecycle monitoring (**Applied → Under Review → Shortlisted → Interview → Selected / Rejected**) with recruiter feedback notes and option to withdraw.
- **Saved Jobs**: Quick bookmarking of active postings.
- **Notifications**: Instant alerts on status changes and interview invitations.

---

### 2. 🏢 Recruiter (Employer)
- **Recruiter Dashboard**: Recruitment pipeline counters (Jobs Posted, Total Applicants, Shortlisted, Interviews Scheduled, Selected Hires) and recent candidate submissions.
- **Company Profile**: Customize organization name, logo, website, industry, size, location, and description.
- **Post & Manage Jobs**: Create vacancies with title, description, requirements, skills, location, job type, experience, salary ranges, vacancies, and application deadlines.
- **Candidate Pipeline**: Filter applicants by job or status, review AI match scores, inspect candidate portfolios, and download official resumes.
- **Application Lifecycle Workflow**: Update candidate status (**Applied → Under Review → Shortlisted → Interview → Selected / Rejected**) and submit screening feedback notes.

---

### 3. 🛡️ Administrator (System Governance)
- **Admin Dashboard**: System metrics (Total Users, Job Seekers, Recruiters, Companies, Active Jobs, Total Applications) and **Chart.js Visual Analytics**:
  - Application Funnel Distribution (Doughnut Chart)
  - Postings by Job Type (Bar Chart)
- **User Governance**: Audit all registered accounts, filter by role/status, and toggle account activation or suspension.
- **Job Moderation**: Oversight of all platform postings with ability to permanently remove inappropriate jobs.
- **Company & Application Auditing**: Platform-wide review of partner companies and application records.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend Framework** | [Next.js](https://nextjs.org/) (App Router, React 19) |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) & Vanilla CSS |
| **Icons** | [Lucide React](https://lucide.dev/) |
| **Analytics & Charts** | [Chart.js](https://www.chartjs.org/) & `react-chartjs-2` |
| **Backend Framework** | [Express.js](https://expressjs.com/) (Node.js) |
| **Database** | [PostgreSQL](https://www.postgresql.org/) (with seamless local relational fallback for instant zero-config testing) |
| **Security & Auth** | JSON Web Tokens (`jsonwebtoken`), `bcryptjs` password hashing |
| **File Uploads** | `multer` (storage in `backend/uploads/`) |
| **Version Control** | Git & GitHub |
| **Deployment** | Vercel (Frontend) & Node Server (Backend) |

---

## 🗄️ Database Architecture (PostgreSQL Schema)

The database schema is defined in [`backend/src/models/schema.sql`](file:///backend/src/models/schema.sql) with relational foreign keys, constraints, and indexes across 16 tables:

1. `users` (id, email, password_hash, role, status, timestamps)
2. `companies` (id, name, logo_url, website, industry, company_size, location, description, founded_year)
3. `job_seekers` (id, user_id, first_name, last_name, phone, headline, bio, location, experience_years, salaries, links)
4. `recruiters` (id, user_id, company_id, first_name, last_name, designation, phone)
5. `jobs` (id, recruiter_id, company_id, title, description, requirements, location, job_type, experience_required, salary, qualification, vacancies, deadline, status)
6. `skills` (id, name, category)
7. `user_skills` (id, job_seeker_id, skill_id, proficiency_level, years_of_experience)
8. `job_skills` (id, job_id, skill_id, is_required)
9. `resumes` (id, job_seeker_id, title, file_url, resume_data, is_default)
10. `applications` (id, job_id, job_seeker_id, resume_id, cover_letter, status, notes, timestamps)
11. `saved_jobs` (id, job_seeker_id, job_id, saved_at)
12. `education` (id, job_seeker_id, degree, institution, field_of_study, start_year, end_year, grade)
13. `experience` (id, job_seeker_id, company_name, title, location, start_date, end_date, is_current, description)
14. `projects` (id, job_seeker_id, title, description, tech_stack, live_url, repo_url)
15. `certifications` (id, job_seeker_id, name, issuing_organization, issue_date, expiration_date, credential_id, credential_url)
16. `notifications` (id, user_id, title, message, type, is_read, link)

---

## 🔑 Pre-Seeded Demo Test Accounts

The system automatically initializes and seeds demo data on first launch. You can also use the **One-Click Demo Fill** buttons on the [`/login`](http://localhost:3000/login) page:

| Role | Email | Password | Details |
|---|---|---|---|
| **Job Seeker (Candidate)** | `seeker@example.com` | `password123` | Alex Johnson (Full Stack Developer, 3.5 yrs exp) |
| **Job Seeker (Candidate 2)** | `jane@example.com` | `password123` | Jane Smith (Frontend & UI/UX Developer) |
| **Recruiter (Google)** | `recruiter@google.com` | `password123` | Sarah Davis (Lead Technical Recruiter at Google) |
| **Recruiter (Microsoft)** | `recruiter@microsoft.com` | `password123` | David Miller (Senior Talent Partner at Microsoft) |
| **Administrator** | `admin@jobportal.com` | `password123` | System Administrator (Full platform governance) |

---

## ⚡ Setup & Running Instructions

### Prerequisites
- **Node.js** (v18+ or v20+)
- **npm** (v9+ or v10+)
- *(Optional)* PostgreSQL server (if you wish to connect directly to an external or local PostgreSQL database). If PostgreSQL is not installed locally, the app will seamlessly run out of the box using its self-contained relational database!

### 1. Clone the repository
```bash
git clone https://github.com/your-username/job-portal-system.git
cd job-portal-system
```

### 2. Backend Setup
```bash
cd backend
npm install
npm run db:init   # Creates tables and seeds demo accounts
npm run dev       # Starts backend API on http://localhost:5000
```

### 3. Frontend Setup
In a new terminal window:
```bash
cd frontend
npm install
npm run dev       # Starts Next.js app on http://localhost:3000
```

Open [http://localhost:3000](http://localhost:3000) in your web browser.

---

## 🧪 Automated End-to-End Verification

A comprehensive automated test suite is included in the project:
```bash
node test_e2e.js
```
This tests all 11 core functional flows:
1. API Health Check
2. Candidate Authentication
3. Seeker Dashboard Metrics
4. AI Skill-based Recommendations & Match Percentage calculation
5. Recruiter Authentication
6. Job Posting Creation
7. Public Job Search with Multi-Filter combinations
8. Job Application submission
9. Recruiter Status Workflow (Applied → Interview with feedback notes)
10. Realtime Candidate Notifications
11. Admin Statistics & Chart.js Aggregations

---

## 🌐 Vercel Deployment Instructions (Frontend)

1. Push your repository to GitHub.
2. Sign in to [Vercel](https://vercel.com/) and click **New Project**.
3. Import your GitHub repository.
4. Set the **Root Directory** to `frontend`.
5. Under **Environment Variables**, add:
   - `NEXT_PUBLIC_API_URL`: Your deployed backend API URL (e.g. `https://your-api.onrender.com/api`)
   - `NEXT_PUBLIC_BACKEND_URL`: Your deployed backend base URL (e.g. `https://your-api.onrender.com`)
6. Click **Deploy**.

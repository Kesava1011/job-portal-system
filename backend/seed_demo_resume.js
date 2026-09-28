const db = require('./src/config/db');

async function seedDemoResume() {
  await db.initDatabase();

  const seeker = (await db.query('SELECT js.*, u.email FROM job_seekers js JOIN users u ON js.user_id = u.id WHERE js.id = 1')).rows[0];
  const exp = (await db.query('SELECT * FROM experience WHERE job_seeker_id = 1')).rows.map((e) => ({
    title: e.title,
    company: e.company_name,
    location: e.location || '',
    dates: e.start_date + ' to ' + (e.is_current ? 'Present' : e.end_date),
    description: e.description || '',
  }));
  const edu = (await db.query('SELECT * FROM education WHERE job_seeker_id = 1')).rows.map((e) => ({
    degree: e.degree,
    institution: e.institution,
    field: e.field_of_study || '',
    years: e.start_year + ' - ' + (e.end_year || 'Present'),
    grade: e.grade || '',
  }));
  const proj = (await db.query('SELECT * FROM projects WHERE job_seeker_id = 1')).rows.map((p) => ({
    title: p.title,
    tech: p.tech_stack || '',
    description: p.description || '',
    url: p.live_url || p.repo_url || '',
  }));
  const skills = (await db.query('SELECT s.name FROM user_skills us JOIN skills s ON us.skill_id = s.id WHERE us.job_seeker_id = 1')).rows.map((s) => s.name);

  const payload = JSON.stringify({
    personalInfo: {
      fullName: (seeker.first_name + ' ' + seeker.last_name).trim(),
      email: seeker.email,
      phone: seeker.phone || '+1 (555) 345-6789',
      location: seeker.location || 'San Francisco, CA',
      headline: seeker.headline || 'Full-Stack Software Engineer',
    },
    careerObjective:
      seeker.bio ||
      'Results-driven Software Engineer with 3.5+ years of experience designing and delivering scalable full-stack web applications using Next.js, Node.js, and PostgreSQL.',
    education: edu,
    skills: skills.length > 0 ? skills : ['React', 'Next.js', 'Node.js', 'PostgreSQL', 'Tailwind CSS'],
    experience: exp,
    internships: [],
    projects: proj,
    certifications: [
      { name: 'AWS Certified Solutions Architect – Associate', issuer: 'Amazon Web Services', date: '2023-04' },
      { name: 'Meta Frontend Developer Professional Certificate', issuer: 'Meta (Coursera)', date: '2022-09' },
    ],
    achievements: [
      'Winner of National Collegiate Hackathon 2024 (Top 1% of 400 teams)',
      "Dean's List Academic Excellence Honor Graduate",
    ],
    languages: ['English (Fluent)', 'Spanish (Conversational)'],
    links: {
      linkedin: seeker.linkedin_url || 'https://linkedin.com/in/alexjohnson-dev',
      github: seeker.github_url || 'https://github.com/alexjohnson-dev',
      portfolio: seeker.portfolio_url || 'https://alexjohnson.dev',
    },
  });

  await db.query('UPDATE resumes SET resume_data = $1 WHERE id = $2', [payload, 3]);
  console.log('✅ Demo resume 3 populated with rich seed data successfully!');
  process.exit(0);
}

seedDemoResume().catch((err) => {
  console.error(err);
  process.exit(1);
});

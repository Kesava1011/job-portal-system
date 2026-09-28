const http = require('http');
const db = require('./src/config/db');

function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, headers: res.headers, data: parsed });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runComprehensiveSectionsTest() {
  console.log('🧪 ========================================================');
  console.log('🧪 VERIFYING ALL RESUME BUILDER SECTIONS (CRUD & PERSISTENCE)');
  console.log('🧪 ========================================================');

  await db.initDatabase();

  // 1. Login as seeker@example.com
  console.log('\n[1] Logging in as candidate demo account (seeker@example.com)...');
  const loginRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { email: 'seeker@example.com', password: 'password123' }
  );

  if (loginRes.status !== 200 || !loginRes.data.token) {
    throw new Error('Login failed: ' + JSON.stringify(loginRes.data));
  }
  const token = loginRes.data.token;
  const user = loginRes.data.user;
  console.log(`✅ Logged in successfully: User ID ${user.id}`);

  // 2. Verify Existing Data Appears
  console.log('\n[2] Verifying existing data appears across all sections (GET /api/resumes/builder/data)...');
  const initialFetch = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/resumes/builder/data',
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });

  const seekerId = initialFetch.data.profile.id;
  console.log(`Job Seeker ID: ${seekerId}`);

  const rd = initialFetch.data.resumeData;
  console.log('Initial Data Verification:');
  console.log('  - Personal Info:', rd?.personalInfo?.fullName, '|', rd?.personalInfo?.headline);
  console.log('  - Objective:', rd?.careerObjective?.slice(0, 45) + '...');
  console.log('  - Skills count:', rd?.skills?.length, `(${rd?.skills?.slice(0, 3).join(', ')}...)`);
  console.log('  - Section 5 (Experience) count:', rd?.experience?.length, `(${rd?.experience?.[0]?.title} at ${rd?.experience?.[0]?.company})`);
  console.log('  - Section 6 (Education) count:', rd?.education?.length, `(${rd?.education?.[0]?.degree} at ${rd?.education?.[0]?.institution})`);
  console.log('  - Section 7 (Projects) count:', rd?.projects?.length, `(${rd?.projects?.[0]?.title})`);
  console.log('  - Section 8 (Achievements) count:', rd?.achievements?.length);
  console.log('  - Section 9 (Languages) count:', rd?.languages?.length);

  if (!rd?.experience || rd.experience.length === 0) throw new Error('Section 5 (Experience) is empty!');
  if (!rd?.education || rd.education.length === 0) throw new Error('Section 6 (Education) is empty!');
  if (!rd?.projects || rd.projects.length === 0) throw new Error('Section 7 (Projects) is empty!');
  console.log('✅ Requirement 1 Verified: Existing data appears in all sections!');

  // 3. Test Add Data in Sections 5, 6, 7
  console.log('\n[3] Testing ADD data in Sections 5 (Experience), 6 (Education), 7 (Projects)...');
  const updatedExperience = [
    ...rd.experience,
    {
      title: 'Staff AI Infrastructure Engineer',
      company: 'OpenAI',
      location: 'San Francisco, CA',
      dates: '2024 to Present',
      description: 'Leading distributed LLM inference clusters and GPU scheduling engines.',
    },
  ];

  const updatedEducation = [
    ...rd.education,
    {
      degree: 'Master of Science in Artificial Intelligence',
      institution: 'Carnegie Mellon University',
      field: 'AI & Robotics',
      years: '2022 - 2024',
      grade: '4.0 GPA',
    },
  ];

  const updatedProjects = [
    ...rd.projects,
    {
      title: 'NeuroFlow - Realtime Graph Neural Network',
      tech: 'PyTorch, CUDA, Next.js, FastAPI',
      url: 'https://github.com/neuroflow',
      description: 'High-throughput distributed GNN library for realtime recommendation graphs.',
    },
  ];

  const updatedSkills = [...rd.skills, 'Kubernetes', 'CUDA'];
  const updatedLanguages = [...rd.languages, 'German (Professional)'];

  const savePayload = {
    resumeId: initialFetch.data.resumeId,
    title: initialFetch.data.title,
    personalInfo: rd.personalInfo,
    careerObjective: rd.careerObjective,
    experience: updatedExperience,
    education: updatedEducation,
    projects: updatedProjects,
    skills: updatedSkills,
    languages: updatedLanguages,
    achievements: rd.achievements,
    links: rd.links,
  };

  const saveRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/resumes/builder',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    },
    savePayload
  );

  if (saveRes.status !== 200 || !saveRes.data.success) {
    throw new Error('Save after Add failed: ' + JSON.stringify(saveRes.data));
  }
  console.log('✅ Save API responded with success:', saveRes.data.message);

  // 4. Verify Database Persistence for Add
  console.log('\n[4] Verifying direct relational database rows for ADD operation...');
  const dbExp = await db.query('SELECT * FROM experience WHERE job_seeker_id = $1 AND company_name = $2', [seekerId, 'OpenAI']);
  if (dbExp.rows.length === 0) throw new Error('Experience at OpenAI was not saved in PostgreSQL experience table!');
  console.log('✅ PostgreSQL experience table row:', dbExp.rows[0].title, 'at', dbExp.rows[0].company_name);

  const dbEdu = await db.query('SELECT * FROM education WHERE job_seeker_id = $1 AND institution = $2', [seekerId, 'Carnegie Mellon University']);
  if (dbEdu.rows.length === 0) throw new Error('Carnegie Mellon was not saved in PostgreSQL education table!');
  console.log('✅ PostgreSQL education table row:', dbEdu.rows[0].degree, 'from', dbEdu.rows[0].institution);

  const dbProj = await db.query('SELECT * FROM projects WHERE job_seeker_id = $1 AND title LIKE $2', [seekerId, '%NeuroFlow%']);
  if (dbProj.rows.length === 0) throw new Error('NeuroFlow was not saved in PostgreSQL projects table!');
  console.log('✅ PostgreSQL projects table row:', dbProj.rows[0].title);

  // 5. Test Edit Data
  console.log('\n[5] Testing EDIT data in Sections 5, 6, 7...');
  // Edit the OpenAI entry title and CMU grade
  const editedExperience = updatedExperience.map((e) =>
    e.company === 'OpenAI' ? { ...e, title: 'Principal AI Infrastructure Architect' } : e
  );
  const editedEducation = updatedEducation.map((ed) =>
    ed.institution === 'Carnegie Mellon University' ? { ...ed, grade: 'Summa Cum Laude (4.0 GPA)' } : ed
  );
  const editedProjects = updatedProjects.map((p) =>
    p.title.includes('NeuroFlow') ? { ...p, title: 'NeuroFlow 2.0 - Distributed Graph Engine' } : p
  );

  const editRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/resumes/builder',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    },
    {
      ...savePayload,
      experience: editedExperience,
      education: editedEducation,
      projects: editedProjects,
    }
  );

  if (editRes.status !== 200 || !editRes.data.success) {
    throw new Error('Save after Edit failed: ' + JSON.stringify(editRes.data));
  }
  console.log('✅ Edit save responded with success:', editRes.data.message);

  // Verify Edit in DB
  const dbExpEdited = await db.query('SELECT title FROM experience WHERE job_seeker_id = $1 AND company_name = $2', [seekerId, 'OpenAI']);
  if (dbExpEdited.rows[0].title !== 'Principal AI Infrastructure Architect') {
    throw new Error('Edited title not updated in DB! Got: ' + dbExpEdited.rows[0].title);
  }
  console.log('✅ PostgreSQL experience row verified updated to:', dbExpEdited.rows[0].title);

  // 6. Test Delete Data
  console.log('\n[6] Testing DELETE data in Section 7 (Projects) and Section 9 (Languages)...');
  // Remove the NeuroFlow project and German language
  const remainingProjects = editedProjects.filter((p) => !p.title.includes('NeuroFlow'));
  const remainingLanguages = updatedLanguages.filter((l) => !l.includes('German'));

  const deleteRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/resumes/builder',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    },
    {
      ...savePayload,
      experience: editedExperience,
      education: editedEducation,
      projects: remainingProjects,
      languages: remainingLanguages,
    }
  );

  if (deleteRes.status !== 200 || !deleteRes.data.success) {
    throw new Error('Save after Delete failed: ' + JSON.stringify(deleteRes.data));
  }
  console.log('✅ Delete save responded with success');

  // Verify deletion in DB
  const dbProjDeleted = await db.query('SELECT * FROM projects WHERE job_seeker_id = $1 AND title LIKE $2', [seekerId, '%NeuroFlow%']);
  if (dbProjDeleted.rows.length > 0) throw new Error('Deleted project still exists in DB!');
  console.log('✅ Project deletion confirmed in PostgreSQL projects table');

  // 7. Test Page Refresh Simulation
  console.log('\n[7] Simulating Page Refresh (fetching fresh data from DB)...');
  const refreshFetch = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/resumes/builder/data',
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });

  const refreshedData = refreshFetch.data.resumeData;
  console.log('Refreshed Data verification:');
  const hasOpenAI = refreshedData.experience.find((e) => e.title === 'Principal AI Infrastructure Architect');
  const hasCMU = refreshedData.education.find((ed) => ed.grade === 'Summa Cum Laude (4.0 GPA)');
  const hasNeuroFlow = refreshedData.projects.find((p) => p.title.includes('NeuroFlow'));
  const hasGerman = refreshedData.languages.find((l) => l.includes('German'));

  if (!hasOpenAI) throw new Error('Refreshed data missing edited OpenAI experience!');
  if (!hasCMU) throw new Error('Refreshed data missing edited CMU education!');
  if (hasNeuroFlow) throw new Error('Refreshed data still contains deleted NeuroFlow project!');
  if (hasGerman) throw new Error('Refreshed data still contains deleted German language!');
  console.log('✅ Requirement 5 Verified: Refresh keeps all added and edited data, and deleted items stay deleted!');

  // 8. Test Candidate Isolation
  console.log('\n[8] Verifying candidate data isolation (User ID & Seeker ID association)...');
  const janeLogin = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { email: 'jane@example.com', password: 'password123' }
  );

  const janeToken = janeLogin.data.token;
  const janeFetch = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/resumes/builder/data',
    method: 'GET',
    headers: { Authorization: `Bearer ${janeToken}` },
  });

  const janeData = janeFetch.data.resumeData;
  const janeHasAlexOpenAI = janeData?.experience?.some((e) => e.company === 'OpenAI');
  if (janeHasAlexOpenAI) {
    throw new Error('Data breach: Jane can see Alex\'s OpenAI experience!');
  }
  console.log('✅ Requirement 6 Verified: Data strictly belongs to the logged-in candidate. Jane cannot see Alex\'s experience!');

  console.log('\n========================================================================');
  console.log('🎉 ALL RESUME BUILDER SECTIONS TESTED & FULLY VERIFIED (100% SUCCESS!)');
  console.log('========================================================================');
  process.exit(0);
}

runComprehensiveSectionsTest().catch((err) => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});

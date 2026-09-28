const db = require('../config/db');

/**
 * Calculates skill-based recommendation and match percentage between a candidate and a job
 * Weighting:
 * - Skills Match: 60%
 * - Experience Match: 25%
 * - Education & Profile: 15%
 */
function calculateMatchScore(candidate, job, candidateSkills = [], jobSkills = [], candidateEducation = []) {
  // 1. Skill Matching
  const candidateSkillNames = new Set(candidateSkills.map(s => s.name.toLowerCase()));
  const matchedSkills = [];
  const missingSkills = [];

  jobSkills.forEach(js => {
    const skillNameLower = js.name.toLowerCase();
    if (candidateSkillNames.has(skillNameLower)) {
      matchedSkills.push(js.name);
    } else {
      missingSkills.push(js.name);
    }
  });

  const totalJobSkills = jobSkills.length;
  let skillScore = 0;
  if (totalJobSkills > 0) {
    const ratio = matchedSkills.length / totalJobSkills;
    skillScore = ratio * 60;
  } else {
    skillScore = 50; // Default when no specific skills mapped
  }

  // 2. Experience Matching
  const candidateExp = parseFloat(candidate.experience_years || 0);
  const requiredExp = parseFloat(job.experience_required || 0);
  let expScore = 0;

  if (requiredExp === 0 || candidateExp >= requiredExp) {
    expScore = 25;
  } else {
    expScore = Math.max(5, (candidateExp / requiredExp) * 25);
  }

  // 3. Education Matching
  let eduScore = 10; // baseline
  const hasDegrees = candidateEducation && candidateEducation.length > 0;
  if (hasDegrees) {
    eduScore = 15;
  } else if (candidate.headline || candidate.bio) {
    eduScore = 12;
  }

  // Total Percentage (capped at 98% unless 100% exact match)
  let totalScore = Math.round(skillScore + expScore + eduScore);
  if (totalScore > 100) totalScore = 100;
  if (totalScore < 15) totalScore = 15;

  return {
    matchPercentage: totalScore,
    matchLabel: `${totalScore}% Match`,
    matchedSkills,
    missingSkills,
    experienceMatch: candidateExp >= requiredExp,
    candidateExp,
    requiredExp,
    totalJobSkills,
  };
}

/**
 * Get recommended jobs for a specific job seeker with match analysis
 */
async function getRecommendationsForSeeker(jobSeekerId, limit = 10) {
  // 1. Get candidate details
  const seekerRes = await db.query('SELECT * FROM job_seekers WHERE id = $1', [jobSeekerId]);
  if (seekerRes.rows.length === 0) return [];
  const candidate = seekerRes.rows[0];

  // 2. Get candidate skills
  const skillsRes = await db.query(`
    SELECT s.id, s.name, s.category, us.proficiency_level, us.years_of_experience
    FROM user_skills us
    JOIN skills s ON us.skill_id = s.id
    WHERE us.job_seeker_id = $1
  `, [jobSeekerId]);
  const candidateSkills = skillsRes.rows;

  // 3. Get candidate education
  const eduRes = await db.query('SELECT * FROM education WHERE job_seeker_id = $1', [jobSeekerId]);
  const candidateEducation = eduRes.rows;

  // 4. Fetch all active jobs with company details
  const jobsRes = await db.query(`
    SELECT j.*, 
           c.name AS company_name, 
           c.logo_url AS company_logo, 
           c.location AS company_location
    FROM jobs j
    LEFT JOIN companies c ON j.company_id = c.id
    WHERE j.status = 'active'
    ORDER BY j.created_at DESC
  `);
  const activeJobs = jobsRes.rows;

  // 5. Fetch all job skills in one query
  const jobSkillsRes = await db.query(`
    SELECT js.job_id, s.id, s.name, s.category, js.is_required
    FROM job_skills js
    JOIN skills s ON js.skill_id = s.id
  `);
  
  const jobSkillsMap = {};
  jobSkillsRes.rows.forEach(row => {
    if (!jobSkillsMap[row.job_id]) jobSkillsMap[row.job_id] = [];
    jobSkillsMap[row.job_id].push(row);
  });

  // 6. Calculate match score for each active job
  const recommendations = activeJobs.map(job => {
    const jobSkills = jobSkillsMap[job.id] || [];
    const matchAnalysis = calculateMatchScore(candidate, job, candidateSkills, jobSkills, candidateEducation);
    return {
      ...job,
      skills: jobSkills,
      match: matchAnalysis,
    };
  });

  // Sort by match percentage descending
  recommendations.sort((a, b) => b.match.matchPercentage - a.match.matchPercentage);

  return recommendations.slice(0, limit);
}

module.exports = {
  calculateMatchScore,
  getRecommendationsForSeeker,
};

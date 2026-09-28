const { getRecommendationsForSeeker } = require('../services/recommendationService');

// Get personalized job recommendations for logged-in job seeker
async function getRecommendations(req, res) {
  try {
    const seekerId = req.user.job_seeker_id;
    if (!seekerId) {
      return res.status(403).json({ success: false, message: 'Only job seekers can receive recommendations.' });
    }

    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    const recommendations = await getRecommendationsForSeeker(seekerId, limit);

    return res.json({
      success: true,
      recommendations,
      count: recommendations.length,
    });
  } catch (error) {
    console.error('getRecommendations error:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate job recommendations.' });
  }
}

module.exports = {
  getRecommendations,
};

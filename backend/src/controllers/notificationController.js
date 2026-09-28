const db = require('../config/db');

// Get all notifications for current user
async function getNotifications(req, res) {
  try {
    const userId = req.user.id;
    const notifsRes = await db.query(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 30',
      [userId]
    );

    const unreadCountRes = await db.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = 0',
      [userId]
    );

    return res.json({
      success: true,
      notifications: notifsRes.rows,
      unreadCount: parseInt(unreadCountRes.rows[0]?.count || 0),
    });
  } catch (error) {
    console.error('getNotifications error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve notifications.' });
  }
}

// Mark single notification as read
async function markAsRead(req, res) {
  try {
    const { id } = req.params;
    const notifCheck = await db.query('SELECT id, user_id FROM notifications WHERE id = $1', [id]);
    if (notifCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Notification not found.' });
    }
    if (notifCheck.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Forbidden: You can only update your own notifications.' });
    }

    await db.query('UPDATE notifications SET is_read = 1 WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    return res.json({ success: true, message: 'Notification marked as read.' });
  } catch (error) {
    console.error('markAsRead error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update notification.' });
  }
}

// Mark all as read
async function markAllAsRead(req, res) {
  try {
    await db.query('UPDATE notifications SET is_read = 1 WHERE user_id = $1', [req.user.id]);
    return res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (error) {
    console.error('markAllAsRead error:', error);
    return res.status(500).json({ success: false, message: 'Failed to mark all notifications as read.' });
  }
}

const { getRecentEmailLogs } = require('../services/emailService');

// Get recent email logs for testing and audit
async function getEmailLogs(req, res) {
  try {
    const logs = getRecentEmailLogs();
    return res.json({
      success: true,
      logs,
    });
  } catch (error) {
    console.error('getEmailLogs error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve email logs.' });
  }
}

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  getEmailLogs,
};

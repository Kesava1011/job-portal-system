/**
 * emailService.js
 * Configurable SMTP and Email notification service for Job Portal.
 * Supports environment variables, robust HTML templates, plaintext fallbacks,
 * and resilient non-blocking error handling.
 */

const nodemailer = require('nodemailer');
const config = require('../config/config');

// In-memory log of sent emails for auditing and automated testing verification
const sentEmailLogs = [];
const MAX_LOGS = 100;

function logSentEmail(emailRecord) {
  sentEmailLogs.unshift({
    ...emailRecord,
    timestamp: new Date().toISOString(),
  });
  if (sentEmailLogs.length > MAX_LOGS) {
    sentEmailLogs.pop();
  }
}

function getRecentEmailLogs() {
  return [...sentEmailLogs];
}

function clearEmailLogs() {
  sentEmailLogs.length = 0;
}

// Create nodemailer transporter based on environment config
function getTransporter() {
  const host = process.env.SMTP_HOST || config.smtpHost;
  const port = parseInt(process.env.SMTP_PORT || config.smtpPort || '587', 10);
  const user = process.env.SMTP_USER || config.smtpUser;
  const pass = process.env.SMTP_PASS || config.smtpPass;
  const secure = (process.env.SMTP_SECURE || config.smtpSecure) === 'true' || port === 465;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      tls: {
        rejectUnauthorized: false, // Prevents self-signed cert failures in staging/testing
      },
    });
  }

  // Fallback test / mock stream transport when credentials are not configured
  return null;
}

/**
 * Send an email with HTML & text content
 */
async function sendEmail({ to, subject, html, text }) {
  const from = process.env.EMAIL_FROM || config.emailFrom || 'Job Portal System <no-reply@jobportal.com>';

  const emailRecord = {
    to,
    from,
    subject,
    text,
    html,
  };

  try {
    const transporter = getTransporter();

    if (transporter) {
      const info = await transporter.sendMail({
        from,
        to,
        subject,
        text,
        html,
      });

      console.log(`[EmailService] Email successfully sent to ${to}: ${subject} (MessageId: ${info.messageId})`);
      logSentEmail({ ...emailRecord, messageId: info.messageId, delivered: true });
      return { success: true, messageId: info.messageId };
    } else {
      // SMTP not fully configured - log for development/test mode
      const mockId = `simulated-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      console.log(`[EmailService - Development/Simulated] To: ${to} | Subject: "${subject}"`);
      logSentEmail({ ...emailRecord, messageId: mockId, delivered: true, simulated: true });
      return { success: true, messageId: mockId, simulated: true };
    }
  } catch (error) {
    console.error(`[EmailService Error] Failed to dispatch email to ${to}:`, error.message);
    logSentEmail({ ...emailRecord, delivered: false, error: error.message });
    // Important requirement: Email failure must NEVER cause application or status update to fail
    return { success: false, error: error.message };
  }
}

/**
 * 1. Email notification: Application Successfully Submitted
 */
async function sendApplicationSubmittedEmail({ to, candidateName, jobTitle, companyName, applicationId }) {
  if (!to) {
    console.warn('[EmailService] Skipping submitted email: No recipient email provided.');
    return { success: false, error: 'No recipient email provided' };
  }

  const name = candidateName || 'Candidate';
  const company = companyName || 'the hiring company';
  const title = jobTitle || 'Position';
  const subject = `Application Submitted: ${title} at ${company}`;

  const nextStepInfo = `Your application has been successfully submitted to ${company}. The recruitment team will review your qualifications and contact you regarding the next steps.`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; }
        .header { background: linear-gradient(135deg, #2563eb, #1d4ed8); padding: 32px 24px; text-align: center; color: #ffffff; }
        .header h1 { margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
        .badge { display: inline-block; padding: 6px 14px; background: #dbeafe; color: #1e40af; border-radius: 9999px; font-size: 13px; font-weight: 700; margin-top: 10px; }
        .content { padding: 32px 24px; }
        .greeting { font-size: 16px; font-weight: 600; margin-bottom: 16px; color: #0f172a; }
        .card { background: #f1f5f9; border-radius: 12px; padding: 20px; margin: 20px 0; border: 1px solid #e2e8f0; }
        .card-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
        .card-row:last-child { border-bottom: none; }
        .label { color: #64748b; font-weight: 600; }
        .value { color: #0f172a; font-weight: 700; }
        .next-steps { background: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 8px; margin: 20px 0; font-size: 14px; color: #1e3a8a; }
        .footer { padding: 20px 24px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; background: #f8fafc; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Application Submitted Successfully</h1>
          <div class="badge">Status: Applied</div>
        </div>
        <div class="content">
          <div class="greeting">Hello ${name},</div>
          <p>Thank you for submitting your job application through the Job Portal. We have notified the hiring team at <strong>${company}</strong>.</p>
          
          <div class="card">
            <div class="card-row">
              <span class="label">Job Title:</span>
              <span class="value">${title}</span>
            </div>
            <div class="card-row">
              <span class="label">Company Name:</span>
              <span class="value">${company}</span>
            </div>
            <div class="card-row">
              <span class="label">Current Status:</span>
              <span class="value">Applied</span>
            </div>
            ${applicationId ? `
            <div class="card-row">
              <span class="label">Application Reference:</span>
              <span class="value">#${applicationId}</span>
            </div>` : ''}
          </div>

          <div class="next-steps">
            <strong>Next Steps:</strong> ${nextStepInfo}
          </div>

          <p style="font-size: 14px; color: #64748b; margin-top: 24px;">You can view the progress of your application anytime by visiting your Candidate Portal.</p>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} Job Portal System. This is an automated notification.
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `Hello ${name},\n\nYour application for "${title}" at ${company} has been successfully submitted.\n\nJob Title: ${title}\nCompany Name: ${company}\nCurrent Application Status: Applied\n\nNext Steps: ${nextStepInfo}\n\nTrack your application progress in your Candidate Portal.\n\nJob Portal System`;

  return sendEmail({ to, subject, html, text });
}

/**
 * 2. Email notification: Application Status Updates (Shortlisted, Interview, Rejected, Selected/Hired, Under Review)
 */
async function sendApplicationStatusUpdateEmail({ to, candidateName, jobTitle, companyName, status, notes, applicationId }) {
  if (!to) {
    console.warn('[EmailService] Skipping status update email: No recipient email provided.');
    return { success: false, error: 'No recipient email provided' };
  }

  const name = candidateName || 'Candidate';
  const company = companyName || 'the hiring company';
  const title = jobTitle || 'Position';
  const cleanStatus = status || 'Updated';

  // Customized status-specific styling and next-steps guidance
  const statusDetails = {
    'Under Review': {
      headerBg: 'linear-gradient(135deg, #0284c7, #0369a1)',
      badgeBg: '#e0f2fe',
      badgeColor: '#0369a1',
      summary: `Your application for "${title}" is now Under Review.`,
      nextStep: `The talent acquisition team at ${company} is currently evaluating your technical qualifications against the job requirements. No action is required from you at this moment.`,
    },
    'Shortlisted': {
      headerBg: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
      badgeBg: '#ede9fe',
      badgeColor: '#5b21b6',
      summary: `Great news! You have been Shortlisted for "${title}".`,
      nextStep: `Congratulations! Your profile stood out to the hiring team. The recruiter will be reaching out soon with scheduling options for your technical assessment or preliminary interview.`,
    },
    'Interview': {
      headerBg: 'linear-gradient(135deg, #0d9488, #0f766e)',
      badgeBg: '#ccfbf1',
      badgeColor: '#115e59',
      summary: `Interview Invitation for "${title}"!`,
      nextStep: `You have been selected for an interview with ${company}. Please check your in-app notifications and email for the meeting agenda, video conference link, and interview preparation details.`,
    },
    'Selected': {
      headerBg: 'linear-gradient(135deg, #059669, #047857)',
      badgeBg: '#d1fae5',
      badgeColor: '#065f46',
      summary: `Congratulations! You have been Selected for "${title}"!`,
      nextStep: `We are thrilled to let you know that ${company} has selected you for this position! The HR team will contact you shortly with your official offer letter and onboarding schedule.`,
    },
    'Hired': {
      headerBg: 'linear-gradient(135deg, #059669, #047857)',
      badgeBg: '#d1fae5',
      badgeColor: '#065f46',
      summary: `Congratulations! You are Hired for "${title}"!`,
      nextStep: `Welcome aboard! You have officially been hired for ${title} at ${company}. Look out for your welcome package and onboarding details.`,
    },
    'Rejected': {
      headerBg: 'linear-gradient(135deg, #475569, #334155)',
      badgeBg: '#f1f5f9',
      badgeColor: '#475569',
      summary: `Update regarding your application for "${title}".`,
      nextStep: `Thank you for taking the time to consider ${company}. Although the team has decided to proceed with other candidates whose skillsets align more closely with this particular opening, we encourage you to apply for future opportunities that match your expertise.`,
    },
  };

  const details = statusDetails[cleanStatus] || {
    headerBg: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
    badgeBg: '#dbeafe',
    badgeColor: '#1e40af',
    summary: `Your application status for "${title}" has been updated to ${cleanStatus}.`,
    nextStep: `Your application status is now "${cleanStatus}". Visit your portal dashboard for further updates.`,
  };

  const subject = `Application Update: ${title} at ${company} - Status: ${cleanStatus}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; }
        .header { background: ${details.headerBg}; padding: 32px 24px; text-align: center; color: #ffffff; }
        .header h1 { margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
        .badge { display: inline-block; padding: 6px 16px; background: ${details.badgeBg}; color: ${details.badgeColor}; border-radius: 9999px; font-size: 14px; font-weight: 800; margin-top: 10px; }
        .content { padding: 32px 24px; }
        .greeting { font-size: 16px; font-weight: 600; margin-bottom: 16px; color: #0f172a; }
        .card { background: #f8fafc; border-radius: 12px; padding: 20px; margin: 20px 0; border: 1px solid #e2e8f0; }
        .card-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
        .card-row:last-child { border-bottom: none; }
        .label { color: #64748b; font-weight: 600; }
        .value { color: #0f172a; font-weight: 700; }
        .next-steps { background: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px; border-radius: 8px; margin: 20px 0; font-size: 14px; color: #14532d; }
        .notes-box { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 8px; margin: 20px 0; font-size: 14px; color: #78350f; }
        .footer { padding: 20px 24px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; background: #f8fafc; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Application Status Update</h1>
          <div class="badge">Status: ${cleanStatus}</div>
        </div>
        <div class="content">
          <div class="greeting">Hello ${name},</div>
          <p>${details.summary}</p>
          
          <div class="card">
            <div class="card-row">
              <span class="label">Job Title:</span>
              <span class="value">${title}</span>
            </div>
            <div class="card-row">
              <span class="label">Company Name:</span>
              <span class="value">${company}</span>
            </div>
            <div class="card-row">
              <span class="label">Current Application Status:</span>
              <span class="value" style="color: ${details.badgeColor};">${cleanStatus}</span>
            </div>
            ${applicationId ? `
            <div class="card-row">
              <span class="label">Application Reference:</span>
              <span class="value">#${applicationId}</span>
            </div>` : ''}
          </div>

          ${notes ? `
          <div class="notes-box">
            <strong>Recruiter Feedback:</strong> ${notes}
          </div>` : ''}

          <div class="next-steps">
            <strong>Next Steps:</strong> ${details.nextStep}
          </div>

          <p style="font-size: 14px; color: #64748b; margin-top: 24px;">To see full details or submit additional materials, please log into your Candidate Dashboard.</p>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} Job Portal System. This is an automated notification.
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `Hello ${name},\n\n${details.summary}\n\nJob Title: ${title}\nCompany Name: ${company}\nCurrent Application Status: ${cleanStatus}\n\n${notes ? `Recruiter Notes: ${notes}\n\n` : ''}Next Steps: ${details.nextStep}\n\nCheck your candidate portal for updates.\n\nJob Portal System`;

  return sendEmail({ to, subject, html, text });
}

module.exports = {
  sendEmail,
  sendApplicationSubmittedEmail,
  sendApplicationStatusUpdateEmail,
  getRecentEmailLogs,
  clearEmailLogs,
};

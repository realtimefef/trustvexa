/**
 * Branded HTML email templates for TrustVexa.
 * Implements a shared base layout with premium dark mode styling and dynamic variable injection.
 */
function getBaseLayout(options) {
    const unsubscribe = options.unsubscribeUrl || 'https://trustvexa.com/settings';
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${options.title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #0b0f19;
      color: #f3f4f6;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #0b0f19;
      padding: 40px 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #111827;
      border: 1px solid #1f2937;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
    .header {
      padding: 30px;
      text-align: center;
      background: linear-gradient(135deg, #1e1b4b 0%, #311042 100%);
      border-bottom: 1px solid #1f2937;
    }
    .logo {
      font-size: 24px;
      font-weight: bold;
      color: #6366f1;
      letter-spacing: 1px;
      text-decoration: none;
    }
    .logo span {
      color: #a855f7;
    }
    .content {
      padding: 40px 30px;
      line-height: 1.6;
      font-size: 16px;
    }
    h1 {
      margin-top: 0;
      font-size: 22px;
      font-weight: 600;
      color: #ffffff;
    }
    p {
      color: #9ca3af;
      margin-bottom: 24px;
    }
    .btn {
      display: inline-block;
      padding: 12px 24px;
      background-color: #6366f1;
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      text-align: center;
      margin: 10px 0 25px;
    }
    .btn:hover {
      background-color: #4f46e5;
    }
    .footer {
      padding: 20px 30px;
      text-align: center;
      background-color: #0b0f19;
      border-top: 1px solid #1f2937;
      font-size: 12px;
      color: #4b5563;
    }
    .footer a {
      color: #6366f1;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <a href="https://trustvexa.com" class="logo">Trust<span>Vexa</span></a>
      </div>
      <div class="content">
        ${options.content}
      </div>
      <div class="footer">
        <p style="margin: 0 0 10px; color: #4b5563;">You are receiving this email because you registered at TrustVexa. If you didn't do this, please ignore this email.</p>
        <p style="margin: 0; color: #4b5563;"><a href="${unsubscribe}">Unsubscribe</a> | <a href="https://trustvexa.com/support">Support</a></p>
      </div>
    </div>
  </div>
</body>
</html>`;
}
export function getWelcomeEmail(data) {
    const content = `
    <h1>Welcome to TrustVexa, ${data.username}!</h1>
    <p>Thank you for creating an account with TrustVexa. We're thrilled to have you here. TrustVexa is a premium, secure escrow platform designed to facilitate trustless trades and transactions with peace of mind.</p>
    <p>Get started by logging into your dashboard and setting up your account preferences.</p>
    <div style="text-align: center;">
      <a href="${data.loginUrl}" class="btn">Go to Dashboard</a>
    </div>
    <p>If you have any questions, our support team is available to assist you 24/7.</p>
  `;
    return getBaseLayout({
        title: 'Welcome to TrustVexa',
        content,
        unsubscribeUrl: data.unsubscribeUrl,
    });
}
export function getVerifyEmail(data) {
    const content = `
    <h1>Verify Your Email Address</h1>
    <p>Hi ${data.username},</p>
    <p>Please click the button below to verify your email address and activate your account. This link will expire in 24 hours.</p>
    <div style="text-align: center;">
      <a href="${data.verifyUrl}" class="btn">Verify Email Address</a>
    </div>
    <p>If you did not request this verification, you can safely ignore this email.</p>
  `;
    return getBaseLayout({
        title: 'Verify Email Address',
        content,
        unsubscribeUrl: data.unsubscribeUrl,
    });
}
export function getPasswordResetEmail(data) {
    const content = `
    <h1>Password Reset Request</h1>
    <p>Hi ${data.username},</p>
    <p>We received a request to reset the password for your TrustVexa account. Click the button below to choose a new password. This link will expire in 1 hour.</p>
    <div style="text-align: center;">
      <a href="${data.resetUrl}" class="btn">Reset Password</a>
    </div>
    <p>If you did not request a password reset, please secure your account immediately and ignore this email.</p>
  `;
    return getBaseLayout({
        title: 'Reset Your Password',
        content,
        unsubscribeUrl: data.unsubscribeUrl,
    });
}
export function getNewDeviceLoginEmail(data) {
    const content = `
    <h1>New Device Login Detected</h1>
    <p>Hi ${data.username},</p>
    <p>A new login was detected on your TrustVexa account:</p>
    <div style="background-color: #1f2937; border-radius: 8px; padding: 20px; margin-bottom: 24px; font-family: monospace; font-size: 14px;">
      <div style="margin-bottom: 8px;"><strong>Device:</strong> ${data.device}</div>
      <div style="margin-bottom: 8px;"><strong>IP Address:</strong> ${data.ip}</div>
      <div><strong>Time:</strong> ${data.time}</div>
    </div>
    <p>If this was you, no action is needed. If you do not recognize this activity, please reset your password and end all sessions from your settings page immediately.</p>
  `;
    return getBaseLayout({
        title: 'Security Alert: New Login',
        content,
        unsubscribeUrl: data.unsubscribeUrl,
    });
}
export function getDealFundedEmail(data) {
    const content = `
    <h1>Deal Funded</h1>
    <p>Hi ${data.username},</p>
    <p>Great news! The buyer has successfully funded your deal: <strong>${data.dealTitle}</strong>.</p>
    <div style="background-color: #1f2937; border-radius: 8px; padding: 20px; margin-bottom: 24px; font-size: 18px; font-weight: bold; text-align: center; color: #10b981;">
      Escrow Amount: ${data.amount} ${data.coin}
    </div>
    <p>You can now safely proceed with fulfilling your end of the transaction. Click the button below to view the deal details.</p>
    <div style="text-align: center;">
      <a href="${data.dealUrl}" class="btn">View Deal Room</a>
    </div>
  `;
    return getBaseLayout({ title: 'Deal Funded', content, unsubscribeUrl: data.unsubscribeUrl });
}
export function getPayoutSentEmail(data) {
    const content = `
    <h1>Payout Transferred</h1>
    <p>Hi ${data.username},</p>
    <p>Your payout has been successfully transferred for the deal: <strong>${data.dealTitle}</strong>.</p>
    <div style="background-color: #1f2937; border-radius: 8px; padding: 20px; margin-bottom: 24px; font-size: 18px; font-weight: bold; text-align: center; color: #10b981;">
      Transferred: ${data.amount} ${data.coin}
    </div>
    <div style="background-color: #1f2937; border-radius: 8px; padding: 15px 20px; margin-bottom: 24px; font-family: monospace; font-size: 13px; word-break: break-all;">
      <strong>Tx Hash:</strong> ${data.txHash}
    </div>
    <p>Click below to review the transaction details in the dashboard.</p>
    <div style="text-align: center;">
      <a href="${data.payoutUrl}" class="btn">View Transaction</a>
    </div>
  `;
    return getBaseLayout({
        title: 'Payout Transferred',
        content,
        unsubscribeUrl: data.unsubscribeUrl,
    });
}
export function getSlaWarningEmail(data) {
    const content = `
    <h1>SLA Deadline Warning</h1>
    <p>Hi ${data.username},</p>
    <p>This is a warning that the deadline for the deal <strong>${data.dealTitle}</strong> is approaching.</p>
    <div style="background-color: #7f1d1d; border: 1px solid #b91c1c; border-radius: 8px; padding: 20px; margin-bottom: 24px; font-size: 18px; font-weight: bold; text-align: center; color: #fecaca;">
      Time Remaining: ${data.hoursLeft} hours
    </div>
    <p>Please complete your tasks or inspections to prevent automatic escalation or penalties. Click below to go to the deal room.</p>
    <div style="text-align: center;">
      <a href="${data.dealUrl}" class="btn">Go to Deal Room</a>
    </div>
  `;
    return getBaseLayout({
        title: 'Urgent: SLA Warning',
        content,
        unsubscribeUrl: data.unsubscribeUrl,
    });
}
export function getDisputeOpenedEmail(data) {
    const content = `
    <h1>Dispute Opened</h1>
    <p>Hi ${data.username},</p>
    <p>A formal dispute has been opened for the deal: <strong>${data.dealTitle}</strong>.</p>
    <div style="background-color: #7c2d12; border: 1px solid #c2410c; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
      <strong style="color: #ffedd5;">Reason:</strong>
      <p style="color: #fdba74; margin: 10px 0 0;">${data.reason}</p>
    </div>
    <p>A TrustVexa moderator will review the chat logs and evidence. Please visit the dispute thread to provide any additional context or resolve the dispute.</p>
    <div style="text-align: center;">
      <a href="${data.disputeUrl}" class="btn">Go to Dispute Thread</a>
    </div>
  `;
    return getBaseLayout({ title: 'Dispute Opened', content, unsubscribeUrl: data.unsubscribeUrl });
}
export function getDigestEmail(data) {
    const period = data.frequency === 'daily' ? 'Daily' : 'Weekly';
    const notifRows = data.notifications
        .map((n) => `
    <tr>
      <td style="padding: 12px 16px; border-bottom: 1px solid #1f2937; color: #a78bfa; font-weight: 600; text-transform: capitalize;">${n.type.replace(/[_:]/g, ' ')}</td>
      <td style="padding: 12px 16px; border-bottom: 1px solid #1f2937; color: #e5e7eb;">${n.summary}${n.dealTitle ? ` — <em style="color:#9ca3af;">${n.dealTitle}</em>` : ''}</td>
      <td style="padding: 12px 16px; border-bottom: 1px solid #1f2937; color: #6b7280; font-size: 13px; white-space: nowrap;">${n.createdAt}</td>
    </tr>`)
        .join('');
    const content = `
    <h1>${period} Notification Digest</h1>
    <p>Hi ${data.username},</p>
    <p>Here's a summary of your unread notifications from the past ${data.frequency === 'daily' ? '24 hours' : 'week'}:</p>
    <div style="overflow-x: auto; margin-bottom: 24px;">
      <table style="width: 100%; border-collapse: collapse; background-color: #1a1f2e; border-radius: 8px; overflow: hidden;">
        <thead>
          <tr style="background-color: #1e1b4b;">
            <th style="padding: 12px 16px; text-align: left; font-size: 13px; color: #a5b4fc; text-transform: uppercase; letter-spacing: 0.05em;">Type</th>
            <th style="padding: 12px 16px; text-align: left; font-size: 13px; color: #a5b4fc; text-transform: uppercase; letter-spacing: 0.05em;">Summary</th>
            <th style="padding: 12px 16px; text-align: left; font-size: 13px; color: #a5b4fc; text-transform: uppercase; letter-spacing: 0.05em;">Time</th>
          </tr>
        </thead>
        <tbody>
          ${notifRows}
        </tbody>
      </table>
    </div>
    <p style="color: #6b7280; font-size: 14px;">Total notifications: <strong style="color: #e5e7eb;">${data.notifications.length}</strong></p>
    <div style="text-align: center;">
      <a href="${data.dashboardUrl}" class="btn">View Dashboard</a>
    </div>
    <p style="color: #6b7280; font-size: 13px; margin-top: 24px;">You receive this digest ${data.frequency}. To switch to immediate notifications, update your <a href="https://trustvexa.com/settings" style="color: #6366f1;">email preferences</a>.</p>
  `;
    return getBaseLayout({
        title: `${period} Digest — TrustVexa`,
        content,
        unsubscribeUrl: data.unsubscribeUrl,
    });
}
//# sourceMappingURL=index.js.map
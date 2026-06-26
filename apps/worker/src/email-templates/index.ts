/**
 * Branded HTML email templates for TrustVexa.
 * Professional, responsive email templates compatible with all major email clients.
 * Follows industry email standards: table-based layout, inline styles, 600px max-width.
 */

interface BaseTemplateOptions {
  unsubscribeUrl?: string | undefined;
  content: string;
  title: string;
  /** Optional short preview text shown in the inbox before opening */
  previewText?: string;
}

function getBaseLayout(options: BaseTemplateOptions): string {
  const unsubscribe = options.unsubscribeUrl || 'https://trustvexa.com/settings';
  const preview = options.previewText ?? options.title;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${options.title}</title>
  <!--[if mso]><style type="text/css">body,table,td,p,a{font-family:Arial,sans-serif!important}</style><![endif]-->
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    body,#body-table{margin:0!important;padding:0!important;background-color:#0a0d14}
    img{border:0;height:auto;line-height:100%;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic}
    table{border-collapse:collapse!important}
    @media only screen and (max-width:600px){
      .wrapper-td{padding:16px!important}
      .card{border-radius:12px!important;margin:0 12px!important}
      .cta-btn{display:block!important;width:100%!important;text-align:center!important;box-sizing:border-box}
      .meta-grid td{display:block!important;width:100%!important;padding:4px 0!important}
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#0a0d14;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <!-- Preview text (hidden, shows in inbox) -->
  <div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${preview} &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>

  <table id="body-table" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0a0d14;">
    <tr>
      <td class="wrapper-td" align="center" style="padding:40px 20px;">
        <!-- Card -->
        <table class="card" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#111827;border-radius:16px;border:1px solid #1f2937;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="padding:0;background:linear-gradient(135deg,#1e1b4b 0%,#2d1b69 50%,#1a1035 100%);">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding:32px 40px;">
                    <!-- Logo mark + wordmark -->
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="center">
                          <a href="https://trustvexa.com" style="text-decoration:none;display:inline-block;">
                            <table cellpadding="0" cellspacing="0" border="0">
                              <tr>
                                <td style="padding-right:10px;vertical-align:middle;">
                                  <!-- Shield icon -->
                                  <div style="width:36px;height:36px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:8px;display:inline-block;text-align:center;line-height:36px;">
                                    <span style="font-size:18px;color:#ffffff;">&#9960;</span>
                                  </div>
                                </td>
                                <td style="vertical-align:middle;">
                                  <span style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">Trust<span style="color:#a78bfa;">Vexa</span></span>
                                </td>
                              </tr>
                            </table>
                          </a>
                        </td>
                      </tr>
                      <tr>
                        <td align="center" style="padding-top:6px;">
                          <span style="font-size:11px;color:#a78bfa;letter-spacing:2px;text-transform:uppercase;font-weight:500;">Secure Escrow Platform</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body content -->
          <tr>
            <td style="padding:40px 40px 32px;font-size:16px;line-height:1.7;color:#d1d5db;">
              ${options.content}
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 40px;">
              <div style="height:1px;background:linear-gradient(to right,transparent,#374151,transparent);"></div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding:24px 40px;background-color:#0d1117;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding-bottom:12px;">
                    <a href="https://trustvexa.com" style="font-size:13px;font-weight:600;color:#6366f1;text-decoration:none;">TrustVexa</a>
                    <span style="color:#374151;padding:0 8px;">·</span>
                    <a href="https://trustvexa.com/support" style="font-size:13px;color:#4b5563;text-decoration:none;">Support</a>
                    <span style="color:#374151;padding:0 8px;">·</span>
                    <a href="https://trustvexa.com/privacy" style="font-size:13px;color:#4b5563;text-decoration:none;">Privacy</a>
                    <span style="color:#374151;padding:0 8px;">·</span>
                    <a href="${unsubscribe}" style="font-size:13px;color:#4b5563;text-decoration:none;">Unsubscribe</a>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <p style="margin:0;font-size:12px;color:#374151;line-height:1.5;">
                      You received this email because you have an account on TrustVexa.<br>
                      Questions? Email us at <a href="mailto:support@trustvexa.com" style="color:#6366f1;text-decoration:none;">support@trustvexa.com</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function getWelcomeEmail(data: {
  username: string;
  loginUrl: string;
  unsubscribeUrl?: string;
}): string {
  const loginUrl = data.loginUrl || 'https://trustvexa.com/dashboard';
  const content = `
    <!-- Greeting -->
    <h1 style="margin:0 0 8px;font-size:26px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">Welcome to TrustVexa, ${data.username}! 🎉</h1>
    <p style="margin:0 0 28px;font-size:16px;color:#9ca3af;">Your account is ready. Here's everything you can do from day one.</p>

    <!-- Feature tiles -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
      <tr>
        <td style="padding:0 0 12px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#1a2035;border:1px solid #1f2937;border-radius:10px;overflow:hidden;">
            <tr>
              <td style="padding:16px 20px;width:44px;vertical-align:top;">
                <div style="width:40px;height:40px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:8px;text-align:center;line-height:40px;font-size:18px;">🔒</div>
              </td>
              <td style="padding:16px 20px 16px 0;vertical-align:top;">
                <p style="margin:0 0 3px;font-size:14px;font-weight:600;color:#ffffff;">Secure escrow</p>
                <p style="margin:0;font-size:13px;color:#6b7280;">Funds are held safely in escrow until both sides confirm delivery.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:0 0 12px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#1a2035;border:1px solid #1f2937;border-radius:10px;overflow:hidden;">
            <tr>
              <td style="padding:16px 20px;width:44px;vertical-align:top;">
                <div style="width:40px;height:40px;background:linear-gradient(135deg,#0891b2,#0e7490);border-radius:8px;text-align:center;line-height:40px;font-size:18px;">💬</div>
              </td>
              <td style="padding:16px 20px 16px 0;vertical-align:top;">
                <p style="margin:0 0 3px;font-size:14px;font-weight:600;color:#ffffff;">Real-time deal chat</p>
                <p style="margin:0;font-size:13px;color:#6b7280;">Communicate with your counterparty and middleman directly in-app.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:0 0 28px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#1a2035;border:1px solid #1f2937;border-radius:10px;overflow:hidden;">
            <tr>
              <td style="padding:16px 20px;width:44px;vertical-align:top;">
                <div style="width:40px;height:40px;background:linear-gradient(135deg,#059669,#047857);border-radius:8px;text-align:center;line-height:40px;font-size:18px;">⚖️</div>
              </td>
              <td style="padding:16px 20px 16px 0;vertical-align:top;">
                <p style="margin:0 0 3px;font-size:14px;font-weight:600;color:#ffffff;">Neutral middleman</p>
                <p style="margin:0;font-size:13px;color:#6b7280;">A verified middleman resolves any disputes and oversees delivery.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- CTA -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
      <tr>
        <td align="center">
          <a href="${loginUrl}" class="cta-btn" style="display:inline-block;padding:15px 36px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#ffffff;text-decoration:none;border-radius:8px;font-size:15px;font-weight:600;letter-spacing:0.2px;mso-padding-alt:0;">
            Go to your Dashboard →
          </a>
        </td>
      </tr>
    </table>

    <!-- Help note -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#1a2035;border:1px solid #1f2937;border-radius:8px;">
      <tr>
        <td style="padding:16px 20px;">
          <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.6;">
            Need help getting started? Visit our <a href="https://trustvexa.com/how-it-works" style="color:#6366f1;text-decoration:none;font-weight:500;">how it works</a> guide or contact us at <a href="mailto:support@trustvexa.com" style="color:#6366f1;text-decoration:none;font-weight:500;">support@trustvexa.com</a> — we respond within one business day.
          </p>
        </td>
      </tr>
    </table>
  `;
  return getBaseLayout({
    title: 'Welcome to TrustVexa',
    previewText: `Welcome aboard, ${data.username}! Your TrustVexa account is ready.`,
    content,
    unsubscribeUrl: data.unsubscribeUrl,
  });
}

export function getVerifyEmail(data: {
  username: string;
  verifyUrl: string;
  unsubscribeUrl?: string;
}): string {
  const content = `
    <h1 style="margin:0 0 8px;font-size:26px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">Verify your email address</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#9ca3af;">Hi ${data.username}, one quick step to activate your TrustVexa account.</p>

    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#1a2035;border:1px solid #1f2937;border-radius:10px;margin-bottom:28px;">
      <tr>
        <td style="padding:24px 28px;">
          <p style="margin:0 0 6px;font-size:14px;font-weight:600;color:#ffffff;">Click the button below to confirm your email.</p>
          <p style="margin:0;font-size:13px;color:#6b7280;">This link expires in <strong style="color:#f59e0b;">24 hours</strong>. After that you'll need to request a new one.</p>
        </td>
      </tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
      <tr>
        <td align="center">
          <a href="${data.verifyUrl}" class="cta-btn" style="display:inline-block;padding:15px 36px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#ffffff;text-decoration:none;border-radius:8px;font-size:15px;font-weight:600;letter-spacing:0.2px;">
            Verify my email →
          </a>
        </td>
      </tr>
    </table>

    <p style="margin:0;font-size:13px;color:#4b5563;line-height:1.6;">If the button doesn't work, copy and paste this URL into your browser:<br>
    <span style="color:#6366f1;word-break:break-all;">${data.verifyUrl}</span></p>

    <p style="margin:20px 0 0;font-size:13px;color:#4b5563;">Didn't create a TrustVexa account? You can safely ignore this email.</p>
  `;
  return getBaseLayout({
    title: 'Verify Your Email — TrustVexa',
    previewText: `${data.username}, please verify your email to activate your TrustVexa account.`,
    content,
    unsubscribeUrl: data.unsubscribeUrl,
  });
}

export function getPasswordResetEmail(data: {
  username: string;
  resetUrl: string;
  unsubscribeUrl?: string;
}): string {
  const content = `
    <!-- Icon -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
      <tr>
        <td align="center">
          <div style="width:60px;height:60px;background:linear-gradient(135deg,#f59e0b,#d97706);border-radius:50%;display:inline-block;text-align:center;line-height:60px;font-size:26px;">🔑</div>
        </td>
      </tr>
    </table>

    <h1 style="margin:0 0 8px;font-size:26px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;text-align:center;">Reset your password</h1>
    <p style="margin:0 0 28px;font-size:15px;color:#9ca3af;text-align:center;">Hi ${data.username}, we received a request to reset your password.</p>

    <!-- Warning box -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#1c1408;border:1px solid #78350f;border-radius:10px;margin-bottom:28px;">
      <tr>
        <td style="padding:16px 20px;">
          <table cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="padding-right:12px;vertical-align:top;padding-top:2px;">
                <span style="font-size:16px;">⚠️</span>
              </td>
              <td>
                <p style="margin:0;font-size:13px;color:#fbbf24;line-height:1.6;">
                  This link expires in <strong>15 minutes</strong>. If you didn't request a password reset, someone may have entered your email by mistake — you can safely ignore this email. Your password will not change.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- CTA -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
      <tr>
        <td align="center">
          <a href="${data.resetUrl}" class="cta-btn" style="display:inline-block;padding:15px 36px;background:linear-gradient(135deg,#f59e0b,#d97706);color:#000000;text-decoration:none;border-radius:8px;font-size:15px;font-weight:700;letter-spacing:0.2px;">
            Reset my password →
          </a>
        </td>
      </tr>
    </table>

    <!-- Fallback URL -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#1a2035;border:1px solid #1f2937;border-radius:8px;margin-bottom:20px;">
      <tr>
        <td style="padding:16px 20px;">
          <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Or copy this link</p>
          <p style="margin:0;font-size:13px;color:#6366f1;word-break:break-all;line-height:1.6;">${data.resetUrl}</p>
        </td>
      </tr>
    </table>

    <!-- Security tip -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0d1f17;border:1px solid #065f46;border-radius:8px;">
      <tr>
        <td style="padding:16px 20px;">
          <p style="margin:0;font-size:13px;color:#6ee7b7;line-height:1.6;">
            <strong style="color:#34d399;">Security tip:</strong> TrustVexa will never ask for your password via email or chat. Use a unique, strong password and enable two-factor authentication in your settings.
          </p>
        </td>
      </tr>
    </table>
  `;
  return getBaseLayout({
    title: 'Reset Your Password — TrustVexa',
    previewText: `Password reset requested for your TrustVexa account, ${data.username}.`,
    content,
    unsubscribeUrl: data.unsubscribeUrl,
  });
}

export function getNewDeviceLoginEmail(data: {
  username: string;
  device: string;
  ip: string;
  time: string;
  unsubscribeUrl?: string;
}): string {
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

export function getDealFundedEmail(data: {
  username: string;
  dealTitle: string;
  dealUrl: string;
  amount: string;
  coin: string;
  unsubscribeUrl?: string;
}): string {
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

export function getPayoutSentEmail(data: {
  username: string;
  dealTitle: string;
  payoutUrl: string;
  amount: string;
  coin: string;
  txHash: string;
  unsubscribeUrl?: string;
}): string {
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

export function getSlaWarningEmail(data: {
  username: string;
  dealTitle: string;
  dealUrl: string;
  hoursLeft: number;
  unsubscribeUrl?: string;
}): string {
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

export function getDisputeOpenedEmail(data: {
  username: string;
  dealTitle: string;
  disputeUrl: string;
  reason: string;
  unsubscribeUrl?: string;
}): string {
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

export interface DigestNotification {
  type: string;
  dealTitle?: string | undefined;
  summary: string;
  createdAt: string;
}

export function getDigestEmail(data: {
  username: string;
  frequency: 'daily' | 'weekly';
  notifications: DigestNotification[];
  dashboardUrl: string;
  unsubscribeUrl?: string;
}): string {
  const period = data.frequency === 'daily' ? 'Daily' : 'Weekly';
  const notifRows = data.notifications
    .map(
      (n) => `
    <tr>
      <td style="padding: 12px 16px; border-bottom: 1px solid #1f2937; color: #a78bfa; font-weight: 600; text-transform: capitalize;">${n.type.replace(/[_:]/g, ' ')}</td>
      <td style="padding: 12px 16px; border-bottom: 1px solid #1f2937; color: #e5e7eb;">${n.summary}${n.dealTitle ? ` — <em style="color:#9ca3af;">${n.dealTitle}</em>` : ''}</td>
      <td style="padding: 12px 16px; border-bottom: 1px solid #1f2937; color: #6b7280; font-size: 13px; white-space: nowrap;">${n.createdAt}</td>
    </tr>`,
    )
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

export interface OtpEmailOptions {
  name: string;
  email: string;
  otp: string;
  ipAddress: string;
  deviceInfo: string;
  expiresInMinutes: number;
}

/**
 * Clean, professional OTP email template.
 * Uses minimal inline styles and table-based layout for maximum email client compatibility.
 * Light theme with subtle branding — designed to avoid spam filters.
 */
export function renderOtpEmailTemplate({
  name,
  otp,
  expiresInMinutes,
}: OtpEmailOptions): string {
  const safeName = name.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const digits = otp.split("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Verification Code</title>
</head>
<body style="margin:0; padding:0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color:#f9fafb; color:#1f2937;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb; padding:40px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="max-width:520px; width:100%; background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
          
          <!-- Header Bar -->
          <tr>
            <td style="background: linear-gradient(135deg, #6366F1, #8B5CF6); padding:24px 32px; text-align:center;">
              <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td style="background-color:rgba(255,255,255,0.2); border-radius:8px; width:32px; height:32px; text-align:center; vertical-align:middle;">
                    <span style="font-size:16px; color:#ffffff;">⌨</span>
                  </td>
                  <td style="padding-left:10px;">
                    <span style="font-size:18px; font-weight:800; color:#ffffff; letter-spacing:-0.5px;">Type</span><span style="font-size:18px; font-weight:800; color:rgba(255,255,255,0.85); letter-spacing:-0.5px;">Master</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding:32px 32px 24px;">
              <h1 style="margin:0 0 8px; font-size:22px; font-weight:700; color:#111827;">Verify your email</h1>
              <p style="margin:0 0 24px; font-size:14px; color:#6b7280; line-height:1.6;">
                Hi <strong style="color:#374151;">${safeName}</strong>, enter this code to complete your registration:
              </p>

              <!-- OTP Code Boxes -->
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
                <tr>
                  ${digits.map(d => `<td style="padding:0 4px;"><div style="width:44px; height:52px; background-color:#f3f4f6; border:2px solid #e5e7eb; border-radius:10px; text-align:center; line-height:52px; font-size:26px; font-weight:800; color:#6366F1; font-family: 'Courier New', monospace;">${d}</div></td>`).join("")}
                </tr>
              </table>

              <!-- Expiry Notice -->
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px; background-color:#eff6ff; border-radius:10px; padding:0;">
                <tr>
                  <td style="padding:10px 20px;">
                    <span style="font-size:12px; color:#3b82f6; font-weight:600;">⏱ This code expires in ${expiresInMinutes} minutes</span>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <hr style="border:none; border-top:1px solid #f3f4f6; margin:0 0 20px;" />

              <!-- Security Note -->
              <p style="margin:0; font-size:12px; color:#9ca3af; line-height:1.6;">
                If you didn't create a TypeMaster account, you can safely ignore this email. This code was requested from your browser.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:16px 32px 24px; text-align:center; border-top:1px solid #f3f4f6;">
              <p style="margin:0; font-size:11px; color:#d1d5db;">
                TypeMaster Pro &bull; Typing Practice Platform
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

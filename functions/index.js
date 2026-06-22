const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentDeleted } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const crypto = require("crypto");

admin.initializeApp();
const db = admin.firestore();

// Helper to check if ISP belongs to a hosting/VPN cloud provider
function isVPNOrProxy(isp) {
  const cloudProviders = [
    "amazon", "google", "digitalocean", "linode", "ovh", "hetzner", "microsoft",
    "hosting", "vpn", "proxy", "tor", "cloudflare", "vultr", "aws", "azure", "leaseweb"
  ];
  const lowerIsp = isp.toLowerCase();
  return cloudProviders.some(provider => lowerIsp.includes(provider));
}

// SHA-256 Hashing helper
function hashOtp(otp) {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

// Disposable email domains list
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com", "yopmail.com", "tempmail.com", "temp-mail.org",
  "guerrillamail.com", "dispostable.com", "10minutemail.com", "trashmail.com"
]);

function isDisposableEmail(email) {
  const domain = email.split("@")[1]?.toLowerCase();
  return DISPOSABLE_DOMAINS.has(domain);
}

// Personalised branded HTML template
function renderOtpEmailTemplate({ name, email, otp, ipAddress, deviceInfo, expiresInMinutes }) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Verification Code</title>
  <style>
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #f3f4f6; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; padding: 30px; background-color: #111827; border: 1px solid #1f2937; border-radius: 16px; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5); }
    .logo { text-align: center; margin-bottom: 24px; }
    .logo img { height: 40px; }
    .content { line-height: 1.6; }
    .greeting { font-size: 20px; font-weight: bold; color: #ffffff; margin-bottom: 16px; }
    .code-box { text-align: center; margin: 30px 0; padding: 20px; background: rgba(99, 102, 241, 0.1); border: 2px dashed #6366f1; border-radius: 12px; }
    .otp-code { font-size: 36px; font-weight: 800; letter-spacing: 6px; color: #8b5cf6; margin: 0; }
    .details { font-size: 13px; color: #9ca3af; margin-top: 30px; border-top: 1px solid #1f2937; padding-top: 20px; }
    .warning { color: #f87171; font-weight: bold; }
    .footer { text-align: center; margin-top: 40px; font-size: 12px; color: #4b5563; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <span style="font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: 1px;">
        <span style="color: #6366f1;">TYPE</span>MASTER
      </span>
    </div>
    <div class="content">
      <div class="greeting">Hello, ${name}</div>
      <p>Please use the following 6-digit one-time passcode to verify your email address. This code will expire in <strong>${expiresInMinutes} minutes</strong>.</p>
      <div class="code-box">
        <h1 class="otp-code">${otp}</h1>
      </div>
      <p class="warning">If you did not request this code, please ignore this email and secure your account credentials.</p>
      <div class="details">
        <strong>Security Audit Details:</strong><br>
        • IP Address: ${ipAddress}<br>
        • Device/Browser: ${deviceInfo}<br>
        • Requested At: ${new Date().toUTCString()}
      </div>
    </div>
    <div class="footer">
      © 2026 TypeMaster Pro. All rights reserved.
    </div>
  </div>
</body>
</html>
  `;
}

// ── 1. SEND OTP CALLABLE ────────────────────────────────────────────────
exports.sendOtp = onCall(async (request) => {
  const { email, name, deviceId, userAgent } = request.data || {};

  if (!email || !name) {
    throw new HttpsError("invalid-argument", "Email and name are required.");
  }

  // Get client IP address from request metadata
  const ipAddress = request.rawRequest?.ip || request.rawRequest?.headers["x-forwarded-for"] || "127.0.0.1";

  try {
    // 1. Disposable email detection
    if (isDisposableEmail(email)) {
      await db.collection("otp_logs").add({
        email,
        type: "rate_limit_block",
        ipAddress,
        deviceId: deviceId || "unknown",
        userAgent: userAgent || "unknown",
        timestamp: Date.now(),
        details: "Blocked attempt: disposable email domain."
      });
      throw new HttpsError("failed-precondition", "Disposable/temporary emails are not permitted.");
    }

    // 2. VPN/Proxy check
    let isp = "Cloud Function Gateway";
    let isSuspicious = false;
    if (ipAddress !== "127.0.0.1" && ipAddress !== "::1" && ipAddress !== "localhost") {
      try {
        const ispRes = await fetch(`https://ipapi.co/${ipAddress}/json/`);
        if (ispRes.ok) {
          const data = await ispRes.json();
          isp = data.org || data.asn || "Unknown ISP";
          if (isVPNOrProxy(isp)) {
            isSuspicious = true;
          }
        }
      } catch (err) {
        console.warn("Failed to lookup client ISP for VPN detection:", err);
      }
    }

    if (isSuspicious) {
      await db.collection("otp_logs").add({
        email,
        type: "abuse_lock",
        ipAddress,
        deviceId: deviceId || "unknown",
        userAgent: userAgent || "unknown",
        timestamp: Date.now(),
        details: `Blocked attempt: VPN/Hosting provider ISP detected (${isp}).`
      });
      throw new HttpsError("permission-denied", "Access denied. VPN, proxy, or hosting network detected.");
    }

    // 3. IP Rate Limiting (Max 10 requests per minute from an IP)
    const sanitizedIp = ipAddress.replace(/\./g, "_").replace(/:/g, "_");
    const ipLimitRef = db.collection("ip_rate_limits").doc(sanitizedIp);
    const ipLimitSnap = await ipLimitRef.get();
    const now = Date.now();
    let timestamps = [];

    if (ipLimitSnap.exists) {
      timestamps = ipLimitSnap.data().timestamps || [];
      timestamps = timestamps.filter(t => now - t < 60000);
      if (timestamps.length >= 10) {
        await db.collection("otp_logs").add({
          email,
          type: "rate_limit_block",
          ipAddress,
          deviceId: deviceId || "unknown",
          userAgent: userAgent || "unknown",
          timestamp: now,
          details: `Rate limit hit: IP address ${ipAddress} triggered block.`
        });
        throw new HttpsError("resource-exhausted", "Rate limit exceeded. Please try again in a minute.");
      }
    }
    timestamps.push(now);
    await ipLimitRef.set({ timestamps }, { merge: true });

    // 4. Check OTP state and limits (cooldown & resends)
    const otpRef = db.collection("otp_verifications").doc(email.trim().toLowerCase());
    const otpSnap = await otpRef.get();
    let resendCount = 0;

    if (otpSnap.exists) {
      const data = otpSnap.data();
      const lastCreated = data.createdAt || 0;
      const lockedUntil = data.lockedUntil || 0;

      // Check temporary lockout
      if (now < lockedUntil) {
        const minutesLeft = Math.ceil((lockedUntil - now) / 60000);
        throw new HttpsError("resource-exhausted", `Too many resends. Account locked temporarily. Try again in ${minutesLeft} minutes.`);
      }

      // Check 30-second resend cooldown
      if (now - lastCreated < 30000) {
        const secsLeft = Math.ceil((30000 - (now - lastCreated)) / 1000);
        throw new HttpsError("resource-exhausted", `Please wait ${secsLeft} seconds before requesting a new code.`);
      }

      resendCount = (data.resendCount || 0) + 1;

      // Lockout if they exceed 3 resends (4th code request)
      if (resendCount >= 3) {
        const lockoutTime = now + 15 * 60 * 1000; // 15 minutes lockout
        await otpRef.set({ lockedUntil: lockoutTime }, { merge: true });

        await db.collection("otp_logs").add({
          email,
          type: "abuse_lock",
          ipAddress,
          deviceId: deviceId || "unknown",
          userAgent: userAgent || "unknown",
          timestamp: now,
          details: "Account temporarily locked due to excessive resend requests."
        });

        throw new HttpsError("resource-exhausted", "Too many resends. OTP verification locked for 15 minutes to protect your account.");
      }
    }

    // 5. Generate secure 6-digit OTP
    const rawOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHashValue = hashOtp(rawOtp);
    const expiresAt = now + 5 * 60 * 1000; // 5 minutes validity

    // 6. Write/Update active OTP verification document
    await otpRef.set({
      email: email.trim().toLowerCase(),
      otpHash: otpHashValue,
      createdAt: now,
      expiresAt,
      attempts: 0,
      resendCount,
      verified: false,
      ipAddress,
      deviceId: deviceId || "unknown",
      lockedUntil: 0
    });

    // 7. Compile template
    const emailHtml = renderOtpEmailTemplate({
      name,
      email,
      otp: rawOtp,
      ipAddress,
      deviceInfo: userAgent || "Web Browser",
      expiresInMinutes: 5
    });

    // 8. Try to send via Nodemailer
    let emailStatus = "Mock Send (SMTP details missing)";
    const smtpHost = process.env.SMTP_HOST;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpPort = process.env.SMTP_PORT;

    if (smtpHost && smtpUser && smtpPass) {
      try {
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: parseInt(smtpPort || "587"),
          auth: { user: smtpUser, pass: smtpPass }
        });

        await transporter.sendMail({
          from: `"TypeMaster Security" <${smtpUser}>`,
          to: email,
          subject: "Your TypeMaster Security Verification Code",
          html: emailHtml
        });
        emailStatus = "Delivered successfully via SMTP";
      } catch (nodemailerErr) {
        console.error("Nodemailer send failed:", nodemailerErr);
        emailStatus = `Nodemailer failed: ${nodemailerErr.message || "Unknown error"}`;
      }
    }

    // Write to sent_emails for developer preview
    await db.collection("sent_emails").add({
      email,
      subject: "Your TypeMaster Security Code",
      html: emailHtml,
      sentAt: now,
      recipientName: name,
      deliveryStatus: emailStatus
    });

    // Log the event
    await db.collection("otp_logs").add({
      email,
      type: "resend",
      ipAddress,
      deviceId: deviceId || "unknown",
      userAgent: userAgent || "unknown",
      timestamp: now,
      details: `OTP code generated and sent. Delivery status: ${emailStatus}. Code (Dev-only): ${rawOtp}`
    });

    console.log(`[OTP Engine Dev Mode] Code for ${email} is ${rawOtp}`);

    return {
      success: true,
      message: "Security code sent successfully.",
      expiresIn: 300,
      cooldown: 30
    };

  } catch (err) {
    console.error("Failed to generate/send OTP:", err);
    if (err instanceof HttpsError) throw err;
    throw new HttpsError("internal", err.message || "Internal server error.");
  }
});

// ── 2. VERIFY OTP CALLABLE ──────────────────────────────────────────────
exports.verifyOtp = onCall(async (request) => {
  const { email, otp, deviceId, userAgent } = request.data || {};

  if (!email || !otp) {
    throw new HttpsError("invalid-argument", "Email and OTP are required.");
  }

  const ipAddress = request.rawRequest?.ip || request.rawRequest?.headers["x-forwarded-for"] || "127.0.0.1";

  try {
    const otpRef = db.collection("otp_verifications").doc(email.trim().toLowerCase());
    const otpSnap = await otpRef.get();

    if (!otpSnap.exists) {
      throw new HttpsError("not-found", "No verification request found. Please request a new code.");
    }

    const data = otpSnap.data();
    const now = Date.now();
    const lockedUntil = data.lockedUntil || 0;

    // 1. Check temporary lockout
    if (now < lockedUntil) {
      const minutesLeft = Math.ceil((lockedUntil - now) / 60000);
      throw new HttpsError("resource-exhausted", `Account temporarily locked due to excessive failed attempts. Try again in ${minutesLeft} minutes.`);
    }

    // 2. Check expiration
    if (data.expiresAt < now) {
      throw new HttpsError("failed-precondition", "Verification code has expired. Please request a new one.");
    }

    const currentAttempts = (data.attempts || 0) + 1;

    // 3. Enforce Max 5 attempts
    if (currentAttempts >= 5) {
      const lockoutTime = now + 15 * 60 * 1000; // 15-minute lock
      await otpRef.set({
        attempts: currentAttempts,
        lockedUntil: lockoutTime
      }, { merge: true });

      // Log suspicious brute-force activity
      await db.collection("otp_logs").add({
        email,
        type: "abuse_lock",
        ipAddress,
        deviceId: deviceId || "unknown",
        userAgent: userAgent || "unknown",
        timestamp: now,
        details: `Brute-force lockout triggered: 5 failed OTP verification attempts.`
      });

      throw new HttpsError("resource-exhausted", "Too many failed attempts. OTP verification locked for 15 minutes to prevent brute-force.");
    }

    // 4. Compare OTP Hash
    const incomingHash = hashOtp(otp.trim());
    const match = incomingHash === data.otpHash;

    if (!match) {
      // Increment attempts
      await otpRef.set({ attempts: currentAttempts }, { merge: true });

      // Log failed attempt
      await db.collection("otp_logs").add({
        email,
        type: "verify_failure",
        ipAddress,
        deviceId: deviceId || "unknown",
        userAgent: userAgent || "unknown",
        timestamp: now,
        details: `Failed OTP entry. Attempt ${currentAttempts}/5.`
      });

      throw new HttpsError("permission-denied", `Incorrect code. You have ${5 - currentAttempts} attempts remaining.`);
    }

    // 5. Success Path: Set verified state
    await otpRef.set({
      verified: true,
      verifiedAt: now,
      attempts: 0 // Reset attempts on success
    }, { merge: true });

    // Log successful verification
    await db.collection("otp_logs").add({
      email,
      type: "verify_success",
      ipAddress,
      deviceId: deviceId || "unknown",
      userAgent: userAgent || "unknown",
      timestamp: now,
      details: "Email verified successfully via OTP."
    });

    return {
      success: true,
      message: "Email verified successfully."
    };

  } catch (err) {
    console.error("Failed to verify OTP:", err);
    if (err instanceof HttpsError) throw err;
    throw new HttpsError("internal", err.message || "Internal server error.");
  }
});

// ── 3. AUTOMATIC USER DELETION CLEANUP TRIGGER ────────────────────────
exports.onUserDeleted = onDocumentDeleted("users/{userId}", async (event) => {
  const userId = event.params.userId;
  const deletedData = event.data.data();

  if (!deletedData) return;

  console.log(`[Firestore Trigger] User profile for UID ${userId} was deleted. Starting database cleanup...`);

  // 1. Delete username reservation document
  const usernameLower = deletedData.usernameLower || deletedData.username?.trim().toLowerCase();
  if (usernameLower) {
    try {
      const usernameDocRef = db.collection("usernames").doc(usernameLower);
      await usernameDocRef.delete();
      console.log(`[Cleanup] Deleted username reservation '${usernameLower}' for user ${userId}.`);
    } catch (err) {
      console.error(`[Cleanup] Failed to delete username reservation '${usernameLower}':`, err);
    }
  }

  // 2. Delete certificates associated with this candidate UID
  try {
    const certsSnapshot = await db.collection("certificates").where("candidateUid", "==", userId).get();
    if (!certsSnapshot.empty) {
      const batch = db.batch();
      certsSnapshot.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });
      await batch.commit();
      console.log(`[Cleanup] Deleted ${certsSnapshot.size} certificates for user ${userId}.`);
    }
  } catch (err) {
    console.error(`[Cleanup] Failed to delete certificates for user ${userId}:`, err);
  }

  // 3. Delete Firebase Auth user account
  try {
    await admin.auth().deleteUser(userId);
    console.log(`[Cleanup] Successfully deleted Firebase Auth account for UID ${userId}.`);
  } catch (err) {
    // If the user was already deleted from Auth, ignore the error
    if (err.code !== "auth/user-not-found" && err.code !== "auth/invalid-uid") {
      console.error(`[Cleanup] Failed to delete Firebase Auth account for user ${userId}:`, err);
    }
  }
});

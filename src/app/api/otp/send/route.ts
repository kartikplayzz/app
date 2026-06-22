import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { isDisposableEmail } from "@/lib/disposableEmails";
import { renderOtpEmailTemplate } from "@/lib/emailTemplates";
import crypto from "crypto";
import nodemailer from "nodemailer";

// Helper to check if ISP belongs to a hosting/VPN cloud provider
function isVPNOrProxy(isp: string): boolean {
  const cloudProviders = [
    "amazon", "google", "digitalocean", "linode", "ovh", "hetzner", "microsoft",
    "hosting", "vpn", "proxy", "tor", "cloudflare", "vultr", "aws", "azure", "leaseweb"
  ];
  const lowerIsp = isp.toLowerCase();
  return cloudProviders.some(provider => lowerIsp.includes(provider));
}

// SHA-256 Hashing function
function hashOtp(otp: string): string {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

export async function POST(req: NextRequest) {
  try {
    const { email, name, deviceId, userAgent } = await req.json();

    if (!email || !name) {
      return NextResponse.json({ error: "Email and name are required." }, { status: 400 });
    }

    // 1. Disposable email detection
    if (isDisposableEmail(email)) {
      // Log blocked attempt in history
      await adminDb.collection("otp_logs").add({
        email,
        type: "rate_limit_block",
        ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
        deviceId: deviceId || "unknown",
        userAgent: userAgent || "unknown",
        timestamp: Date.now(),
        details: "Blocked attempt: disposable email domain."
      });
      return NextResponse.json({ error: "Disposable/temporary emails are not permitted." }, { status: 400 });
    }

    const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";

    // 2. VPN / Proxy Heuristic check
    let isp = "Localhost / Internal";
    let isSuspicious = false;
    if (ipAddress !== "127.0.0.1" && ipAddress !== "::1") {
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
      await adminDb.collection("otp_logs").add({
        email,
        type: "abuse_lock",
        ipAddress,
        deviceId: deviceId || "unknown",
        userAgent: userAgent || "unknown",
        timestamp: Date.now(),
        details: `Blocked attempt: VPN/Hosting provider ISP detected (${isp}).`
      });
      return NextResponse.json({ error: "Access denied. VPN, proxy, or hosting network detected." }, { status: 403 });
    }

    // 3. IP Rate Limiting (Max 10 requests per minute from an IP)
    const ipLimitRef = adminDb.collection("ip_rate_limits").doc(ipAddress.replace(/\./g, "_"));
    const ipLimitSnap = await ipLimitRef.get();
    const now = Date.now();
    let timestamps: number[] = [];

    if (ipLimitSnap.exists) {
      timestamps = ipLimitSnap.data()?.timestamps || [];
      // Filter timestamps in last 60 seconds
      timestamps = timestamps.filter(t => now - t < 60000);
      if (timestamps.length >= 10) {
        await adminDb.collection("otp_logs").add({
          email,
          type: "rate_limit_block",
          ipAddress,
          deviceId: deviceId || "unknown",
          userAgent: userAgent || "unknown",
          timestamp: now,
          details: `Rate limit hit: IP address ${ipAddress} triggered block.`
        });
        return NextResponse.json({ error: "Rate limit exceeded. Please try again in a minute." }, { status: 429 });
      }
    }
    timestamps.push(now);
    await ipLimitRef.set({ timestamps }, { merge: true });

    // 4. Check OTP state and limits (cooldown & resends)
    const otpRef = adminDb.collection("otp_verifications").doc(email.trim().toLowerCase());
    const otpSnap = await otpRef.get();
    let resendCount = 0;
    
    if (otpSnap.exists) {
      const data = otpSnap.data();
      const lastCreated = data?.createdAt || 0;
      const lockedUntil = data?.lockedUntil || 0;

      // Check temporary lockout
      if (now < lockedUntil) {
        const minutesLeft = Math.ceil((lockedUntil - now) / 60000);
        return NextResponse.json({
          error: `Too many resends. Account locked temporarily. Try again in ${minutesLeft} minutes.`
        }, { status: 423 });
      }

      // Check 30-second resend cooldown
      if (now - lastCreated < 30000) {
        const secsLeft = Math.ceil((30000 - (now - lastCreated)) / 1000);
        return NextResponse.json({ error: `Please wait ${secsLeft} seconds before requesting a new code.` }, { status: 429 });
      }

      resendCount = (data?.resendCount || 0) + 1;

      // Lockout if they exceed 3 resends (4th code request)
      if (resendCount >= 3) {
        const lockoutTime = now + 15 * 60 * 1000; // 15 minutes lockout
        await otpRef.set({ lockedUntil: lockoutTime }, { merge: true });
        
        await adminDb.collection("otp_logs").add({
          email,
          type: "abuse_lock",
          ipAddress,
          deviceId: deviceId || "unknown",
          userAgent: userAgent || "unknown",
          timestamp: now,
          details: "Account temporarily locked due to excessive resend requests."
        });

        return NextResponse.json({
          error: "Too many resends. OTP verification locked for 15 minutes to protect your account."
        }, { status: 423 });
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

    // 7. Compile personalized branded HTML template
    const emailHtml = renderOtpEmailTemplate({
      name,
      email,
      otp: rawOtp,
      ipAddress,
      deviceInfo: userAgent || "Web Browser",
      expiresInMinutes: 5
    });

    // 8. Send email via Gmail SMTP
    let emailStatus = "Not sent (SMTP not configured)";
    const smtpHost = process.env.SMTP_HOST;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (smtpHost && smtpUser && smtpPass) {
      try {
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: 465,
          secure: true,
          auth: { user: smtpUser, pass: smtpPass }
        });

        await transporter.sendMail({
          from: smtpUser,
          to: email,
          subject: `${rawOtp} - Your TypeMaster verification code`,
          text: `Hi ${name},\n\nYour TypeMaster verification code is: ${rawOtp}\n\nThis code expires in 5 minutes.\n\nIf you didn't request this, ignore this email.\n\n- TypeMaster Team`,
          html: emailHtml
        });
        emailStatus = "Delivered successfully via SMTP";
      } catch (nodemailerErr: any) {
        console.error("Nodemailer send failed:", nodemailerErr);
        emailStatus = `Failed: ${nodemailerErr.message || "Unknown error"}`;
      }
    }

    // Write to sent_emails collection so developers can preview the email HTML in dashboard
    await adminDb.collection("sent_emails").add({
      email,
      subject: "Your TypeMaster Security Code",
      html: emailHtml,
      sentAt: now,
      recipientName: name,
      deliveryStatus: emailStatus
    });

    // Log the event
    await adminDb.collection("otp_logs").add({
      email,
      type: "resend",
      ipAddress,
      deviceId: deviceId || "unknown",
      userAgent: userAgent || "unknown",
      timestamp: now,
      details: `OTP code generated and sent. Delivery status: ${emailStatus}. Code (Dev-only): ${rawOtp}`
    });

    // Output dev code in response headers or log for easy local development testing
    console.log(`[OTP Engine Dev Mode] Code for ${email} is ${rawOtp}`);

    return NextResponse.json({
      success: true,
      message: "Security code sent successfully.",
      expiresIn: 300, // 5 minutes
      cooldown: 30
    });

  } catch (err: any) {
    console.error("Failed to generate/send OTP:", err);
    return NextResponse.json({ error: err.message || "Internal server error." }, { status: 500 });
  }
}

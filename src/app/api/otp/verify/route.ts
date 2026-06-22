import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import crypto from "crypto";

// SHA-256 Hashing helper
function hashOtp(otp: string): string {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

export async function POST(req: NextRequest) {
  try {
    const { email, otp, deviceId, userAgent } = await req.json();

    if (!email || !otp) {
      return NextResponse.json({ error: "Email and OTP are required." }, { status: 400 });
    }

    const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";
    const otpRef = adminDb.collection("otp_verifications").doc(email.trim().toLowerCase());
    const otpSnap = await otpRef.get();

    if (!otpSnap.exists) {
      return NextResponse.json({ error: "No verification request found. Please request a new code." }, { status: 404 });
    }

    const data = otpSnap.data();
    const now = Date.now();
    const lockedUntil = data?.lockedUntil || 0;

    // 1. Check temporary lockout
    if (now < lockedUntil) {
      const minutesLeft = Math.ceil((lockedUntil - now) / 60000);
      return NextResponse.json({
        error: `Account temporarily locked due to excessive failed attempts. Try again in ${minutesLeft} minutes.`
      }, { status: 423 });
    }

    // 2. Check expiration
    if (data?.expiresAt < now) {
      return NextResponse.json({ error: "Verification code has expired. Please request a new one." }, { status: 410 });
    }

    const currentAttempts = (data?.attempts || 0) + 1;

    // 3. Enforce Max 5 attempts
    if (currentAttempts >= 5) {
      const lockoutTime = now + 15 * 60 * 1000; // 15-minute lock
      await otpRef.set({
        attempts: currentAttempts,
        lockedUntil: lockoutTime
      }, { merge: true });

      // Log suspicious brute-force activity
      await adminDb.collection("otp_logs").add({
        email,
        type: "abuse_lock",
        ipAddress,
        deviceId: deviceId || "unknown",
        userAgent: userAgent || "unknown",
        timestamp: now,
        details: `Brute-force lockout triggered: 5 failed OTP verification attempts.`
      });

      return NextResponse.json({
        error: "Too many failed attempts. OTP verification locked for 15 minutes to prevent brute-force."
      }, { status: 423 });
    }

    // 4. Compare OTP Hash
    const incomingHash = hashOtp(otp.trim());
    const match = incomingHash === data?.otpHash;

    if (!match) {
      // Increment attempts
      await otpRef.set({ attempts: currentAttempts }, { merge: true });

      // Log failed attempt
      await adminDb.collection("otp_logs").add({
        email,
        type: "verify_failure",
        ipAddress,
        deviceId: deviceId || "unknown",
        userAgent: userAgent || "unknown",
        timestamp: now,
        details: `Failed OTP entry. Attempt ${currentAttempts}/5.`
      });

      return NextResponse.json({
        error: `Incorrect code. You have ${5 - currentAttempts} attempts remaining.`,
        attemptsRemaining: 5 - currentAttempts
      }, { status: 401 });
    }

    // 5. Success Path: Set verified state
    await otpRef.set({
      verified: true,
      verifiedAt: now,
      attempts: 0 // Reset attempts on success
    }, { merge: true });

    // Log successful verification
    await adminDb.collection("otp_logs").add({
      email,
      type: "verify_success",
      ipAddress,
      deviceId: deviceId || "unknown",
      userAgent: userAgent || "unknown",
      timestamp: now,
      details: "Email verified successfully via OTP."
    });

    return NextResponse.json({
      success: true,
      message: "Email verified successfully."
    });

  } catch (err: any) {
    console.error("Failed to verify OTP:", err);
    return NextResponse.json({ error: err.message || "Internal server error." }, { status: 500 });
  }
}

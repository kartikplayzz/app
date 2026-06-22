import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";

export async function POST(req: NextRequest) {
  try {
    const { idToken } = await req.json();
    if (!idToken) {
      return NextResponse.json({ error: "ID token is required." }, { status: 400 });
    }

    // Verify the Firebase ID token
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const uid = decodedToken.uid;

    // Create a Custom Token for the verified user
    const customToken = await adminAuth.createCustomToken(uid);

    return NextResponse.json({ customToken });
  } catch (err: any) {
    console.error("Error generating custom token:", err);
    return NextResponse.json(
      { error: err.message || "Failed to generate custom token." },
      { status: 500 }
    );
  }
}

import { useState, useEffect } from "react";
import { checkUsernameAvailability } from "@/lib/firebaseSync";

export type UsernameStatus = "idle" | "checking" | "available" | "taken" | "invalid";

export function useUsernameCheck(username: string) {
  const [status, setStatus] = useState<UsernameStatus>("idle");
  const [message, setMessage] = useState("");
  const [shakeTrigger, setShakeTrigger] = useState(false);

  useEffect(() => {
    const cleanUsername = username.trim().toLowerCase();
    if (!cleanUsername) {
      setStatus("idle");
      setMessage("");
      return;
    }

    const reserved = ["admin", "system", "administrator", "root", "support", "owner"];

    // 1. Client-side rules validation
    if (cleanUsername.length < 4) {
      setStatus("invalid");
      setMessage("✗ invalid username");
      return;
    }
    if (cleanUsername.length > 20) {
      setStatus("invalid");
      setMessage("✗ invalid username");
      return;
    }
    if (/\s/.test(cleanUsername)) {
      setStatus("invalid");
      setMessage("✗ invalid username");
      return;
    }
    if (!/^[a-z0-9_]+$/.test(cleanUsername)) {
      setStatus("invalid");
      setMessage("✗ invalid username");
      return;
    }
    if (reserved.includes(cleanUsername)) {
      setStatus("invalid");
      setMessage("✗ invalid username");
      return;
    }

    setStatus("checking");
    setMessage("Checking availability...");

    // 2. Debounced query check
    const delayDebounceFn = setTimeout(async () => {
      try {
        const available = await checkUsernameAvailability(cleanUsername);
        if (available) {
          setStatus("available");
          setMessage("✓ username available");
        } else {
          setStatus("taken");
          setMessage("✗ username already taken");
          setShakeTrigger((prev) => !prev);
        }
      } catch (err) {
        console.error("Error verifying username:", err);
        setStatus("taken");
        setMessage("✗ username already taken");
        setShakeTrigger((prev) => !prev);
      }
    }, 350);

    return () => clearTimeout(delayDebounceFn);
  }, [username]);

  return { status, message, shakeTrigger };
}

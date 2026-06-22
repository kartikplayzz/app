// Dictionary of common disposable/temporary email domains
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "tempmail.com",
  "temp-mail.org",
  "10minutemail.com",
  "yopmail.com",
  "dispostable.com",
  "guerrillamail.com",
  "guerrillamailblock.com",
  "guerrillamail.net",
  "guerrillamail.org",
  "guerrillamail.biz",
  "sharklasers.com",
  "burnermail.io",
  "trashmail.com",
  "maildrop.cc",
  "getairmail.com",
  "crazymailing.com",
  "owlymail.com",
  "throwawaymail.com",
  "mailnesia.com",
  "mailcatch.com",
  "mintemail.com",
  "mailtogo.org",
]);

/**
 * Checks if an email address belongs to a disposable email provider
 */
export function isDisposableEmail(email: string): boolean {
  const cleanEmail = email.trim().toLowerCase();
  const parts = cleanEmail.split("@");
  if (parts.length < 2) return false;
  
  const domain = parts[1];
  return DISPOSABLE_DOMAINS.has(domain);
}

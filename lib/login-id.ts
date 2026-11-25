/**
 * Sign-up accepts a mobile number or an email.
 * Supabase signs in with email + password, so a mobile number is stored as a
 * private login ID like 9876543210@phone.ssbarena.onrender.com (no SMS needed).
 */
export const PHONE_DOMAIN = 'phone.ssbarena.onrender.com';

export function toLoginEmail(input: string): string | null {
  const value = input.trim().toLowerCase();
  if (value.includes('@')) {
    if (value.endsWith(`@${PHONE_DOMAIN}`)) return null;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : null;
  }
  if (!/^\+?[\d\s()-]+$/.test(value)) return null;
  let digits = value.replace(/\D/g, '');
  // Treat +91 98765 43210, 098765 43210 and 9876543210 as the same number.
  if (/^91[6-9]\d{9}$/.test(digits)) digits = digits.slice(2);
  else if (/^0[6-9]\d{9}$/.test(digits)) digits = digits.slice(1);
  return digits.length >= 9 && digits.length <= 15 ? `${digits}@${PHONE_DOMAIN}` : null;
}

export const isPhoneLogin = (email?: string | null) => Boolean(email?.endsWith(`@${PHONE_DOMAIN}`));

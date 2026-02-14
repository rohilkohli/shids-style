// ============================================================================
// Email Validation Utilities
// ============================================================================

/**
 * RFC 5322 compliant email regex pattern
 * Validates most common email formats
 */
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/**
 * Simpler email regex for basic validation
 */
const SIMPLE_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface EmailValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validate an email address
 * @param email - Email to validate
 * @param strict - Use strict RFC 5322 validation (default: false)
 * @returns Validation result with error message if invalid
 */
export function validateEmail(email: string, strict = false): EmailValidationResult {
  const trimmed = email.trim();
  
  if (!trimmed) {
    return { isValid: false, error: "Email is required" };
  }
  
  if (trimmed.length > 254) {
    return { isValid: false, error: "Email is too long" };
  }
  
  const regex = strict ? EMAIL_REGEX : SIMPLE_EMAIL_REGEX;
  
  if (!regex.test(trimmed)) {
    return { isValid: false, error: "Please enter a valid email address" };
  }
  
  // Check for common typos in popular domains
  const domain = trimmed.split("@")[1]?.toLowerCase();
  const typoSuggestions: Record<string, string> = {
    "gmial.com": "gmail.com",
    "gmal.com": "gmail.com",
    "gamil.com": "gmail.com",
    "gnail.com": "gmail.com",
    "hotmal.com": "hotmail.com",
    "homail.com": "hotmail.com",
    "outlok.com": "outlook.com",
    "outloo.com": "outlook.com",
    "yahooo.com": "yahoo.com",
    "yaho.com": "yahoo.com",
  };
  
  const suggestion = domain ? typoSuggestions[domain] : undefined;
  if (suggestion) {
    return { 
      isValid: false, 
      error: `Did you mean @${suggestion}?` 
    };
  }
  
  return { isValid: true };
}

/**
 * Quick check if email is valid (boolean only)
 */
export function isValidEmail(email: string): boolean {
  return validateEmail(email).isValid;
}

/**
 * Normalize email for storage/comparison
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

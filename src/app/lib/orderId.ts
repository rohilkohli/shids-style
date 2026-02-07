const DEFAULT_PREFIX = "SHIDS";
const ALPHANUM = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

const randomChars = (length: number) => {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => ALPHANUM[byte % ALPHANUM.length]).join("");
};

export const generateShortOrderId = (prefix = DEFAULT_PREFIX, suffixLength = 4) => {
  const safePrefix = prefix.trim().toUpperCase();
  return `${safePrefix}-${randomChars(suffixLength)}`;
};

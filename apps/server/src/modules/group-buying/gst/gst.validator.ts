
const CHARSET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const FORMAT_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export interface GstValidationResult {
  valid: boolean;
  reason?: string;
}

export function validateGst(raw: string): GstValidationResult {
  if (!raw || typeof raw !== 'string') {
    return { valid: false, reason: 'GST number is required' };
  }

  const gstin = raw.trim().toUpperCase();

  if (gstin.length !== 15) {
    return { valid: false, reason: `GSTIN must be 15 characters (got ${gstin.length})` };
  }

  if (!FORMAT_REGEX.test(gstin)) {
    return { valid: false, reason: 'GSTIN format is invalid' };
  }

  const stateCode = parseInt(gstin.slice(0, 2), 10);
  if (stateCode < 1 || stateCode > 37) {
    return { valid: false, reason: `Invalid state code: ${gstin.slice(0, 2)}` };
  }

  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const charIndex = CHARSET.indexOf(gstin[i]);
    if (charIndex === -1) {
      return { valid: false, reason: `Unexpected character at position ${i}: '${gstin[i]}'` };
    }
    let product = charIndex * (i % 2 === 0 ? 1 : 2);
    if (product > 35) {
      product = Math.floor(product / 36) + (product % 36);
    }
    sum += product;
  }

  const expectedChecksumIndex = (36 - (sum % 36)) % 36;
  const expectedCheckChar = CHARSET[expectedChecksumIndex];
  const actualCheckChar = gstin[14];

  if (actualCheckChar !== expectedCheckChar) {
    return {
      valid: false,
      reason: `Invalid checksum: expected '${expectedCheckChar}', got '${actualCheckChar}'`,
    };
  }

  return { valid: true };
}

export function isValidGst(raw: string): boolean {
  return validateGst(raw).valid;
}

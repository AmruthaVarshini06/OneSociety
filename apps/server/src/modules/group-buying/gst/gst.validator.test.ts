import { validateGst, isValidGst } from './gst.validator';

describe('GST Validator', () => {
  describe('valid GSTINs', () => {
    it('accepts a well-known valid GSTIN', () => {
      const result = validateGst('07AAACB1234D1ZF');
      expect(result.valid).toBe(true);
    });

    it('accepts lowercase input (auto-uppercased)', () => {
      const result = validateGst('07aaacb1234d1zf');
      expect(result.valid).toBe(true);
    });

    it('accepts with leading/trailing spaces (trimmed)', () => {
      const result = validateGst('  07AAACB1234D1ZF  ');
      expect(result.valid).toBe(true);
    });

    it('accepts a Karnataka GSTIN', () => {
      const result = validateGst('29AABCU9603R1ZJ');
      expect(result.valid).toBe(true);
    });

    it('accepts a Maharashtra GSTIN', () => {
      const result = validateGst('27AAJCS1234D1ZN');
      expect(result.valid).toBe(true);
    });
  });

  describe('format failures', () => {
    it('rejects a string shorter than 15 chars', () => {
      const result = validateGst('07AAACB1234D1Z');
      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/15 characters/);
    });

    it('rejects a string longer than 15 chars', () => {
      const result = validateGst('07AAACB1234D1ZFX');
      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/15 characters/);
    });

    it('rejects an empty string', () => {
      const result = validateGst('');
      expect(result.valid).toBe(false);
    });

    it('rejects a null-ish value', () => {
      const result = validateGst(null as any);
      expect(result.valid).toBe(false);
    });

    it('rejects a GSTIN where 15th char is not in CHARSET', () => {
      const result = validateGst('07AAACB1234D1Z!');
      expect(result.valid).toBe(false);
    });
  });

  describe('state code failures', () => {
    it('rejects state code 00', () => {
      const result = validateGst('00AAACB1234D1ZF');
      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/state code/i);
    });

    it('rejects state code 38', () => {
      const result = validateGst('38AAACB1234D1ZF');
      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/state code/i);
    });
  });

  describe('checksum failures', () => {
    it('rejects a GSTIN with wrong last character', () => {
      const result = validateGst('07AAACB1234D1ZA');
      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/checksum/i);
    });

    it('rejects a GSTIN with one character changed in the middle', () => {
      const result = validateGst('07AAAXB1234D1ZF');
      expect(result.valid).toBe(false);
    });
  });

  describe('isValidGst', () => {
    it('returns true for valid GSTIN', () => {
      expect(isValidGst('07AAACB1234D1ZF')).toBe(true);
    });

    it('returns false for invalid GSTIN', () => {
      expect(isValidGst('BADGSTIN')).toBe(false);
    });
  });
});

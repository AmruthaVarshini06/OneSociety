import { generateQrToken, verifyQrToken } from './token';

describe('Delivery QR Token Generator & Verifier', () => {
  const groupOrderId = '60c72b2f9b1d8b2badbee001';
  const flatId = '60c72b2f9b1d8b2badbee002';

  it('generates a valid token and verifies it correctly', () => {
    const token = generateQrToken(groupOrderId, flatId);
    expect(typeof token).toBe('string');
    expect(token).toContain('.');

    const result = verifyQrToken(token);
    expect(result.valid).toBe(true);
    expect(result.groupOrderId).toBe(groupOrderId);
    expect(result.flatId).toBe(flatId);
  });

  it('rejects a token with a tampered signature', () => {
    const token = generateQrToken(groupOrderId, flatId);
    const [dataB64] = token.split('.');
    const fakeSignature = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    const tampered = `${dataB64}.${fakeSignature}`;

    const result = verifyQrToken(tampered);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('Invalid signature');
  });

  it('rejects a token with tampered payload data', () => {
    const token = generateQrToken(groupOrderId, flatId);
    const [, signature] = token.split('.');
    const fakePayload = Buffer.from(JSON.stringify({ groupOrderId: 'fake', flatId: 'fake' })).toString('base64url');
    const tampered = `${fakePayload}.${signature}`;

    const result = verifyQrToken(tampered);
    expect(result.valid).toBe(false);
  });

  it('rejects malformed tokens', () => {
    expect(verifyQrToken('').valid).toBe(false);
    expect(verifyQrToken('malformed_without_dot').valid).toBe(false);
    expect(verifyQrToken('part1.part2.part3').valid).toBe(false);
  });
});

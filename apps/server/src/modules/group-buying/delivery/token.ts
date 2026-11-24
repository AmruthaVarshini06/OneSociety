import crypto from 'crypto';

const SECRET = process.env.JWT_ACCESS_SECRET || 'onesociety_qr_delivery_secret_key_32c';

export interface TokenPayload {
  groupOrderId: string;
  flatId: string;
  timestamp: number;
  nonce: string;
}

export function generateQrToken(groupOrderId: string, flatId: string): string {
  const payload: TokenPayload = {
    groupOrderId,
    flatId,
    timestamp: Date.now(),
    nonce: crypto.randomBytes(8).toString('hex'),
  };
  const json = JSON.stringify(payload);
  const dataB64 = Buffer.from(json).toString('base64url');
  const signature = crypto.createHmac('sha256', SECRET).update(dataB64).digest('hex');
  return `${dataB64}.${signature}`;
}

export function verifyQrToken(token: string): {
  valid: boolean;
  groupOrderId?: string;
  flatId?: string;
  reason?: string;
} {
  if (!token || typeof token !== 'string') {
    return { valid: false, reason: 'Missing or invalid token format' };
  }

  const parts = token.split('.');
  if (parts.length !== 2) {
    return { valid: false, reason: 'Invalid token structure' };
  }

  const [dataB64, signature] = parts;
  const expectedSig = crypto.createHmac('sha256', SECRET).update(dataB64).digest('hex');
  if (signature !== expectedSig) {
    return { valid: false, reason: 'Invalid signature' };
  }

  try {
    const raw = Buffer.from(dataB64, 'base64url').toString('utf8');
    const payload = JSON.parse(raw) as TokenPayload;
    if (!payload.groupOrderId || !payload.flatId) {
      return { valid: false, reason: 'Incomplete payload' };
    }
    return {
      valid: true,
      groupOrderId: payload.groupOrderId,
      flatId: payload.flatId,
    };
  } catch {
    return { valid: false, reason: 'Failed to decode token payload' };
  }
}

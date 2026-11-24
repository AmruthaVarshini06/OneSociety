import { query } from '../../../config/supabase';
import { sendNotification } from '../../../shared/notifications/notification.service';

export interface PaymentWindowRule {
  type: 'SAME_DAY_HOURS' | 'DAYS_AFTER_JOB' | 'MONTHLY_DATE_RANGE';
  sameDayHours?: { from: string; to: string };
  daysAfterJob?: number;
  monthlyDateRange?: { fromDay: number; toDay: number };
}

export interface PriceOffer {
  amountPaise: number;
  billingUnit: 'HOURLY' | 'DAILY' | 'MONTHLY' | 'FIXED';
  paymentWindow: PaymentWindowRule;
  noticePeriodDays: number;
  notes?: string;
  status: 'PENDING' | 'ACCEPTED' | 'COUNTERED' | 'DECLINED';
  respondedAt?: Date;
}

export interface ServiceChatDocument {
  id: string;
  _id: string;
  requestId: string;
  senderId: string;
  senderRole: 'SEEKER' | 'PROVIDER' | 'SYSTEM';
  text: string;
  type: 'TEXT' | 'PRICE_OFFER' | 'SYSTEM';
  priceOffer?: PriceOffer;
  createdAt: Date;
}

function mapChat(row: any): ServiceChatDocument {
  return {
    id: row.id,
    _id: row.id,
    requestId: row.request_id,
    senderId: row.sender_id,
    senderRole: row.sender_role,
    text: row.text,
    type: row.type,
    priceOffer: row.price_offer,
    createdAt: row.created_at,
  };
}

async function getRequestById(requestId: string): Promise<any> {
  const res = await query('SELECT * FROM service_requests WHERE id = $1', [requestId]);
  if (!res.rows[0]) {
    // If not in service_requests, check service_agreements as fallback
    const agreeRes = await query('SELECT * FROM service_agreements WHERE id = $1', [requestId]);
    if (agreeRes.rows[0]) {
      const a = agreeRes.rows[0];
      return {
        id: a.id,
        seekerId: a.seeker_id,
        providerUserId: a.provider_user_id,
      };
    }
    return null;
  }
  const r = res.rows[0];
  return {
    id: r.id,
    seekerId: r.seeker_id,
    providerUserId: r.provider_user_id,
  };
}

function assertRequestAccess(request: any, userId: string): 'seeker' | 'provider' {
  if (request.seekerId?.toString() === userId) return 'seeker';
  if (request.providerUserId?.toString() === userId) return 'provider';
  throw Object.assign(new Error('Forbidden: not a party to this request'), { statusCode: 403 });
}

export async function getChatMessages(requestId: string, userId: string): Promise<ServiceChatDocument[]> {
  const request = await getRequestById(requestId);
  if (!request) throw Object.assign(new Error('Request not found'), { statusCode: 404 });
  assertRequestAccess(request, userId);

  const res = await query(
    'SELECT * FROM service_chats WHERE request_id = $1 ORDER BY created_at ASC',
    [requestId]
  );
  return res.rows.map(mapChat);
}

export async function sendMessage(
  requestId: string,
  senderId: string,
  senderRole: 'seeker' | 'provider',
  text: string,
): Promise<ServiceChatDocument> {
  const request = await getRequestById(requestId);
  if (!request) throw Object.assign(new Error('Request not found'), { statusCode: 404 });
  assertRequestAccess(request, senderId);

  const res = await query(
    `INSERT INTO service_chats (request_id, sender_id, sender_role, text, type)
     VALUES ($1, $2, $3, $4, 'TEXT')
     RETURNING *`,
    [requestId, senderId, senderRole.toUpperCase(), text]
  );

  const recipientId = senderRole === 'seeker'
    ? request.providerUserId.toString()
    : request.seekerId.toString();

  await sendNotification(
    recipientId,
    'New message',
    text.slice(0, 80),
    'SERVICE_CHAT_MESSAGE',
    requestId,
    { requestId },
  );

  return mapChat(res.rows[0]);
}

export async function sendPriceOffer(
  requestId: string,
  senderId: string,
  offer: Omit<PriceOffer, 'status' | 'respondedAt'>,
): Promise<ServiceChatDocument> {
  const request = await getRequestById(requestId);
  if (!request) throw Object.assign(new Error('Request not found'), { statusCode: 404 });
  const senderRole = assertRequestAccess(request, senderId);

  // Invalidate previous pending offers
  await query(
    `UPDATE service_chats 
     SET price_offer = jsonb_set(price_offer, '{status}', '"DECLINED"')
     WHERE request_id = $1 AND type = 'PRICE_OFFER' AND price_offer->>'status' = 'PENDING'`,
    [requestId]
  );

  const amountRs = (offer.amountPaise / 100).toFixed(2);
  const fullOffer = { ...offer, status: 'PENDING' };

  const res = await query(
    `INSERT INTO service_chats (request_id, sender_id, sender_role, text, type, price_offer)
     VALUES ($1, $2, $3, $4, 'PRICE_OFFER', $5)
     RETURNING *`,
    [
      requestId,
      senderId,
      senderRole.toUpperCase(),
      `Price offer: ₹${amountRs} per ${offer.billingUnit.toLowerCase()}`,
      JSON.stringify(fullOffer),
    ]
  );

  const recipientId = senderRole === 'seeker'
    ? request.providerUserId.toString()
    : request.seekerId.toString();

  await sendNotification(
    recipientId,
    'New price offer',
    `₹${amountRs} per ${offer.billingUnit.toLowerCase()} — tap to respond`,
    'SERVICE_PRICE_OFFER',
    requestId,
    { requestId },
  );

  return mapChat(res.rows[0]);
}

export async function respondToPriceOffer(
  requestId: string,
  offerId: string,
  userId: string,
  action: 'ACCEPT' | 'COUNTER' | 'DECLINE',
  counterOffer?: Omit<PriceOffer, 'status' | 'respondedAt'>,
): Promise<void> {
  const request = await getRequestById(requestId);
  if (!request) throw Object.assign(new Error('Request not found'), { statusCode: 404 });
  const userRole = assertRequestAccess(request, userId);

  const res = await query('SELECT * FROM service_chats WHERE id = $1 AND request_id = $2', [offerId, requestId]);
  const msg = res.rows[0];
  if (!msg || !msg.price_offer) throw Object.assign(new Error('Offer not found'), { statusCode: 404 });
  if (msg.price_offer.status !== 'PENDING') throw Object.assign(new Error('Offer already responded'), { statusCode: 400 });
  if (msg.sender_id.toString() === userId) throw Object.assign(new Error('Cannot respond to your own offer'), { statusCode: 400 });

  const updatedOffer = {
    ...msg.price_offer,
    status: action === 'ACCEPT' ? 'ACCEPTED' : action === 'COUNTER' ? 'COUNTERED' : 'DECLINED',
    respondedAt: new Date().toISOString(),
  };

  await query('UPDATE service_chats SET price_offer = $1 WHERE id = $2', [JSON.stringify(updatedOffer), offerId]);

  if (action === 'ACCEPT') {
    const { lockAgreement } = await import('../agreements/service-agreement.service');
    await lockAgreement(
      requestId,
      msg.price_offer.amountPaise,
      msg.price_offer.billingUnit,
      msg.price_offer.paymentWindow,
      msg.price_offer.noticePeriodDays,
    );
  } else if (action === 'COUNTER' && counterOffer) {
    await sendPriceOffer(requestId, userId, counterOffer);
  }

  const recipientId = userRole === 'seeker'
    ? request.providerUserId.toString()
    : request.seekerId.toString();

  await sendNotification(
    recipientId,
    `Price offer ${action.toLowerCase()}ed`,
    action === 'ACCEPT' ? 'Agreement is now locked!' : `Your price offer was ${action.toLowerCase()}ed`,
    'SERVICE_OFFER_RESPONSE',
    requestId,
    { requestId, action },
  );
}

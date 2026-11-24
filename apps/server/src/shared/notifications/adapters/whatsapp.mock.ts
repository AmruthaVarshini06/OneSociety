/**
 * WhatsApp / SMS mock adapter.
 * Always logs — never sends real messages.
 * To add a real provider later, replace the implementations here.
 */
export function sendWhatsApp(phone: string, message: string): void {
  console.info(`[WHATSAPP MOCK] To: ${phone} | ${message}`);
}

export function sendSms(phone: string, message: string): void {
  console.info(`[SMS MOCK] To: ${phone} | ${message}`);
}

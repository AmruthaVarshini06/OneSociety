export function sendWhatsApp(phone: string, message: string): void {
  console.info(`[WHATSAPP MOCK] To: ${phone} | ${message}`);
}

export function sendSms(phone: string, message: string): void {
  console.info(`[SMS MOCK] To: ${phone} | ${message}`);
}

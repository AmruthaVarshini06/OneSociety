import { sendWhatsApp, sendSms } from './adapters/whatsapp.mock';

describe('Notification Adapters & Formatting', () => {
  let consoleInfoSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleInfoSpy.mockRestore();
  });

  it('logs whatsapp message with target phone and formatted text', () => {
    sendWhatsApp('9876543210', '[OneSociety] Order Dispatched: Rice');
    expect(consoleInfoSpy).toHaveBeenCalledWith(
      expect.stringContaining('[WHATSAPP MOCK] To: 9876543210 | [OneSociety] Order Dispatched: Rice'),
    );
  });

  it('logs sms message with target phone and formatted text', () => {
    sendSms('9876543210', 'Your delivery verification OTP is 123456');
    expect(consoleInfoSpy).toHaveBeenCalledWith(
      expect.stringContaining('[SMS MOCK] To: 9876543210 | Your delivery verification OTP is 123456'),
    );
  });
});

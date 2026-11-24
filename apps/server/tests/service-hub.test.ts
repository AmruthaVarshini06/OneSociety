import mongoose, { Types } from 'mongoose';
import { seedSection1 } from '../scripts/seed/section1-foundation';
import { seedSection4 } from '../scripts/seed/section4-servicehub';
import { ServiceCategory } from '../src/modules/service-hub/categories/service-category.model';
import { ServiceProviderProfile } from '../src/modules/service-hub/providers/provider-profile.model';
import { ServiceRequest } from '../src/modules/service-hub/requests/service-request.model';
import { ServiceAgreement } from '../src/modules/service-hub/agreements/service-agreement.model';
import { ServicePayment } from '../src/modules/service-hub/payments/service-payment.model';
import {
  registerInternalProvider,
  convertToPermanent,
  getProviderDocuments,
} from '../src/modules/service-hub/providers/provider.service';
import {
  createServiceRequest,
  timeSlotsOverlap,
  checkProviderScheduleOverlap,
} from '../src/modules/service-hub/requests/service-request.service';

describe('ServiceHub — Core Business Rules & Edge Cases', () => {
  let foundation: any;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI!);
    foundation = await seedSection1();
    await seedSection4(foundation);
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  it('1. Verifies seeded data: 6 categories, 12 providers, active agreements & payments', async () => {
    const catCount = await ServiceCategory.countDocuments();
    expect(catCount).toBe(6);

    const providerCount = await ServiceProviderProfile.countDocuments();
    expect(providerCount).toBe(12);

    const domesticHelpCount = await ServiceProviderProfile.countDocuments({ categorySlug: 'domestic-help' });
    expect(domesticHelpCount).toBe(3);

    const internalCount = await ServiceProviderProfile.countDocuments({ providerType: 'INTERNAL' });
    expect(internalCount).toBe(7);

    const activeAgreements = await ServiceAgreement.countDocuments({ status: 'LOCKED' });
    expect(activeAgreements).toBeGreaterThanOrEqual(1);

    const overduePayments = await ServicePayment.countDocuments({ status: 'OVERDUE' });
    expect(overduePayments).toBeGreaterThanOrEqual(1);
  });

  it('2. Rule: Domestic help providers are EXTERNAL ONLY (residents cannot register as domestic help)', async () => {
    const residentUserId = foundation.users['suresh.kumar'].toString();

    await expect(
      registerInternalProvider({
        userId: residentUserId,
        societyId: foundation.societyId.toString(),
        name: 'Suresh Resident',
        phone: '+919999999999',
        categorySlug: 'domestic-help',
        optionsOffered: ['Cleaning + Washing Utensils'],
      }),
    ).rejects.toThrow(/Domestic help providers must be external/i);
  });

  it('3. Rule: Self-Booking Block (residents cannot book themselves as a provider)', async () => {
    const priyaProfile = await ServiceProviderProfile.findOne({ name: 'Priya Sharma' });
    expect(priyaProfile).toBeDefined();

    await expect(
      createServiceRequest({
        seekerId: priyaProfile!.userId.toString(),
        societyId: foundation.societyId.toString(),
        providerProfileId: priyaProfile!._id.toString(),
        categorySlug: priyaProfile!.categorySlug,
        optionSlug: 'school-tuition',
        workType: 'TEMPORARY',
        startDate: new Date(),
        dailyTimeSlot: { from: '10:00', to: '12:00' },
        daysOfWeek: [1, 2, 3],
        requirementsText: 'Tuition for myself',
      }),
    ).rejects.toThrow(/cannot request a service from yourself/i);
  });

  it('4. Rule: One-Way Conversion (permanent account cannot be converted back to temporary)', async () => {
    const permProvider = await ServiceProviderProfile.findOne({ accountType: 'PERMANENT' });
    expect(permProvider).toBeDefined();

    await expect(
      convertToPermanent(permProvider!._id.toString(), foundation.presidentId.toString()),
    ).rejects.toThrow(/already PERMANENT/i);
  });

  it('5. Rule: Schedule Overlap Detection blocks conflicting bookings for same provider', async () => {
    expect(timeSlotsOverlap({ from: '10:00', to: '14:00' }, { from: '12:00', to: '16:00' })).toBe(true);
    expect(timeSlotsOverlap({ from: '10:00', to: '12:00' }, { from: '14:00', to: '16:00' })).toBe(false);

    const priyaProfile = await ServiceProviderProfile.findOne({ name: 'Priya Sharma' });
    expect(priyaProfile).toBeDefined();

    // Priya already has an active locked agreement for 17:00 - 18:30 on weekdays [1, 2, 3, 4, 5]
    const conflictResult = await checkProviderScheduleOverlap(
      priyaProfile!.userId,
      new Date('2026-11-10'),
      new Date('2026-11-20'),
      false,
      [1, 3],
      { from: '17:30', to: '18:00' },
    );
    expect(conflictResult.hasConflict).toBe(true);
  });

  it('6. Rule: Document Privacy Guard (only President and owning Provider can view documents)', async () => {
    const lakshmi = await ServiceProviderProfile.findOne({ name: 'Lakshmi Devi' });
    expect(lakshmi).toBeDefined();

    // President can view
    const presDocs = await getProviderDocuments(
      lakshmi!._id.toString(),
      foundation.presidentId.toString(),
      'president',
    );
    expect(presDocs.length).toBeGreaterThanOrEqual(1);

    // Owning provider can view
    const ownerDocs = await getProviderDocuments(
      lakshmi!._id.toString(),
      lakshmi!.userId.toString(),
      'provider_external',
    );
    expect(ownerDocs.length).toBeGreaterThanOrEqual(1);

    // Unrelated resident cannot view
    const strangerId = foundation.users['suresh.kumar'].toString();
    await expect(
      getProviderDocuments(lakshmi!._id.toString(), strangerId, 'resident'),
    ).rejects.toThrow(/Access denied/i);
  });
});

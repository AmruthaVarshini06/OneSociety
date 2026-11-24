import mongoose from 'mongoose';
import { seedSection1 } from '../scripts/seed/section1-foundation';
import { seedSection3 } from '../scripts/seed/section3-sharerent';
import { RentalItem } from '../src/modules/share-rent/items/rental-item.model';
import { RentalBooking } from '../src/modules/share-rent/bookings/rental-booking.model';
import { RentalDispute } from '../src/modules/share-rent/disputes/rental-dispute.model';
import { RentalCatalogCategory } from '../src/modules/share-rent/catalog/catalog-category.model';
import { RentalItemRequest } from '../src/modules/share-rent/requests/item-request.model';
import { RentalRating } from '../src/modules/share-rent/ratings/rental-rating.model';

describe('Share and Rent — Seed & Integrity Verification', () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI!);
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  it('should seed foundation and share-rent data cleanly and idempotently', async () => {
    const f1 = await seedSection1();
    expect(f1.societyId).toBeDefined();
    expect(Object.keys(f1.flats)).toHaveLength(24);
    expect(Object.keys(f1.users).length).toBeGreaterThanOrEqual(28);

    await seedSection3(f1);

    const categoriesCount = await RentalCatalogCategory.countDocuments();
    expect(categoriesCount).toBe(9);

    const itemsCount = await RentalItem.countDocuments();
    expect(itemsCount).toBe(23); // 22 published + 1 draft rejected

    const bookingsCount = await RentalBooking.countDocuments();
    expect(bookingsCount).toBe(6);

    const disputesCount = await RentalDispute.countDocuments();
    expect(disputesCount).toBe(1);

    const requestsCount = await RentalItemRequest.countDocuments();
    expect(requestsCount).toBe(1);

    const ratingsCount = await RentalRating.countDocuments();
    expect(ratingsCount).toBe(8);

    // Run again to verify idempotence
    await seedSection3(f1);
    expect(await RentalItem.countDocuments()).toBe(23);
    expect(await RentalBooking.countDocuments()).toBe(6);
  });
});

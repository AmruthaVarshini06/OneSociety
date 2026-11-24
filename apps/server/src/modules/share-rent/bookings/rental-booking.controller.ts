import type { Request, Response } from 'express';
import * as bookingService from './rental-booking.service';
import {
  createBookingSchema,
  respondBookingSchema,
  payBookingSchema,
  listBookingsQuerySchema,
  uploadPickupPhotosSchema,
  confirmHandoverSchema,
  requestExtensionSchema,
  respondExtensionSchema,
  payExtensionSchema,
  uploadReturnPhotosSchema,
  confirmReturnSchema,
  payOvertimeSchema,
  renterConfirmSchema,
} from './rental-booking.schema';

export async function previewBooking(req: Request, res: Response): Promise<void> {
  const { itemId, billingUnit, bookedUnits } = req.body as {
    itemId: string;
    billingUnit: 'HOUR' | 'DAY';
    bookedUnits: number;
  };
  if (!itemId || !billingUnit || !bookedUnits) {
    res.status(400).json({ success: false, message: 'itemId, billingUnit, bookedUnits required' });
    return;
  }
  const result = await bookingService.previewBooking(
    itemId,
    billingUnit,
    Number(bookedUnits),
    req.user!.societyId,
  );
  res.json({ success: true, data: result });
}

export async function createBooking(req: Request, res: Response): Promise<void> {
  const validated = createBookingSchema.parse(req.body);
  const booking = await bookingService.createBooking(
    validated,
    req.user!.userId,
    req.user!.societyId,
  );
  res.status(201).json({ success: true, data: booking });
}

export async function respondToBooking(req: Request, res: Response): Promise<void> {
  const validated = respondBookingSchema.parse(req.body);
  const booking = await bookingService.respondToBooking(
    req.params.id,
    req.user!.userId,
    validated,
  );
  res.json({ success: true, data: booking });
}

export async function payBooking(req: Request, res: Response): Promise<void> {
  const validated = payBookingSchema.parse(req.body);
  const booking = await bookingService.payBooking(
    req.params.id,
    req.user!.userId,
    validated,
  );
  res.json({ success: true, data: booking });
}

export async function cancelBooking(req: Request, res: Response): Promise<void> {
  const booking = await bookingService.cancelBooking(
    req.params.id,
    req.user!.userId,
    req.user!.societyId,
  );
  res.json({ success: true, data: booking });
}

export async function listBookings(req: Request, res: Response): Promise<void> {
  const query = listBookingsQuerySchema.parse(req.query);
  const result = await bookingService.listBookings(req.user!.userId, query);
  res.json({ success: true, data: result });
}

export async function getBookingById(req: Request, res: Response): Promise<void> {
  const booking = await bookingService.getBookingById(
    req.params.id,
    req.user!.userId,
    req.user!.role,
    req.user!.societyId,
  );
  res.json({ success: true, data: booking });
}

export async function uploadPickupPhotos(req: Request, res: Response): Promise<void> {
  const validated = uploadPickupPhotosSchema.parse(req.body);
  const booking = await bookingService.uploadPickupPhotos(
    req.params.id,
    req.user!.userId,
    req.user!.societyId,
    validated,
  );
  res.json({ success: true, data: booking });
}

export async function confirmHandover(req: Request, res: Response): Promise<void> {
  const validated = confirmHandoverSchema.parse(req.body);
  const booking = await bookingService.confirmHandover(
    req.params.id,
    req.user!.userId,
    req.user!.societyId,
    validated,
  );
  res.json({ success: true, data: booking });
}

export async function requestExtension(req: Request, res: Response): Promise<void> {
  const validated = requestExtensionSchema.parse(req.body);
  const booking = await bookingService.requestExtension(
    req.params.id,
    req.user!.userId,
    req.user!.societyId,
    validated,
  );
  res.json({ success: true, data: booking });
}

export async function respondExtension(req: Request, res: Response): Promise<void> {
  const validated = respondExtensionSchema.parse(req.body);
  const booking = await bookingService.respondExtension(
    req.params.id,
    req.user!.userId,
    req.user!.societyId,
    validated,
  );
  res.json({ success: true, data: booking });
}

export async function payExtension(req: Request, res: Response): Promise<void> {
  const validated = payExtensionSchema.parse(req.body);
  const booking = await bookingService.payExtension(
    req.params.id,
    req.user!.userId,
    req.user!.societyId,
    validated,
  );
  res.json({ success: true, data: booking });
}

export async function uploadReturnPhotos(req: Request, res: Response): Promise<void> {
  const validated = uploadReturnPhotosSchema.parse(req.body);
  const booking = await bookingService.uploadReturnPhotos(
    req.params.id,
    req.user!.userId,
    req.user!.societyId,
    validated,
  );
  res.json({ success: true, data: booking });
}

export async function calculateReturnSummary(req: Request, res: Response): Promise<void> {
  const result = await bookingService.calculateReturnSummary(
    req.params.id,
    req.user!.societyId,
  );
  res.json({ success: true, data: result });
}

export async function confirmReturn(req: Request, res: Response): Promise<void> {
  const validated = confirmReturnSchema.parse(req.body);
  const booking = await bookingService.confirmReturn(
    req.params.id,
    req.user!.userId,
    req.user!.societyId,
    validated,
  );
  res.json({ success: true, data: booking });
}

export async function payOvertime(req: Request, res: Response): Promise<void> {
  const validated = payOvertimeSchema.parse(req.body);
  const booking = await bookingService.payOvertime(
    req.params.id,
    req.user!.userId,
    req.user!.societyId,
    validated,
  );
  res.json({ success: true, data: booking });
}

export async function renterConfirmReturn(req: Request, res: Response): Promise<void> {
  const validated = renterConfirmSchema.parse(req.body);
  const booking = await bookingService.renterConfirmReturn(
    req.params.id,
    req.user!.userId,
    req.user!.societyId,
    validated,
  );
  res.json({ success: true, data: booking });
}

export async function settleBooking(req: Request, res: Response): Promise<void> {
  const booking = await bookingService.settleBooking(
    req.params.id,
    req.user!.userId,
    req.user!.societyId,
  );
  res.json({ success: true, data: booking });
}

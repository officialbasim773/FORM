import type { AppointmentConfig, BookingChoice, Slot } from "./appointments";
import type { FormRecord, Receipt, TeamMember } from "./model";

export type StoredForm = Omit<FormRecord, "draft" | "published"> & {
  draft: string;
  published: string | null;
  deleted: number;
};
export type StoredMember = TeamMember & {
  business_id: string;
  user_id: string | null;
  invite_hash: string | null;
  created_at: string;
};
export type BookingStatus =
  "pending" | "confirmed" | "declined" | "cancelled" | "completed" | "no_show";
export interface BookingDetails {
  customer: string;
  email: string;
  customerPhone: string;
  notes: string;
  serviceName: string;
  providerName: string;
  price: number;
  currency: string;
  answers?: Receipt["answers"];
}
export interface Booking {
  id: string;
  business_id: string;
  form_id: string | null;
  submission_id: string | null;
  customer_id: string | null;
  service_id: string;
  provider_id: string;
  start: string;
  end: string;
  occupied_end: string;
  timezone: string;
  status: BookingStatus;
  revision: number;
  schedule_revision: number;
  details: BookingDetails;
  confirmation: string;
  payload_hash: string;
  token_hash: string;
  created_at: string;
  updated_at: string;
}
export type StoredBooking = Omit<Booking, "details"> & { details: string };
export interface AppointmentCustomer {
  id: string;
  name: string;
  email: string;
  phone: string;
  notes: string;
  archived: number;
  revision: number;
  created_at: string;
  updated_at: string;
  booking_count: number;
  last_booking: string | null;
}
export interface CustomerProfile {
  customer: AppointmentCustomer;
  bookings: Booking[];
}
export interface BookingActivity {
  action: string;
  start: string;
  end: string;
  provider_id: string;
  created_at: string;
}
export interface BookingProfile {
  booking: Booking;
  activity: BookingActivity[];
}
export interface AppointmentSettings {
  enabled: boolean;
  revision: number;
  config: AppointmentConfig;
  team: { id: string; name: string }[];
  bookingPath: string;
}
export interface BookingRequest {
  appointment: BookingChoice;
  customer: { name: string; email: string; phone: string; notes: string };
  idempotency: string;
  token: string;
  startedAt: number;
  website: string;
}
export type AvailableSlot = Slot;

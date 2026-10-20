CREATE TABLE appointment_settings (
 business_id TEXT PRIMARY KEY REFERENCES businesses(id), enabled INTEGER NOT NULL DEFAULT 0,
 revision INTEGER NOT NULL DEFAULT 0, config TEXT NOT NULL
);
CREATE TABLE bookings (
 id TEXT PRIMARY KEY, business_id TEXT NOT NULL REFERENCES businesses(id),
 form_id TEXT NOT NULL REFERENCES forms(id), submission_id TEXT UNIQUE REFERENCES submissions(id) ON DELETE SET NULL,
 service_id TEXT NOT NULL, provider_id TEXT NOT NULL, start TEXT NOT NULL, end TEXT NOT NULL,
 occupied_end TEXT NOT NULL, timezone TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'confirmed' CHECK(status IN ('confirmed','cancelled','completed','no_show')),
 revision INTEGER NOT NULL DEFAULT 0, schedule_revision INTEGER NOT NULL,
 details TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
 CHECK(start < end AND end <= occupied_end)
);
CREATE INDEX idx_bookings_availability ON bookings(business_id,provider_id,start,occupied_end);
CREATE INDEX idx_bookings_calendar ON bookings(business_id,start);
CREATE TRIGGER bookings_validate_insert BEFORE INSERT ON bookings BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM appointment_settings WHERE business_id=NEW.business_id AND enabled=1 AND revision=NEW.schedule_revision) THEN RAISE(ABORT,'APPOINTMENT_SETTINGS_CHANGED') END;
 SELECT CASE WHEN NEW.provider_id <> 'owner' AND NOT EXISTS(SELECT 1 FROM members WHERE id=NEW.provider_id AND business_id=NEW.business_id AND status='active') THEN RAISE(ABORT,'APPOINTMENT_PROVIDER_UNAVAILABLE') END;
 SELECT CASE WHEN EXISTS(SELECT 1 FROM bookings WHERE business_id=NEW.business_id AND provider_id=NEW.provider_id AND status<>'cancelled' AND start<NEW.occupied_end AND occupied_end>NEW.start) THEN RAISE(ABORT,'APPOINTMENT_CONFLICT') END;
END;
CREATE TRIGGER bookings_validate_reschedule BEFORE UPDATE OF start,end,occupied_end,provider_id ON bookings BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM appointment_settings WHERE business_id=NEW.business_id AND enabled=1 AND revision=NEW.schedule_revision) THEN RAISE(ABORT,'APPOINTMENT_SETTINGS_CHANGED') END;
 SELECT CASE WHEN NEW.provider_id <> 'owner' AND NOT EXISTS(SELECT 1 FROM members WHERE id=NEW.provider_id AND business_id=NEW.business_id AND status='active') THEN RAISE(ABORT,'APPOINTMENT_PROVIDER_UNAVAILABLE') END;
 SELECT CASE WHEN EXISTS(SELECT 1 FROM bookings WHERE id<>NEW.id AND business_id=NEW.business_id AND provider_id=NEW.provider_id AND status<>'cancelled' AND start<NEW.occupied_end AND occupied_end>NEW.start) THEN RAISE(ABORT,'APPOINTMENT_CONFLICT') END;
END;

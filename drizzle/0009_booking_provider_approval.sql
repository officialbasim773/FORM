-- Recheck provider membership atomically when a pending request is accepted.
-- Membership can change after the request was submitted or displayed.
CREATE TRIGGER bookings_validate_approval BEFORE UPDATE OF status ON bookings
WHEN OLD.status='pending' AND NEW.status='confirmed'
BEGIN
 SELECT CASE WHEN NEW.provider_id <> 'owner' AND NOT EXISTS(
   SELECT 1 FROM members WHERE id=NEW.provider_id
   AND business_id=NEW.business_id AND status='active'
 ) THEN RAISE(ABORT,'APPOINTMENT_PROVIDER_UNAVAILABLE') END;
END;

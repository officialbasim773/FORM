CREATE TABLE appointment_customers (
 id TEXT PRIMARY KEY, business_id TEXT NOT NULL REFERENCES businesses(id),
 name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT NOT NULL,
 notes TEXT NOT NULL DEFAULT '', archived INTEGER NOT NULL DEFAULT 0,
 revision INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
 UNIQUE(business_id,email,phone)
);
ALTER TABLE bookings ADD COLUMN customer_id TEXT REFERENCES appointment_customers(id);
INSERT OR IGNORE INTO appointment_customers(id,business_id,name,email,phone,created_at,updated_at)
 SELECT lower(hex(randomblob(16))),business_id,coalesce(json_extract(details,'$.customer'),''),lower(trim(json_extract(details,'$.email'))),coalesce(json_extract(details,'$.customerPhone'),''),created_at,updated_at FROM bookings WHERE json_extract(details,'$.email') IS NOT NULL ORDER BY created_at;
UPDATE bookings SET customer_id=(SELECT id FROM appointment_customers c WHERE c.business_id=bookings.business_id AND c.email=lower(trim(json_extract(bookings.details,'$.email'))) AND c.phone=coalesce(json_extract(bookings.details,'$.customerPhone'),''));
CREATE INDEX idx_booking_customer ON bookings(business_id,customer_id,start);
CREATE TRIGGER booking_customer_link AFTER INSERT ON bookings WHEN json_extract(NEW.details,'$.email') IS NOT NULL BEGIN
 INSERT OR IGNORE INTO appointment_customers(id,business_id,name,email,phone,created_at,updated_at) VALUES(lower(hex(randomblob(16))),NEW.business_id,json_extract(NEW.details,'$.customer'),lower(trim(json_extract(NEW.details,'$.email'))),coalesce(json_extract(NEW.details,'$.customerPhone'),''),NEW.created_at,NEW.updated_at);
 UPDATE bookings SET customer_id=(SELECT id FROM appointment_customers WHERE business_id=NEW.business_id AND email=lower(trim(json_extract(NEW.details,'$.email'))) AND phone=coalesce(json_extract(NEW.details,'$.customerPhone'),'')) WHERE id=NEW.id;
END;
CREATE TABLE appointment_activity (
 id INTEGER PRIMARY KEY AUTOINCREMENT, business_id TEXT NOT NULL, booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
 action TEXT NOT NULL, start TEXT NOT NULL, end TEXT NOT NULL, provider_id TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TRIGGER booking_activity_insert AFTER INSERT ON bookings BEGIN
 INSERT INTO appointment_activity(business_id,booking_id,action,start,end,provider_id,created_at) VALUES(NEW.business_id,NEW.id,NEW.status,NEW.start,NEW.end,NEW.provider_id,NEW.created_at);
END;
CREATE TRIGGER booking_activity_change AFTER UPDATE OF status,start,provider_id ON bookings WHEN NEW.status<>OLD.status OR NEW.start<>OLD.start OR NEW.provider_id<>OLD.provider_id BEGIN
 INSERT INTO appointment_activity(business_id,booking_id,action,start,end,provider_id,created_at) VALUES(NEW.business_id,NEW.id,CASE WHEN NEW.status<>OLD.status THEN NEW.status ELSE 'rescheduled' END,NEW.start,NEW.end,NEW.provider_id,NEW.updated_at);
END;

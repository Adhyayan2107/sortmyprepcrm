-- Fix: partial unique index on lead_contacts is incompatible with PostgREST's
-- ON CONFLICT (lead_id, email) clause. Replace with a full unique constraint.
-- PostgreSQL treats NULL as distinct in UNIQUE, so multiple email-less contacts
-- per lead are still allowed.

DROP INDEX IF EXISTS lead_contacts_lead_email_uidx;

ALTER TABLE lead_contacts
  ADD CONSTRAINT lead_contacts_lead_email_key UNIQUE (lead_id, email);

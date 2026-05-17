-- Auto-update contacts.last_interaction_at whenever a contact_log is inserted
CREATE OR REPLACE FUNCTION contact_logs_update_interaction()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE contacts
  SET last_interaction_at = NEW.logged_at
  WHERE id = NEW.contact_id
    AND (last_interaction_at IS NULL OR NEW.logged_at > last_interaction_at);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_contact_logs_update_interaction ON contact_logs;
CREATE TRIGGER trg_contact_logs_update_interaction
  AFTER INSERT ON contact_logs
  FOR EACH ROW EXECUTE FUNCTION contact_logs_update_interaction();

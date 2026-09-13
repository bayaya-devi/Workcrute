PRAGMA foreign_keys = ON;
ALTER TABLE v2_applicant_history ADD COLUMN event_type TEXT NOT NULL DEFAULT 'status';
CREATE TABLE v2_applicant_notes (
  id TEXT PRIMARY KEY,
  applicant_id TEXT NOT NULL REFERENCES v2_applicants(id) ON DELETE CASCADE,
  admin_identifier TEXT,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX v2_applicant_notes_idx ON v2_applicant_notes(applicant_id, created_at DESC);
INSERT INTO v2_applicant_notes(id,applicant_id,content,created_at)
SELECT 'legacy-' || id,id,admin_notes,updated_at FROM v2_applicants WHERE trim(COALESCE(admin_notes,'')) <> '';
INSERT INTO v2_applicant_history(id,applicant_id,next_status,event_type,created_at)
SELECT 'received-' || id,id,'received','received',created_at FROM v2_applicants;
CREATE TRIGGER v2_applicant_received AFTER INSERT ON v2_applicants BEGIN
  INSERT INTO v2_applicant_history(id,applicant_id,next_status,event_type,created_at)
  VALUES('received-' || NEW.id,NEW.id,'received','received',NEW.created_at);
END;
CREATE TRIGGER v2_applicant_note_added AFTER INSERT ON v2_applicant_notes BEGIN
  INSERT INTO v2_applicant_history(id,applicant_id,admin_session_id,next_status,note,event_type,created_at)
  SELECT 'note-' || NEW.id,NEW.applicant_id,NEW.admin_identifier,status,NEW.content,'note',NEW.created_at
  FROM v2_applicants WHERE id=NEW.applicant_id;
END;

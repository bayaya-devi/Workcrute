PRAGMA foreign_keys = ON;
ALTER TABLE v2_employee_profiles ADD COLUMN fixed_salary_centimes INTEGER NOT NULL DEFAULT 350000 CHECK(fixed_salary_centimes=350000);

CREATE TABLE v2_billing_profiles (
  account_id TEXT PRIMARY KEY REFERENCES v2_accounts(id),
  legal_name TEXT NOT NULL,
  address TEXT NOT NULL,
  cnif TEXT NOT NULL,
  ice TEXT NOT NULL,
  fiscal_id TEXT NOT NULL,
  professional_tax TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  signature TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE v2_billing_config (
  id INTEGER PRIMARY KEY CHECK(id=1),
  client_name TEXT NOT NULL DEFAULT 'CALL MANAGEMENT SECURITY',
  client_address TEXT NOT NULL DEFAULT '',
  tax_mention TEXT NOT NULL DEFAULT '',
  admin_email TEXT NOT NULL DEFAULT '',
  timezone TEXT NOT NULL DEFAULT 'Africa/Casablanca',
  reminders_start_period TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO v2_billing_config(id,reminders_start_period) VALUES(1,strftime('%Y-%m','now'));
CREATE TABLE v2_billing_invoices (
  id TEXT PRIMARY KEY,
  employee_account_id TEXT NOT NULL REFERENCES v2_accounts(id),
  period TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  previous_id TEXT REFERENCES v2_billing_invoices(id),
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','submitted','refused','approved','paid','cancelled','deleted')),
  service_centimes INTEGER NOT NULL DEFAULT 0 CHECK(service_centimes>=0),
  expenses_centimes INTEGER NOT NULL DEFAULT 0 CHECK(expenses_centimes>=0),
  bonus_centimes INTEGER NOT NULL DEFAULT 0 CHECK(bonus_centimes>=0),
  other_centimes INTEGER NOT NULL DEFAULT 0 CHECK(other_centimes>=0),
  details_json TEXT NOT NULL DEFAULT '{}',
  total_centimes INTEGER NOT NULL DEFAULT 0,
  issuer_json TEXT,
  client_json TEXT,
  revision INTEGER NOT NULL DEFAULT 1,
  last_transition_id TEXT,
  reference TEXT UNIQUE,
  admin_note TEXT,
  payment_reference TEXT,
  paid_at TEXT,
  submitted_at TEXT,
  approved_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(employee_account_id,period,version)
);
CREATE UNIQUE INDEX v2_billing_active_month_idx ON v2_billing_invoices(employee_account_id,period) WHERE status IN ('draft','submitted','approved','paid');
CREATE INDEX v2_billing_period_idx ON v2_billing_invoices(period,status);
CREATE TABLE v2_billing_documents (
  invoice_id TEXT NOT NULL REFERENCES v2_billing_invoices(id),
  kind TEXT NOT NULL CHECK(kind IN ('preview','official')),
  data BLOB NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(invoice_id,kind)
);
CREATE TABLE v2_billing_history (
  id TEXT PRIMARY KEY,
  invoice_id TEXT REFERENCES v2_billing_invoices(id),
  employee_account_id TEXT NOT NULL REFERENCES v2_accounts(id),
  actor_id TEXT NOT NULL,
  event TEXT NOT NULL,
  details_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX v2_billing_history_idx ON v2_billing_history(invoice_id,created_at);
CREATE TABLE v2_billing_notifications (
  id TEXT PRIMARY KEY,
  employee_account_id TEXT NOT NULL REFERENCES v2_accounts(id),
  period TEXT NOT NULL,
  event TEXT NOT NULL,
  invoice_id TEXT REFERENCES v2_billing_invoices(id),
  read_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE v2_billing_reminders (
  id TEXT NOT NULL UNIQUE,
  employee_account_id TEXT NOT NULL REFERENCES v2_accounts(id),
  period TEXT NOT NULL,
  reminder_date TEXT NOT NULL,
  PRIMARY KEY(employee_account_id,period,reminder_date)
);
CREATE TABLE v2_billing_email_outbox (
  id TEXT PRIMARY KEY,
  dedupe_key TEXT NOT NULL UNIQUE,
  invoice_id TEXT REFERENCES v2_billing_invoices(id),
  employee_account_id TEXT NOT NULL REFERENCES v2_accounts(id),
  period TEXT NOT NULL,
  event TEXT NOT NULL,
  recipient TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'fr',
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','sent','failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  lease_until TEXT,
  next_attempt_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sent_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE v2_billing_sequence (id INTEGER PRIMARY KEY AUTOINCREMENT, invoice_id TEXT NOT NULL UNIQUE REFERENCES v2_billing_invoices(id));

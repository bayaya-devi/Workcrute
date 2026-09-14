PRAGMA foreign_keys = ON;

CREATE TABLE v2_invoice_requests (
  id TEXT PRIMARY KEY,
  employee_account_id TEXT NOT NULL REFERENCES v2_accounts(id) ON DELETE CASCADE,
  requested_for TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','reviewed','closed')),
  admin_note TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX v2_invoice_requests_employee_idx ON v2_invoice_requests(employee_account_id, created_at DESC);
CREATE INDEX v2_invoice_requests_status_idx ON v2_invoice_requests(status, created_at DESC);

CREATE TABLE v2_employee_invoices (
  id TEXT PRIMARY KEY,
  employee_account_id TEXT NOT NULL REFERENCES v2_accounts(id) ON DELETE CASCADE,
  reference TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'published' CHECK(status IN ('published','paid','cancelled')),
  document_url TEXT,
  issued_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX v2_employee_invoices_employee_idx ON v2_employee_invoices(employee_account_id, issued_at DESC);

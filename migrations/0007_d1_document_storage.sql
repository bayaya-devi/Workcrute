PRAGMA foreign_keys = ON;

CREATE TABLE document_chunks (
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  data BLOB NOT NULL,
  PRIMARY KEY(document_id, chunk_index)
);

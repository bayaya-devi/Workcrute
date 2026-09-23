import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { processV2ApplicantEmails } from '../src/v2-applicants.js';

const db=new DatabaseSync(':memory:');
db.exec(readFileSync(new URL('../migrations/0017_v2_applicants.sql',import.meta.url),'utf8'));
db.exec("INSERT INTO v2_applicants(id,reference,first_name,last_name,email,phone,city,country,professional_title,domain,experience_level,availability,consent_at,idempotency_key) VALUES('test','WC-TEST','Test','Queue','test@example.com','0','Test','Test','Test','Test','Test','Test',CURRENT_TIMESTAMP,'test')");
db.exec("INSERT INTO v2_applicant_email_outbox(id,applicant_id,audience,recipient) VALUES('mail','test','applicant','test@example.com')");
const DB={prepare(query){let args=[];return{bind(...values){args=values;return this;},async all(){return {results:db.prepare(query).all(...args)};},async first(){return db.prepare(query).get(...args);},async run(){return {meta:{changes:db.prepare(query).run(...args).changes}};}};}};
let sends=0;
const env={DB,ENVIRONMENT:'qa',EMAIL_FROM:'test@example.com',EMAIL:{async send(){sends++;await new Promise(resolve=>setTimeout(resolve,20));}}};
try {
  await Promise.all([processV2ApplicantEmails(env),processV2ApplicantEmails(env)]);
  assert.equal(sends,1,'Concurrent workers must send only once');
  await processV2ApplicantEmails(env);assert.equal(sends,1,'Sent mail must not be resent');
  db.exec("UPDATE v2_applicant_email_outbox SET status='processing',updated_at=datetime('now','-10 minutes') WHERE id='mail'");
  await processV2ApplicantEmails(env);assert.equal(sends,2,'Abandoned delivery must be recovered');
  db.exec("UPDATE v2_applicant_email_outbox SET status='pending' WHERE id='mail'");
  await processV2ApplicantEmails({...env,EMAIL:{async send(){throw new Error('TEST_FAILURE');}}});
  assert.equal(db.prepare("SELECT status FROM v2_applicant_email_outbox").get().status,'failed');
  await processV2ApplicantEmails(env);assert.equal(sends,2,'Backoff must be respected');
  db.exec("UPDATE v2_applicant_email_outbox SET next_attempt_at=datetime('now','-1 minute')");
  await processV2ApplicantEmails(env);assert.equal(sends,3);
  console.log('Applicant mail queue: concurrency, stale recovery, backoff and retry OK');
} finally {db.close();}

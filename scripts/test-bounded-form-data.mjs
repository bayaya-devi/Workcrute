import assert from 'node:assert/strict';
import { boundedFormData } from '../src/bounded-form-data.js';

const form = new FormData();
form.set('name', 'Test');
form.set('cv', new File(['%PDF-1.4\nTest'], 'cv.pdf', {type:'application/pdf'}));
const request = new Request('https://example.test', {method:'POST', body:form});
const parsed = await boundedFormData(request, 4096);
assert.equal(parsed.get('name'), 'Test');
assert.equal(await parsed.get('cv').text(), '%PDF-1.4\nTest');
let chunks = 0;
const stream = new ReadableStream({pull(controller) {chunks++;controller.enqueue(new Uint8Array(1024));}});
const oversized = new Request('https://example.test', {method:'POST',headers:{'content-type':'multipart/form-data; boundary=test'},body:stream,duplex:'half'});
await assert.rejects(boundedFormData(oversized, 4096), /PAYLOAD_TOO_LARGE/);
assert.ok(chunks < 10, 'Oversized stream must stop being read');
console.log('Multipart accepted unchanged; unbounded stream rejected before buffering: OK');

export async function boundedFormData(request, maxBytes) {
  let size = 0;
  let exceeded = false;
  if (!request.body) return request.formData();
  const body = request.body.pipeThrough(new TransformStream({
    transform(chunk, controller) {
      size += chunk.byteLength;
      if (size > maxBytes) {
        exceeded = true;
        controller.error(new RangeError("PAYLOAD_TOO_LARGE"));
        return;
      }
      controller.enqueue(chunk);
    },
  }));
  try {
    return await new Response(body, { headers: request.headers }).formData();
  } catch (error) {
    if (exceeded) throw new RangeError("PAYLOAD_TOO_LARGE");
    throw error;
  }
}

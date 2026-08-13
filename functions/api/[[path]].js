const WORKER_ORIGIN = "https://workcrute.aetbconseil.workers.dev";

export async function onRequest(context) {
  const incoming = new URL(context.request.url);
  const target = new URL(incoming.pathname + incoming.search, WORKER_ORIGIN);
  const proxied = new Request(target, context.request);
  return fetch(proxied);
}

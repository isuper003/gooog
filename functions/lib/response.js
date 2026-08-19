export function successResponse(data, status = 200, headers = {}) {
  return new Response(JSON.stringify({ success: true, data }), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

export function errorResponse(message, status = 400, headers = {}) {
  return new Response(JSON.stringify({ success: false, error: message }), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

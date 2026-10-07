const DEFAULT_MARKETING_ORIGINS = [
  "https://voltasport.vercel.app",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

function allowedOrigins(): string[] {
  const fromEnv = [
    process.env.MARKETING_ORIGIN,
    process.env.NEXT_PUBLIC_MARKETING_URL,
    process.env.MARKETING_URL,
  ].filter((value): value is string => Boolean(value?.trim()));
  return [...new Set([...fromEnv, ...DEFAULT_MARKETING_ORIGINS])];
}

export function publicApiCorsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get("Origin");
  if (!origin) return {};
  const allowed = allowedOrigins();
  if (!allowed.includes(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

export function publicApiOptionsResponse(request: Request) {
  return new Response(null, {
    status: 204,
    headers: publicApiCorsHeaders(request),
  });
}

import { app } from "../src/app.js";
import type { IncomingMessage, ServerResponse } from "node:http";

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const protocol = req.headers["x-forwarded-proto"] ?? "https";
  const host = req.headers.host ?? "localhost";
  const url = `${protocol}://${host}${req.url ?? "/"}`;
  const method = req.method ?? "GET";
  const requestInit = {
    method,
    headers: new Headers(req.headers as Record<string, string>),
    body: method === "GET" || method === "HEAD" ? undefined : (req as unknown as ReadableStream),
    // Node's incoming request is a streaming body.
    duplex: "half",
  } as RequestInit & { duplex: "half" };
  const request = new Request(url, requestInit);
  const response = await app.handle(request);
  res.statusCode = response.status;
  response.headers.forEach((value, key) => res.setHeader(key, value));
  res.end(Buffer.from(await response.arrayBuffer()));
}
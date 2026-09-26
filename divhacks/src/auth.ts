import { createHash } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

import { toE164 } from "./phone";
import { checkCode, dropCode, issueCode, requirePepper } from "./store";

type SendBody = {
  name?: unknown;
  phone?: unknown;
  email?: unknown;
};

type VerifyBody = SendBody & {
  code?: unknown;
};

export type SendLoginCode = (phone: string, code: string) => Promise<void>;

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > 20_000) throw new Error("Request body is too large.");
    chunks.push(buffer);
  }
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Content-Length": Buffer.byteLength(payload),
  });
  res.end(payload);
}

function userId(phone: string): string {
  return `user_${createHash("sha256").update(phone).digest("hex").slice(0, 16)}`;
}

function parseSignup(body: SendBody): { name: string; phone: string; email: string } | { error: string } {
  const name = readString(body.name);
  const phoneRaw = readString(body.phone);
  if (name.length < 2) return { error: "Tell us the name you go by." };
  try {
    return { name, email: "", phone: toE164(phoneRaw) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Enter a phone number with area code." };
  }
}

export function startAuthServer(port: number, sendLoginCode: SendLoginCode) {
  requirePepper();

  const server = createServer(async (req, res) => {
    try {
      if (req.method === "OPTIONS") {
        sendJson(res, 204, {});
        return;
      }
      if (req.method === "GET" && req.url === "/health") {
        sendJson(res, 200, { ok: true });
        return;
      }
      if (req.method === "POST" && req.url === "/auth/send-code") {
        await handleSend(req, res, sendLoginCode);
        return;
      }
      if (req.method === "POST" && req.url === "/auth/verify-code") {
        await handleVerify(req, res);
        return;
      }
      sendJson(res, 404, { error: "Not found." });
    } catch (error) {
      console.error(error);
      if (!res.headersSent) sendJson(res, 400, { error: "Could not read that request." });
    }
  });

  server.listen(port, "0.0.0.0", () => {
    console.log(`Auth server listening on http://0.0.0.0:${port}`);
  });
}

async function handleSend(req: IncomingMessage, res: ServerResponse, sendLoginCode: SendLoginCode) {
  const parsed = parseSignup((await readJson(req)) as SendBody);
  if ("error" in parsed) {
    sendJson(res, 400, { error: parsed.error });
    return;
  }

  const issued = issueCode(parsed);
  if ("error" in issued) {
    sendJson(res, issued.status, { error: issued.error });
    return;
  }

  try {
    await sendLoginCode(parsed.phone, issued.code);
  } catch (error) {
    dropCode(parsed.phone);
    console.error("Photon send failed", error);
    sendJson(res, 502, {
      error: "Could not text that number. On a free Photon plan, add this phone as a project user in the dashboard, then try again.",
    });
    return;
  }

  console.log(`Login code sent to ${parsed.phone.slice(0, 3)}…${parsed.phone.slice(-4)}`);
  sendJson(res, 200, { ok: true });
}

async function handleVerify(req: IncomingMessage, res: ServerResponse) {
  const body = (await readJson(req)) as VerifyBody;
  const parsed = parseSignup(body);
  if ("error" in parsed) {
    sendJson(res, 400, { error: parsed.error });
    return;
  }
  const code = readString(body.code);
  if (!/^\d{4}$/.test(code)) {
    sendJson(res, 400, { error: "Enter the 4-digit code." });
    return;
  }

  const result = checkCode(parsed.phone, code);
  if (!result.ok) {
    sendJson(res, result.status, { error: result.error });
    return;
  }

  sendJson(res, 200, {
    id: userId(parsed.phone),
    name: result.name,
    phone: parsed.phone,
    email: result.email,
    interests: [],
    cuisines: [],
    availability: [],
  });
}

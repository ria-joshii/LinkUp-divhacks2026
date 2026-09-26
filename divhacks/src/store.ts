import { createHash, randomInt, timingSafeEqual } from "node:crypto";

const TTL_MS = 10 * 60 * 1000;
const RESEND_MS = 30 * 1000;
const MAX_ATTEMPTS = 5;

type PendingCode = {
  hash: string;
  expiresAt: number;
  sentAt: number;
  attempts: number;
  name: string;
  email: string;
};

type IssueResult = { code: string } | { error: string; status: number };

type CheckResult =
  | { ok: true; name: string; email: string }
  | { ok: false; error: string; status: number };

const pending = new Map<string, PendingCode>();

export function requirePepper(): string {
  const value = process.env.CODE_PEPPER?.trim();
  if (!value) throw new Error("Missing CODE_PEPPER in divhacks/.env");
  return value;
}

function hashCode(phone: string, code: string): string {
  return createHash("sha256").update(`${requirePepper()}:${phone}:${code}`).digest("hex");
}

function hashesMatch(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function issueCode(input: { phone: string; name: string; email: string }): IssueResult {
  const now = Date.now();
  const existing = pending.get(input.phone);
  if (existing && existing.expiresAt > now && now - existing.sentAt < RESEND_MS) {
    return { error: "Wait a few seconds before requesting another code.", status: 429 };
  }

  const code = randomInt(0, 10_000).toString().padStart(4, "0");
  pending.set(input.phone, {
    hash: hashCode(input.phone, code),
    expiresAt: now + TTL_MS,
    sentAt: now,
    attempts: 0,
    name: input.name,
    email: input.email,
  });
  return { code };
}

export function dropCode(phone: string) {
  pending.delete(phone);
}

export function checkCode(phone: string, code: string): CheckResult {
  const record = pending.get(phone);
  if (!record || record.expiresAt <= Date.now()) {
    pending.delete(phone);
    return { ok: false, error: "That code expired. Request a new one.", status: 401 };
  }

  if (!hashesMatch(hashCode(phone, code), record.hash)) {
    record.attempts += 1;
    if (record.attempts >= MAX_ATTEMPTS) {
      pending.delete(phone);
      return { ok: false, error: "Too many tries. Request a new code.", status: 429 };
    }
    return { ok: false, error: "That code does not match.", status: 401 };
  }

  pending.delete(phone);
  return { ok: true, name: record.name, email: record.email };
}

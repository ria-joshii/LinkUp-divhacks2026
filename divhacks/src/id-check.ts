import { spawn } from "node:child_process";
import { mkdtemp, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(new URL("./read-id-text.swift", import.meta.url));
const binaryPath = join(tmpdir(), "blindspot-read-id-text");

function nameTokens(value: string): string[] {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((part) => part.length >= 2);
}

/** Every word in the profile name has to show up on the ID. */
export function namesMatch(profileName: string, ocrText: string): boolean {
  const expected = nameTokens(profileName);
  if (expected.length === 0) return false;
  const found = new Set(nameTokens(ocrText));
  return expected.every((part) => found.has(part));
}

function run(command: string, args: string[], timeout = 60_000): Promise<{ code: number | null; stdout: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { timeout });
    let stdout = "";
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
      if (stdout.length > 20_000) child.kill();
    });
    child.on("error", () => reject(new Error("Could not read that photo on this computer.")));
    child.on("close", (code) => resolve({ code, stdout }));
  });
}

async function ocrBinary(): Promise<string> {
  const scriptStat = await stat(scriptPath);
  const binStat = await stat(binaryPath).catch(() => null);
  if (binStat && binStat.mtimeMs >= scriptStat.mtimeMs) return binaryPath;

  const sdk = await run("xcrun", ["--show-sdk-path"]);
  if (sdk.code !== 0 || !sdk.stdout.trim()) {
    throw new Error("Could not read that photo on this computer.");
  }
  const compiled = await run("swiftc", ["-O", "-sdk", sdk.stdout.trim(), "-o", binaryPath, scriptPath]);
  if (compiled.code !== 0) throw new Error("Could not read that photo on this computer.");
  return binaryPath;
}

async function recognize(file: string): Promise<string> {
  const binary = await ocrBinary();
  const result = await run(binary, [file], 20_000);
  if (result.code !== 0) {
    throw new Error("Could not read a name on that photo. Try a brighter, flatter picture.");
  }
  return result.stdout;
}

/** Reads the photo on this computer, compares the name, and deletes the file. */
export async function idNameMatches(profileName: string, imageBase64: string): Promise<boolean> {
  if (process.platform !== "darwin") {
    throw new Error("The name check runs on the Mac that hosts the auth server.");
  }
  const bytes = Buffer.from(imageBase64, "base64");
  if (bytes.length < 100) throw new Error("That photo could not be read. Take another one.");

  const dir = await mkdtemp(join(tmpdir(), "blindspot-id-"));
  try {
    const file = join(dir, "id.jpg");
    await writeFile(file, bytes);
    const text = await recognize(file);
    if (!text.trim()) {
      throw new Error("No name could be read. Hold the ID flat in bright light and try again.");
    }
    return namesMatch(profileName, text);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

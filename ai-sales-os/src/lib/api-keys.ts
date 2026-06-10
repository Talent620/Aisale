import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

/**
 * API keys for the public REST API (`/api/v1/*`). Plaintext keys look like
 * `sk_live_<40 hex>`; only the SHA-256 digest is stored, so a leaked database
 * never leaks usable keys. The plaintext is returned exactly once at creation.
 */

function hashKey(plaintext: string): string {
  return createHash("sha256").update(plaintext).digest("hex");
}

export async function createApiKey(companyId: string, name: string) {
  const plaintext = `sk_live_${randomBytes(20).toString("hex")}`;
  const key = await prisma.apiKey.create({
    data: {
      companyId,
      name,
      prefix: plaintext.slice(0, 15),
      keyHash: hashKey(plaintext),
    },
  });
  return { key, plaintext };
}

/** Resolve a Bearer token to its company; null when invalid or revoked. */
export async function verifyApiKey(req: Request): Promise<{ companyId: string; keyId: string } | null> {
  const header = req.headers.get("authorization") ?? "";
  const m = header.match(/^Bearer\s+(sk_live_[a-f0-9]{40})$/i);
  if (!m) return null;

  const key = await prisma.apiKey.findUnique({ where: { keyHash: hashKey(m[1]) } });
  if (!key || key.revokedAt) return null;

  // Best-effort usage stamp; never block the request on it.
  prisma.apiKey
    .update({ where: { id: key.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {});

  return { companyId: key.companyId, keyId: key.id };
}

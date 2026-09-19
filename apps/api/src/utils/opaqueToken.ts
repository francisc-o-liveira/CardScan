import crypto from "node:crypto";

/** Generates a random opaque token plus its stored hash (refresh tokens, password-reset tokens). */
export const generateOpaqueToken = () => {
  const token = crypto.randomBytes(48).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  return { token, tokenHash };
};

export const hashOpaqueToken = (token: string): string =>
  crypto.createHash("sha256").update(token).digest("hex");

// src/lib/crypto.ts
// Utility functions for simple cryptographic operations used in the client.

/**
 * Hashes a passcode using SHA-256 and returns a hex string.
 * This is used for storing a hashed version of the user's optional local passcode.
 * The function works in browsers supporting the SubtleCrypto API.
 */
export async function hashPasscode(passcode: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(passcode);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  // Convert buffer to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

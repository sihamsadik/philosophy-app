// Re-export shim — parseBody() + the re-exported @agora-server/contract zod schemas now live in the
// @agora/core kernel. Import sites keep using "../lib/validation.js".
export * from "@philosophy/core/lib/validation";

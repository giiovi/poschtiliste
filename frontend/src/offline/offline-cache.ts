// must match the runtime cache name in vite.config.ts
export const OFFLINE_API_CACHE = "poschtiliste-api";

// cached api responses belong to the logged-in user, so they are removed whenever the user changes
export async function clearOfflineCache(): Promise<void> {
  if (typeof caches === "undefined") {
    return;
  }

  await caches.delete(OFFLINE_API_CACHE).catch(() => false);
}

import type { Database } from "../db/database";
import type { Artist } from "../types/artist";

export interface ArtistService {
  findByNamePrefix(prefix: string): Promise<Artist[]>;
  list(limit: number): Promise<Artist[]>;
}

export function createArtistService(database: Database): ArtistService {
  return {
    async findByNamePrefix(prefix: string): Promise<Artist[]> {
      const normalizedPrefix = prefix.trim();

      if (normalizedPrefix.length === 0) {
        return [];
      }

      return database.all<Artist>(
        "SELECT ArtistId, Name FROM artists WHERE Name LIKE ? ORDER BY Random()",
        [`${normalizedPrefix}%`],
      );
    },

    async list(limit: number): Promise<Artist[]> {
      if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
        throw new RangeError(
          "Artist limit must be an integer between 1 and 100",
        );
      }

      return database.all<Artist>(
        "SELECT ArtistId, Name FROM artists LIMIT ?",
        [limit],
      );
    },
  };
}

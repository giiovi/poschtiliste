import type { Database } from "../src/db/database";
import { createArtistService } from "../src/services/artist-service";
import type { Artist } from "../src/types/artist";

function createDatabaseStub(rows: Artist[] = []): {
  database: Database;
  all: jest.Mock;
} {
  const all = jest.fn().mockResolvedValue(rows);

  return {
    database: { all },
    all,
  };
}

describe("artist service", () => {
  test("normalizes a name prefix and queries the database", async () => {
    const artists = [{ ArtistId: 1, Name: "AC/DC" }];
    const { database, all } = createDatabaseStub(artists);
    const service = createArtistService(database);

    await expect(service.findByNamePrefix("  A ")).resolves.toEqual(artists);
    expect(all).toHaveBeenCalledWith(expect.stringContaining("Name LIKE ?"), [
      "A%",
    ]);
  });

  test("returns no artists for an empty prefix without querying", async () => {
    const { database, all } = createDatabaseStub();
    const service = createArtistService(database);

    await expect(service.findByNamePrefix("   ")).resolves.toEqual([]);
    expect(all).not.toHaveBeenCalled();
  });

  test("uses the requested list limit", async () => {
    const { database, all } = createDatabaseStub();
    const service = createArtistService(database);

    await service.list(10);

    expect(all).toHaveBeenCalledWith(expect.stringContaining("LIMIT ?"), [10]);
  });

  test.each([0, 101, 1.5, Number.NaN])(
    "rejects the invalid list limit %p",
    async (limit) => {
      const { database, all } = createDatabaseStub();
      const service = createArtistService(database);

      await expect(service.list(limit)).rejects.toThrow(RangeError);
      expect(all).not.toHaveBeenCalled();
    },
  );
});

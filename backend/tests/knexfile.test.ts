import { createKnexConfig } from "../src/db/knex-config";

const environment: NodeJS.ProcessEnv = {
  DATABASE_CLIENT: "sqlite3",
  DATABASE_FILENAME: "./data/development.sqlite",
  TEST_DATABASE_CLIENT: "sqlite3",
  TEST_DATABASE_FILENAME: "./data/test.sqlite",
};

describe("Knex configuration", () => {
  test("uses separate development and test databases", () => {
    const config = createKnexConfig(environment);

    expect(config.development.connection).toEqual({
      filename: "./data/development.sqlite",
    });
    expect(config.test.connection).toEqual({
      filename: "./data/test.sqlite",
    });
  });

  test("reads the database clients from environment variables", () => {
    const config = createKnexConfig({
      ...environment,
      DATABASE_CLIENT: "development-client",
      TEST_DATABASE_CLIENT: "test-client",
    });

    expect(config.development.client).toBe("development-client");
    expect(config.test.client).toBe("test-client");
  });

  test("rejects a missing database parameter", () => {
    expect(() =>
      createKnexConfig({
        ...environment,
        TEST_DATABASE_FILENAME: "",
      }),
    ).toThrow("Missing required environment variable: TEST_DATABASE_FILENAME");
  });
});

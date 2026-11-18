import {
  createKnexConfig,
  createKnexEnvironmentConfig,
} from "../src/db/knex-config";

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

  test("creates a production database config without test variables", () => {
    expect(
      createKnexEnvironmentConfig(
        {
          DATABASE_CLIENT: "sqlite3",
          DATABASE_FILENAME: "/data/poschtiliste.sqlite",
        },
        "development",
      ).connection,
    ).toEqual({ filename: "/data/poschtiliste.sqlite" });
  });

  const postgresEnvironment: NodeJS.ProcessEnv = {
    DATABASE_CLIENT: "pg",
    DATABASE_HOST: "database",
    DATABASE_NAME: "poschtiliste",
    DATABASE_USER: "poschtiliste",
    DATABASE_PASSWORD: "secret",
  };

  test("creates a postgresql config from environment variables", () => {
    const config = createKnexEnvironmentConfig(
      postgresEnvironment,
      "development",
    );

    expect(config.client).toBe("pg");
    expect(config.useNullAsDefault).toBe(false);
    expect(config.connection).toEqual({
      host: "database",
      port: 5432,
      database: "poschtiliste",
      user: "poschtiliste",
      password: "secret",
    });
  });

  test("reads the postgresql port from the environment", () => {
    const config = createKnexEnvironmentConfig(
      { ...postgresEnvironment, DATABASE_PORT: "6543" },
      "development",
    );

    expect(config.connection).toMatchObject({ port: 6543 });
  });

  test("rejects a missing postgresql password", () => {
    expect(() =>
      createKnexEnvironmentConfig(
        { ...postgresEnvironment, DATABASE_PASSWORD: "" },
        "development",
      ),
    ).toThrow("Missing required environment variable: DATABASE_PASSWORD");
  });
});

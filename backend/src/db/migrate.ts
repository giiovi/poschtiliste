import { createDatabase } from "./database";

async function migrate(): Promise<void> {
  const database = createDatabase(process.env);

  try {
    const [batch, migrations] = await database.connection.migrate.latest();
    console.log(
      migrations.length === 0
        ? "Database schema is up to date"
        : `Applied migration batch ${batch}: ${migrations.join(", ")}`,
    );
  } finally {
    await database.connection.destroy();
  }
}

void migrate().catch((error: unknown) => {
  console.error("Database migration failed", error);
  process.exitCode = 1;
});

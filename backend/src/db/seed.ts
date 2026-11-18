import { createDatabase } from "./database";

async function seed(): Promise<void> {
  const database = createDatabase(process.env);

  try {
    const [seedFiles] = await database.connection.seed.run();
    console.log(`Ran ${seedFiles.length} seed file(s)`);
  } finally {
    await database.connection.destroy();
  }
}

void seed().catch((error: unknown) => {
  console.error("Database seed failed", error);
  process.exitCode = 1;
});

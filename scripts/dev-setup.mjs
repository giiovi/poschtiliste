import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const skipDocker = process.argv.includes("--no-docker");

function run(command, args, options = {}) {
  const commandLine = `${command} ${args.join(" ")}`;
  const spawnOptions = {
    cwd: rootDirectory,
    stdio: options.quiet ? "ignore" : "inherit",
  };
  console.log(`\n> ${commandLine}`);

  // npm is a .cmd file on windows and needs a shell, args are fixed strings
  const result =
    process.platform === "win32"
      ? spawnSync(commandLine, { ...spawnOptions, shell: true })
      : spawnSync(command, args, spawnOptions);

  if (result.status !== 0 && !options.allowFailure) {
    console.error(`\nSetup failed: ${commandLine}`);
    process.exit(result.status ?? 1);
  }

  return result.status === 0;
}

function createEnvironmentFile() {
  const environmentFile = path.join(rootDirectory, ".env");

  if (existsSync(environmentFile)) {
    console.log("\n.env already exists, keeping it");
    return;
  }

  copyFileSync(path.join(rootDirectory, ".env.example"), environmentFile);
  console.log("\nCreated .env from .env.example");
}

function startDocker() {
  if (skipDocker) {
    console.log("\nSkipping Docker (--no-docker)");
    return;
  }

  if (!run("docker", ["info"], { quiet: true, allowFailure: true })) {
    console.log(
      "\nDocker is not running, skipping the container. Start Docker and run `npm run setup` again.",
    );
    return;
  }

  run("docker", ["compose", "up", "--detach", "--build"]);
}

run("npm", ["install"]);
createEnvironmentFile();
run("npm", ["run", "db:migrate"]);
run("npm", ["run", "db:seed"]);
startDocker();

console.log("\nDeveloper setup complete.");

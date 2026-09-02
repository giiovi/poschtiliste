import path from "node:path";

import dotenv from "dotenv";

import { createKnexConfig } from "./src/db/knex-config";

dotenv.config({
  path: path.resolve(__dirname, "../.env"),
  quiet: true,
});

export default createKnexConfig(process.env);

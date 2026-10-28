import { createServer } from "node:http";
import path from "node:path";

import dotenv from "dotenv";

import { createApp } from "./app";
import { createDatabase } from "./db/database";
import { encodeHTML } from "./library";
import { createSocketServer } from "./realtime/socket-server";
import { createUserService } from "./services/user-service";
import { createSessionMiddleware } from "./session";

dotenv.config({
  path: [
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), "../.env"),
  ],
  quiet: true,
});

const port = Number(process.env.PORT ?? 3000);
const database = createDatabase(process.env);
// http and socket.io share one session store
const sessionMiddleware = createSessionMiddleware(process.env);
const httpServer = createServer(createApp({ database, sessionMiddleware }));

createSocketServer(httpServer, {
  sessionMiddleware,
  userService: createUserService(database),
});

httpServer.listen(port, () => {
  console.log(`Encode HTML: ${JSON.stringify(encodeHTML([]))}`);
  console.log(`Example app listening at http://localhost:${port}`);
});

import express, { type Express } from "express";
import nunjucks from "nunjucks";
import sqlite3 from "sqlite3";

export function createApp(): Express {
  const app = express();
  const database = new sqlite3.Database("./chinook.db");

  database.on("trace", (sql: string) => {
    console.log(`DEBUG SQL: ${sql}`);
  });

  nunjucks.configure("views", {
    express: app,
    autoescape: true,
    noCache: true,
  });

  app.set("view engine", "njk");
  app.set("views", "./views");

  app.get("/api/health", (_request, response) => {
    response.json({ status: "ok" });
  });

  app.get("/", (_request, response) => {
    database.all(
      "SELECT * FROM artists WHERE Name LIKE ? ORDER BY Random()",
      ["A%"],
      (error, rows) => {
        response.render("hello.html", {
          today: new Date(),
          err: error,
          rows,
        });
      },
    );
  });

  app.get("/json-demo", (_request, response) => {
    database.all("SELECT * FROM artists LIMIT 10", (_error, rows) => {
      response.json({
        today: new Date(),
        rows,
      });
    });
  });

  return app;
}

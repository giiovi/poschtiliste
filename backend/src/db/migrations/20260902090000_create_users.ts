import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("users", (table) => {
    table.increments("id").primary();
    table.string("username", 100).notNullable().unique();
    table
      .string("password_hash", 60)
      .notNullable()
      .checkLength("=", 60, "users_password_hash_length_check");
    table
      .string("role", 20)
      .notNullable()
      .defaultTo("user")
      .checkIn(["admin", "user"], "users_role_check");
    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at").notNullable().defaultTo(knex.fn.now());

    table.check(
      "substr(password_hash, 1, 4) IN ('$2a$', '$2b$', '$2y$')",
      {},
      "users_password_hash_bcrypt_prefix_check",
    );
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable("users");
}

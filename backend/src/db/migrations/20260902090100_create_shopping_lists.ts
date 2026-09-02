import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("shopping_lists", (table) => {
    table.increments("id").primary();
    table.string("title", 255).notNullable();
    table.date("due_date").nullable();
    table
      .integer("responsible_user_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("users")
      .onUpdate("CASCADE")
      .onDelete("RESTRICT");
    table.boolean("completed").notNullable().defaultTo(false);
    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at").notNullable().defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable("shopping_lists");
}

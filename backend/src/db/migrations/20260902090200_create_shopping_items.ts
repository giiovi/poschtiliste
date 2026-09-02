import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("shopping_items", (table) => {
    table.increments("id").primary();
    table
      .integer("shopping_list_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("shopping_lists")
      .onUpdate("CASCADE")
      .onDelete("CASCADE");
    table.string("name", 255).notNullable();
    table
      .integer("quantity")
      .unsigned()
      .notNullable()
      .defaultTo(1)
      .checkPositive("shopping_items_quantity_positive_check");
    table.boolean("purchased").notNullable().defaultTo(false);
    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at").notNullable().defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable("shopping_items");
}

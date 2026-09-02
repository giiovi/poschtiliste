# Database migrations

The initial migrations create the application tables in dependency order:

1. `users`
2. `shopping_lists`
3. `shopping_items`
4. `list_assignments`

Knex rolls them back in reverse order so that foreign-key dependencies remain
valid. User passwords are stored exclusively in `password_hash`; the database
accepts only 60-character bcrypt hashes with a supported bcrypt prefix.

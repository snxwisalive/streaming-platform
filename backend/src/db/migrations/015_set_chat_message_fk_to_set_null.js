export const up = pgm => {
    pgm.sql(`
        -- Allow keeping chats/messages history after a user row is physically deleted.
        -- We switch FK actions from ON DELETE CASCADE to ON DELETE SET NULL.
        -- This requires making the FK columns nullable.

        -- chats participants
        ALTER TABLE chats
          ALTER COLUMN user1_id DROP NOT NULL,
          ALTER COLUMN user2_id DROP NOT NULL;

        DO $$
        DECLARE
          r record;
        BEGIN
          FOR r IN
            SELECT tc.constraint_name, kcu.table_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
              ON tc.constraint_name = kcu.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY'
              AND kcu.table_name = 'chats'
              AND kcu.column_name IN ('user1_id', 'user2_id')
          LOOP
            EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', r.table_name, r.constraint_name);
          END LOOP;
        END $$;

        -- Recreate constraints with SET NULL
        ALTER TABLE chats
          ADD CONSTRAINT chats_user1_id_fkey FOREIGN KEY (user1_id) REFERENCES users(user_id) ON DELETE SET NULL,
          ADD CONSTRAINT chats_user2_id_fkey FOREIGN KEY (user2_id) REFERENCES users(user_id) ON DELETE SET NULL;

        -- messages sender
        ALTER TABLE messages
          ALTER COLUMN sender_id DROP NOT NULL;

        DO $$
        DECLARE
          r record;
        BEGIN
          FOR r IN
            SELECT tc.constraint_name, kcu.table_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
              ON tc.constraint_name = kcu.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY'
              AND kcu.table_name = 'messages'
              AND kcu.column_name = 'sender_id'
          LOOP
            EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', r.table_name, r.constraint_name);
          END LOOP;
        END $$;

        ALTER TABLE messages
          ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES users(user_id) ON DELETE SET NULL;
    `);
};

export const down = pgm => {
    // Rolling back this schema change is not provided.
    // In typical deployments, this migration is one-way.
};


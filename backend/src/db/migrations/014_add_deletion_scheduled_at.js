export const up = pgm => {
    pgm.sql(`
        ALTER TABLE users
          ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
          ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP DEFAULT NULL,
          ADD COLUMN IF NOT EXISTS deletion_scheduled_at TIMESTAMP DEFAULT NULL;
    `);
};

export const down = pgm => {
    pgm.sql(`
        ALTER TABLE users
          DROP COLUMN IF EXISTS deletion_scheduled_at;
    `);
};


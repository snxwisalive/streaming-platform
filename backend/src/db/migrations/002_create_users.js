export const up = pgm => {
    pgm.createTable('users', {
        user_id: { type: 'serial', primaryKey: true },

        email: { type: 'varchar(255)', notNull: true, unique: true },
        nickname: { type: 'varchar(50)', notNull: true, unique: true },
        password_hash: { type: 'varchar(255)', notNull: true },

        birth_date: { type: 'date' },

        avatar_url: { type: 'varchar(500)' },
        banner_url: { type: 'varchar(500)' },
        bio: { type: 'text' },

        theme_color: {
            type: 'varchar(7)',
            default: '#6441A5'
        },

        is_active: {
            type: 'boolean',
            default: true
        },

        is_streamer: {
            type: 'boolean',
            default: false
        },

        phone: { type: 'varchar(20)' },

        two_factor_enabled: {
            type: 'boolean',
            default: false
        },

        created_at: {
            type: 'timestamp',
            default: pgm.func('current_timestamp')
        },

        updated_at: {
            type: 'timestamp',
            default: pgm.func('current_timestamp')
        }
    });

    pgm.createIndex('users', 'email');
    pgm.createIndex('users', 'nickname');
};

export const down = pgm => {
    pgm.dropTable('users');
};
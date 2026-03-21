export const up = pgm => {
    pgm.alterColumn('users', 'password_hash', {
        type: 'varchar(255)',
        notNull: false,
    });

    pgm.createTable('oauth_accounts', {
        id: { type: 'serial', primaryKey: true },
        user_id: {
            type: 'integer',
            notNull: true,
            references: '"users"(user_id)',
            onDelete: 'CASCADE',
        },
        provider: { type: 'varchar(50)', notNull: true },
        provider_user_id: { type: 'varchar(255)', notNull: true },
        access_token: { type: 'text' },
        refresh_token: { type: 'text' },
        expires_at: { type: 'timestamp' },
        created_at: {
            type: 'timestamp',
            default: pgm.func('current_timestamp'),
        },
    });

    pgm.addConstraint(
        'oauth_accounts',
        'oauth_accounts_provider_user_unique',
        'UNIQUE (provider, provider_user_id)'
    );

    pgm.createIndex('oauth_accounts', 'user_id');
};

export const down = pgm => {
    pgm.dropTable('oauth_accounts');
    pgm.alterColumn('users', 'password_hash', {
        type: 'varchar(255)',
        notNull: true,
    });
};
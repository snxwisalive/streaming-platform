export const up = (pgm) => {
    pgm.addColumn('users', {
        deleted_at: {
            type: 'timestamp',
            default: null
        }
    });
    pgm.createIndex('users', 'deleted_at');
};

export const down = (pgm) => {
    pgm.dropIndex('users', 'deleted_at');
    pgm.dropColumn('users', 'deleted_at');
};


export const up = (pgm) => {
    pgm.createTable("stream_chat_messages", {
        message_id: {
            type: "serial",
            primaryKey: true,
        },
        stream_user_id: {
            type: "integer",
            notNull: true,
            references: "users(user_id)",
            onDelete: "cascade",
        },
        sender_id: {
            type: "integer",
            notNull: true,
            references: "users(user_id)",
            onDelete: "cascade",
        },
        text: {
            type: "text",
            notNull: true,
        },
        created_at: {
            type: "timestamp",
            default: pgm.func("current_timestamp"),
        },
    });

    pgm.createIndex("stream_chat_messages", "stream_user_id");
    pgm.createIndex("stream_chat_messages", "sender_id");
    pgm.createIndex("stream_chat_messages", "created_at");
};

export const down = (pgm) => {
    pgm.dropTable("stream_chat_messages");
};

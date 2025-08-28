const sqlite3 = require('sqlite3').verbose();
const dbPath = 'chat.db';
const chatDb = new sqlite3.Database(dbPath, (err) => {
    if (err)
        console.log("Database opening error", err);
    else
        console.log("Connected to the SQLite database.");
    // Create messages table
    chatDb.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender TEXT NOT NULL,
      message TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
        if (err)
            console.error('Messages table creation error', err);
        else
            console.log('Messages table created or already exists.');
    });
    // Create reactions table - THIS WAS MISSING!
    chatDb.run(`
    CREATE TABLE IF NOT EXISTS reactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id INTEGER NOT NULL,
      emoji TEXT NOT NULL,
      user TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (message_id) REFERENCES messages (id)
    )
  `, (err) => {
        if (err)
            console.error('Reactions table creation error', err);
        else
            console.log('Reactions table created or already exists.');
    });
});
chatDb.insertMessage = function (sender, message, cb) {
    chatDb.run(`INSERT INTO messages (sender, message) VALUES (?, ?)`, [sender, message], function (err) {
        if (cb)
            cb(err, this ? this.lastID : undefined);
    });
};
chatDb.getMessages = function (callback) {
    chatDb.all(`SELECT * FROM messages ORDER BY timestamp ASC`, [], (err, rows) => {
        callback(err, rows);
    });
};
chatDb.addReaction = function (messageId, emoji, user, cb) {
    chatDb.run(`INSERT INTO reactions (message_id, emoji, user) VALUES (?, ?, ?)`, [messageId, emoji, user], function (err) {
        if (cb)
            cb(err);
    });
};
chatDb.getReactionsForMessage = function (messageId, callback) {
    chatDb.all(`SELECT emoji, COUNT(emoji) AS count FROM reactions WHERE message_id = ? GROUP BY emoji`, [messageId], (err, rows) => {
        callback(err, rows);
    });
};
module.exports = chatDb;
// Support both ESM default export and CommonJS require()
exports.default = chatDb;

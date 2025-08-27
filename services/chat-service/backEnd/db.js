const sqlite3 = require('sqlite3').verbose();
const dbPath = 'chat.db';
const db = new sqlite3.Database(dbPath, (err) => {
  if (err)
    console.log("Database opening error", err);
  else
    console.log("Connected to the SQLite database.");

  // Create messages table
  db.run(`
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
  db.run(`
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

db.insertMessage = function (sender, message, cb) {
  db.run(`INSERT INTO messages (sender, message) VALUES (?, ?)`, [sender, message], function (err) {
    if (cb) cb(err, this ? this.lastID : undefined);
  });
};

db.getMessages = function (callback) {
  db.all(`SELECT * FROM messages ORDER BY timestamp ASC`, [], (err, rows) => {
    callback(err, rows);
  });
};

db.addReaction = function (messageId, emoji, user, cb) {
  db.run(`INSERT INTO reactions (message_id, emoji, user) VALUES (?, ?, ?)`, [messageId, emoji, user], function (err) {
    if (cb) cb(err);
  });
};

db.getReactionsForMessage = function (messageId, callback) {
  db.all(`SELECT emoji, COUNT(emoji) AS count FROM reactions WHERE message_id = ? GROUP BY emoji`, [messageId], (err, rows) => {
    callback(err, rows);
  });
};

module.exports = db;
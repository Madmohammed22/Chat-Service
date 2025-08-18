const path = require('path');
const Fastify = require('fastify');
const WebSocket = require('ws');
const fastify = Fastify();

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

function insertMessage(sender, message) {
  db.run(`
    INSERT INTO messages (sender, message) VALUES (?, ?)
  `, [sender, message], function (err) {
    if (err) {
      console.error("Message insertion error", err);
    } else {
      console.log(`A row has been inserted with rowid ${this.lastID}`);
    }
  });
}

function getMessages(callback) {
  db.all(`
    SELECT * FROM messages ORDER BY timestamp ASC
  `, [], (err, rows) => {
    if (err) {
      console.error("Message retrieval error", err);
      callback(err, null);
    } else {
      callback(null, rows);
    }
  });
}

function addReaction(messageId, emoji, user) {
  db.run(`
       INSERT INTO reactions (message_id, emoji, user) VALUES (?, ?, ?)
     `, [messageId, emoji, user], function (err) {
    if (err) {
      console.error("Reaction insertion error..", err);
    } else {  
      console.log(`Reaction added to message ${messageId} by ${user} with emoji ${emoji}`);
    }
  });
}

function getReactionsForMessage(messageId, callback) {
  db.all(`
           SELECT emoji, COUNT(emoji) AS count FROM reactions WHERE message_id = ? GROUP BY emoji
       `, [messageId], (err, rows) => {
    if (err) {
      console.error("Error retrieving reactions:", err);
      callback(err, null);
    } else {
      callback(null, rows);
    }
  });
}

// Register static files first
fastify.register(require('@fastify/static'), {
  root: path.join('/home/mmad/Desktop/Chat/services/chat-service/frontEnd'),
});

fastify.get('/', async (request, reply) => {
  return reply.sendFile('index.html');
});

const server = fastify.server;
const wss = new WebSocket.Server({ server });

wss.on('connection', ws => {
  console.log('Client connected');

  getMessages((err, messages) => {
    if (err) {
      console.error("Error retrieving messages:", err);
    } else {
      // Fetch reactions for each message and send the combined data to the client
      Promise.all(
        messages.map(message => {
          return new Promise((resolve, reject) => {
            getReactionsForMessage(message.id, (err, reactions) => {
              if (err) {
                console.error(`Error getting reactions for message ${message.id}:`, err);
                resolve({ ...message, reactions: [] }); // Resolve with empty reactions on error
              } else {
                resolve({ ...message, reactions: reactions });
              }
            });
          });
        })
      )
      .then(messagesWithReactions => {
        ws.send(JSON.stringify({ type: 'history', messages: messagesWithReactions }));
      })
      .catch(error => {
        console.error("Error fetching reactions for initial messages:", error);
        ws.send(JSON.stringify({ type: 'history', messages: messages })); // Send messages without reactions if there's a global error
      });
    }
  });

  ws.on('message', message => {
    console.log('Chat message received:', message.toString());

    try {
      const parsedMessage = JSON.parse(message);
      if (parsedMessage.type === 'chat') {
        const sender = parsedMessage.sender;
        const text = parsedMessage.message;

        db.run(`
          INSERT INTO messages (sender, message) VALUES (?, ?)
        `, [sender, text], function (err) {
          if (err) {
            console.error("Message insertion error", err);
            return;
          }
          
          const messageId = this.lastID;
          console.log(`A row has been inserted with rowid ${messageId}`);

          // Send the message with its ID to all clients
          wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: 'chat',
                id: messageId,
                sender: sender,
                message: text
              }));
            }
          });
        });
      } else if (parsedMessage.type === 'reaction') {
        const messageId = parsedMessage.messageId;
        const emoji = parsedMessage.emoji;
        const user = parsedMessage.user; // Get the user who reacted

        addReaction(messageId, emoji, user);

        getReactionsForMessage(messageId, (err, reactions) => {
            if (err) {
                console.error("Error retrieving reactions:", err);
                return;
            }

            wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({
                        type: 'reaction',
                        messageId: messageId,
                        reactions: reactions // Send updated reactions for the message
                    }));
                }
            });
        });
      }
    } catch (error) {
      console.error("Error processing message:", error);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

let isClosing = false;

process.on('SIGINT', () => {
  if (!isClosing) {
    isClosing = true;
    db.close((err) => {
      if (err) {
        console.error('Database closing error', err);
        process.exit(1);
      } else {
        console.log('Database connection closed.');
        process.exit(0);
      }
    });
  }
});

fastify.listen({ port: 3000 }, (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Server listening on ${address}`);
});
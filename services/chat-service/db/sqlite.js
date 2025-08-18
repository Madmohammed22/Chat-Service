const sqlite3 = require('sqlite3').verbose(); // Use the correct sqlite3 package
'use strict';

// Use in-memory databases for testing
const database = new sqlite3.Database(':memory:');
const database1 = new sqlite3.Database(':memory:');

database.serialize(() => { // Use serialize to ensure operations are executed in order
  database.run(`
    CREATE TABLE data(
      key INTEGER PRIMARY KEY,
      value TEXT
    ) STRICT
  `);

  const insert = database.prepare('INSERT INTO data (key, value) VALUES (?, ?)');
  insert.run(1, 'hello');
  insert.run(2, 'world');
  insert.finalize(); // Important: Finalize the statement when done

  const query = database.prepare('SELECT * FROM data ORDER BY key');
  query.all((err, rows) => { // Use a callback for asynchronous operations
    if (err) {
      console.error(err);
    } else {
      console.log(rows);
    }
  });
  query.finalize(); // Important: Finalize the statement when done
});


database1.serialize(() => {  // Use serialize to ensure operations are executed in order
  database1.run(`
    CREATE TABLE data1(
      key INTEGER PRIMARY KEY
    ) STRICT
  `);

  const insert1 = database1.prepare('INSERT INTO data1 (key) VALUES (?)'); // Corrected INSERT statement
  insert1.run(1); // Insert a value
  insert1.run(2); // Insert another value
  insert1.finalize(); // Important: Finalize the statement when done

  const query1 = database1.prepare('SELECT * FROM data1 ORDER BY key'); // Corrected table name

  query1.all((err, rows) => { // Use a callback for asynchronous operations
    if (err) {
      console.error(err);
    } else {
      console.log(rows);
    }
  });
  query1.finalize(); // Important: Finalize the statement when done

});

// Close the databases when done (important for releasing resources)
database.close();
database1.close();
const Database = require('better-sqlite3');
function initDb () {
  const db = new Database('foobar.db', { verbose: console.log }); // create if no connection found
  db.prepare('CREATE TABLE IF NOT EXISTS insecure_users (id int PRIMARY KEY, username varchar(255) UNIQUE, insecure_password varchar(255))').run();
}

module.exports = { initDb }
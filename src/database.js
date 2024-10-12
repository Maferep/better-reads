const Database = require('better-sqlite3');
var session = require('express-session')
const SqliteStore = require("better-sqlite3-session-store")(session)
function initDb () {
  const db = new Database('foobar.db', { verbose: console.log }); // create if no connection found
  db.prepare('CREATE TABLE IF NOT EXISTS insecure_users (id int PRIMARY KEY, username varchar(255) UNIQUE, insecure_password varchar(255))').run();
}

function initSessions (app) {
	const db_sessions = new Database("sessions.db", { verbose: console.log });
	app.use(
	session({
		store: new SqliteStore({
		client: db_sessions, 
		expired: {
			clear: true,
			intervalMs: 900000 //ms = 15min
		}
		}),
		secret: "keyboard cat",
		resave: false,
	})
	)
}
module.exports = { initDb, initSessions }
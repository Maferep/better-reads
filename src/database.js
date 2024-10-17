import Database from 'better-sqlite3';
import session from 'express-session';
import _SqliteStore from "better-sqlite3-session-store";
var SqliteStore = _SqliteStore(session)

function initDb () {
  const db = new Database('database_files/foobar.db', { verbose: console.log }); // create if no connection found
  const db_stmt = 'CREATE TABLE IF NOT EXISTS insecure_users (id int PRIMARY KEY, username varchar(255) UNIQUE, insecure_password varchar(255))'
  db.prepare(db_stmt).run();

  const db_books = 'CREATE TABLE IF NOT EXISTS books (id int PRIMARY KEY, book_name varchar(255) UNIQUE, description varchar(255), isbn varchar(255))'
  db.prepare(db_books).run();
}

function initSessions (app) {
	const db_sessions = new Database('database_files/sessions.db', { verbose: console.log });
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
export { initDb, initSessions }
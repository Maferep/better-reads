import Database from 'better-sqlite3';
import session from 'express-session';
import _SqliteStore from "better-sqlite3-session-store";
var SqliteStore = _SqliteStore(session)

function initDb () {
  // Create username/password database
  const db = new Database('database_files/betterreads.db', { verbose: console.log }); // create if no connection found
  console.log("pre insecure users")
  const db_stmt = 'CREATE TABLE IF NOT EXISTS insecure_users (id int PRIMARY KEY, username varchar(255) UNIQUE, insecure_password varchar(255))'
  console.log("post insecure users")
  db.prepare(db_stmt).run();
  console.log(db_stmt)

  // create book database
  createBookDb(db);
}

function createBookDb(db) {
  const db_books = 'CREATE TABLE IF NOT EXISTS books (id int PRIMARY KEY, book_name varchar(255) UNIQUE, description varchar(255), isbn varchar(255))';
  db.prepare(db_books).run();

  const books_count = 'SELECT COUNT(*) FROM books'
  let count =db.prepare(books_count).get(); // { 'COUNT(*)': 0 }
  if(count['COUNT(*)'] <= 0) {
    const insert_books = 'INSERT INTO books VALUES (?,?,?,?)';

    // insert temporary example books
    const id = Math.floor(Math.random() * 10000000);
    db.prepare(insert_books).run(
      id,
      "The Chronicles of Narnia: The Lion, the Witch and the Wardrobe",
      "The Lion, the Witch and the Wardrobe is a portal fantasy novel for children by C. S. Lewis, published by Geoffrey Bles in 1950. It is the first published and best known of seven novels in The Chronicles of Narnia. Among all the author's books, it is also the most widely held in libraries.",
      "978-0-06-081922-4");
    db.prepare(insert_books).run(
      id + 1,
      "Prince Caspian",
      "Prince Caspian (originally published as Prince Caspian: The Return to Narnia) is a high fantasy novel for children by C. S. Lewis, published by Geoffrey Bles in 1951. It was the second published of seven novels in The Chronicles of Narnia (1950–1956), and Lewis had finished writing it in 1949, before the first book was out.[4] It is volume four in recent editions of the series, sequenced according to the internal chronology of the books. Like the others, it was illustrated by Pauline Baynes and her work has been retained in many later editions.[1][3] ",
      "978-0-06-081922-5");
    db.prepare(insert_books).run(
      id + 2,
      "The Voyage of the Dawn Treader",
      "The Voyage of the Dawn Treader[a] is a portal fantasy novel for children written by C. S. Lewis, published by Geoffrey Bles in 1952. It was the third published of seven novels in The Chronicles of Narnia (1950–1956). Macmillan US published an American edition within the calendar year,[1][3] with substantial revisions which were retained in the United States until 1994. It is volume five in recent editions, which are sequenced according to the novels' internal chronology.",
      "978-0-06-081922-6");
  }
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

function fetchBooks(amount, offset) {
  const db = new Database('database_files/betterreads.db', { verbose: console.log }); // create if no connection found
  const fetchBooks = 'SELECT * FROM books LIMIT ? OFFSET ?';
  const rows = db.prepare(fetchBooks).all(amount, offset)
  console.log("fetch books:", rows)
  return rows
}

export { initDb, initSessions, fetchBooks }
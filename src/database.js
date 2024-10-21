import Database from 'better-sqlite3';
import session from 'express-session';
import _SqliteStore from "better-sqlite3-session-store";
import csv from 'csv-parser';
import fs from 'fs';
import axios from 'axios';

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
  createBookDb(db, "./database_files/books_data.csv");
}

function loadFromCSV(path, callback) {
  const rows = [];

  fs.createReadStream(path)
    .pipe(csv())
    .on('data', (data) => {
      data["isbn"] = "-",
      rows.push(data);
    })
    .on('end', () => {
      // TODO: call here fetchISBN to fetch all
      callback(rows);
    })
    .on('error', (err) => {
      console.error('Error reading CSV file:', err);
    });
}

function fetchISBN(infoLink, callback) {
  // TODO: fetch in batch manner, not individually
  const url = new URL(infoLink);
  const book_id = url.searchParams.get("id");
  const books_api = `https://www.googleapis.com/books/v1/volumes/${book_id}`
  axios.get(books_api, (res) => {
    const ISBN_10 = 0; 
    const ISBN_13 = 1;
    console.log(res.data);
    isbn = res.data["volumeInfo"]["industryIdentifiers"][ISBN_10]["identifier"];
    callback(isbn);
  });
}

function createBookDb(db, datasetPath) {
  db.prepare(
    `CREATE TABLE IF NOT EXISTS books (
      id int PRIMARY KEY, 
      book_name TEXT UNIQUE, 
      description TEXT, 
      isbn TEXT
    )`
  ).run();

  const books_count = 'SELECT COUNT(*) FROM books'
  let count = db.prepare(books_count).get(); // { 'COUNT(*)': 0 }

  if (count['COUNT(*)'] <= 0) {
    loadFromCSV(datasetPath, (books) => {
      const insert_books = db.prepare(
        `INSERT INTO books (
            book_name, 
            description, 
            isbn
         ) VALUES (?,?,?)`
      );

      for (const book of books) {
        insert_books.run(
          book["Title"], 
          book["description"],
          book["isbn"],
        );
      }
    });
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

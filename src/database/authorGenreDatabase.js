import Database from "better-sqlite3";
import _SqliteStore from "better-sqlite3-session-store";

export function fetchAuthorsFromBook(bookId) {
  const db = new Database("database_files/betterreads.db");
  const stmt = `
    SELECT author_id FROM books_authors WHERE book_id=?
  `;
  const authors = db.prepare(stmt).all(bookId).map(rowObject => rowObject.author_id);
  return authors
}

export function fetchGenresFromBook(bookId) {
  const db = new Database("database_files/betterreads.db");
  const stmt = `
    SELECT genre_id FROM books_genres WHERE book_id=?
  `;
  const genres = db.prepare(stmt).all(bookId).map(rowObject => rowObject.genre_id);
  return genres
}

export function fetchBooksInGenre(genre_name) {
  const db = new Database("database_files/betterreads.db", { verbose: console.log });
  const stmt = `
    SELECT * FROM books WHERE books.id IN (SELECT book_id FROM books_genres WHERE genre_id=?)
  `;
  const books = db.prepare(stmt).all(genre_name);
  return books
}
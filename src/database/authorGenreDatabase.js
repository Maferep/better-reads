import Database from "better-sqlite3";
import _SqliteStore from "better-sqlite3-session-store";
const PAGINATION_LIMIT = 7;

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

export function fetchBooksInGenre(genre_name, limit=PAGINATION_LIMIT, page=0) {
  const db = new Database("database_files/betterreads.db", { verbose: console.log });

  // we ask for one more than the pages we want in order to know if there is more
  const stmt = `
    SELECT * FROM books WHERE books.id IN (SELECT book_id FROM books_genres WHERE genre_id=? LIMIT ? OFFSET ?)
  `;
  const offset = page * limit;
  const books = db.prepare(stmt).all(genre_name, limit +1, offset);

  // if we got the pages we wanted, then there are more pages left
  const has_more = (books.length == limit+1);
  return { books: books, has_more: has_more };
}

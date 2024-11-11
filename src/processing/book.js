
import { addReview, fetchBook,
  fetchBookState, fetchReviews, userAlreadySubmitedReview,
  addBookState, createPost } from '../database.js';
import { fetchAuthorsFromBook, fetchGenresFromBook } from '../database/authorGenreDatabase.js'

export function getBookData(bookId) {
  const bookRow = fetchBook(bookId);
  //El libro con tal id no existe
  if (bookRow == null) {
    res.status(404).send("Book id not found")
    return;
  }
  let authors = fetchAuthorsFromBook(bookId);
  let genres = fetchGenresFromBook(bookId);
  bookRow.authors = authors
  bookRow.genres = genres
  return bookRow
}
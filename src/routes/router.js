import { Router } from 'express';
import { isAuthenticated } from '../authenticate.js';
import authRouter from './authRouter.js';
import { addReview, fetchBook, fetchBooks, fetchBookState, fetchReviews, userAlreadySubmitedReview, addBookState, createPost, searchBooks } from '../database.js';
import Database from 'better-sqlite3';

const router = Router();

router.get('/', isAuthenticated, async function (req, res) {
  res.render("index", { 
    username: req.session.user, 
    loggedIn: true, 
    title: "Home page",
    style: "style.css" })
})

router.get('/', function (req, res) {
  res.redirect('login')
})


router.get('/browse', async function (req, res) {
  const searchTerm = req.query.search || "";
  const amount = 10; 
  const offset = 0;

  const rows = await searchBooks(searchTerm, amount, offset);

  res.render("browse", {
    username: req.session.user,
    loggedIn: true,
    title: "Browse Books",
    style: "style.css",
    bookEntries: rows
  });
});


router.get('/browse/search', async function (req, res) {
  const searchTerm = req.query.search || "";
  const amount = 10;
  const offset = 0;

  const rows = await searchBooks(searchTerm, amount, offset);
  

  res.json({ bookEntries: rows });
});

router.get('/book/:id', async function (req, res) {
  console.log("entro book")

  const bookId = req.params.id;
  
  const userId = req.session.userId;

 //Busco el libro por ID en la base de datos
  const bookRow = fetchBook(bookId)
  const bookState = fetchBookState(bookId, userId);

  console.log("Libro recibido", bookRow)
  
  const reviewsRows = fetchReviews(bookId, userId);

  const reviewsData = {
    reviews: reviewsRows
  };

  let sum = 0;

  //Mofidy rating, so its a porcentual value, in the form of a string from 0 to 100
  for (let review of reviewsData.reviews) {
    sum += review.rating;
    review.rating = (review.rating * 20).toString();
  }

  const mean = sum / reviewsData.reviews.length;

  const meanText = (mean * 20).toString()

  
  const estaAutenticado = Boolean(req.session.user);

  //El libro con tal id no existe
  if (bookRow == null) {
    res.status(404).send("Book id not found")
    return;
  }

  const userSubmittedReview = userAlreadySubmitedReview(bookId, userId);

  res.render("book", {
    username: req.session.user,
    loggedIn: estaAutenticado,
    allowReview: estaAutenticado && !userSubmittedReview,
    bookName: bookRow.book_name,
    bookDescription: bookRow.description,
    title: bookRow.book_name,
    style: "../../style_book.css",
    reviews: reviewsData.reviews,
    ratingsMean: meanText,
    bookState: bookState,
  })
})

router.post('/book/:id/review', (req, res) => {
  try {
    const bookId = req.params.id;
    const rating = req.body.rating;
    const reviewText = req.body.reviewText;

    // get user
    const userId = req.session.userId;

    const userSubmittedReview = userAlreadySubmitedReview(bookId, userId);
  
    if (userSubmittedReview) {
      res.status(400).json({ success: false, message: 'Ya enviaste una review para este libro' });
      return;
    }

    if (userId == null) {
      res.status(400).json({ success: false, message: 'Tiene que iniciar sesión para enviar una review' });
      return;
    }

    if (rating == null) {
      res.status(400).json({ success: false, message: 'Tiene que indicar si o si la cantidad de estrellas en la review' });
      return;
    }

    console.log('Review submitted by', userId, 'for book', bookId, 'with rating', rating, 'and review', reviewText);

    addReview(bookId, userId, rating, reviewText);
    res.json({ success: true, message: 'Review submitted successfully!' });

  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'An error occurred while submitting the review' });
  }

})

router.post('/book/:id/state', (req, res) => {
  const bookId = req.params.id;
  const userId = req.session.userId;
  const state = req.body.bookState;
  addBookState(bookId, userId, state)
})

// post a post (not a review) to be shown on the feed

router.post('/post', (req, res) => {
  const userId = req.session.userId;
  const postContent = req.body["post-content"];
  const topic = req.body.topic;
  createPost(userId, postContent, topic);
  res.redirect('/')
})


router.use(authRouter)
export default router;
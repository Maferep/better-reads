import { Router } from 'express';
import { isAuthenticated } from '../authenticate.js';
import authRouter from './authRouter.js';
import { addReview, fetchBook, fetchBooks, fetchReviews, userAlreadySubmitedReview } from '../database.js';
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

router.get('/browse', function (req, res) {
  const rows = fetchBooks(10, 0);
  let serialized = '';
  for (let row of rows) {
    for(let prop in row){
      serialized = serialized + row[prop] + '\n';
    }
    serialized = serialized + '\n';
  }
  res.end(serialized);
})

router.get('/book/:id', async function (req, res) {
  const bookId = req.params.id;
  
  const userId = req.session.userId;

 //Busco el libro por ID en la base de datos
  const bookRow = fetchBook(bookId)
  
  const reviewsRows = fetchReviews(bookId, userId);

const reviewsData = {
  reviews: reviewsRows
};

  //Mofidy rating, so it is a array of 5 elements who are true or false, depending on the value
  for (let review of reviewsData.reviews) {
    review.rating = Array.from({ length: 5 }, (_, i) => i < review.rating);
  }

  
  const estaAutenticado = Boolean(req.session.user);

  //El libro con tal id no existe
  if (bookRow == null) {
    res.send("Book id not found")
  }

  res.render("book", {
    username: req.session.user,
    loggedIn: estaAutenticado,
    bookName: bookRow.book_name,
    bookDescription: bookRow.description,
    title: "Home page",
    style: "../style.css",
    reviews: reviewsData.reviews})
})

router.post('/book/:id/review', (req, res) => {

  try {
    const bookId = req.params.id;
    const rating = req.body.rating;
    const reviewText = req.body.reviewText;

    console.log(req)

    // get user
    const userId = req.session.userId;
  
    if (userAlreadySubmitedReview(bookId, userId)) {
      res.status(400).json({ success: false, message: 'Ya enviaste una review para este libro' });
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

router.use(authRouter)
export default router;
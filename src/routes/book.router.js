import { Router } from 'express';
import { estaAutenticado, isAuthenticated } from '../authenticate.js';
import { addReview, fetchBook,
  fetchBookState, fetchReviews, userAlreadySubmitedReview,
  addBookState, createPost } from '../database.js';

const router = Router();

router.get('/:id', async function (req, res) {
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
  
    
    const estaAutenticadoBool = estaAutenticado(req);
  
    //El libro con tal id no existe
    if (bookRow == null) {
      res.status(404).send("Book id not found")
      return;
    }
  
    const userSubmittedReview = userAlreadySubmitedReview(bookId, userId);
  
  
  
    let authors = bookRow.authors.replace("[","").replace("]","")
    let genres = bookRow.genre.replace("[","").replace("]","")
  
    authors != '""' ? authors : authors = "No authors found"
    genres != '""' ? genres : genres = "No genres found"
  
    res.render("book", {
      username: req.session.user,
      loggedIn: estaAutenticadoBool,
      allowReview: estaAutenticadoBool && !userSubmittedReview,
      bookId: bookRow.id,
      bookName: bookRow.book_name,
      bookDescription: bookRow.description,
      bookAuthor: authors, // Cambiado a authors
      bookGenre: genres,   // Cambiado a genres
      bookCover: bookRow.image,
      title: bookRow.book_name,
      style: "style_book.css",
      reviews: reviewsData.reviews,
      ratingsMean: meanText,
      bookState: bookState,
    })
});


router.post('/:id/review', isAuthenticated, (req, res) => {
    try {
        const bookId = req.params.id;
        const rating = req.body.rating;
        const reviewText = req.body.reviewText;

        const shareOnFeed = Boolean(req.body.shareOnFeed);

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

        if (shareOnFeed) {
            createPost(userId, reviewText, bookId, rating);
        }

        res.json({ success: true, message: 'Review submitted successfully!' });

    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: 'An error occurred while submitting the review' });
    }
})
  
router.post('/:id/state', isAuthenticated, (req, res) => {
    const bookId = req.params.id;
    const userId = req.session.userId;
    const state = req.body.bookState;
    addBookState(bookId, userId, state)
})
  



export default router;
import { Router } from 'express';
import { estaAutenticado, isAuthenticated } from '../authenticate.js';
import { addReview, fetchBook,
  fetchBookState, fetchReviews, userAlreadySubmitedReview,
  addBookState, createPost, getPostOfReview, deleteAllLikes, deleteAllReposts, deleteAllComments,
deletePost, deleteReview } from '../database.js';
import { getBookData } from '../processing/book.js'
import { deleteAllNotificationsReferringToPost } from '../database/notificationDatabase.js';


const router = Router();

router.get('/:id', async function (req, res) {
  const bookId = req.params.id;
  const bookRow = getBookData(bookId);

  const userId = req.session.userId;
  const bookState = fetchBookState(bookId, userId);
  const reviewsRows = fetchReviews(bookId, userId);
  const reviewsFront = parseReviews(reviewsRows, userId);
  const meanText = calculateMean(reviewsRows);
  const estaAutenticadoBool = estaAutenticado(req);
  const userSubmittedReview = userAlreadySubmitedReview(bookId, userId);
  const authors = bookRow.authors;
  const genres = bookRow.genres;


  res.render("book", {
    do_sidebar: estaAutenticadoBool,
    userId: userId,
    username: req.session.user,
    loggedIn: estaAutenticadoBool,
    allowReview: estaAutenticadoBool && !userSubmittedReview,
    bookId: bookRow.id,
    bookName: bookRow.book_name,
    bookDescription: bookRow.description,
    authors: (authors.length ? authors : "No authors found"),
    genres:  (genres.length ? genres : "No genres found"), 
    bookCover: bookRow.image,
    title: bookRow.book_name,
    reviews: reviewsFront,
    ratingsMean: meanText,
    bookState: bookState,
  })
});

function parseReviews(reviews, user_id) {
  return reviews.map((review) => {
    console.log(review)
    return {
      review_id: review.review_id,
      username: review.username,
      rating: review.rating * 20,
      review_text: review.review_text,
      is_own: (review.user_id === user_id)
    };
  });
}


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
            createPost(userId, reviewText, bookId, "book", rating);
        }

        res.json({ success: true, message: 'Review submitted successfully!' });

    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: 'An error occurred while submitting the review' });
    }
})

router.delete("/:book_id/review/:review_id", isAuthenticated, (req, res) => {
  const bookId = req.params.book_id;
  const reviewId = req.params.review_id;
  const userId = req.session.userId;

  const userSubmittedReview = userAlreadySubmitedReview(bookId, userId);

  if (!userSubmittedReview) {
    res.status(400).json({ success: false, message: 'No se encontró la review que intenta eliminar' });
    return;
  }
  

  const post_id = getPostOfReview(reviewId);
  if (post_id != null && post_id != undefined)
    deleteRepostAndPostAndComments(post_id, userId);


  deleteReview(reviewId, userId);

  res.json({ success: true, message: 'Review eliminada correctamente!' });
});

function deleteRepostAndPostAndComments(postId) {
  deleteAllNotificationsReferringToPost(postId);

  deleteAllLikes(postId);   
  deleteAllReposts(postId);
  deleteAllComments(postId);

  deletePost(postId);
}
  
router.post('/:id/state', isAuthenticated, (req, res) => {
    const bookId = req.params.id;
    const userId = req.session.userId;
    const state = req.body.bookState;
    addBookState(bookId, userId, state)
});
  



export default router;

function calculateMean(reviews) {
  let sum = 0;

  //Mofidy rating, so its a porcentual value, in the form of a string from 0 to 100
  for (let review of reviews) {
    sum += review.rating;
    review.rating = (review.rating * 20).toString();
  }

  const mean = sum / reviews.length;

  const meanText = (mean * 20).toString();
  return meanText;
}

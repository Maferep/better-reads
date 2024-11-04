import { Router } from 'express';
import { isAuthenticated } from '../authenticate.js';
import {fetchPostsAndLastDate, fetchBook, fetchPost } from '../database.js';

const router = Router();

router.get('/', isAuthenticated, async function (req, res) {
  const userId = req.session.userId;

  if (!req.query.last_date) {
    req.query.last_date = new Date().toISOString();
  }

  if (!req.query.book_id) {
    req.query.book_id = null;
  }

  
  const desdeFecha = new Date(req.query.last_date);
  const deLibro = req.query.book_id;

  //Map que convierta posts a un formato usado por el handlebars
  const posts_and_date_raw = fetchPostsAndLastDate(7,desdeFecha, deLibro);

  console.log(posts_and_date_raw)

  const posts_raw = posts_and_date_raw.rows;

  const last_date = posts_and_date_raw.last_date;

  const posts_processed = posts_raw.map(post_raw => {
    return {
      post_id: post_raw.post_id,
      user_id: post_raw.user_id,
      username: post_raw.username,
      book_id: post_raw.book_id,
      book_name: post_raw.book_name,
      content: post_raw.text_content,
      number_reposts: post_raw.reposts,
      number_comments: 0,
      repost_user_id: post_raw.repost_user_id,
      repost_username: post_raw.repost_username,
    }})

    //Poner id, nombre e imagen de libro si bookId no es null
    let book = null;

    if (deLibro != null) {
      const book_raw = fetchBook(deLibro)
      book = {
        id: book_raw.id,
        title: book_raw.book_name,
        cover_url: book_raw.image
      }
    }

  res.render("index", { 
    username: req.session.user, 
    loggedIn: true, 
    title: "Home page",
    // style: "style_prototype.css",
    book: book,
    posts: posts_processed,
    last_date: (last_date.getTime() == 0)? 0 : last_date.toISOString()
   })
})

router.get('/', function (req, res) {
  res.redirect('login')
})

router.get("/test", function(req, res) {
  const posts = fetchPost(1)
  console.log("POSTS", posts)
  res.json(posts)
})


export default router;

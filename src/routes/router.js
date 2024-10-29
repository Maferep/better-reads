import { Router } from 'express';
import { isAuthenticated } from '../authenticate.js';
import {fetchPostsAndLastDate,hasLiked } from '../database.js';

const router = Router();

router.get('/', isAuthenticated, async function (req, res) {
  const userId = req.session.userId;

  if (!req.query.last_date) {
    req.query.last_date = new Date().toISOString();
  }

  
  const desdeFecha = new Date(req.query.last_date);

  //Map que convierta posts a un formato usado por el handlebars
  const posts_and_date_raw = fetchPostsAndLastDate(7,desdeFecha);

  console.log(posts_and_date_raw)

  const posts_raw = posts_and_date_raw.rows;

  const last_date = posts_and_date_raw.last_date;

  const posts_processed = posts_raw.map(post_raw => {
    let liked_by_user = hasLiked(post_raw.id, userId);
    console.log(liked_by_user)
    return {
      post_id: post_raw.id,
      username: post_raw.username,
      topic: post_raw.book_name,
      book_id: post_raw.book_id,
      content: post_raw.text_content,
      post_id: post_raw.id,
      number_likes: post_raw.likes,
      number_reposts: 0,
      number_comments: 0,
      liked_by_user
    }})
 

  res.render("index", { 
    username: req.session.user, 
    loggedIn: true, 
    title: "Home page",
    style: "style.css",
    posts: posts_processed,
    last_date: (last_date.getTime() == 0)? 0 : last_date.toISOString()
   })
})

router.get('/', function (req, res) {
  res.redirect('login')
})


export default router;

import { Router } from 'express';
import { isAuthenticated } from '../authenticate.js';
import {fetchPostsAndLastDate, fetchBook, fetchPost, getFollowingFeed, hasLiked } from '../database.js';

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
// Seguir a un usuario
router.post('/follow', isAuthenticated, async function (req, res) {
  const followerId = req.session.userId; 
  const followingId = req.body.followingId; 

  try {
    await followUser(followerId, followingId);
    res.status(200).json({ message: `User ${followerId} now follows user ${followingId}` });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Dejar de seguir a un usuario
router.post('/unfollow', isAuthenticated, async function (req, res) {
  const followerId = req.session.userId; 
  const followingId = req.body.followingId; 

  try {
    await unfollowUser(followerId, followingId);
    res.status(200).json({ message: `User ${followerId} unfollowed user ${followingId}` });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Ver seguidores de un usuario
router.get('/:userId/followers', isAuthenticated, async function (req, res) {
  const userId = req.params.userId; 

  try {
    const followers = await getFollowers(userId);
    res.status(200).json({ followers });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Ver a quién sigue un usuario
router.get('/:userId/following', isAuthenticated, async function (req, res) {
  const userId = req.params.userId; 

  try {
    const following = await getFollowing(userId);
    res.status(200).json({ following });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});


router.get('/following-posts', function (req, res) {
    const userId = req.session.userId;
    const amount = 10;
    const offset = parseInt(req.query.offset) || 0;
    console.log(offset);
    const { posts_raw, has_more } = getFollowingFeed(userId, amount, offset);

    const posts_processed = posts_raw.map(post_raw => {
    let liked_by_user = hasLiked(post_raw.post_id, userId);
    console.log(liked_by_user)
    return {
      post_id: post_raw.post_id,
      username: post_raw.username,
      topic: post_raw.book_name,
      book_id: post_raw.book_id,
      content: post_raw.text_content,
      post_id: post_raw.post_id,
      number_likes: post_raw.likes,
      number_reposts: 0,
      number_comments: 0,
      liked_by_user
    }})

    res.render("following_posts", {
        username: req.session.user,
        loggedIn: true,
        title: "Following Posts",
        //style: "style.css",
        posts: posts_processed,
        has_more
    });
});


export default router;

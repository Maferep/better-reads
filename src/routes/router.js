import { Router } from 'express';
import { isAuthenticated } from '../authenticate.js';
import {fetchPostsAndLastDate,hasLiked, getPostsFromUserId, getUserProfile, updateUserProfile } from '../database.js';
import {uploader} from "../uploader.js";

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

router.get("/profile", isAuthenticated, function (req, res) {
  const posts = getPostsFromUserId(req.session.userId);
  const userProfile = getUserProfile(req.session.userId); // Obtén la información de perfil
  console.log(userProfile?.bio, userProfile?.profile_photo);
  const isProfileComplete = userProfile?.bio && userProfile?.profile_photo;
  res.render("profile", { 
    username: req.session.user, 
    loggedIn: true, 
    title: "Profile page",
    posts: posts,
    profile_photo: userProfile?.profile_photo,
    bio: userProfile?.bio,
    isProfileComplete
  });
});

// Ruta para actualizar el perfil y cargar la foto
router.post("/profile", uploader.single("profile_photo"), function (req, res) {
  const userId = req.session.userId;
  const bio = req.body.bio || null;
  const profilePhoto = req.file ? `/uploads/${req.file.filename}` : null;

  updateUserProfile(userId, bio, profilePhoto);
  res.redirect("/profile");
});

export default router;

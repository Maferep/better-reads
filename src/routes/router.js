import { Router } from 'express';

import {uploader} from "../uploader.js";
import { fetchBook, followUser, unfollowUser, getUserProfile, updateUserProfile, getFollowers, getFollowing, getIdFromUsername, isUserFollowing} from '../database.js';
import { getPostsFromUserId, fetchPaginatedPosts } from "../database/paginationDatabase.js";
import { estaAutenticado, isAuthenticated } from '../authenticate.js';
import { createFollowNotification, removeFollowNotification } from '../database/notificationDatabase.js';

const router = Router();

router.get('/', isAuthenticated, async function (req, res) {
  processFeedRequest(req, res, false);
})

router.get('/', function (req, res) {
  res.redirect('login')
})

router.get("/test", function(req, res) {
  const fecha = new Date();
  const posts = fetchPaginatedPosts(fecha, 0);
  const posts1 = fetchPaginatedPosts(fecha, 1);
  console.log("POSTS", posts)
  res.json([posts, posts1])
})

// Seguir a un usuario
router.post('/follow/:followingId', isAuthenticated, async function (req, res) {
  const followerId = req.session.userId; 
  const followingId = req.params.followingId; 

  
  try {
    await followUser(followerId, followingId);
    res.status(200).json({ message: `User ${followerId} now follows user ${followingId}` });

  } catch (error) {
    res.status(400).json({ error: error.message });
    return;
  }

  createFollowNotification(followerId, followingId);
});

// Dejar de seguir a un usuario
router.post('/unfollow/:followingId', isAuthenticated, async function (req, res) {
  const followerId = req.session.userId; 
  const followingId = req.params.followingId; 
  
  try {
    await unfollowUser(followerId, followingId);
    res.status(200).json({ message: `User ${followerId} unfollowed user ${followingId}` });
  } catch (error) {
    res.status(400).json({ error: error.message });
    return;
  }

  removeFollowNotification(followerId, followingId);
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
  processFeedRequest(req, res, true);
});

router.get("/profile", isAuthenticated, function (req, res) {
  processProfileRequest(req, res, true);
});

router.get("/:profileUsername/profile", isAuthenticated, function (req, res) {
  const username = req.params.profileUsername;
  const sessionUsername = req.session.user;

  // Determina si el perfil es del usuario actual o de otro usuario
  const isOwnProfile = username === sessionUsername;
  if (isOwnProfile) {
    res.redirect("/profile");
    return;
  }
  
  processProfileRequest(req, res, false);
});

//Procesa la solicitud de perfil, ya sea propio o externo.
function processProfileRequest(req, res, isOwnProfile) {
  req.query.paginate_from ??= new Date().toISOString();
  req.query.page ??= 0;

  const paginarDesdeFecha = new Date(req.query.paginate_from);
  const pagina = Number(req.query.page);

  const userId = isOwnProfile ? req.session.userId : getIdFromUsername(req.params.profileUsername);
  const userProfile = getUserProfile(userId); // Obtén la información de perfil
  console.log(userProfile?.bio, userProfile?.profile_photo);
  const isProfileComplete = userProfile?.bio && userProfile?.profile_photo;
  const followers =  getFollowers(userId);
  const following =  getFollowing(userId);
  const isFollowing = isOwnProfile ? undefined : isUserFollowing(req.session.userId, userId);
  const profile_photo = isProfileComplete ? userProfile.profile_photo : "/uploads/default-profile.png";

  
  const all_raw = getPostsFromUserId(userId, paginarDesdeFecha, pagina);
  const posts_processed = postsRawToFrontEndCompatible(all_raw.rows);
  const has_more = all_raw.has_more;
  
  res.render("profile", { 
    do_sidebar: true,
    my_username: req.session.user, 
    username: isOwnProfile ? req.session.user : req.params.profileUsername, 
    userId: userId,
    loggedIn: true, 
    title: "Profile page",
    profile_photo: profile_photo,
    bio: userProfile?.bio,
    isProfileComplete,
    followers: followers,
    following: following,
    isFollowing: isFollowing,
    isOwnProfile: isOwnProfile,
    feed: {
      posts: posts_processed,
      paginate_from: paginarDesdeFecha.toISOString(),
      page_number: has_more ? pagina + 1 : null,
      endpoint_route: isOwnProfile ? "profile" : `${req.params.profileUsername}/profile`,
    }
  });
}


// Ruta para actualizar el perfil y cargar la foto
router.post("/profile", uploader.single("profile_photo"), function (req, res) {
  const userId = req.session.userId;
  const bio = req.body.bio || null;

  // Solo actualiza `profilePhoto` si se ha subido un archivo
  const profilePhoto = req.file ? `/uploads/${req.file.filename}` : `/uploads/default-profile.png`;
  
  const currentProfile = getUserProfile(userId);
   console.log("Current Profile:", currentProfile);

  const updatedProfilePhoto = profilePhoto || currentProfile.profile_photo;

  const updatedBio = bio || "No bio available" || currentProfile.bio;

  updateUserProfile(userId, updatedBio, updatedProfilePhoto);

  res.redirect("/profile");
});

//Convierte posts como vienen del query a la base de datos a un formato compatible con el front-end.
function postsRawToFrontEndCompatible(postsRaw) {
  return postsRaw.map(post_raw => {
    return {
      post_id: post_raw.post_id,
      user_id: post_raw.user_id,
      username: post_raw.username,
      book_id: post_raw.book_id,
      book_name: post_raw.book_name,
      author_topic: post_raw.author_topic,
      content: post_raw.text_content,
      number_reposts: post_raw.reposts,
      number_comments: 0,
      is_review: Boolean(post_raw.review_score),
      review_score: (post_raw.review_score * 20),
      repost_user_id: post_raw.repost_user_id,
      repost_username: post_raw.repost_username,
    }
  })
}

//A partir de un request de un feed (no de perfil), devuelve una pagina con los posts correspondientes.
function processFeedRequest(req, res, onlyFollowing) {
  req.query.paginate_from ??= new Date().toISOString();
  req.query.page ??= 0;
  req.query.book_id ??= null;
  req.query.author ??= null;
  req.query.genre ??= null;

  const paginarDesdeFecha = new Date(req.query.paginate_from);
  const pagina = Number(req.query.page);
  const deLibro = req.query.book_id;
  const deAutor = req.query.author;
  const deGenero = req.query.genre;
  console.log(deGenero);
  const userId = req.session.userId;

  const filter = {};
  filter.bookId = deLibro;
  filter.authorTopic = deAutor;
  filter.genre = deGenero;
  if (onlyFollowing) {
    filter.followedBy = userId;
  }

  const allRaw = fetchPaginatedPosts(paginarDesdeFecha, pagina, filter);

  const posts_raw = allRaw.rows;
  const has_more = allRaw.has_more;

  const posts_processed = postsRawToFrontEndCompatible(posts_raw);

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
    do_sidebar: true,
    username: req.session.user,
    loggedIn: true,
    title: "Home page",
    book: book,
    author: deAutor,
    genre: deGenero,
    allowPosting: Boolean(!onlyFollowing && !deGenero),
    feed: {
      posts: posts_processed,
      paginate_from: paginarDesdeFecha.toISOString(),
      page_number: has_more ? pagina + 1 : null,
      endpoint_route: onlyFollowing ? "following-posts" : "",
      book_id: deLibro
    }
  });
}


export default router;

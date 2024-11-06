import { Router } from 'express';
import Database from 'better-sqlite3';
import { isAuthenticated } from '../authenticate.js';
import {uploader} from "../uploader.js";
import {getPostsFromUserId, getUserProfile, updateUserProfile, getFollowers, getFollowing, getUsernameFromId, getIdFromUsername, isUserFollowing } from '../database.js';

const authRouter = Router()

authRouter.get('/logout', function (req, res, next) {
  // logout logic
  
  // clear the user from the session object and save.
  // this will ensure that re-using the old session id
  // does not have a logged in user
  req.session.user = null
  req.session.userId = null
  req.session.save(function (err) {
    if (err) next(err)
      
    // regenerate the session, which is good practice to help
    // guard against forms of session fixation
    req.session.regenerate(function (err) {
      if (err) next(err)
        res.redirect('/')
    })
  })
})

authRouter.get('/login', isAuthenticated, function(req, res) {
  res.redirect('/')
})

authRouter.get('/login', function(req, res) {
  const _hasWrongCred = req.query.wrong_cred == 1;
  console.log("Has wrong cred?", _hasWrongCred)
  res.render('login', { 
    username: "guest", 
    loggedIn: false, 
    hasWrongCred: _hasWrongCred, 
    title: "Login",
    style: "style.css" })
})

authRouter.post('/login', isAuthenticated, function(req, res) {
  res.redirect('/')
})
authRouter.post('/login', function (req, res) {
  // TODO: validate input
  const db = new Database('database_files/betterreads.db', { verbose: console.log }); 
  const username = req.body.name
  const password = req.body.password
  try {
    const rows = db.prepare('SELECT *  FROM insecure_users WHERE username=? AND insecure_password=?').all(username, password);
    if (rows.length == 0) {
      console.log("Wrong cred. Redirecting...")
      res.redirect("/login?wrong_cred=1")
      return
    } else {
      // successful login!
      // regenerate session to prevent session fixation
      req.session.regenerate(function (err) {
        if (err) {
          console.log("NEXT")
          next(err)
        } else {
          // store user information in session, typically a user id
          req.session.user = req.body.name
          req.session.userId = rows[0].id
          console.log("set user ", req.session.user)
          // save the session before redirection to ensure page
          // load does not happen before session is saved
          req.session.save(function (err) {
            console.log("saving...")
            if (err) {
              next(err)
              return
            } else {
              res.redirect('/')
              return
            }
          })
        }
      })
    }
  } catch (e) {
    console.error(e)
    if(!res.writableEnded) res.end("Failed to log in");
  }
})

authRouter.get('/register', isAuthenticated, function(req, res) {
  res.redirect('/')
})

authRouter.get('/register', function(req, res) {
  const _usernameExists = req.query.username_exists == 1;
  console.log("Existing name", _usernameExists)
  res.render('register', { 
    username: "guest", 
    loggedIn: false, 
    usernameExists: _usernameExists,
    title: "Home page",
    style: "style.css"  })
})

authRouter.post('/register', isAuthenticated, function(req, res) {
  res.redirect('/')
})

authRouter.post('/register', function  (req, res) {
  const db = new Database('database_files/betterreads.db', { verbose: console.log }); 
  const id = Math.floor(Math.random()*10000000);
  // TODO: validate input
  const username = req.body.name
  const password = req.body.password
  // TODO check existing sql const check = db.prepare('')
  try {
    const run = db.prepare('INSERT INTO insecure_users VALUES (?,?,?)').run(id, username, password);
    res.redirect("/");
    return
  } catch (e) {
    console.log("Username exists. Redirecting...")
    res.redirect("/register?username_exists=1")
  }
})


authRouter.get("/profile", isAuthenticated, function (req, res) {
  const posts_raw = getPostsFromUserId(req.session.userId);
  const userProfile = getUserProfile(req.session.userId); // Obtén la información de perfil
  console.log(userProfile?.bio, userProfile?.profile_photo);
  const isProfileComplete = userProfile?.bio && userProfile?.profile_photo;
  const followers =  getFollowers(req.session.userId);
  const following =  getFollowing(req.session.userId);
  const posts = posts_raw.map(post_raw => {
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
  const profile_photo = isProfileComplete ? userProfile.profile_photo : "/uploads/default-profile.png";
  res.render("profile", { 
    my_username: req.session.user, 
    username: req.session.user, 
    loggedIn: true, 
    title: "Profile page",
    posts: posts,
    profile_photo: profile_photo,
    bio: userProfile?.bio,
    isProfileComplete,
    followers: followers,
    following: following,
    isOwnProfile: true,
    style: "style_prototype.css"
  });
});

authRouter.get("/:profileUsername/profile", isAuthenticated, function (req, res) {
  const username = req.params.profileUsername;
  const sessionUsername = req.session.user;
  
  // Determina si el perfil es del usuario actual o de otro usuario
  const isOwnProfile = username === sessionUsername;
  const userId = getIdFromUsername(username);
  const posts_raw = getPostsFromUserId(userId);
  const userProfile = getUserProfile(userId); // Obtén la información de perfil
  console.log(userProfile?.bio, userProfile?.profile_photo);
  const isProfileComplete = userProfile?.bio && userProfile?.profile_photo;
  const followers =  getFollowers(userId);
  const following =  getFollowing(userId);
  const isFollowing = isUserFollowing(req.session.userId, userId);
  const posts = posts_raw.map(post_raw => {
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
  const profile_photo = isProfileComplete ? userProfile.profile_photo : "/uploads/default-profile.png";
  res.render("profile", { 
    my_username: req.session.user, 
    username: username, 
    userId: userId,
    loggedIn: true, 
    title: "Profile page",
    posts: posts,
    profile_photo: profile_photo,
    bio: userProfile?.bio,
    isProfileComplete,
    followers: followers,
    following: following,
    isOwnProfile,
    isFollowing,
    style: "style_prototype.css"
  });
});

// Ruta para actualizar el perfil y cargar la foto
authRouter.post("/profile", uploader.single("profile_photo"), function (req, res) {
  const userId = req.session.userId;
  const bio = req.body.bio || null;

  // Solo actualiza `profilePhoto` si se ha subido un archivo
  const profilePhoto = req.file ? `/uploads/${req.file.filename}` : null;

  // Obtén el perfil actual del usuario para no sobreescribir `profile_photo` si no hay un archivo nuevo
  const currentProfile = getUserProfile(userId);
  const updatedProfilePhoto = profilePhoto || currentProfile.profile_photo;

  updateUserProfile(userId, bio, updatedProfilePhoto);
  res.redirect("/profile");
});

export default authRouter;



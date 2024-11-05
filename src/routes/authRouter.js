import { Router } from 'express';
import Database from 'better-sqlite3';
import { isAuthenticated } from '../authenticate.js';
import {uploader} from "../uploader.js";
import {getPostsFromUserId, getUserProfile, updateUserProfile, getFollowers, getFollowing, getUsernameFromId, getIdFromUsername } from '../database.js';

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
  const posts = getPostsFromUserId(req.session.userId);
  const userProfile = getUserProfile(req.session.userId); // Obtén la información de perfil
  console.log(userProfile?.bio, userProfile?.profile_photo);
  const isProfileComplete = userProfile?.bio && userProfile?.profile_photo;
  const followers =  getFollowers(req.session.userId);
  const following =  getFollowing(req.session.userId);
  res.render("profile", { 
    username: req.session.user, 
    loggedIn: true, 
    title: "Profile page",
    posts: posts,
    profile_photo: userProfile?.profile_photo,
    bio: userProfile?.bio,
    isProfileComplete,
    followers: followers,
    following: following,
    style: "style_prototype.css"
  });
});

authRouter.get("/:profileUsername/profile", isAuthenticated, function (req, res) {
  const username = req.params.profileUsername;
  const userId = getIdFromUsername(username);
  const posts = getPostsFromUserId(userId);
  const userProfile = getUserProfile(userId); // Obtén la información de perfil
  console.log(userProfile?.bio, userProfile?.profile_photo);
  const isProfileComplete = userProfile?.bio && userProfile?.profile_photo;
  const followers =  getFollowers(userId);
  const following =  getFollowing(userId);
  res.render("profile", { 
    username: username, 
    loggedIn: true, 
    title: "Profile page",
    posts: posts,
    profile_photo: userProfile?.profile_photo,
    bio: userProfile?.bio,
    isProfileComplete,
    followers: followers,
    following: following,
    style: "style_prototype.css"
  });
});

// Ruta para actualizar el perfil y cargar la foto
authRouter.post("/profile", uploader.single("profile_photo"), function (req, res) {
  const userId = req.session.userId;
  const bio = req.body.bio || null;
  const profilePhoto = req.file ? `/uploads/${req.file.filename}` : null;

  updateUserProfile(userId, bio, profilePhoto);
  res.redirect("/profile");
});

export default authRouter
import { Router } from 'express';
import Database from 'better-sqlite3';
import { isAuthenticated } from '../authenticate.js';
import {uploader} from "../uploader.js";
import {hasLiked, fetchPostsAndLastDate, getPostsFromUserId, getUserProfile, updateUserProfile } from '../database.js';

const authRouter = Router();

authRouter.get('/', isAuthenticated, async function (req, res) {
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
    style: "style_prototype.css",
    posts: posts_processed,
    last_date: (last_date.getTime() == 0)? 0 : last_date.toISOString()
   })
})

// authRouter.get('/', function (req, res) {
//   res.redirect('login')
// })



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
  res.render("profile", { 
    username: req.session.user, 
    loggedIn: true, 
    title: "Profile page",
    posts: posts,
    profile_photo: userProfile?.profile_photo,
    bio: userProfile?.bio,
    isProfileComplete,
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
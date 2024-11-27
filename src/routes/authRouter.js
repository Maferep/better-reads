import { Router } from 'express';
import Database from 'better-sqlite3';
import { sha256, isAuthenticated } from '../authenticate.js';
import crypto from 'crypto';
import { v4 as uuid4 } from 'uuid';

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
    do_sidebar: false,
    username: "guest", 
    loggedIn: false, 
    hasWrongCred: _hasWrongCred, 
    title: "Login" })
})


authRouter.post('/login', isAuthenticated, function(req, res) {
  res.redirect('/')
})

authRouter.post('/login', function (req, res) {
  // TODO: validate input
  const db = new Database('database_files/betterreads.db', { verbose: console.log }); 
  const username = req.body.name
  const password = sha256(req.body.password);
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
    do_sidebar: false,
    username: "guest", 
    loggedIn: false, 
    usernameExists: _usernameExists,
    title: "Home page" })
})

authRouter.post('/register', isAuthenticated, function(req, res) {
  res.redirect('/')
})

authRouter.post('/register', function  (req, res) {
  const db = new Database('database_files/betterreads.db', { verbose: console.log }); 
  // TODO: validate input
  const id = req.body.uid ? req.body.uid : uuid4();
  const username = req.body.name
  const password = sha256(req.body.password);
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



export default authRouter;



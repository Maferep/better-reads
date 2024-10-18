import { Router } from 'express';
import isAuthenticated from '../middleware/authenticate.js';
import Database from 'better-sqlite3';
const router = Router();

router.get('/', isAuthenticated, async function (req, res) {
  res.render("index", { username: req.session.user, loggedIn: true })
})

router.get('/', function (req, res) {
  res.redirect('login')
})

router.get('/logout', function (req, res, next) {
  // logout logic

  // clear the user from the session object and save.
  // this will ensure that re-using the old session id
  // does not have a logged in user
  req.session.user = null
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

router.get('/login', isAuthenticated, function(req, res) {
  res.redirect('/')
})

router.get('/login', function(req, res) {
  const _hasWrongCred = req.query.wrong_cred == 1;
  console.log("Has wrong cred?", _hasWrongCred)
  res.render('login', { username: "guest", loggedIn: false, hasWrongCred: _hasWrongCred})
})

router.post('/login', isAuthenticated, function(req, res) {
  res.redirect('/')
})
router.post('/login', function (req, res) {
  // TODO: validate input
  const db = new Database('database_files/foobar.db', { verbose: console.log }); 
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

router.get('/register', isAuthenticated, function(req, res) {
  res.redirect('/')
})

router.get('/register', function(req, res) {
  const _usernameExists = req.query.username_exists == 1;
  console.log("Existing name", _usernameExists)
  res.render('register', { username: "guest", loggedIn: false, usernameExists: _usernameExists })
})

router.post('/register', isAuthenticated, function(req, res) {
  res.redirect('/')
})

router.post('/register', function  (req, res) {
  const db = new Database('database_files/foobar.db', { verbose: console.log }); 
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


export default router;
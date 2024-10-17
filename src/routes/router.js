import { Router } from 'express';
import postLogin from "../postLogin.js";
import postRegister from "../postRegister.js";

const router = Router();

function isAuthenticated (req, res, next) {
  if (req.session.user) next()
  else next('route')
}

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
router.post('/login', postLogin)

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
router.post('/register', postRegister)


export default router;
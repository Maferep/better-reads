const express = require('express');
const busboy = require('busboy');
const fs = require('fs')
var http = require('http');
const { argv } = require('node:process');
const postLogin = require("./src/postLogin.js");
const postRegister = require("./src/postRegister.js");
const { initDb, initSessions } = require("./src/database.js");


// database
initDb()

// get port number
var port = argv[2]
if (port == undefined) port = 80;

const app = express();
initSessions(app)
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
// middleware to test if authenticated
function isAuthenticated (req, res, next) {
  if (req.session.user) next()
  else next('route')
}

app.get('/', isAuthenticated, async function (req, res) {
  res.render("index", { username: req.session.user, loggedIn: true })
})

app.get('/', function (req, res) {
  res.redirect('login')
})

app.get('/logout', function (req, res, next) {
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

app.get('/login', isAuthenticated, function(req, res) {
  res.redirect('/')
})

app.get('/login', function(req, res) {
  res.render('login', { username: "guest", loggedIn: false })
})

app.post('/login', isAuthenticated, function(req, res) {
  res.redirect('/')
})
app.post('/login', postLogin.postLogin)

app.get('/register', isAuthenticated, function(req, res) {
  res.redirect('/')
})

app.get('/register', function(req, res) {
  res.render('register', { username: "guest", loggedIn: false })
})

app.post('/register', isAuthenticated, function(req, res) {
  res.redirect('/')
})
app.post('/register', postRegister.postRegister)

// unsecured endpoint
app.use(express.static('static'))

// http
let serverHttp = http.createServer(app)
serverHttp.listen(port, () => console.log('Example app is listening on port', port))

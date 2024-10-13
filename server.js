const express = require('express');
const busboy = require('busboy');
const fs = require('fs')
var http = require('http');
const { argv } = require('node:process');
const postLogin = require("./src/postLogin.js");
const postRegister = require("./src/postRegister.js");
const ejs = require('ejs')
const { initDb, initSessions } = require("./src/database.js");
var escapeHtml = require('escape-html')


// database
initDb()

// get port number
var port = argv[2]
if (port == undefined) port = 80;

const app = express();
initSessions(app)
app.use(express.urlencoded({ extended: true }));

// middleware to test if authenticated
function isAuthenticated (req, res, next) {
  if (req.session.user) next()
  else next('route')
}

app.get('/', isAuthenticated, async function (req, res) {
  // this is only called when there is an authentication user due to isAuthenticated
  rendered = await ejs.renderFile("./pages/index.ejs", {username: req.session.user})
  console.log(rendered)
  res.end(rendered)
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
  page = fs.readFileSync('./pages/login.html')
  res.end(page)
})

app.post('/login', isAuthenticated, function(req, res) {
  res.redirect('/')
})
app.post('/login', postLogin.postLogin)

app.get('/register', isAuthenticated, function(req, res) {
  res.redirect('/')
})

app.get('/register', function(req, res) {
  page = fs.readFileSync('./pages/register.html')
  res.end(page)
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

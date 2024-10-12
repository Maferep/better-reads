const express = require('express');
const busboy = require('busboy');
var http = require('http');
const { argv } = require('node:process');
var session = require('express-session')
const postLogin = require("./src/postLogin.js");
const postRegister = require("./src/postRegister.js");
const { initDb } = require("./src/database.js");
var escapeHtml = require('escape-html')

// database
initDb()

// get port number
var port = argv[2]
if (port == undefined) port = 80;

const app = express();
app.use(express.urlencoded({ extended: true }));

var sess = {
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true,
  cookie: {}
}
app.use(session(sess))

// middleware to test if authenticated
function isAuthenticated (req, res, next) {
  if (req.session.user) next()
  else next('route')
}

app.get('/', isAuthenticated, function (req, res) {
  // this is only called when there is an authentication user due to isAuthenticated
  res.send('hello, ' + escapeHtml(req.session.user) + '!' +
    ' <a href="/logout">Logout</a>')
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

app.get('/', function (req, res) {
  res.redirect('login.html')
})

app.post('/login', postLogin.postLogin)

app.post('/register', postRegister.postRegister)

if (app.get('env') === 'production') {
	app.set('trust proxy', 1) // trust first proxy
	sess.cookie.secure = true // serve secure cookies
}
app.use(session(sess))

// unsecured endpoint
app.use(express.static('static'))

// http
let serverHttp = http.createServer(app)
serverHttp.listen(port, () => console.log('Example app is listening on port', port))

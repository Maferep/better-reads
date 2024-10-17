import express from 'express';
import http from 'http';
import { argv } from 'node:process';
import postLogin from "./src/postLogin.js";
import postRegister from "./src/postRegister.js";
import { initDb, initSessions } from "./src/database.js";
import handlebars from "express-handlebars";

// database
initDb()

// get port number
var port = argv[2]
if (port == undefined) port = 80;

const app = express();

//Incializamos el motor de plantillas
app.engine("handlebars", handlebars.engine());
//Establecemos el motor de renderizado
app.set("view engine", "handlebars");

initSessions(app)
app.use(express.urlencoded({ extended: true }));
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
  const _hasWrongCred = req.query.wrong_cred == 1;
  console.log("Has wrong cred?", _hasWrongCred)
  res.render('login', { username: "guest", loggedIn: false, hasWrongCred: _hasWrongCred})
})

app.post('/login', isAuthenticated, function(req, res) {
  res.redirect('/')
})
app.post('/login', postLogin)

app.get('/register', isAuthenticated, function(req, res) {
  res.redirect('/')
})

app.get('/register', function(req, res) {
  const _usernameExists = req.query.username_exists == 1;
  console.log("Existing name", _usernameExists)
  res.render('register', { username: "guest", loggedIn: false, usernameExists: _usernameExists })
})

app.post('/register', isAuthenticated, function(req, res) {
  res.redirect('/')
})
app.post('/register', postRegister)

app.use(express.static('static'))

// http
let serverHttp = http.createServer(app)
serverHttp.listen(port, () => console.log('Example app is listening on port', port))

const express = require('express');
const busboy = require('busboy');
var http = require('http');
var path = require('path');
var fs = require('fs');
const { argv } = require('node:process');
const basicAuth = require('express-basic-auth')
const Database = require('better-sqlite3');
var session = require('express-session')

// database
const db = new Database('foobar.db', { verbose: console.log }); // create if no connection found
db.prepare('CREATE TABLE IF NOT EXISTS insecure_users (id int PRIMARY KEY, username varchar(255) UNIQUE, insecure_password varchar(255))').run();

// get port number
var port = argv[2]
if (port == undefined) port = 80;

const app = express();
app.use(express.urlencoded({ extended: true }));

app.post('/login', function (req, res) {
  // TODO: validate input
  const username = req.body.name
  const password = req.body.password
  try {
    const rows = db.prepare('SELECT *  FROM insecure_users WHERE username=? AND insecure_password=?').all(username, password);
    if (rows.length == 0) {
      console.log(rows)
      res.end("Invalid credentials");
    } else {
      res.end("Logged in!");
    }
  } catch (e) {
    console.error(e)
    res.end("Failed to log in");
  }
})

app.post('/register', function (req, res) {
  const id = Math.floor(Math.random()*10000000);
  // TODO: validate input
  const username = req.body.name
  const password = req.body.password
  // TODO check existing sql const check = db.prepare('')
  try {
    const run = db.prepare('INSERT INTO insecure_users VALUES (?,?,?)').run(id, username, password);
    res.end("Registered!");
  } catch (e) {
    console.error(e)
    res.end("Failed to register");
  }
})

// unsecured endpoint
app.use(express.static('static'))

app.post('/file_upload', function (req, res) {
  console.log("got a file upload attempt")
  const bb = busboy({ headers: req.headers,  limits: { fileSize: 6 * 1024 * 1024 , files: 1 } }); // cuts off files silently
  bb.on('file', (name, file, info) => {
    console.log(info);
    if(info.filename == undefined) {
      res.end("Error: no file sent!");
      return
    }
    var saveTo = path.join('.', 'user_uploads', info.filename);
    console.log('Uploading: ' + saveTo);
    file.pipe(fs.createWriteStream(saveTo));
  });
  bb.on('finish', function() {
    console.log('Upload complete');
    res.writeHead(200, { 'Connection': 'close' });
    res.end("That's all folks!");
  });
  return req.pipe(bb);
})

// http
let serverHttp = http.createServer(app)
serverHttp.listen(port, () => console.log('Example app is listening on port', port))

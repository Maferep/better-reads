const express = require('express');
const busboy = require('busboy');
var http = require('http');
var path = require('path');
var fs = require('fs');
const { argv } = require('node:process');
const basicAuth = require('express-basic-auth')
var session = require('express-session')
const postLogin = require("./src/postLogin.js");
const postRegister = require("./src/postRegister.js");
const { initDb } = require("./src/database.js");

// database
initDb()

// get port number
var port = argv[2]
if (port == undefined) port = 80;

const app = express();
app.use(express.urlencoded({ extended: true }));

app.post('/login', postLogin.postLogin)

app.post('/register', postRegister.postRegister)

// unsecured endpoint
app.use(express.static('static'))

// http
let serverHttp = http.createServer(app)
serverHttp.listen(port, () => console.log('Example app is listening on port', port))

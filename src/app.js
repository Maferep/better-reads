import express from 'express';
import http from 'http';
import { argv } from 'node:process';
import { initDb, initSessions } from "./database.js";
import handlebars from "express-handlebars";
import authRouter from './routes/authRouter.js';
import bookRouter from './routes/book.router.js';
import browseRouter from './routes/browse.router.js';
import postRouter from './routes/post.router.js';
import path from 'path';
import __dirname from './path.js';
import router from './routes/router.js';

// database
initDb()

// get port number
var port = argv[2]
if (port == undefined) port = 80;

const app = express();

const hbs = handlebars.create();

hbs.handlebars.registerHelper('eq', function(a, b) {
    return a === b;
});

hbs.handlebars.registerHelper('draw-heart', function (userHasLiked) {
    return userHasLiked ? "❤️" : "🤍"
});


app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars'); // Set default view engine
app.set('views', path.join(__dirname, 'views'));
app.use('/static',express.static(`${__dirname}/../public`));
initSessions(app)
app.use(express.urlencoded({ extended: true }));

// routes
app.use(authRouter)
app.use(router)
app.use('/browse', browseRouter)
app.use('/book', bookRouter)
app.use('/post', postRouter)
// http
let serverHttp = http.createServer(app)
serverHttp.listen(port, () => console.log('Example app is listening on port', port))

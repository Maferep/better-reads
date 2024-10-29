import express from 'express';
import http from 'http';
import { argv } from 'node:process';
import { initDb, initSessions } from "./database.js";
import handlebars from "express-handlebars";
import router from "./routes/router.js"
import authRouter from './routes/authRouter.js';
import bookRouter from './routes/book.router.js';
import browseRouter from './routes/browse.router.js';
import postRouter from './routes/post.router.js';


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

//Incializamos el motor de plantillas
app.engine("handlebars", hbs.engine);
//Establecemos el motor de renderizado
app.set("view engine", "handlebars");

initSessions(app)
app.use(express.urlencoded({ extended: true }));
app.use(express.static('static'))

// routes
app.use(authRouter)
app.use(router)
app.use('/browse', browseRouter)
app.use('/book', bookRouter)
app.use('/post', postRouter)
// http
let serverHttp = http.createServer(app)
serverHttp.listen(port, () => console.log('Example app is listening on port', port))

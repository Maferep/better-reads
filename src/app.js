import express from 'express';
import http from 'http';
import { argv } from 'node:process';
import { initDb, initSessions } from "./database.js";
import handlebars from "express-handlebars";
import router from "./routes/router.js"

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
app.use(express.static('static'))
app.use(router)
// http
let serverHttp = http.createServer(app)
serverHttp.listen(port, () => console.log('Example app is listening on port', port))

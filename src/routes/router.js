import { Router } from 'express';
import { isAuthenticated } from '../authenticate.js';
import authRouter from './authRouter.js';
import { fetchBook, fetchBooks } from '../database.js';
import Database from 'better-sqlite3';

const router = Router();

router.get('/', isAuthenticated, async function (req, res) {
  res.render("index", { 
    username: req.session.user, 
    loggedIn: true, 
    title: "Home page",
    style: "style.css" })
})

router.get('/', function (req, res) {
  res.redirect('login')
})

router.get('/browse', function (req, res) {
  const rows = fetchBooks(10, 0);
  let serialized = '';
  for (let row of rows) {
    for(let prop in row){
      serialized = serialized + row[prop] + '\n';
    }
    serialized = serialized + '\n';
  }
  res.end(serialized);
})

router.get('/book/:id', async function (req, res) {
  const bookId = req.params.id;
 //Busco el libro por ID en la base de datos
  const bookRow = fetchBook(bookId)
  
  const estaAutenticado = Boolean(req.session.user);

  //El libro con tal id no existe
  if (bookRow == null) {
    res.send("Book id not found")
  }

  res.render("book", {
    username: req.session.user,
    loggedIn: estaAutenticado,
    bookName: bookRow.book_name,
    bookDescription: bookRow.description,
    title: "Home page",
    style: "../style.css"})
})

router.use(authRouter)

export default router;
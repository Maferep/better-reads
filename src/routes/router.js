import { Router } from 'express';
import { isAuthenticated } from '../authenticate.js';
import authRouter from './authRouter.js';
import { fetchBooks } from '../database.js';
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
  const amount = 10;
  const offset = 0;
  const rows = fetchBooks(amount, offset);
  res.render("browse", {
    username: req.session.user, 
    loggedIn: true, 
    title: "Home page",
    style: "style.css",
    bookEntries: rows
  });
})

router.use(authRouter)

export default router;
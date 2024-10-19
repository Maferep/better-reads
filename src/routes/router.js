import { Router } from 'express';
import { isAuthenticated } from '../authenticate.js';
import authRouter from './authRouter.js';
import { fetchBooks } from '../database.js';
import Database from 'better-sqlite3';

const router = Router();

router.get('/', isAuthenticated, async function (req, res) {
  res.render("index", { username: req.session.user, loggedIn: true })
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

router.use(authRouter)

export default router;
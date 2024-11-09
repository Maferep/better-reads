import { Router } from 'express';
import {searchBooks } from '../database.js';

const router = Router();

router.get('/', function (req, res) {
    const amount = 10;
    const offset = 0;

    const rows = searchBooks("", amount, offset);

    res.render("browse", {
        username: req.session.user,
        loggedIn: true,
        title: "Browse Books",
        bookEntries: rows
    });
});
  
  
router.get('/search', function (req, res) {
    const searchTerm = req.query.search || "";
    const amount = 10;
    const offset = 0;

    const rows = searchBooks(searchTerm, amount, offset);
    res.json({ bookEntries: rows });
});


export default router;
import { Router } from 'express';
import {searchBooks, searchBooksByTitleOrAuthor, searchAuthorByName } from '../database.js';

const router = Router();

router.get('/', function (req, res) {
    const amount = 10;
    const offset = 0;

    const rows = searchBooks("", amount, offset);

    res.render("browse", {
        username: req.session.user,
        loggedIn: true,
        title: "Browse Books"
    });
});
  
  
router.get('/search', function (req, res) {
    const searchTerm = req.query.search || "";
    const amount = 10;
    const offset = 0;

    const rows = searchBooksByTitleOrAuthor(searchTerm, amount, offset);

    console.log("RESULTADOS", rows)

    res.json({ bookEntries: rows });
});

router.get('/search/:query', function (req, res) {
    const searchTerm = req.params.query;
    const amount = 10;
    const offset = 0;

    const rows = searchBooksByTitleOrAuthor(searchTerm, amount, offset);

    res.render("browse", {
        username: req.session.user,
        loggedIn: true,
        title: "Browse Books",
        results: rows
    });
});

router.get('/search_author', function (req, res) {
    const searchTerm = req.query.search || "";
    const amount = 10;
    const offset = 0;

    const rows = searchAuthorByName(searchTerm, amount, offset);
    res.json({ authorEntries: rows });
});

export default router;
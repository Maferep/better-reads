import { Router } from 'express';
import { searchBooksByTitleOrAuthor, searchBooksByAuthor, searchBooksByTitle, searchAuthorByName
    , searchUsers, searchGenres
 } from '../database.js';

const router = Router();

router.get('/', function (req, res) {
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
    res.json({ bookEntries: rows });
});

//Busca tanto libros, como generos y usuarios. Busca primero libros,
// luego generos, y finalmente usuarios, buscando ocupar el cupo total de resultados
router.get('/search_all', function (req, res) {
    const searchTerm = req.query.search || "";
    let results = 20
    const offset = 0;

    const bookRows = searchBooksByTitleOrAuthor(searchTerm, Math.ceil(results/2), offset);
    results -= bookRows.length;
    
    const genresRows = searchGenres(searchTerm, Math.ceil(results/2), offset);
    results -= genresRows.length;
    
    const userRows = searchUsers(searchTerm, results, offset);


    res.json({ bookEntries: bookRows, userEntries: userRows, genreEntries: genresRows });
});

router.get('/search/:query', function (req, res) {
    const searchTerm = req.params.query;
    const amount = 20;
    const offset = 0;

    const tipoBusqueda = req.query.type ?? "book_and_author_name"

    let rows;

    const validTypes = {};

    if (tipoBusqueda == "book_and_author_name") {
        rows = searchBooksByTitleOrAuthor(searchTerm, amount, offset);
        validTypes["book_and_author_name"] = true;
    } else if (tipoBusqueda == "book_name") {
        rows = searchBooksByTitle(searchTerm, amount, offset);
        validTypes["book_name"] = true;
    } else if (tipoBusqueda == "author_name") {
        rows = searchBooksByAuthor(searchTerm, amount, offset);
        validTypes["author_name"] = true;
    } else {
        res.status(400).send("Invalid search type");
    }

    res.render("browse", {
        username: req.session.user,
        loggedIn: true,
        title: "Browse Books",
        search: searchTerm,
        results: rows,
        validTypes: validTypes
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
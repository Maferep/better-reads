import { Router } from 'express';
import { searchBooksByTitleOrAuthor, searchBooksByAuthor, searchBooksByTitle, searchAuthorByName
    , searchUsers, searchGenres,
    genericPaginatedSearch
 } from '../database.js';
 
import { getBookData } from '../processing/book.js';

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
    req.query.page ??= 0;
    const page = Number(req.query.page);

    const searchTerm = req.params.query;

    const tipoBusqueda = req.query.type ?? "book_and_author_name"

    

    const validTypes = {};
    let queryFunction;

    if (tipoBusqueda == "book_and_author_name") {
        queryFunction = searchBooksByTitleOrAuthor;
        validTypes["book_and_author_name"] = true;
    } else if (tipoBusqueda == "book_name") {
        queryFunction = searchBooksByTitle;
        validTypes["book_name"] = true;
    } else if (tipoBusqueda == "author_name") {
        queryFunction = searchBooksByAuthor;
        validTypes["author_name"] = true;
    } else {
        res.status(400).send("Invalid search type");
    }

    const result = genericPaginatedSearch(queryFunction, searchTerm, 10, page);

    const books = result.rows.map(book => {
        book = getBookData(book.id);
        book.description = book.description.substring(0, 100);
        book.description = book.description + " (...)";
        console.log(book.description);
        return book
      });

    const has_more = result.has_more;

    res.render("browse", {
        username: req.session.user,
        loggedIn: true,
        title: "Browse Books",
        search: searchTerm,
        books: books,
        next_page: has_more ? page + 1 : null,
        prev_page: page > 0 ? page - 1 : null,
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
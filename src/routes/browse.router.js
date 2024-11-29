import { Router } from 'express';
import { searchBooksByTitleOrAuthor, searchBooksByAuthor, searchBooksByTitle, searchAuthorByName
    , searchUsers, searchGenres,
    genericPaginatedSearch
 } from '../database.js';
import { estaAutenticado, isAuthenticated } from '../authenticate.js';    
import { fetchBooksInGenre, fetchBooksByAuthor } from '../database/authorGenreDatabase.js'
import { getBookData } from '../processing/book.js';

const router = Router();

router.get('/', function (req, res) {
    res.render("browse", {
        username: req.session.user,
        do_sidebar: true,
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

    const authorRows = searchAuthorByName(searchTerm, Math.ceil(results/2), offset);
    results -= authorRows.length;
    
    const genresRows = searchGenres(searchTerm, results, offset);


    res.json({ bookEntries: deleteRepeatedBooksByTitleOrAuthor(bookRows), authorEntries: authorRows, genreEntries: genresRows });
});

router.get('/search_users', function (req, res) {
    const searchTerm = req.query.search || "";
    const amount = 10;
    const offset = 0;

    const rows = searchUsers(searchTerm, amount, offset);
    res.json({ userEntries: rows });
});


function deleteRepeatedBooksByTitleOrAuthor(books) {
    console.log("ORIGINAL BOOKS:", books);

    let newBooks = {};

    for (let book of books) {
        if (!(book.id in newBooks)) {
            newBooks[book.id] = book;
        } else {
            //Hay 3 opciones:
            // 1. El libro ya esta en la lista, por una coincidencia de titulo, y el duplicado esta por coincidencia de autor:
            //  Debo agregar la coincidencia de autor al libro ya existente
            // 2. El libro ya esta en la lista, por una coincidencia de autor, y el duplicado esta por coincidencia de titulo:
            //  No agrego nada, ya que el libro ya esta en la lista, y ya incluye la coincidencia de autor
            // 3. El libro ya esta en la lista, por una coincidencia de autor, y el duplicado esta por coincidencia de autor:
            // Tengo que agregar el nuevo autor, al campo de author_coincidence

            const existingBook = newBooks[book.id];

            if (existingBook.coincidence_type == "book_name" && book.coincidence_type == "author_name") {
                existingBook.author_coincidence = book.author_coincidence;
                existingBook.coincidence_type = "book_and_author_name";
            } else if (existingBook.coincidence_type == "book_name" && book.coincidence_type == "book_name") {
                //Do nothing
            } else if (existingBook.coincidence_type == "author_name" && book.coincidence_type == "author_name") {
                existingBook.author_coincidence += ", " + book.author_coincidence;
            } else if (existingBook.coincidence_type == "author_name" && book.coincidence_type == "book_name") {
                existingBook.coincidence_type = "book_and_author_name";
            }
        }
    }

    return Object.values(newBooks);
}



function cortarDescripcion(descripcion, longitud) {
    if (descripcion.length <= longitud) {
        return descripcion;
    }

    
    let nuevaDescripcion = descripcion.substring(0, longitud);

    const lastSpaceIndex = nuevaDescripcion.lastIndexOf(' ');
    const lastLineJumpIndex = nuevaDescripcion.lastIndexOf('\n');

    const cutTo = Math.max(lastSpaceIndex, lastLineJumpIndex);

    if (cutTo != -1) {
        nuevaDescripcion = nuevaDescripcion.substring(0, lastSpaceIndex);
    }

    nuevaDescripcion += " (...)";

    
    console.log("Desc inicial:", descripcion.substring(0, 100) + ' (...)');
    console.log("Desc cortada:", nuevaDescripcion);
    
    return nuevaDescripcion;
}

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

    const result = genericPaginatedSearch(queryFunction, searchTerm, 10, page, true);

    console.log("RESULT:", result)

    const books = result.rows.map(book => {
        let book_parsed = getBookData(book.id);

        book_parsed.description = cortarDescripcion(book_parsed.description, 100);
        book_parsed.rating = (book.avg_rating)*20;
        return book_parsed
      });

      console.log("BOOKS", books)

    const has_more = result.has_more;

    res.render("browse", {
        username: req.session.user,
        loggedIn: true,
        title: "Browse Books",
        search: searchTerm,
        books: books,
        next_page: has_more ? page + 1 : null,
        prev_page: page > 0 ? page - 1 : null,
        validTypes: validTypes,
        endpoint_route: `browse/search/${searchTerm}`,
        more_link_parameters: `&type=${tipoBusqueda}`
    });
});

router.get('/search_author', function (req, res) {
    const searchTerm = req.query.search || "";
    const amount = 10;
    const offset = 0;

    const rows = searchAuthorByName(searchTerm, amount, offset);
    res.json({ authorEntries: rows });
});


function processTopicBooksRequest(res, req, topic_type, topic) {
    const PAGINATION_LIMIT = 7;
    req.query.page ??= 0;
    const page = Number(req.query.page)
    
    let result;

    if (topic_type == "genre") {
        result = fetchBooksInGenre(topic, PAGINATION_LIMIT, page);
    } else if (topic_type == "author") {
        result = fetchBooksByAuthor(topic, PAGINATION_LIMIT, page);
    } else {
        res.status(400).send("Invalid topic type");
    }


    const books = result.books.map(book => {
      book = getBookData(book.id);
  
      if (book.book_name.length > 90) {
        book.book_name = book.book_name.substring(0, 90);
        book.book_name = book.book_name + "...";
      }
      if (book.description.length > 100) {
        book.description = book.description.substring(0, 100);
        book.description = book.description + " (...)";
      }
      return book
    });
    const estaAutenticadoBool = estaAutenticado(req);
  
    const next_page = result.has_more ? page + 1 : null;
    const prev_page = (page > 0) ? page - 1 : null;
  
    console.log(`${prev_page} ${next_page}`)

    
    res.render("books", {
      username: req.session.user,
      loggedIn: estaAutenticadoBool,
      topic_type: topic_type,
      topic: topic,
      topic_url: encodeURIComponent(topic),
      books: books,
      next_page: next_page,
      prev_page: prev_page,
      endpoint_route: `browse/${topic_type}/${req.params.genre}`
    });
}


router.get('/genre/:genre', (req, res) => {
    processTopicBooksRequest(res, req, "genre", req.params.genre);
});

router.get('/author/:author', (req, res) => {
    processTopicBooksRequest(res, req, "author", req.params.author);
});


export default router;
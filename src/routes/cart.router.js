import { Router } from "express";
import { retrieveFromCart,fetchBook } from "../database.js";
import { isAuthenticated } from "../authenticate.js";

const router = Router();

router.get('/', isAuthenticated,function (req, res) {
    const data = retrieveFromCart(req.session.userId);
    let books = data.map((book) => {
        return fetchBook(book.book_id);
    });
    //format the author and the genre of the book, removing the [] and the "".
    books = books.map((book) => {
        book.authors = book.authors.replace(/[\[\]"]+/g, '');
        book.genre = book.genre.replace(/[\[\]"]+/g, '');
        book.userId = req.session.userId;
        return book;
    });
    const empty_cart = books.length === 0;
    res.render("cart", {
        do_sidebar: true,
        loggedIn: true,
        title: "Cart",
        empty_cart,
        books,
    });
});



export default router;
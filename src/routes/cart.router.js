import { Router } from "express";
import { retrieveFromCart,fetchBook } from "../database.js";
import { isAuthenticated } from "../authenticate.js";

const router = Router();

router.get('/', isAuthenticated,function (req, res) {
    const data = retrieveFromCart(req.session.userId);
    let books = data.map((book) => {
        return fetchBook(book.book_id);
    });
    console.log(books);
    res.render("cart", {
        do_sidebar: true,
        loggedIn: true,
        title: "Cart",
        books
    });
});



export default router;
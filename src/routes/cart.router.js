import { Router } from "express";
import { retrieveFromCart,fetchBook, clearUserCart } from "../database.js";
import { isAuthenticated } from "../authenticate.js";
import { getCartTotalPrice } from "../database.js";
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
    const userId = req.session.userId;
    res.render("cart", {
        loggedIn: true,
        title: "Cart",
        username: req.session.user,
        empty_cart,
        books,
        userId
    });
});

router.get("/", function (req, res) {
    res.redirect("/");
});


router.get("/card_payment", isAuthenticated, function (req, res) {
    const total_price = getCartTotalPrice(req.session.userId);

    if(total_price === null){
        //Redirect to cart if the cart is empty
        res.redirect("/cart");
        return;
    }    

    res.render("card_payment", {
        title: "Card Payment",
        loggedIn: true,
        do_sidebar: false,
        username: req.session.user,
        userId: req.session.userId,
        total_price
    });
});

router.get("/card_payment", function (req, res) {
    res.redirect("/");
});


//Route to empty the cart
router.post("/clear", isAuthenticated, function (req, res) {
    const userId = req.session.userId;
    clearUserCart(userId);
    
    //Return ok
    res.status(200).send();
});




export default router;
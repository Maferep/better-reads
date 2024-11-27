import { Router } from "express";
import { retrieveFromCart,getCartTotalPrice, clearUserCart, createPurchaseFromCart } from "../database/cartAndPurchasesDatabase.js";
import { isAuthenticated } from "../authenticate.js";
import {fetchBook  } from "../database.js";
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
        book.quantity = data.find((element) => element.book_id === book.id).quantity;
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

router.get("/shipping_address", isAuthenticated, function (req, res) {
    const userId = req.session.userId;
    let total_price = getCartTotalPrice(userId);
    total_price += 5.00;
    if (total_price === null) {
        // Redirigir al carrito si el carrito está vacío
        res.redirect("/cart");
        return;
    }

    // Renderiza la página de dirección de envío
    res.render("ship_address", {
        title: "Ship Address",
        loggedIn: true,
        username: req.session.user,
        userId,
        total_price
    });
});


router.get("/card_payment", isAuthenticated, function (req, res) {
    let total_price = getCartTotalPrice(req.session.userId);
    total_price += 5.00; //Shipping cost
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


router.post("/card_payment", isAuthenticated, function (req, res) {

    console.log(req.body)
    //Recibo los datos del formulario
    const { cardNumber, expirationDate, securityCode } = req.body;
    const userId = req.session.userId;
    const total_price = getCartTotalPrice(userId);
    //Valido los datos
    if (cardNumber === "" || expirationDate === "" || securityCode === "") {
        res.status(400).send("All fields are required");
        return;
    }

    if (validateExpirationDate(expirationDate) === false) {
        res.status(400).send("Expired card");
        return;
    }

    //Validar que tiene algun libro en el carrito
    if (total_price === null) {
        res.status(400).send("Cart is empty");
        return;
    }

    //Proceso el pago
    //Aquí debería ir la lógica de procesar el pago

    //Creo la compra
    createPurchaseFromCart(userId);
    clearUserCart(userId);

    //Responder con un ok
    res.status(200).send();
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

router.get('/item-count', isAuthenticated, (req, res) => {
    const cartItems = retrieveFromCart(req.session.userId);
    const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0); // Suma las cantidades
    res.json({ count: itemCount });
});



export default router;

function validateExpirationDate(expiration_date) {
    //Check if the expiration date is in the format MM/YY
    const regex = new RegExp("^(0[1-9]|1[0-2])\/[0-9]{2}$");
    if (!regex.test(expiration_date)) {
        return false;
    }

    const [month, year] = expiration_date.split("/");
    const current_date = new Date();
    const current_year = current_date.getFullYear();
    const current_month = current_date.getMonth() + 1;

    if (parseInt(year) < current_year % 100) {
        return false;
    }

    if (parseInt(year) === current_year % 100 && parseInt(month) < current_month) {
        return false;
    }

    return true;
}
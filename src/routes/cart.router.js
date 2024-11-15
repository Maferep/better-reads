import { Router } from "express";

const router = Router();

router.get('/', function (req, res) {
    res.render("cart", {
        username: req.session.user,
        do_sidebar: true,
        loggedIn: true,
        title: "Cart",
    });
});

// Endpoint to add a book to the cart
router.post('/', function (req, res) {
    
    const data = req.body;
    console.log(data);


    // try {
    //     const stmt = db.prepare("INSERT INTO cart (user_id, book_id) VALUES (?, ?)");
    //     stmt.run(userId, bookId);
    //     res.status(200).send("Book added to cart successfully!");
    // } catch (error) {
    //     console.error("Error adding book to cart:", error);
    //     res.status(500).send("An error occurred while adding the book to the cart.");
    // }
});


export default router;
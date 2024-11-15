import { addBookToCart,removeFromCart } from "./database.js";

export default io => {
    io.on('connection', socket => {
        console.log("Nuevo cliente conectado -----> ", socket.id);
        socket.on("addBookToCart", (data) => {
            console.log("Book added to cart: ", data);
            addBookToCart(data.userId, data.bookId);
        });

        socket.on("removeFromCart",(data) => {
            console.log("Book removed from cart: ", data);
            removeFromCart(data.userId, data.bookId);
            socket.emit("bookRemovedFromCart");
        });
    });
}
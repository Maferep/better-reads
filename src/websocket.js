import { addBookToCart,removeFromCart,retrieveFromCart,fetchBook,clearUserCart } from "./database.js";

export default io => {
    io.on('connection', socket => {
        console.log("Nuevo cliente conectado -----> ", socket.id);
        socket.on("addBookToCart", (data) => {
            console.log("Book added to cart: ", data);
            addBookToCart(data.userId, data.bookId);
        });

        socket.on("removeFromCart",(data) => {
            removeFromCart(data.userId, data.bookId);
            socket.emit("bookRemovedFromCart",{bookId:data.bookId});
        });

        socket.on("clearCart",(userId)=>{
            console.log("Clearing cart for user: ", userId);
            clearUserCart(userId);
        });
    });
}
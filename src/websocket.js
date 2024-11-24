import { addBookToCart,removeFromCart,retrieveFromCart,clearUserCart,saveBookQuantity } from "./database/cartAndPurchasesDatabase.js";

export default io => {
    io.on('connection', socket => {
        console.log("Nuevo cliente conectado -----> ", socket.id);
        socket.on("addBookToCart", (data) => {
            console.log("Book added to cart: ", data);
            addBookToCart(data.userId, data.bookId);
            io.emit('cartUpdated'); // Notifica a todos los clientes
        });
        
        socket.on("removeFromCart", (data) => {
            removeFromCart(data.userId, data.bookId);
            socket.emit("bookRemovedFromCart", { bookId: data.bookId });
            io.emit('cartUpdated'); // Notifica a todos los clientes
        });
        
        socket.on("bookQuantityChanged", (data) => {
            const { userId, bookId, quantity } = data;
            saveBookQuantity(userId, bookId, quantity);
            io.emit('cartUpdated'); // Notifica a todos los clientes
        });
        
        socket.on("clearCart", (userId) => {
            clearUserCart(userId);
            io.emit('cartUpdated'); // Notifica a todos los clientes
        });


    });
}
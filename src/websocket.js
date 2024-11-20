import { addBookToCart,removeFromCart,retrieveFromCart,fetchBook,clearUserCart,saveBookQuantity } from "./database.js";

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

        socket.on("purchaseCart", (data) => {
            const { userId, cart } = data;
        
            console.log(`Processing purchase for user: ${userId}`);
            console.log(`Cart data: `, cart);
        
            try {
    
                for (const { bookId, quantity } of cart) {
                    saveBookQuantity(userId, bookId, quantity); 
                }
        
                socket.emit('purchaseConfirmed', { success: true });
            } catch (error) {
                console.error("Error processing purchase: ", error);
                socket.emit('purchaseConfirmed', { success: false, error });
            }
        });


    });
}
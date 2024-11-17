import { addBookToCart,removeFromCart,retrieveFromCart,fetchBook } from "./database.js";

export default io => {
    io.on('connection', socket => {
        console.log("Nuevo cliente conectado -----> ", socket.id);
        socket.on("addBookToCart", (data) => {
            console.log("Book added to cart: ", data);
            addBookToCart(data.userId, data.bookId);
        });

        socket.on("removeFromCart",(data) => {
            removeFromCart(data.userId, data.bookId);
            const remaining_books = retrieveFromCart(data.userId);
            if (remaining_books.length !== 0) {
                let books = remaining_books.map((book) => {
                    return fetchBook(book.book_id);
                });
                //format the author and the genre of the book, removing the [] and the "".
                books = books.map((book) => {
                    book.authors = book.authors.replace(/[\[\]"]+/g, '');
                    book.genre = book.genre.replace(/[\[\]"]+/g, '');
                    book.userId = data.userId;
                    return book;
                });
                console.log("remaining books", books);
                socket.emit("bookRemovedFromCart",books);
            }else{
                socket.emit("bookRemovedFromCart",remaining_books);
            }
        });
    });
}
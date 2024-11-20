import Database from "better-sqlite3";
import { fetchBook } from "../database.js";

function createCartAndPurchasesDB(db) {
    createCartDB(db);
}

function createCartDB(db) {
    const db_stmt = `CREATE TABLE IF NOT EXISTS cart (
      id INTEGER PRIMARY KEY NOT NULL,
      user_id INTEGER NOT NULL,
      book_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (user_id) REFERENCES insecure_users(id),
      FOREIGN KEY (book_id) REFERENCES books(id)
    )`;
    db.prepare(db_stmt).run();
    console.log("Created cart table with quantity column.");
  }

  
function addBookToCart(userId, bookId) {
    const db = new Database("database_files/betterreads.db", {
      verbose: console.log,
    });
    const checkCart = db.prepare("SELECT 1 FROM cart WHERE user_id = ? AND book_id = ?");
    const exists = checkCart.get(userId, bookId);
  
    if (!exists) {
      const insertCart = db.prepare("INSERT INTO cart (user_id, book_id) VALUES (?, ?)");
      insertCart.run(userId, bookId);
      console.log(`Book ${bookId} added to cart for user ${userId}.`);
    } else {
      console.log(`Book ${bookId} is already in the cart for user ${userId}.`);
    }
  }

  
function removeFromCart(userId, bookId) {
    const db = new Database("database_files/betterreads.db", {
      verbose: console.log,
    });
    const removeBook = db.prepare("DELETE FROM cart WHERE user_id = ? AND book_id = ?");
    removeBook.run(userId, bookId);
  }
  
  function retrieveFromCart(userId) {
    const db = new Database("database_files/betterreads.db", {
      verbose: console.log,
    });
    const retrieveCart = db.prepare("SELECT * FROM cart WHERE user_id = ?");
    const rows = retrieveCart.all(userId);
    return rows;
  }
  
  function clearUserCart(userId) {
    const db = new Database("database_files/betterreads.db", {
      verbose: console.log,
    });
    const clearCart = db.prepare("DELETE FROM cart WHERE user_id = ?");
    clearCart.run(userId);
  }
  
  function saveBookQuantity(userId, bookId, quantity) {
    const db = new Database("database_files/betterreads.db", {
      verbose: console.log,
    });
  
    const checkCart = db.prepare("SELECT 1 FROM cart WHERE user_id = ? AND book_id = ?");
    const exists = checkCart.get(userId, bookId);
  
    if (!exists) {
      const insertCart = db.prepare("INSERT INTO cart (user_id, book_id, quantity) VALUES (?, ?, ?)");
      insertCart.run(userId, bookId, quantity);
      console.log(`Book ${bookId} added to cart for user ${userId}.`);
    } else {
      const updateCart = db.prepare("UPDATE cart SET quantity = ? WHERE user_id = ? AND book_id = ?");
      updateCart.run(quantity, userId, bookId);
      console.log(`Book ${bookId} quantity updated to ${quantity} for user ${userId}.`);
    }
  }
  
  function getCartTotalPrice(userId) {
    const db = new Database("database_files/betterreads.db", {
      verbose: console.log,
    });
    const retrieveCart = db.prepare("SELECT * FROM cart WHERE user_id = ?");
    const rows = retrieveCart.all(userId);
    let total_price = 0;
    for (const row of rows) {
      const book = fetchBook(row.book_id);
      total_price += book.price * row.quantity;
    }
    return total_price;
  }
  


  export{
    createCartAndPurchasesDB,
    addBookToCart,
    removeFromCart,
    retrieveFromCart,
    clearUserCart,
    saveBookQuantity,
    getCartTotalPrice
  }

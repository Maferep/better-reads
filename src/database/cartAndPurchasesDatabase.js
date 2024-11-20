import Database from "better-sqlite3";
import { fetchBook } from "../database.js";

function createCartAndPurchasesDB(db) {
    createCartDB(db);
    createPurchases_itemsDB(db);
    createPurchasesDB(db);
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

function createPurchases_itemsDB(db) {
    const db_stmt = `CREATE TABLE IF NOT EXISTS purchases_items (
      id INTEGER PRIMARY KEY NOT NULL,
      purchase_id INTEGER NOT NULL,
      book_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (book_id) REFERENCES books(id)
        FOREIGN KEY (purchase_id) REFERENCES purchases(purchase_id)
    )`;
    db.prepare(db_stmt).run();
    console.log("Created purchases table with quantity column.");
}

function createPurchasesDB(db) {
    const db_stmt = `CREATE TABLE IF NOT EXISTS purchases (
        id INTEGER PRIMARY KEY NOT NULL,
        purchase_id INTEGER NOT NULL UNIQUE,
        user_id INTEGER NOT NULL,
        final_price REAL NOT NULL,
        purchase_date INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES insecure_users(id)
        )`;
    db.prepare(db_stmt).run();
    console.log("Created purchases table with purchase_date column.");
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
    //Si no hay ninugn libro, devolver null
    if (rows.length === 0)
      return null;

    let total_price = 0;
    for (const row of rows) {
      const book = fetchBook(row.book_id);
      total_price += book.price * row.quantity;
    }
    return total_price;
  }

  function createPurchaseFromCart(userId) {
    const db = new Database("database_files/betterreads.db", {
      verbose: console.log,
    });
    const retrieveCart = db.prepare("SELECT * FROM cart WHERE user_id = ?");
    const booksCart = retrieveCart.all(userId);
    const total_price = getCartTotalPrice(userId);

    if (booksCart.length === 0) {
      console.log(`User ${userId} tried to create a purchase with an empty cart.`);
      throw Error("Empty cart.");
    }

    const currentMaxPurchaseId = db.prepare("SELECT MAX(purchase_id) FROM purchases").get()["MAX(purchase_id)"] || 0;
    const newPurchaseId = currentMaxPurchaseId + 1;

    const insertPurchase = db.prepare("INSERT INTO purchases (purchase_id, user_id, final_price, purchase_date) VALUES (?, ?, ?, unixepoch('subsec'))");
    insertPurchase.run(newPurchaseId, userId, total_price);

    for (const book of booksCart) {
      const insertPurchaseItem = db.prepare("INSERT INTO purchases_items (purchase_id, book_id, quantity) VALUES (?, ?, ?)");
      insertPurchaseItem.run(newPurchaseId, book.book_id, book.quantity);
    }
  }
  


  export{
    createCartAndPurchasesDB,
    addBookToCart,
    removeFromCart,
    retrieveFromCart,
    clearUserCart,
    saveBookQuantity,
    getCartTotalPrice,
    createPurchaseFromCart
  }

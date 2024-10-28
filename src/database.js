import Database from "better-sqlite3";
import session from "express-session";
import _SqliteStore from "better-sqlite3-session-store";
import csv from "csv-parser";
import fs from "fs";
import axios from "axios";
import { randomInt } from "crypto";
var SqliteStore = _SqliteStore(session)
const TEST_USER_ID = 20000000;
const TEST_BOOK_ID = 0;
const TEST_POST_ID = 1;

function initDb() {
  // Create username/password database
  const db = new Database("database_files/betterreads.db", {
    verbose: console.log,
  }); // create if no connection found
  createInsecureUsersDatabase(db);
  createBookDb(db, "./database_files/books_data.csv");

  createReviewDb(db);
  createBookStatesDb(db);
  createPostDatabase(db);
  createCommentDb(db);
  createLikeDb(db);

  // create posts database
}

// this database stores passwords in plain text!
function createInsecureUsersDatabase(db) {
  const db_stmt = 'CREATE TABLE IF NOT EXISTS insecure_users (id INTEGER PRIMARY KEY NOT NULL, username varchar(255) UNIQUE NOT NULL, insecure_password varchar(255) NOT NULL)';
  db.prepare(db_stmt).run();
  console.log(db_stmt);

  // insert test user
  const id = TEST_USER_ID;
  // TODO: validate input
  const username = "staff"
  const password = "password"

  try {
    const run = db.prepare('INSERT INTO insecure_users VALUES (?,?,?)').run(id, username, password);
    console.log("Created default test user.")
  } catch (e) {
    console.log("Database already contains default test user.")
  }
}

function loadFromCSV(path, callback) {
  const rows = [];

  fs.createReadStream(path)
    .pipe(csv())
    .on("data", (data) => {
      (data["isbn"] = "-"), rows.push(data);
    })
    .on("end", () => {
      // TODO: call here fetchISBN to fetch all
      callback(rows);
    })
    .on("error", (err) => {
      console.error("Error reading CSV file:", err);
    });
}

function fetchISBN(infoLink, callback) {
  // TODO: fetch in batch manner, not individually
  const url = new URL(infoLink);
  const book_id = url.searchParams.get("id");
  const books_api = `https://www.googleapis.com/books/v1/volumes/${book_id}`;
  axios.get(books_api, (res) => {
    const ISBN_10 = 0;
    const ISBN_13 = 1;
    console.log(res.data);
    isbn = res.data["volumeInfo"]["industryIdentifiers"][ISBN_10]["identifier"];
    callback(isbn);
  });
}

function createBookDb(db, datasetPath) {
  // Create or modify the table structure to include authors, genres, and image fields.
  db.prepare(
    `CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY NOT NULL, 
      book_name TEXT UNIQUE NOT NULL, 
      description TEXT  NOT NULL, 
      isbn TEXT, 
      authors TEXT,
      genre TEXT,
      image TEXT
    )`
  ).run();

  // Check if the table already contains data
  const books_count = "SELECT COUNT(*) FROM books";
  let count = db.prepare(books_count).get();

  if (count["COUNT(*)"] <= 0) {
    const insert_books = db.prepare(
      `INSERT INTO books (
          id,
          book_name, 
          description, 
          isbn,
            authors,
            genre,
            image
       ) VALUES (?, ?, ?, ?, ?, ?, ?)`
    );
    insert_books.run(0, "TestBook", "test description", "0-8560-9505-2", "Test Author", "Test Genre", "https://thumbs.dreamstime.com/z/modern-vector-abstract-book-cover-template-teared-paper-47197768.jpg");
    loadFromCSV(datasetPath, (books) => {
      let id = 0

      const insert_many_books = db.transaction((books) => {
        for (const book of books) {
          id += 1;
          insert_books.run(
            id,
            book["Title"], 
            book["description"], 
            book["isbn"],
            JSON.stringify(book["authors"]), // Store authors as a JSON string
            JSON.stringify(book["categories"]), // Store categories (genres) as a JSON string
            book["image"] // Direct image link
          );
        }      
      })

      // Populate the database with data from the CSV file
      insert_many_books(books);
    });
  } 
}

function createPostDatabase(db) {
  /*
  https://www.sqlite.org/foreignkeys.html
  https://www.sqlite.org/lang_datefunc.html
  Note that numeric arguments in parentheses that following the type name 
  (ex: "VARCHAR(255)") are ignored by SQLite - SQLite does not impose any length restrictions 
  (other than the large global SQLITE_MAX_LENGTH limit) on the length of strings, BLOBs or numeric values.

  In the SQL statement text input to sqlite3_prepare_v2() and its variants, 
  literals may be replaced by a parameter that matches one of following templates: ?, ...

  */

  const MAX_POST_LENGTH = 50000
  const stmt = db.prepare(
    `CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY  NOT NULL,
      author_id int NOT NULL,
      book_id int NOT NULL,
      text_content TEXT  NOT NULL,
      date TEXT NOT NULL,
      likes int NOT NULL,
      FOREIGN KEY(author_id) REFERENCES insecure_users(id),
      FOREIGN KEY(book_id) REFERENCES books(id))`
  ).run();
  
  // TODO: add size constraint from https://stackoverflow.com/questions/17785047/string-storage-size-in-sqlite

  // CREATE TEST POST FROM TEST USER
  // we use TEST_USER_ID and a default user to ensure foreign key constraints are met
  
  const posts_count = 'SELECT COUNT(*) FROM posts'
  let count = db.prepare(posts_count).get(); // { 'COUNT(*)': 0 }

  if (count['COUNT(*)'] <= 0) {
    const insert_posts = db.prepare(
      `INSERT INTO posts (
          author_id, book_id, text_content, date, likes
       ) VALUES (?,?,?,DateTime('now'), 0)`
    );

    insert_posts.run(
      TEST_USER_ID, 
      TEST_BOOK_ID, 
      "This is my first post!!!!!!!!!!!!!!"
    );
  }
}

function createCommentDb(db) {
  /*
  */

  const MAX_COMMENT_LENGTH = 50000
  const stmt = db.prepare(
    `CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY NOT NULL,
      parent INTEGER NOT NULL,
      text_content TEXT NOT NULL,
      date TEXT NOT NULL,
      likes int NOT NULL,
      FOREIGN KEY(parent) REFERENCES posts(id))`
  ).run();
  
  // create comment
  
  let count = 'SELECT COUNT(*) FROM comments'
  count = db.prepare(count).get(); // { 'COUNT(*)': 0 }

  if (count['COUNT(*)'] <= 0) {
    const insert_comments = db.prepare(
      `INSERT INTO comments (
          parent, text_content, date, likes
       ) VALUES (?,?,DateTime('now'), 0)`
    );

    insert_comments.run(
      1, 
      "This post is rubbish mate"
    );
  }
}

function createLikeDb(db) {
  /*
  */

  const MAX_COMMENT_LENGTH = 50000
  const stmt = db.prepare(
    `CREATE TABLE IF NOT EXISTS likes (
      id INTEGER PRIMARY KEY NOT NULL,
      post_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      FOREIGN KEY(post_id) REFERENCES posts(id),
      FOREIGN KEY(user_id) REFERENCES insecure_users(id))`
  ).run();
  
  let count = 'SELECT COUNT(*) FROM likes'
  count = db.prepare(count).get(); // { 'COUNT(*)': 0 }

  if (count['COUNT(*)'] <= 0) {
    const insert_likes = db.prepare(
      `INSERT INTO likes (
          post_id, user_id, date
       ) VALUES (?,?,DateTime('now'))`
    );

    insert_likes.run(
      1,
      20000000
    );
  }
}

function createReviewDb(db) {
  // add pragma foreign keys
  db.pragma("foreign_keys = ON");

  // delete table reviews if it exists
  // db.prepare(/* sql */`DROP TABLE IF EXISTS reviews`).run();

  //The table has the columns: review_id, book_id, user_id, rating, review_text
  const db_reviews = /* sql */ `CREATE TABLE IF NOT EXISTS reviews (
                        review_id INTEGER PRIMARY KEY AUTOINCREMENT,
                        book_id INT,
                        user_id INT,
                        rating INT,
                        review_text VARCHAR(255),
                        FOREIGN KEY (book_id) REFERENCES books(id),
                        FOREIGN KEY (user_id) REFERENCES insecure_users(id));`;

  db.prepare(db_reviews).run();
}

function createBookStatesDb(db) {
  db.pragma("foreign_keys = ON");

  const db_book_states = `CREATE TABLE IF NOT EXISTS book_states (
                        book_id INT,
                        user_id INT,
                        state VARCHAR(255),
                        PRIMARY KEY (book_id, user_id),
                        FOREIGN KEY (book_id) REFERENCES books(id),
                        FOREIGN KEY (user_id) REFERENCES insecure_users(id));`;

  db.prepare(db_book_states).run();
}

function initSessions(app) {
  // const db_sessions = new Database('database_files/sessions.db', { verbose: console.log });
  const db_sessions = new Database("database_files/sessions.db", {});

  app.use(
    session({
      store: new SqliteStore({
        client: db_sessions,
        expired: {
          clear: true,
          intervalMs: 900000, //ms = 15min
        },
      }),
      secret: "keyboard cat",
      resave: false,
    })
  );
}

function fetchBooks(amount, offset) {
  const db = new Database("database_files/betterreads.db", {
    verbose: console.log,
  }); // create if no connection found
  const fetchBooks = "SELECT * FROM books LIMIT ? OFFSET ?";
  const rows = db.prepare(fetchBooks).all(amount, offset);
  console.log("fetch books:", rows);
  return rows;
}

function fetchBook(bookId) {
  const db = new Database("database_files/betterreads.db", {
    verbose: console.log,
  });
  const fetchQuery = "SELECT * FROM books WHERE id=?";
  const rows = db.prepare(fetchQuery).all(bookId);
  console.log("book fetched:", rows);

  if (rows.length == 0) return null;
  return rows[0];
}

function addReview(bookId, userId, rating, reviewText) {
  const db = new Database("database_files/betterreads.db", {
    verbose: console.log,
  });
  const insertReview = /* sql */ `INSERT INTO reviews (book_id, user_id, rating, review_text) VALUES (?, ?, ?, ?)`;
  db.prepare(insertReview).run(bookId, userId, rating, reviewText);
}

function fetchReviews(bookId, userId = null) {
  //get reviews in format {username, rating, review_text}
  //En el caso de que se provea un userId, se va a retornar todas las reviews, pero con la review de tal user ID al inicio.

  const db = new Database("database_files/betterreads.db", {
    verbose: console.log,
  });

  //it needs to jopin with insecure_users to get the username
  const fetchReviews = /* sql */ `SELECT insecure_users.username, reviews.rating, reviews.review_text FROM reviews
                                JOIN insecure_users ON reviews.user_id = insecure_users.id
                                WHERE reviews.book_id = ?
                                ORDER BY CASE WHEN reviews.user_id = ? THEN 1 ELSE 0 END DESC;`;

  const rows = db.prepare(fetchReviews).all(bookId, userId);

  console.log(rows);

  return rows;
}

function userAlreadySubmitedReview(bookId, userId) {
  const db = new Database("database_files/betterreads.db", {
    verbose: console.log,
  });
  const query = /* sql */ `SELECT 1 FROM reviews WHERE book_id = ? AND user_id = ?`;
  const rows = db.prepare(query).all(bookId, userId);
  return rows.length > 0;
}

function fetchBookState(bookId, userId) {
  const db = new Database("database_files/betterreads.db", {
    verbose: console.log,
  });
  const query = /* sql */ `SELECT state FROM book_states WHERE book_id = ? AND user_id = ?`;
  const result = db.prepare(query).get(bookId, userId);
  return result ? result.state : null;
}

function addBookState(bookId, userId, state) {
  const db = new Database("database_files/betterreads.db", {
    verbose: console.log,
  });
  if (state === "none") {
    const operation = /* sql */ `DELETE FROM book_states WHERE book_id = ? AND user_id = ?`;
    db.prepare(operation).run(bookId, userId);
  } else {
    const operation = /* sql */ `INSERT INTO book_states (book_id, user_id, state)
                           VALUES (?, ?, ?)
                           ON CONFLICT(book_id, user_id) DO UPDATE SET state = ?`;
    db.prepare(operation).run(bookId, userId, state, state);  // Pass `state` twice for the update clause
  }
}

// TODO: ui needs to only let you talk about specific books so we can use a valid book id
function createPost(userId, content, topic) {
  const db = new Database("database_files/betterreads.db", {
    verbose: console.log,
  });
  const operation = /* sql */ `INSERT INTO posts (
        author_id, book_id, text_content, date, likes
     ) VALUES (?,?,?,DateTime('now'), 0)`
  db.prepare(operation).run(
    userId, 
    TEST_BOOK_ID,
    "About ''''" + topic + "'''': " + content
  );
}

function fetchPosts() {
  //Quiero obtener de la base de datos, el id del post, id del usuario, nombre de usuario, el id y nombre del libro sobre el que habla, el contenido del post, y quiero que este ordenado por fecha
  const db = new Database("database_files/betterreads.db", {
    verbose: console.log,
  });
  const query = /* sql */ `SELECT posts.id, insecure_users.id as user_id, insecure_users.username, books.id as book_id, books.book_name, posts.text_content FROM posts
                          JOIN insecure_users ON posts.author_id = insecure_users.id
                          JOIN books ON posts.book_id = books.id
                          ORDER BY posts.date DESC;`;

  const rows = db.prepare(query).all();
  return rows;
}

function incrementLikes(postId, userId) { // TODO: run inside transaction to ensure correctness
  const db = new Database("database_files/betterreads.db", {
    verbose: console.log,
  });
  // check post already liked
  const findLike = db.prepare(`SELECT id FROM likes WHERE post_id=? AND user_id=?`);
  let id = findLike.get(postId, userId);
  if (id == undefined) {
    // add to db
      const addLike = db.prepare(`INSERT INTO likes (
        post_id, user_id, date
    ) VALUES (?,?,DateTime('now'))`);

    let info = addLike.run(postId, userId);
    console.log(info.changes)
    if(!(info.changes > 0)) {
      return "fail to add like"
    }

    // increment counter
    const operation = /* sql */ `UPDATE posts SET likes=((posts.likes)+1) WHERE rowid=?`
    info = db.prepare(operation).run(postId);
    console.log("LIKE INCREMENT WAS ATTEMPTED:")
    console.log(info.changes)
    if(!(info.changes > 0)) {
    return "fail to increment"
    } else {
    return "success to increment"
    }
  } else {
    console.log(`Like already exists for ${post_id}`);
  }
}

function hasLiked(postId, userId) { // TODO: run inside transaction to ensure correctness
  const db = new Database("database_files/betterreads.db", {
    verbose: console.log,
  });
  // check post already liked
  const findLike = db.prepare(`SELECT id FROM likes WHERE post_id=? AND user_id=?`);
  let id = findLike.get(postId, userId);
  if (id == undefined) {
    return false;
  } else {
    return true;
  }
}


function searchBooks(query, limit, offset) {
  const db = new Database("database_files/betterreads.db", {
    verbose: console.log,
  });
  

  const searchQuery = `
    SELECT * FROM books 
    WHERE book_name LIKE ?
    LIMIT ? OFFSET ?`;

  const searchTerm = `%${query}%`;

  const rows = db.prepare(searchQuery).all(searchTerm, limit, offset);
  console.log("search results:", rows);

  return rows;
}

export {
  initDb,
  initSessions,
  fetchBooks,
  fetchBook,
  addReview,
  fetchReviews,
  userAlreadySubmitedReview,
  addBookState,
  fetchBookState,
  createPost,
  searchBooks,
  fetchPosts,
  incrementLikes
};

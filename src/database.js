import Database from "better-sqlite3";
import session from "express-session";
import _SqliteStore from "better-sqlite3-session-store";
import csv from "csv-parser";
import fs from "fs";
import axios from "axios";
import { start } from "repl";
import { create } from "domain";
import { createNotificationsDB } from "./database/notificationDatabase.js";
import { createCartAndPurchasesDB } from "./database/cartAndPurchasesDatabase.js";
import { sha256 } from "./authenticate.js";
import { v4 as uuid4 } from "uuid";
import {createAllMockData} from "./database/mockData.js";

var SqliteStore = _SqliteStore(session)
const TEST_USER_ID = uuid4();
const TEST_USER_ID_2 = uuid4();
const TEST_BOOK_ID = 0;
const TEST_POST_ID = 1;
const CANTIDAD_POSTS_PAGINADO = 20;

const RESET_DATABASE = false;

const BOOK_DATA_FULL = "./database_files/books_data_full.csv";
const BOOK_DATA_SMALL = "./database_files/books_data_prices.csv";

function initDb() {
  //Delete files of database
  if (RESET_DATABASE) {
    fs.unlink("database_files/betterreads.db", (err) => {});
    fs.unlink("database_files/sessions.db", (err) => {});
  }



  // Create username/password database
  console.log("Database initialization started.");
  const db = new Database("database_files/betterreads.db", {
    // verbose: console.log,
  }); // create if no connection found
  console.log("Database connection established.");
  createInsecureUsersDatabase(db);
  console.log("Created insecure_users table.");
  createUserProfileDb(db);
  console.log("Created user_profiles table.");
  createUserFollowsDb(db);
  console.log("Created user_follows table.");
  var csvreader = createBookDb(db, BOOK_DATA_FULL, BOOK_DATA_SMALL);
  console.log("Created books table.");

  if (csvreader != undefined) {
    csvreader.on("end", () => {
      createReviewDb(db);
        console.log("Created reviews table.");
        createBookStatesDb(db);
        console.log("Created book_states table.");
        createPostDatabase(db);
        console.log("Created posts table.");
        createRepostsDb(db);
        console.log("Created reposts table.");
        createCommentDb(db);
        console.log("Created comments table.");
        createLikeDb(db);
        console.log("Created likes table.");
        createCartAndPurchasesDB(db);

        createNotificationsDB(db);

        //Si solo hay 2 usuarios, se crea toda la mock data
        if (db.prepare("SELECT COUNT(*) FROM insecure_users").get()["COUNT(*)"] <= 2) {
          console.log("CREANDO MOCK DATA");
          createAllMockData();
        }

        console.log("Database initialization complete.");
    });
  } else {
    console.log("Database initialization complete.");
  }
}

function createUserProfileDb(db) {
  const db_stmt = `CREATE TABLE IF NOT EXISTS user_profiles (
    user_id TEXT PRIMARY KEY NOT NULL,
    bio TEXT,
    profile_photo TEXT,
    FOREIGN KEY (user_id) REFERENCES insecure_users(id)
  )`;
  db.prepare(db_stmt).run();
  console.log("Created user_profiles table.");
}

function createUserFollowsDb(db) {
  const db_stmt = `CREATE TABLE IF NOT EXISTS user_follows (
    follower_id TEXT NOT NULL,
    following_id TEXT NOT NULL,
    PRIMARY KEY (follower_id, following_id),
    FOREIGN KEY (follower_id) REFERENCES insecure_users(id),
    FOREIGN KEY (following_id) REFERENCES insecure_users(id)
  )`;
  db.prepare(db_stmt).run();
  console.log("Created user_follows table.");

  // testing
  const staffId = TEST_USER_ID; 
  const founderId = TEST_USER_ID_2; 

  followUser(staffId, founderId);
  followUser(founderId, staffId);

  const followers = getFollowers( staffId);
  console.log(`User ${staffId} followers:`, followers);
 
  const following = getFollowing(staffId);
  console.log(`User ${staffId} is following:`, following);
}

function getRandomBookId() {
  const db = new Database("database_files/betterreads.db", {
    // verbose: console.log,
  });
  const stmt = db.prepare("SELECT id FROM books ORDER BY RANDOM() LIMIT 1");
  return stmt.get().id;
}

function getRandomAuthorId() {
  const db = new Database("database_files/betterreads.db", {
    // verbose: console.log,
  });
  const stmt = db.prepare("SELECT author_id FROM books_authors ORDER BY RANDOM() LIMIT 1");
  return stmt.get().author_id;
}



function createInsecureUsersDatabase(db) {
  const db_stmt = 'CREATE TABLE IF NOT EXISTS insecure_users (id TEXT PRIMARY KEY NOT NULL, username varchar(255) UNIQUE NOT NULL, insecure_password varchar(255) NOT NULL)';
  db.prepare(db_stmt).run();

  // Create test users
  try {
  createUser(TEST_USER_ID, "staff", "password");
  createUser(TEST_USER_ID_2, "founder", "founderpassword");
  } catch (e) {
    console.log("Users already exist");
  }
}

function existsUserId(userId) {
  const db = new Database("database_files/betterreads.db", {
    // verbose: console.log,
  });
  const stmt = db.prepare("SELECT 1 FROM insecure_users WHERE id = ?");
  return stmt.get(userId) !== undefined;
}

function existsUsername(username) {
  const db = new Database("database_files/betterreads.db", {
    // verbose: console.log,
  });
  const stmt = db.prepare("SELECT 1 FROM insecure_users WHERE username = ?");
  return stmt.get(username) !== undefined;
}

function createUser(userId, username, password) {
  const db = new Database("database_files/betterreads.db", {
    // verbose: console.log,
  });

  if (existsUserId(userId)) {
    throw new Error("UserID already exists");
  }

  if (existsUsername(username)) {
    throw new Error("Username already exists");
  }

  const stmt = db.prepare("INSERT INTO insecure_users (id, username, insecure_password) VALUES (?, ?, ?)");
  stmt.run(userId, username, sha256(password));
}

function loadFromCSV(path, callback) {
  const rows = [];

  return fs.createReadStream(path)
    .pipe(csv())
    .on("data", (data) => {
      rows.push(data);
    })
    .on("end", () => {
      callback(rows);
    })
    .on("error", (err) => {
      console.error("Error reading CSV file:", err);
    });
}

function createBookDb(db, fullDatasetPath, shortDatasetPath) {
  // Create or modify the table structure to include authors, genres, image, and price fields.
  db.prepare(
    `CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY NOT NULL, 
      book_name TEXT UNIQUE NOT NULL, 
      description TEXT NOT NULL, 
      authors TEXT,
      genre TEXT,
      image TEXT,
      price REAL
    )`
  ).run();

  // Create tables for book-genre and book-author pairs
  db.prepare(
    `CREATE TABLE IF NOT EXISTS books_genres (
      id INTEGER PRIMARY KEY NOT NULL, 
      genre_id TEXT, 
      book_id INTEGER NOT NULL,
      FOREIGN KEY (book_id) REFERENCES books(id)
    )`
  ).run();

  db.prepare(
    `CREATE TABLE IF NOT EXISTS books_authors (
      id INTEGER PRIMARY KEY NOT NULL, 
      author_id TEXT, 
      book_id INTEGER NOT NULL,
      FOREIGN KEY (book_id) REFERENCES books(id)
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
          authors,
          genre,
          image,
          price
       ) VALUES (?, ?, ?, ?, ?, ?, ?)`
    );
    const insert_book_authors = db.prepare(
      `INSERT INTO books_authors (author_id, book_id) VALUES (?, ?)`
    );
    const insert_book_genres = db.prepare(
      `INSERT INTO books_genres (genre_id, book_id) VALUES (?, ?)`
    );

    // Create example book
    insert_books.run(0, "TestBook", "test description", "Test Author", "Test Genre", "https://thumbs.dreamstime.com/z/modern-vector-abstract-book-cover-template-teared-paper-47197768.jpg", 0.0);

    // Determine dataset path
    let datasetPath = "";
    if (fs.existsSync(fullDatasetPath)) {
      console.log("Found books_data_full.csv for full dataset.");
      datasetPath = fullDatasetPath;
    } else if (fs.existsSync(shortDatasetPath)) {
      console.log("Using books_data.csv for shortened dataset.");
      datasetPath = shortDatasetPath;
    } else {
      throw new Error("No dataset found.");
    }

    // Load and parse books from CSV
    return loadFromCSV(datasetPath, (books) => {
      let id = 0;
      const cantidadLibros = books.length;

      const insert_many_books = db.transaction((books) => {
        for (const book of books) {
          let empty_fields = 0;
          const important_fields = ["Title", "description", "authors", "image", "categories", "price"];
          for (const key of important_fields) {
            if (book[key] === undefined || book[key] === "") {
              empty_fields += 1;
            }
          }

          if (empty_fields >= 2) {
            // Discard book with too many missing fields
            continue;
          }

          id += 1;
          const price = parseFloat(book["price"]) || 0.0; // Parse price, default to 0.0 if invalid
          insert_books.run(
            id,
            book["Title"],
            book["description"],
            JSON.stringify(book["authors"]),
            JSON.stringify(book["categories"]),
            book["image"],
            price
          );

          // Extract authors and genres
          let re = /\[(?:'([^']*)'(?:, *(?:'([^']*)'))*)?\]/;
          let authors = book["authors"].match(re);
          let genres = book["categories"].match(re);
          authors = authors ? authors.slice(1) : [];
          genres = genres ? genres.slice(1) : [];

          for (const author of authors) {
            if (author && author !== "") {
              insert_book_authors.run(author, id);
            }
          }
          for (const genre of genres) {
            if (genre && genre !== "") {
              insert_book_genres.run(genre, id);
            }
          }

          if (id % Math.round(cantidadLibros / 100) === 0) {
            console.log(`Cargando libros ${Math.floor((id / cantidadLibros) * 100)}%`);
          }
        }
      });

      // Populate the database
      insert_many_books(books);
      console.log("Cargando libros 100%");
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
/*sql*/`CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY NOT NULL,
      author_id TEXT,
      book_id int DEFAULT NULL, -- En realidad se refiere a un topic, que en esta columna sería un libro //TODO: renombrar a book_topic
      author_topic int DEFULT NULL,
      text_content TEXT NOT NULL DEFAULT '',
      date INTEGER NOT NULL,
      likes int NOT NULL DEFAULT 0,
      comments int NOT NULL DEFAULT 0,
      reposts int NOT NULL DEFAULT 0,
      review_score int DEFAULT NULL,
      FOREIGN KEY(author_id) REFERENCES insecure_users(id),
      FOREIGN KEY(book_id) REFERENCES books(id))`
  ).run();
  
  // TODO: add size constraint from https://stackoverflow.com/questions/17785047/string-storage-size-in-sqlite

  // CREATE TEST POST FROM TEST USER
  // we use TEST_USER_ID and a default user to ensure foreign key constraints are met
  
  const posts_count = 'SELECT COUNT(*) FROM posts'
  let count = db.prepare(posts_count).get(); // { 'COUNT(*)': 0 }

  const NUMBER_OF_POSTS = 1

  if (count['COUNT(*)'] <= 0) {

    for (let i = 0; i < NUMBER_OF_POSTS; i++) {
      createPost(TEST_USER_ID, `This is my ${i}° post!`, TEST_BOOK_ID, "book")
      console.log(`Inserted post ${i} of ${NUMBER_OF_POSTS}`);
    }
  }
}

function createRepostsDb(db) {
  db.prepare(
    /*sql*/`CREATE TABLE IF NOT EXISTS reposts (
      id INTEGER PRIMARY KEY NOT NULL,
      post_id INTEGER NOT NULL,
      user_id TEXT NOT NULL,
      date INTEGER NOT NULL,
      FOREIGN KEY(post_id) REFERENCES posts(id),
      FOREIGN KEY(user_id) REFERENCES insecure_users(id));`
    ).run();

  let count = 'SELECT COUNT(*) FROM reposts'
  count = db.prepare(count).get(); // { 'COUNT(*)': 0 }

  if (count['COUNT(*)'] <= 0) {
    createRepost(1, TEST_USER_ID);
  }
}  
  

function sleepFor(sleepDuration){
  var now = new Date().getTime();
  while(new Date().getTime() < now + sleepDuration){ 
      /* Do nothing */ 
  }
}

function createCommentDb(db) {
  /*
  */

  const MAX_COMMENT_LENGTH = 50000
  const stmt = db.prepare(
    `CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY NOT NULL,
      parent_post INTEGER NOT NULL,
      author_id TEXT NOT NULL,
      text_content TEXT NOT NULL,
      date INTEGER NOT NULL,
      FOREIGN KEY(parent_post) REFERENCES posts(id),
      FOREIGN KEY(author_id) REFERENCES insecure_users(id));`
  ).run();
  
  // create comment
  
  let count = 'SELECT COUNT(1) FROM comments'
  count = db.prepare(count).get(); // { 'COUNT(*)': 0 }

  if (count['COUNT(*)'] <= 0) {
    createComment(1, TEST_USER_ID, "This post is rubbish mate");
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
      user_id TEXT NOT NULL,
      date INTEGER NOT NULL,
      FOREIGN KEY(post_id) REFERENCES posts(id),
      FOREIGN KEY(user_id) REFERENCES insecure_users(id))`
  ).run();
  
  let count = 'SELECT COUNT(*) FROM likes'
  count = db.prepare(count).get(); // { 'COUNT(*)': 0 }

  if (count['COUNT(*)'] <= 0) {
    incrementLikes(1, TEST_USER_ID)
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
                        user_id TEXT,
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
                        user_id TEXT,
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
    // verbose: console.log,
  });
  //test if already has review
  const query = /* sql */ `SELECT 1 FROM reviews WHERE book_id = ? AND user_id = ?`;
  const rows = db.prepare(query).all(bookId, userId);
  if (rows.length > 0) {
    throw new Error("User already reviewed this book");
  }

  const insertReview = /* sql */ `INSERT INTO reviews (book_id, user_id, rating, review_text) VALUES (?, ?, ?, ?)`;
  db.prepare(insertReview).run(bookId, userId, rating, reviewText);
}

function deleteReview(reviewId, userId) {
  const db = new Database("database_files/betterreads.db", {
    verbose: console.log,
  });

  const deleteReview = /* sql */ `DELETE FROM reviews WHERE review_id = ? AND user_id = ?`;
  db.prepare(deleteReview).run(reviewId, userId);
}

function getPostOfReview(reviewId) {
  const db = new Database("database_files/betterreads.db", {
    verbose: console.log,
  });

  //tengo que primero buscar la review, obtener el libro, usuario, y puntaje. A partir de eso puedo buscar el post que tenga esas 3 cosas.
  const fetchReview = /* sql */ `SELECT book_id, user_id, rating FROM reviews WHERE review_id = ?`;
  const review = db.prepare(fetchReview).get(reviewId);

  if (!review) return null;

  const fetchPost = /* sql */ `SELECT id FROM posts WHERE book_id = ? AND author_id = ? AND review_score = ?`;
  const postId = db.prepare(fetchPost).get(review.book_id, review.user_id, review.rating);

  if (!postId) return null;

  return postId["id"];
}


function fetchReviews(bookId, userId = null) {
  //get reviews in format {username, rating, review_text}
  //En el caso de que se provea un userId, se va a retornar todas las reviews, pero con la review de tal user ID al inicio.

  const db = new Database("database_files/betterreads.db", {
    verbose: console.log,
  });

  //it needs to jopin with insecure_users to get the username
  const fetchReviews = /* sql */ `SELECT reviews.review_id, insecure_users.username, reviews.user_id, reviews.rating, reviews.review_text FROM reviews
                                JOIN insecure_users ON reviews.user_id = insecure_users.id
                                WHERE reviews.book_id = ?
                                ORDER BY CASE WHEN reviews.user_id = ? THEN 1 ELSE 0 END DESC;`;

  const rows = db.prepare(fetchReviews).all(bookId, userId);

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
    // verbose: console.log,
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

// Crea un nuevo post en la base de datos, usando el contenido y topic seleccionado,
// y opcionalmente lo registra como una review con cierto rating
function createPost(userId, content, topic, topic_type, rating = null) {
  const db = new Database("database_files/betterreads.db", {
    // verbose: console.log,
  });

  let columnNameTopic;

  if (topic_type == "book") {
    columnNameTopic = "book_id";
  } else if (topic_type == "author") {
    columnNameTopic = "author_topic";
  } else {
    throw new Error("Invalid topic type");
  }

  const operation = /* sql */ `INSERT INTO posts (
        author_id, `+ columnNameTopic + /*sql*/ ` , text_content, date, review_score
     ) VALUES (@postAuthorId,@topic,@text_content,unixepoch('subsec'), @review_score)`
  db.prepare(operation).run(
    {
      postAuthorId: userId,
      topic: topic,
      text_content: content,
      review_score: rating
    }
  );
}

function createRepost(postId, userId) {
  const db = new Database("database_files/betterreads.db", {
    // verbose: console.log,
  });

  //Check that user did not repost already
  const findRepost = db.prepare(`SELECT id FROM reposts WHERE post_id=? AND user_id=?`);
  let id = findRepost.get(postId, userId)

  if (id != undefined) {
    throw new Error("User already reposted this post");
  }

  const operation = /* sql */ `INSERT INTO reposts (
        post_id, user_id, date
     ) VALUES (?,?,unixepoch('subsec'))`
     

  db.prepare(operation).run(postId, userId);

  const incrementReposts = /* sql */ `UPDATE posts SET reposts=((posts.reposts)+1) WHERE id=?`
  db.prepare(incrementReposts).run(postId);
}

function deleteRepost(postId, userId) {
  const db = new Database("database_files/betterreads.db", {
    verbose: console.log,
  });

  const operation = /* sql */ `DELETE FROM reposts WHERE post_id=? AND user_id=?`
  db.prepare(operation).run(postId, userId);

  const decrementReposts = /* sql */ `UPDATE posts SET reposts=((posts.reposts)-1) WHERE id=? AND posts.reposts > 0`
  db.prepare(decrementReposts).run(postId);
}




// TODO: do not return status codes, this should not be handled in the database layer. 
// Return error / info instead
// TODO: run inside transaction to ensure correctness
function incrementLikes(postId, userId) {
  if (!Number.isInteger(Number(postId))) {
    return { 
      code: 500, 
      like_count: 0, 
      msg: `fail to increment ${postId}`
  };
  }
  const db = new Database("database_files/betterreads.db", {
    // verbose: console.log,
  });

  // check post already liked
  const findLikeCount = db.prepare(`SELECT likes FROM posts WHERE id=?`);
  const findLike = db.prepare(`SELECT id FROM likes WHERE post_id=? AND user_id=?`);
  let id = findLike.get(postId, userId)

  if (id == undefined) {
    // add to db
      const addLike = db.prepare(`INSERT INTO likes (
        post_id, user_id, date
    ) VALUES (?,?,unixepoch('subsec'))`);

    let info = addLike.run(postId, userId);
    if(!(info.changes > 0)) {
      return "fail to add like"
    }

    // increment counter
    const operation = /* sql */ `UPDATE posts SET likes=((posts.likes)+1) WHERE rowid=?`
    info = db.prepare(operation).run(postId);
    let like_count = findLikeCount.get(postId).likes;

    if(!(info.changes > 0)) {
        return { 
            code: 500, 
            like_count: like_count, 
            msg: "fail to increment" 
        };
    } else {
        return { 
            code: 200, 
            like_count: like_count, 
            msg: "success to increment" 
        };
    }
  } else {
    let like_count = findLikeCount.get(postId);
    return { 
        code: 200, 
        like_count: like_count, 
        msg: `Like already exists for ${postId}`
    };
  }
}


// TODO: do not return status codes, this should not be handled in the database layer. 
// Return error / info instead
// TODO: run inside transaction to ensure correctness
function decrementLikes(postId, userId) {
  const db = new Database("database_files/betterreads.db", {
    verbose: console.log,
  });

  // check post already liked
  const findLikeCount = db.prepare(`SELECT likes FROM posts WHERE id=?`);
  const findLike = db.prepare(`SELECT id FROM likes WHERE post_id=? AND user_id=?`);
  let id = findLike.get(postId, userId).id;

  if (id != undefined) {
    // remove from db
    const delLike = db.prepare(`DELETE FROM likes WHERE id=?`);
    console.log("ID ", id);
    let info = delLike.run(id);
    if(!(info.changes > 0)) {
      return "fail to remove like"
    }

    // decrement counter
    const operation = /* sql */ `UPDATE posts SET likes=((posts.likes)-1) WHERE rowid=? AND posts.likes > 0`
    info = db.prepare(operation).run(postId);

    let like_count = findLikeCount.get(postId);

    if(!(info.changes > 0)) {
        return { 
            code: 500, 
            like_count: like_count.likes, 
            msg: "fail to decrement" 
        };
    } else {
        return { 
            code: 200, 
            like_count: like_count.likes, 
            msg: "success to decrement" 
        };
    }
  } else {
    let like_count = findLikeCount.get(postId);
    return { 
        code: 200, 
        like_count: like_count.likes, 
        msg: `Like already exists for ${postId}`
    };
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

function hasReposted(postId, userId) {
  const db = new Database("database_files/betterreads.db", {
    verbose: console.log,
  });

  console.log(postId, userId)

  //Si hay un registro con tal postID y UserID quiere decir que ya reposteó.
  const findRepost = db.prepare(`SELECT id FROM reposts WHERE post_id=? AND user_id=?`);

  const id = findRepost.get(postId, userId);
  const yaReposteo = id != undefined;

  return yaReposteo
}

function hasCommented(postId, userId) {
  const db = new Database("database_files/betterreads.db", {
    verbose: console.log,
  });

  //Si hay un registro con tal postID y UserID quiere decir que ya comentó.
  const findComment = db.prepare(`SELECT id FROM comments WHERE parent_post=? AND author_id=?`);

  const id = findComment.get(postId, userId);
  const yaComento = id != undefined;

  return yaComento
}

function getLikesCount(postId) {
  const db = new Database("database_files/betterreads.db", {
    verbose: console.log,
  });
  const findLikeCount = db.prepare(`SELECT likes FROM posts WHERE id=?`);
  return findLikeCount.get(postId).likes;
}

function getRepostsCount(postId) {
  const db = new Database("database_files/betterreads.db", {
    verbose: console.log,
  });
  const findRepostCount = db.prepare(`SELECT reposts FROM posts WHERE id=?`);
  return findRepostCount.get(postId).reposts;
}

function getInfoCount(postId) {
  //Get number of comments, likes, reposts
  const db = new Database("database_files/betterreads.db", {
    verbose: console.log,
  });
  const findInfo = db.prepare(`SELECT comments, likes, reposts FROM posts WHERE id=?`);
  return findInfo.get(postId);
}


function fetchPostAndComments(postId) {
  const post = fetchPost(postId);
  const comments = fetchComments(postId);
  return { post, comments };
}

function fetchPost(postId) {
  const db = new Database("database_files/betterreads.db", {
    verbose: console.log,
  });
  const query_post = /* sql */ `SELECT posts.id, insecure_users.id as user_id, insecure_users.username, books.id as book_id, books.book_name, posts.text_content, posts.date, posts.likes FROM posts
                          JOIN insecure_users ON posts.author_id = insecure_users.id
                          JOIN books ON posts.book_id = books.id
                          WHERE posts.id IN (SELECT value FROM json_each(?))`;

  const rows = db.prepare(query_post).all(JSON.stringify(postId));

  //Quiero devolver un array de posts si pedi muchos posts, pero un unico post, si pedi solo uno.
  if (Array.isArray(postId))
    return rows;
  else
    return rows[0];
}

function fetchComments(postId) {
  const db = new Database("database_files/betterreads.db", {
    verbose: console.log,
  });
  const query_post = /* sql */ `SELECT comments.id, insecure_users.id as user_id, insecure_users.username, comments.text_content, comments.date FROM comments
                          JOIN insecure_users ON comments.author_id = insecure_users.id
                          WHERE comments.parent_post = ?
                          ORDER BY comments.date ASC`;

  return db.prepare(query_post).all(postId);
}

function createComment(postId, userId, content) {
  const db = new Database("database_files/betterreads.db", {
    // verbose: console.log,
  });
  const operation = /* sql */ `INSERT INTO comments (
        parent_post, author_id, text_content, date
     ) VALUES (?,?,?,unixepoch('subsec'))`
  db.prepare(operation).run(postId, userId, content);

  const incrementComments = /* sql */ `UPDATE posts SET comments=((posts.comments)+1) WHERE id=?`
  db.prepare(incrementComments).run(postId);
}

function deleteComment(commentId) {
  const db = new Database("database_files/betterreads.db", {
    verbose: console.log,
  });

  const postId = db.prepare(`SELECT parent_post FROM comments WHERE id=?`).get(commentId).parent_post;

  const operation = /* sql */ `DELETE FROM comments WHERE id=?`
  db.prepare(operation).run(commentId);

  //reducir numero de comentarios en post
  const decrementComments = /* sql */ `UPDATE posts SET comments=((posts.comments)-1) WHERE id=? AND posts.comments > 0`
  db.prepare(decrementComments).run(postId);
}

function getCommentAuthor(commentId) {
  const db = new Database("database_files/betterreads.db", {
    verbose: console.log,
  });
  const query = /* sql */ `SELECT author_id FROM comments WHERE id=?`
  return db.prepare(query).get(commentId).author_id;
}

function searchBooksByTitle(title, limit, offset) {
  return searchBooksGeneric(title, null, limit, offset);
}

function searchBooksByAuthor(author, limit, offset) {
  return searchBooksGeneric(null, author, limit, offset);
}

//Busca la mitad de limite por autor, y la mitad por titulo.
function searchBooksByTitleOrAuthor(titleOrAuthor, limit, offset) {
  return searchBooksGeneric(titleOrAuthor, titleOrAuthor, limit, offset);
}

function searchBooksGeneric(title, author, limit, offset) {
  const db = new Database("database_files/betterreads.db", {
    verbose: console.log,
  });
  
  const avgRatingColumn = /*sql*/`(SELECT AVG(reviews.rating) FROM reviews WHERE reviews.book_id = books.id) AS avg_rating`;

  const bookSearchQuery = /*sql*/`
  SELECT books.*, ${avgRatingColumn}, 'book_name' AS coincidence_type, NULL AS author_coincidence FROM books 
  WHERE book_name LIKE @title`

  const authorSearchQuery = /*sql*/`
  SELECT books.*, ${avgRatingColumn}, 'author_name' AS coincidence_type, books_authors.author_id as author_coincidence FROM books
  JOIN books_authors ON books.id = books_authors.book_id
  WHERE books_authors.author_id LIKE @author`


  const orderAndLimitQuery = /*sql*/`
  ORDER BY avg_rating DESC
  LIMIT @limit OFFSET @offset`;


  const searchTitle = `%${title}%`;
  const searchAuthor = `%${author}%`;

  let finalQuery = "";

  if (title != null) {
    finalQuery += bookSearchQuery;
  }

  if (author != null) {
    if (title != null) {
      finalQuery += " UNION ";
    }
    finalQuery += authorSearchQuery;
  }

  finalQuery += orderAndLimitQuery;

  console.log(finalQuery)

  const rows = db.prepare(finalQuery).all({
    title: searchTitle,
    author: searchAuthor,
    limit: limit,
    offset: offset
  });
  return rows;
}

function searchAuthorByName(authorName, limit, offset) {
  const db = new Database("database_files/betterreads.db", {
    verbose: console.log,
  });

  const searchQuery = /*sql*/ `
    SELECT DISTINCT author_id FROM books_authors
    WHERE author_id LIKE @authorName
    LIMIT @limit OFFSET @offset;`;
  
  const searchTerm = `%${authorName}%`;

  const rows = db.prepare(searchQuery).all(
    {
      authorName: searchTerm,
      limit: limit,
      offset: offset
    }
  );
  console.log("search results:", rows);

  return rows;
}

function getLikedPostsFromUserId(userId){
  const db = new Database("database_files/betterreads.db", {
    verbose: console.log,
  });
  const query = /* sql */ `SELECT * FROM posts WHERE id IN (SELECT post_id FROM likes WHERE user_id = ?)`;
  const rows = db.prepare(query).all(userId);
  return rows;
}

function getUserProfile(userId) {
  const db = new Database("database_files/betterreads.db");
  const stmt = db.prepare("SELECT * FROM user_profiles WHERE user_id = ?");
  return stmt.get(userId);
}

function updateUserProfile(userId, bio, profilePhoto) {
  const db = new Database("database_files/betterreads.db");
  const stmt = db.prepare("INSERT INTO user_profiles (user_id, bio, profile_photo) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET bio = ?, profile_photo = ?");
  stmt.run(userId, bio, profilePhoto, bio, profilePhoto);
}

function followUser(followerId, followingId) {
  const db = new Database("database_files/betterreads.db");
  const exists = db.prepare(`SELECT 1 FROM user_follows WHERE follower_id = ? AND following_id = ?`).get(followerId, followingId);
  
  if (exists) {
    console.log(`User ${followerId} is already following user ${followingId}.`);
    return; 
  }

  const stmt = `INSERT INTO user_follows (follower_id, following_id) VALUES (?, ?)`;
    console.log(`User ${followerId} will follow user ${followingId}.`);
  try {
    db.prepare(stmt).run(followerId, followingId);
    console.log(`User ${followerId} now follows user ${followingId}.`);
  } catch (e) {
    console.log(`Failed to create follow relationship: ${e.message}`);
  }
}

function getFollowers(userId) {
  const db = new Database("database_files/betterreads.db");
  const stmt = `SELECT follower_id FROM user_follows WHERE following_id = ?`;
  return db.prepare(stmt).all(userId);
}

function getFollowing(userId) {
  const db = new Database("database_files/betterreads.db");
  const stmt = `SELECT following_id FROM user_follows WHERE follower_id = ?`;
  return db.prepare(stmt).all(userId);
}

function unfollowUser(followerId, followingId) {
  const db = new Database("database_files/betterreads.db");
  const stmt = `DELETE FROM user_follows WHERE follower_id = ? AND following_id = ?`;

  try {
    const result = db.prepare(stmt).run(followerId, followingId);
    if (result.changes > 0) {
      console.log(`User ${followerId} has unfollowed user ${followingId}`);
    } else {
      console.log(`User ${followerId} was not following user ${followingId}`);
    }
  } catch (error) {
    console.error(`Failed to unfollow user ${followingId}: ${error.message}`);
  }
}

function isUserFollowing(followerId, followingId) {
  const db = new Database("database_files/betterreads.db");
  const stmt = `SELECT 1 FROM user_follows WHERE follower_id = ? AND following_id = ?`;
  
  const exists = db.prepare(stmt).get(followerId, followingId);
  
  return !!exists; 
}

function getUsernameFromId(userId) {
  const db = new Database("database_files/betterreads.db");
  const stmt = `
    SELECT username FROM insecure_users WHERE id=?
  `;
  const name = db.prepare(stmt).get(userId);
  return name['username']
}

function getIdFromUsername(username) {
  const db = new Database("database_files/betterreads.db");
  const stmt = `
    SELECT id FROM insecure_users WHERE username=?
  `;
  const id = db.prepare(stmt).get(username);

  if (typeof id === 'undefined') {
    throw new Error("Username does not exist");
  }
  return id['id']
}


function searchUsers(query, limit, offset) {
  const db = new Database("database_files/betterreads.db", {
    verbose: console.log,
  });
  

  const searchQuery = `
    SELECT * FROM insecure_users 
    WHERE username LIKE ?
    LIMIT ? OFFSET ?`;

  const searchTerm = `%${query}%`;

  const rows = db.prepare(searchQuery).all(searchTerm, limit, offset);

  return rows;
}

function searchGenres(query, limit, offset) {
  const db = new Database("database_files/betterreads.db", {
    verbose: console.log,
  });
  

  const searchQuery = `
    SELECT DISTINCT genre_id FROM books_genres
    WHERE genre_id LIKE ?
    LIMIT ? OFFSET ?`;

  const searchTerm = `%${query}%`;

  const rows = db.prepare(searchQuery).all(searchTerm, limit, offset);

  return rows;
}

// Function to paginate db request in the form of request(queryParameter, limit, offset)
function genericPaginatedSearch(function_request, queryParameter, results_per_page, page, eliminate_repeated = false) {
  const offset = page * results_per_page;
  const limit = results_per_page + 1;
  const rows = function_request(queryParameter, limit, offset);

  const has_more = rows.length > results_per_page;
  if (has_more) {
    rows.pop();
  }

  if (eliminate_repeated) {
    const unique_ids = new Set();
    const unique_rows = [];
    for (const row of rows) {
      if (!unique_ids.has(row.id)) {
        unique_rows.push(row);
        unique_ids.add(row.id);
      }
    } 
    return { rows: unique_rows, has_more };
  }
  
  return { rows, has_more };
}

function getPostAuthor(post_id) {
  const db = new Database("database_files/betterreads.db", {
    verbose: console.log,
  });
  const query = /* sql */ `SELECT author_id FROM posts WHERE id=?`;
  const result = db.prepare(query).get(post_id);
  console.log("RESULT", result)

  return result.author_id;
}


function getStats(userId) {
  const db = new Database("database_files/betterreads.db", {
    verbose: console.log,
  });

  const query = /* sql */ `
    SELECT 
      bs.state, 
      COUNT(bs.book_id) AS count,
      b.id AS book_id,
      b.book_name AS name,
      b.authors,
      b.image AS image,
      b.genre
    FROM book_states bs
    JOIN books b ON bs.book_id = b.id
    WHERE bs.user_id = ? -- Filtra por usuario
    GROUP BY bs.state, b.id
  `;

  const rows = db.prepare(query).all(userId);

  
  const groupedStats = rows.reduce((acc, row) => {
    if (!acc[row.state]) {
      acc[row.state] = { state: row.state, count: 0, books: [] };
    }
    acc[row.state].count += 1; 


    const authors = row.authors.replace(/[\[\]'"]/g, '').trim(); 
    const genre = row.genre.replace(/[\[\]'"]/g, '').trim();

    acc[row.state].books.push({
      id: row.book_id,
      name: row.name,
      authors: authors,
      image: row.image,
      genre: genre
    });
    return acc;
  }, {});

  
  return Object.values(groupedStats);
}

function deleteAllLikes(post_id) {
  const db = new Database("database_files/betterreads.db", {
    verbose: console.log,
  });

  const query = /* sql */ `DELETE FROM likes WHERE post_id=?`;
  db.prepare(query).run(post_id);
}

function deleteAllReposts(post_id) {
  const db = new Database("database_files/betterreads.db", {
    verbose: console.log,
  });

  const query = /* sql */ `DELETE FROM reposts WHERE post_id=?`;
  db.prepare(query).run(post_id);
}

function deleteAllComments(post_id) {
  const db = new Database("database_files/betterreads.db", {
    verbose: console.log,
  });

  const query = /* sql */ `DELETE FROM comments WHERE parent_post=?`;
  db.prepare(query).run(post_id);
}

function deletePost(post_id) {
  const db = new Database("database_files/betterreads.db", {
    verbose: console.log,
  });

  const query = /* sql */ `DELETE FROM posts WHERE id=?`;
  db.prepare(query).run(post_id);
}

function numberOfBooks() {
  const db = new Database("database_files/betterreads.db", {
    verbose: console.log,
  });

  const query = /* sql */ `SELECT COUNT(*) FROM books`;
  const result = db.prepare(query).get();
  return result['COUNT(*)'];
}


export {
  initDb,
  initSessions,
  fetchBooks,
  fetchBook,
  addReview,
  deleteReview,
  fetchReviews,
  userAlreadySubmitedReview,
  addBookState,
  fetchBookState,
  createPost,
  searchBooksByTitle as searchBooks,
  incrementLikes,
  decrementLikes,
  fetchPostAndComments,
  createComment,
  hasLiked,
  hasReposted,
  hasCommented,
  getLikesCount,
  getRepostsCount,
  getInfoCount,
  getLikedPostsFromUserId,
  getUserProfile,
  updateUserProfile,
  createRepost,
  deleteRepost,
  fetchPost,
  followUser,
  getFollowers,
  getFollowing,
  unfollowUser,
  isUserFollowing,
  getUsernameFromId,
  getIdFromUsername,
  searchUsers,
  searchGenres,
  searchBooksByTitleOrAuthor,
  searchBooksByTitle,
  searchBooksByAuthor,
  searchAuthorByName,
  genericPaginatedSearch,
  getPostAuthor,
  getStats,
  deleteComment,
  getCommentAuthor,
  deleteAllLikes,
  deleteAllReposts,
  deleteAllComments,
  deletePost,
  getPostOfReview,
  createUser,
  getRandomAuthorId,
  getRandomBookId,
  numberOfBooks
};

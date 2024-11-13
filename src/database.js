import Database from "better-sqlite3";
import session from "express-session";
import _SqliteStore from "better-sqlite3-session-store";
import csv from "csv-parser";
import fs from "fs";
import axios from "axios";
import { start } from "repl";
var SqliteStore = _SqliteStore(session)
const TEST_USER_ID = 20000000;
const TEST_BOOK_ID = 0;
const TEST_POST_ID = 1;
const CANTIDAD_POSTS_PAGINADO = 7;

const BOOK_DATA_FULL = "./database_files/books_data_full.csv";
const BOOK_DATA_SMALL = "./database_files/books_data.csv";

function initDb() {
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
  createBookDb(db, BOOK_DATA_FULL, BOOK_DATA_SMALL);
  console.log("Created books table.");


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
}

function createUserProfileDb(db) {
  const db_stmt = `CREATE TABLE IF NOT EXISTS user_profiles (
    user_id INTEGER PRIMARY KEY NOT NULL,
    bio TEXT,
    profile_photo TEXT,
    FOREIGN KEY (user_id) REFERENCES insecure_users(id)
  )`;
  db.prepare(db_stmt).run();
  console.log("Created user_profiles table.");
}

function createUserFollowsDb(db) {
  const db_stmt = `CREATE TABLE IF NOT EXISTS user_follows (
    follower_id INTEGER NOT NULL,
    following_id INTEGER NOT NULL,
    PRIMARY KEY (follower_id, following_id),
    FOREIGN KEY (follower_id) REFERENCES insecure_users(id),
    FOREIGN KEY (following_id) REFERENCES insecure_users(id)
  )`;
  db.prepare(db_stmt).run();
  console.log("Created user_follows table.");

  // testing
  const staffId = TEST_USER_ID; 
  const founderId = TEST_USER_ID + 1; 

  followUser(staffId, founderId);
  followUser(founderId, staffId);

  const followers = getFollowers( staffId);
  console.log(`User ${staffId} followers:`, followers);
 
  const following = getFollowing(staffId);
  console.log(`User ${staffId} is following:`, following);
}



function createInsecureUsersDatabase(db) {
  const db_stmt = 'CREATE TABLE IF NOT EXISTS insecure_users (id INTEGER PRIMARY KEY NOT NULL, username varchar(255) UNIQUE NOT NULL, insecure_password varchar(255) NOT NULL)';
  db.prepare(db_stmt).run();
  console.log(db_stmt);

  const users = [
    { id: TEST_USER_ID, username: "staff", password: "password" },
    { id: TEST_USER_ID + 1, username: "founder", password: "founderpassword" } 
  ];

  users.forEach(user => {
    try {
      const run = db.prepare('INSERT INTO insecure_users (id, username, insecure_password) VALUES (?, ?, ?)').run(user.id, user.username, user.password);
      console.log(`Created default test user: ${user.username}`);
    } catch (e) {
      console.log(`Database already contains default test user: ${user.username}`);
    }
  });
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

function createBookDb(db, fullDatasetPath, shortDatasetPath) {
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

  // create table for book-genre and book-author pairs
  const books_genres = db.prepare(`CREATE TABLE IF NOT EXISTS books_genres (
    id INTEGER PRIMARY KEY NOT NULL, 
    genre_id TEXT, 
    book_id INTEGER NOT NULL,
    FOREIGN KEY (book_id) REFERENCES books(id)
  )`).run();
  
  const books_authors = db.prepare(`CREATE TABLE IF NOT EXISTS books_authors(
    id INTEGER PRIMARY KEY NOT NULL, 
    author_id TEXT, 
    book_id INTEGER NOT NULL,
    FOREIGN KEY (book_id) REFERENCES books(id)
  )`).run();

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
    const insert_book_authors = db.prepare(
      `INSERT INTO books_authors (author_id, book_id) VALUES (?, ?)`
    );
    const insert_book_genres = db.prepare(
      `INSERT INTO books_genres (genre_id, book_id) VALUES (?, ?)`
    );

    // create example book
    insert_books.run(0, "TestBook", "test description", "0-8560-9505-2", "Test Author", "Test Genre", "https://thumbs.dreamstime.com/z/modern-vector-abstract-book-cover-template-teared-paper-47197768.jpg");
    
    // read and store each book from csv
    // asynchronous: calls a callback every time CSV is loaded, does not stop execution of the app
    let datasetPath = "";

    if (fs.existsSync(fullDatasetPath)) {
      console.log("Found books_data_full.csv for full dataset.");
      datasetPath = fullDatasetPath;
    } else if (fs.existsSync(shortDatasetPath)) {
      console.log("Not found books_data_full.csv for full dataset, using books_data.csv instead for shorten dataset instead.");
      datasetPath = shortDatasetPath;
    } else {
      throw new Error("No dataset found.");
    }
    
    
    loadFromCSV(datasetPath, (books) => {
      let id = 0

      const cantidadLibros = books.length;

      const insert_many_books = db.transaction((books) => {
        for (const book of books) {
          let empty_fields = 0;

          const important_fields = ["Title", "description", "authors", "image", "categories"];
          for (const key of important_fields) {
            if (book[key] === undefined || book[key] === "") {
              empty_fields += 1;
            }
          }

          if (empty_fields >= 2) {
            //Descarto libro con muchos faltantes
            continue;
          }

          id += 1;
          insert_books.run(
            id,
            book["Title"], 
            book["description"], 
            book["isbn"],
            JSON.stringify(book["authors"]), // TODO remove and replace
            JSON.stringify(book["categories"]), // TODO remove and replace
            book["image"] // Direct image link
          );
          let re = /\[(?:'([^']*)'(?:, *(?:'([^']*)'))*)?\]/
          let authors = book["authors"].match(re)
          let genres = book["categories"].match(re)
          // console.log(authors)
          // console.log(genres)
          authors = authors ? authors.slice(1, authors.length) : [] ;
          genres = genres ? genres.slice(1, genres.length) : [] ;
          // console.log(authors)
          // console.log(genres)
          for (const author of authors) {
            if (author && author != "") {
              insert_book_authors.run(author, id)
            }
          }
          for (const genre of genres) {
            if (genre && genre != "") {
              insert_book_genres.run(genre, id)
            }
          }
          if (id%Math.round(cantidadLibros/100)==0) {
            console.log(`Cargando libros ${Math.floor(id/cantidadLibros*100)}%`);
          }
        }     
      })

      // Populate the database with data from the CSV file
      insert_many_books(books);

      console.log("Cargando libros 100%")
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
      author_id int,
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

  if (count['COUNT(*)'] <= 0) {
    const insert_posts = db.prepare(
      `INSERT INTO posts (
          author_id, book_id, text_content, date, likes
       ) VALUES (?,?,?,unixepoch('subsec'), 0)`
    );

    const insert_many_posts = db.transaction((n) => {
      for (let i = 0; i < n; i++) {insert_posts.run(TEST_USER_ID, 
        TEST_BOOK_ID, 
        `This is my ${i}° post!!!!!!!!!!!!!!`);

        console.log(`Inserted post ${i} of ${n}`);

        sleepFor(10)
      }
      })
  
    insert_many_posts(20)
  }
}

function createRepostsDb(db) {
  db.prepare(
    /*sql*/`CREATE TABLE IF NOT EXISTS reposts (
      id INTEGER PRIMARY KEY NOT NULL,
      post_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      date INTEGER NOT NULL,
      FOREIGN KEY(post_id) REFERENCES posts(id),
      FOREIGN KEY(user_id) REFERENCES insecure_users(id));`
    ).run();

  let count = 'SELECT COUNT(*) FROM reposts'
  count = db.prepare(count).get(); // { 'COUNT(*)': 0 }

  if (count['COUNT(*)'] <= 0) {
    const insert_reposts = db.prepare(
      `INSERT INTO reposts (
          post_id, user_id, date
       ) VALUES (?,?,unixepoch('subsec'))`
    );

    insert_reposts.run(
      1,
      20000000
    );
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
      author_id INTEGER NOT NULL,
      text_content TEXT NOT NULL,
      date INTEGER NOT NULL,
      FOREIGN KEY(parent_post) REFERENCES posts(id),
      FOREIGN KEY(author_id) REFERENCES insecure_users(id));`
  ).run();
  
  // create comment
  
  let count = 'SELECT COUNT(1) FROM comments'
  count = db.prepare(count).get(); // { 'COUNT(*)': 0 }

  if (count['COUNT(*)'] <= 0) {
    const insert_comments = db.prepare(
      `INSERT INTO comments (
          parent_post, author_id, text_content, date
       ) VALUES (?,?,?,unixepoch('subsec'))`
    );

    insert_comments.run(
      1,
      20000000, 
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
      date INTEGER NOT NULL,
      FOREIGN KEY(post_id) REFERENCES posts(id),
      FOREIGN KEY(user_id) REFERENCES insecure_users(id))`
  ).run();
  
  let count = 'SELECT COUNT(*) FROM likes'
  count = db.prepare(count).get(); // { 'COUNT(*)': 0 }

  if (count['COUNT(*)'] <= 0) {
    const insert_likes = db.prepare(
      `INSERT INTO likes (
          post_id, user_id, date
       ) VALUES (?,?,unixepoch('subsec'))`
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

// Crea un nuevo post en la base de datos, usando el contenido y topic seleccionado,
// y opcionalmente lo registra como una review con cierto rating
function createPost(userId, content, topic, topic_type, rating = null) {
  const db = new Database("database_files/betterreads.db", {
    verbose: console.log,
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
    verbose: console.log,
  });

  const operation = /* sql */ `INSERT INTO reposts (
        post_id, user_id, date
     ) VALUES (?,?,unixepoch('subsec'))`

  db.prepare(operation).run(postId, userId);

  const incrementReposts = /* sql */ `UPDATE posts SET reposts=((posts.reposts)+1) WHERE id=?`
  db.prepare(incrementReposts).run(postId);
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
    verbose: console.log,
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

    let info = addLike.run(Number(postId), userId);
    console.log(info.changes)
    if(!(info.changes > 0)) {
      return "fail to add like"
    }

    // increment counter
    const operation = /* sql */ `UPDATE posts SET likes=((posts.likes)+1) WHERE rowid=?`
    info = db.prepare(operation).run(postId);
    console.log("LIKE INCREMENT WAS ATTEMPTED:")
    console.log(info.changes)
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
    console.log(info.changes)
    if(!(info.changes > 0)) {
      return "fail to remove like"
    }

    // decrement counter
    const operation = /* sql */ `UPDATE posts SET likes=((posts.likes)-1) WHERE rowid=? AND posts.likes > 0`
    info = db.prepare(operation).run(postId);
    console.log("LIKE INCREMENT WAS ATTEMPTED:")
    console.log(info.changes)
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

function canRepost(postId, userId) {
  const db = new Database("database_files/betterreads.db", {
    verbose: console.log,
  });

  console.log(postId, userId)

  //Si hay un registro con tal postID y UserID quiere decir que ya reposteó.
  // Tambien quiero ver que el usuario no sea dueño del post, para no poder repostearse a si mismo
  const findRepost = db.prepare(`SELECT id FROM reposts WHERE post_id=? AND user_id=?`);
  const findPost = db.prepare(`SELECT author_id FROM posts WHERE id=?`);

  const id = findRepost.get(postId, userId);
  const post = findPost.get(postId);

  const yaReposteo = id != undefined;
  const esDuenio = post.author_id == userId;

  console.log(yaReposteo)
  console.log(esDuenio)

  return (!yaReposteo && !esDuenio)

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
    verbose: console.log,
  });
  const operation = /* sql */ `INSERT INTO comments (
        parent_post, author_id, text_content, date
     ) VALUES (?,?,?,unixepoch('subsec'))`
  db.prepare(operation).run(postId, userId, content);

  const incrementComments = /* sql */ `UPDATE posts SET comments=((posts.comments)+1) WHERE id=?`
  db.prepare(incrementComments).run(postId);
}


function searchBooksByTitle(title, limit, offset) {
  const db = new Database("database_files/betterreads.db", {
    verbose: console.log,
  });
  

  const searchQuery = `
    SELECT *, 'book_name' AS coincidence_type FROM books 
    WHERE book_name LIKE @title
    LIMIT @limit OFFSET @offset`;

  const searchTerm = `%${title}%`;

  const rows = db.prepare(searchQuery).all(
    {
      title: searchTerm,
      limit: limit,
      offset: offset
    }
  );
  console.log("search results:", rows);

  return rows;
}

function searchBooksByAuthor(author, limit, offset) {
  const db = new Database("database_files/betterreads.db", {
    verbose: console.log,
  });
  

  const searchQuery = `
  SELECT books.*, 'author_name' AS coincidence_type FROM books 
  JOIN books_authors ON books.id = books_authors.book_id
  WHERE books_authors.author_id LIKE @author
    LIMIT @limit OFFSET @offset`;

  const searchTerm = `%${author}%`;

  const rows = db.prepare(searchQuery).all(
    {
      author: searchTerm,
      limit: limit,
      offset: offset
    }
  );
  console.log("search results:", rows);

  return rows;
}

//Busca la mitad de limite por autor, y la mitad por titulo.
function searchBooksByTitleOrAuthor(titleOrAuthor, limit, offset) {
  // const db = new Database("database_files/betterreads.db", {
  //   verbose: console.log,
  // });
  // const searchQuery = /*sql*/`
  // SELECT *, 'book_name' AS coincidence_type FROM books 
  // WHERE book_name LIKE @query
  // UNION
  // SELECT books.*, 'author_name' AS coincidence_type FROM books 
  // JOIN books_authors ON books.id = books_authors.book_id
  // WHERE books_authors.author_id LIKE @query
  // ORDER BY coincidence_type DESC
  // LIMIT @limit OFFSET @offset`;
  // const searchTerm = `%${titleOrAuthor}%`;
  // const rows = db.prepare(searchQuery).all({
  //   query: searchTerm,
  //   limit: limit,
  //   offset: offset
  // });
  // console.log("search results:", rows);

  const authors = searchBooksByAuthor(titleOrAuthor, Math.ceil(limit/2), offset);
  const books = searchBooksByTitle(titleOrAuthor, (limit - authors.length), offset);

  return authors.concat(books);
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
  searchBooksByTitle as searchBooks,
  incrementLikes,
  decrementLikes,
  fetchPostAndComments,
  createComment,
  hasLiked,
  canRepost,
  getLikesCount,
  getRepostsCount,
  getInfoCount,
  getLikedPostsFromUserId,
  getUserProfile,
  updateUserProfile,
  createRepost,
  fetchPost,
  followUser,
  getFollowers,
  getFollowing,
  unfollowUser,
  isUserFollowing,
  getUsernameFromId,
  getIdFromUsername,
  searchUsers,
  searchBooksByTitleOrAuthor,
  searchBooksByTitle,
  searchBooksByAuthor,
  searchAuthorByName
};

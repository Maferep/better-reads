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

function initDb() {
  // Create username/password database
  const db = new Database("database_files/betterreads.db", {
    verbose: console.log,
  }); // create if no connection found
  createInsecureUsersDatabase(db);
  createUserProfileDb(db);
  createUserFollowsDb(db);
  createBookDb(db, "./database_files/books_data.csv");

  createReviewDb(db);
  createBookStatesDb(db);
  createPostDatabase(db);
  createRepostsDb(db);
  createCommentDb(db);
  createLikeDb(db);

  // create posts database
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
  
  // create genres index
  db.prepare("CREATE INDEX idx_genre ON books(genre);").run();

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
      id INTEGER PRIMARY KEY NOT NULL,
      author_id int NOT NULL,
      book_id int NOT NULL,
      text_content TEXT NOT NULL DEFAULT '',
      date INTEGER NOT NULL,
      likes int NOT NULL DEFAULT 0,
      comments int NOT NULL DEFAULT 0,
      reposts int NOT NULL DEFAULT 0,
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
       ) VALUES (?,?,?,unixepoch('now'), 0)`
    );

    const insert_many_posts = db.transaction((n) => {
      for (let i = 0; i < n; i++) {insert_posts.run(TEST_USER_ID, 
        TEST_BOOK_ID, 
        `This is my ${i}° post!!!!!!!!!!!!!!`);

        sleepFor(1000)
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
       ) VALUES (?,?,unixepoch('now'))`
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
       ) VALUES (?,?,?,unixepoch('now'))`
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
       ) VALUES (?,?,unixepoch('now'))`
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

// TODO: ui needs to only let you talk about specific books so we can use a valid book id
function createPost(userId, content, topic) {
  const bookId = topic // in the future, a topic can be an author or book chapter
  const db = new Database("database_files/betterreads.db", {
    verbose: console.log,
  });
  const operation = /* sql */ `INSERT INTO posts (
        author_id, book_id, text_content, date, likes
     ) VALUES (?,?,?,unixepoch('now'), 0)`
  db.prepare(operation).run(
    userId, 
    bookId,
    content
  );
}

function createRepost(postId, userId) {
  const db = new Database("database_files/betterreads.db", {
    verbose: console.log,
  });

  const operation = /* sql */ `INSERT INTO reposts (
        post_id, user_id, date
     ) VALUES (?,?,unixepoch('now'))`

  db.prepare(operation).run(postId, userId);

  const incrementReposts = /* sql */ `UPDATE posts SET reposts=((posts.reposts)+1) WHERE id=?`
  db.prepare(incrementReposts).run(postId);
}


function fetchPostsAndLastDate(number_of_posts = -1,startDate = new Date(0), bookFilter = null) {
  //Quiero obtener de la base de datos, el id del post, id del usuario, nombre de usuario, el id y nombre del libro sobre el que habla, el contenido del post, y quiero que este ordenado por fecha
  const db = new Database("database_files/betterreads.db", {
    verbose: console.log,
  });

  //Fecha del post más reciente que quiero obtener. Como SQLite funcina con segundos, divido por 1000 para obtener segundos desde epoch.
  const fecha_inicio_query = startDate.valueOf()/1000;

  console.log(fecha_inicio_query)

  //Fecha del post más antiguo que quiero obtener.
  let fecha_final_query;
  try {
    const fecha_final_query_prepare = db.prepare(
/*sql*/ `SELECT date FROM posts
        UNION
        SELECT date FROM reposts rp
        WHERE` + (bookFilter == null)?"":/*sql*/` books.id = ? AND ` + /*sql*/` date <= ?
        ORDER BY date DESC
        LIMIT 1 OFFSET ?;`);

    if (bookFilter == null) {
      fecha_final_query = fecha_final_query_prepare.get(fecha_inicio_query, number_of_posts);
    } else {
      fecha_final_query = fecha_final_query_prepare.get(bookFilter, fecha_inicio_query, number_of_posts);
    }
  } catch (e) {
    // Pongo la fecha más temprana posible. Uso epoch, porque no creo que haya ningun post publicado antes de 1970
    fecha_final_query = 0;
  }

  const rows = getPostsWithFilters(fecha_inicio_query, fecha_final_query, bookFilter);
  return {"rows": rows, "last_date": new Date(fecha_final_query*1000)};
}


function getPostsWithFilters(since, until, bookId = null) {
  const db = new Database("database_files/betterreads.db", {
    verbose: console.log,
  });

  const book_filter = (bookId == null)?``:`AND b.id = ? `;

  const query = 
  /*sql*/  `SELECT p.id AS post_id,
                    original_user.id AS user_id,
                    original_user.username AS username,
                    b.id AS book_id,
                    b.book_name,
                    p.text_content,
                    p.date AS date,
                    NULL AS repost_user_id,        -- NULL for original posts
                    NULL AS repost_username         -- NULL for original posts
            FROM posts p
            JOIN insecure_users original_user ON p.author_id = original_user.id
            JOIN books b ON p.book_id = b.id
            WHERE ? >= date AND date > ? ` + book_filter + 
  /*sql*/  `UNION
            SELECT rp.post_id AS post_id,
                    original_user.id AS user_id,
                    original_user.username AS username,
                    b.id AS book_id,
                    b.book_name,
                    p.text_content,
                    rp.date AS date,
                    rp.user_id AS repost_user_id,  -- ID of the user who reposted
                    repost_user.username AS repost_username  -- Username of the user who reposted
            FROM reposts rp
            JOIN posts p ON rp.post_id = p.id
            JOIN insecure_users original_user ON p.author_id = original_user.id
            LEFT JOIN insecure_users repost_user ON rp.user_id = repost_user.id
            JOIN books b ON p.book_id = b.id
            WHERE ? >= rp.date AND rp.date > ?` + book_filter +
  /*sql*/  `ORDER BY date DESC;`;

  console.log(query)

  if (bookId == null) {
    return db.prepare(query).all(since, until, since, until);
  } else {
    return db.prepare(query).all(since, until,bookId, since, until, bookId);
  }
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
    ) VALUES (?,?,unixepoch('now'))`);

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
     ) VALUES (?,?,?,unixepoch('now'))`
  db.prepare(operation).run(postId, userId, content);

  const incrementComments = /* sql */ `UPDATE posts SET comments=((posts.comments)+1) WHERE id=?`
  db.prepare(incrementComments).run(postId);
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

function getPostsFromUserId(userId){
  const db = new Database("database_files/betterreads.db", {
    verbose: console.log,
  });
    const query = 
  /*sql*/  `SELECT 
                    p.id AS post_id,
                    u.id AS user_id,
                    u.username,
                    b.id AS book_id,
                    b.book_name,
                    p.text_content,
                    p.date AS date,
                    p.likes,
                    NULL AS repost_user_id,
                    NULL AS repost_username
            FROM posts p
            JOIN insecure_users u ON p.author_id = u.id
            JOIN books b ON p.book_id = b.id
            WHERE p.author_id = ?

            UNION

            SELECT 
                    rp.post_id AS post_id,
                    u.id AS user_id,
                    u.username,
                    b.id AS book_id,
                    b.book_name,
                    p.text_content,
                    rp.date AS date,
                    p.likes,
                    rp.user_id AS repost_user_id,
                    repost_user.username AS repost_username
            FROM reposts rp
            JOIN posts p ON rp.post_id = p.id
            JOIN insecure_users u ON p.author_id = u.id
            LEFT JOIN insecure_users repost_user ON rp.user_id = repost_user.id
            JOIN books b ON p.book_id = b.id
            WHERE rp.user_id = ?

            ORDER BY p.date DESC`;
  const rows = db.prepare(query).all(userId, userId);
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

function getFollowingFeed(userId, limit = 10, offset = 0) {
  const db = new Database("database_files/betterreads.db");
  const stmt = /*sql*/`
    SELECT 
      posts.id AS post_id, 
      insecure_users.id AS user_id, 
      insecure_users.username, 
      books.id AS book_id, 
      books.book_name, 
      posts.text_content, 
      posts.date, 
      posts.likes,
      NULL AS repost_user_id,
      NULL AS repost_username
    FROM posts
    JOIN insecure_users ON posts.author_id = insecure_users.id
    JOIN books ON posts.book_id = books.id
    JOIN user_follows uf ON posts.author_id = uf.following_id 
    WHERE uf.follower_id = ?
    UNION
    SELECT
      rp.post_id AS post_id,
      insecure_users.id AS user_id,
      insecure_users.username,
      books.id AS book_id,
      books.book_name,
      posts.text_content,
      rp.date AS date,
      posts.likes,
      rp.user_id AS repost_user_id,
      repost_user.username AS repost_username
    FROM reposts rp
    JOIN posts ON rp.post_id = posts.id
    JOIN insecure_users ON posts.author_id = insecure_users.id
    LEFT JOIN insecure_users repost_user ON rp.user_id = repost_user.id
    JOIN books ON posts.book_id = books.id
    JOIN user_follows uf ON rp.user_id = uf.following_id 
    WHERE uf.follower_id = ?
    ORDER BY posts.date DESC
    LIMIT ? OFFSET ?;
  `;

  const posts_raw = db.prepare(stmt).all(userId, userId, limit, offset);
  console.log(`Fetched ${posts_raw.length} posts for user ${userId} feed with offset ${offset}.`);

   const stmtCount = `
    SELECT COUNT(*) AS total 
    FROM posts
    JOIN user_follows uf ON posts.author_id = uf.following_id 
    WHERE uf.follower_id = ?
  `;

  const countResult = db.prepare(stmtCount).get(userId);
  const totalPosts = countResult.total;

  const has_more = totalPosts > (offset + limit);

  return { posts_raw, has_more };
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
  incrementLikes,
  decrementLikes,
  fetchPostsAndLastDate,
  fetchPostAndComments,
  createComment,
  hasLiked,
  canRepost,
  getLikesCount,
  getRepostsCount,
  getInfoCount,
  getPostsFromUserId,
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
  getFollowingFeed,
  getUsernameFromId,
  getIdFromUsername
};

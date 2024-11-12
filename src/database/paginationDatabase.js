import Database from "better-sqlite3";
import _SqliteStore from "better-sqlite3-session-store";
const TEST_USER_ID = 20000000;
const TEST_BOOK_ID = 0;
const TEST_POST_ID = 1;
const CANTIDAD_POSTS_PAGINADO = 7;
// Entrega una lista de posts, devolviedo un array de posts (paginados),
// y un booleano que indica si existen más posts luego del ultimo devuelto
// Filter es un diccionario, con los distintos filtros posibles.
export function fetchPaginatedPosts(paginateFromDate, page, filter = {}) {
  const db = new Database("database_files/betterreads.db", {
    verbose: console.log,
  });


  filter.bookId = filter.bookId || null;
  filter.followedBy = filter.followedBy || null;

  const paginateFromDateEpoch = paginateFromDate.valueOf();

  const rows_and_more_posts = getPostsWithFilters(paginateFromDateEpoch, page, filter.followedBy ,filter.bookId, filter.authorTopic, filter.genre);

  return rows_and_more_posts
}

//Unica funcion que realiza la query real para obtener los posts. No debería usarse fuera de este modulo.
// Recibe el tiempo de referencia para el primer post, el numero de pagina, y filtros varios.
// Devuelve la lista de posts, junto a un booleano que indica que existen más posts.
export function getPostsWithFilters(paginateFromDate, page, followedBy = null, bookId = null, authorTopic = null, genre = null, authorId = null, number_of_posts = CANTIDAD_POSTS_PAGINADO) {
  const postsInPage = number_of_posts;

  const offset = page * postsInPage;

  const db = new Database("database_files/betterreads.db", {
    verbose: console.log,
  });

  //Segun si se envia alguna de estas caracteristicas, se agrega o no el filtro al query.
  const book_filter = (bookId == null)?` `:` AND b.id = @book_id `;
  const follow_filter = (followedBy == null)?` `:` AND uf.follower_id = @followedBy `;

  const author_filter_post = (authorId == null)?` `:` AND user_id = @authorId `;
  const author_filter_repost = (authorId == null)?` `:` AND repost_user_id = @authorId `;

  const author_topic_filter = (authorTopic == null) 
  ? '' 
  : ` AND (books_authors.author_id LIKE @authorTopic OR p.author_topic LIKE @authorTopic)`;

  const genre_filter = (genre == null) 
  ? '' 
  : ` AND (books_genres.genre_id LIKE @genre)`;

  const query = 
  /*sql*/  `SELECT p.id AS post_id,
                    original_user.id AS user_id,
                    original_user.username AS username,
                    b.id AS book_id,
                    p.author_topic,
                    b.book_name,
                    p.text_content,
                    p.date AS date,
                    p.review_score,
                    NULL AS repost_user_id,        -- NULL for original posts
                    NULL AS repost_username         -- NULL for original posts
            FROM posts p
            JOIN insecure_users original_user ON p.author_id = original_user.id
            LEFT JOIN books b ON p.book_id = b.id
            LEFT JOIN books_authors ON b.id = books_authors.book_id
            LEFT JOIN books_genres ON b.id = books_genres.book_id
            LEFT JOIN user_follows uf ON user_id = uf.following_id -- JOIN to get posts from followed users, not always used
            WHERE @startDate >= date ` + book_filter + follow_filter + author_filter_post + author_topic_filter + genre_filter +
  /*sql*/  `UNION
            SELECT rp.post_id AS post_id,
                    original_user.id AS user_id,
                    original_user.username AS username,
                    b.id AS book_id,
                    p.author_topic,
                    b.book_name,
                    p.text_content,
                    rp.date AS date,
                    p.review_score,
                    rp.user_id AS repost_user_id,  -- ID of the user who reposted
                    repost_user.username AS repost_username  -- Username of the user who reposted
            FROM reposts rp
            JOIN posts p ON rp.post_id = p.id
            JOIN insecure_users original_user ON p.author_id = original_user.id
            LEFT JOIN insecure_users repost_user ON rp.user_id = repost_user.id
            LEFT JOIN books b ON p.book_id = b.id
            LEFT JOIN books_authors ON b.id = books_authors.book_id
            LEFT JOIN books_genres ON b.id = books_genres.book_id
            LEFT JOIN user_follows uf ON user_id = uf.following_id -- JOIN to get posts from followed users, not always used
            WHERE @startDate >= rp.date ` + book_filter + follow_filter + author_filter_repost + author_topic_filter + genre_filter +
  /*sql*/  `ORDER BY date DESC
            LIMIT @postsInPage OFFSET @startFromPost;`;

  console.log(query)

  let rows;

  //Se pueden enviar los parametros como un diccionario. Aquel parametro que no se use
  // no afecta al query.
  let parametersQuery = {
    startDate: paginateFromDate,
    book_id: bookId,
    followedBy: followedBy,
    authorTopic: authorTopic,
    genre: genre,
    postsInPage: postsInPage + 1,
    startFromPost: offset,
    authorId: authorId
  }

  console.log(parametersQuery)

  rows = db.prepare(query).all(parametersQuery);

  // Se busca si se pudo obtener un post extra, si esto es así, se elimina este post extra de la lista
  // y se setea el booleano has_more a true, para indicar que hay por lo menos un post extra.
  let has_more = false
  if (rows.length > postsInPage) {
    rows.pop();
    has_more = true;
  }

  return {rows, has_more};
}

export function getPostsFromUserId(userId, paginateFromDate, page){
  const paginateFromDateEpoch = paginateFromDate.valueOf();

  const rows_and_more_posts = getPostsWithFilters(paginateFromDateEpoch, page, null, null, null, null, userId);

  return rows_and_more_posts;
}

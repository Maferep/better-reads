import { Router } from 'express';
import { estaAutenticado, isAuthenticated } from '../authenticate.js';
import {createPost,
  incrementLikes, decrementLikes, 
  fetchPostAndComments, createComment, hasLiked, getLikes} from '../database.js';

const router = Router();

router.get('/:id', (req, res) => {
    const postId = req.params.id;
    const postAndCommentsRaw = fetchPostAndComments(postId);
    const postRaw = postAndCommentsRaw.post;
    const commentsRaw = postAndCommentsRaw.comments;
  
    console.log(postAndCommentsRaw)
  
    //Map commentsRaw to cooments, where each ends up as {username, content}
    const comments = commentsRaw.map(comment => {
      return {
        username_comment: comment.username,
        content: comment.text_content
      }})
  
    // console.log(postAndCommentsRaw)
  
    const estaAutenticadoBool = estaAutenticado(req);
  
    let liked_by_user = estaAutenticadoBool ? hasLiked(postRaw.id, req.session.userId) : false;
    res.render('post', {
      style: "post.css",
      username: req.session.user,
      loggedIn: estaAutenticadoBool,
      username_post: postRaw.username,
      book_id: postRaw.book_id,
      topic: postRaw.book_name,
      content: postRaw.text_content,
      number_likes: postRaw.likes,
      number_reposts: 0,
      number_comments: commentsRaw.length,
      comments: comments,
      post_id: postId,
      liked_by_user
    });
  });
  
// post a post (not a review) to be shown on the feed
router.post('/', (req, res) => {
    const userId = req.session.userId;
    const postContent = req.body["post-content"];
    const topic = req.body.book; // this will now be a user id
    createPost(userId, postContent, topic);
    
    //Quiero saber si tengo que volver al feed de libro, o al feed general.
    const goBackToBookFeed = req.body.goBackToBookFeed;
    if (goBackToBookFeed == "true") {
        res.redirect(`/?book_id=${topic}`);
    } else {
        res.redirect('/')
    }
});

router.post('/:id/comment', (req, res) => {
    const postId = req.params.id;
    const userId = req.session.userId;
    const commentContent = req.body["comment-content"];
    createComment(postId, userId, commentContent);
    res.redirect(`/post/${postId}`);
});

// Endpoint for liking a post
// test: curl -X POST http://localhost/post/1/like
router.post('/:id/like', isAuthenticated, (req, res) => {
    const postId = req.params.id;
    const userId = req.session.userId;

    if (postId != "null") {
        // TODO: fetch like count should be a separate method
        const {code, like_count, msg } = incrementLikes(postId, userId)
        const data = {
        message: msg,
        like_count: like_count,
        result: code,
        };
        res.json(data);
    } else {
        const code = 500;
        const like_count = 0;
        const msg = "bad post id";
        const data = {
        message: msg,
        like_count: like_count,
        result: code,
        };
        res.json(data);
    }
});

// Endpoint for liking a post
// test: curl -X POST http://localhost/post/1/like
router.post('/:id/unlike', isAuthenticated, (req, res) => {
    const postId = req.params.id;
    const userId = req.session.userId;
    const {code, like_count, msg } = decrementLikes(postId, userId)

    const data = {
    message: msg,
    like_count: like_count,
    result: code,
    };
    res.json(data);
});

// Endpoint for checking if user likes a post
router.get('/:id/like', isAuthenticated, (req, res) => {
    const postId = req.params.id;
    const userId = req.session.userId;
    const result = hasLiked(postId, userId)
    const number_of_likes = getLikes(postId)
    //res.redirect(`/?result=${result}`); // TODO: avoid reload
    res.json({
    liked: result,
    like_count: number_of_likes,
    });
});
  

export default router;

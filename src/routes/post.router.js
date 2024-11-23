import { Router } from 'express';
import { estaAutenticado, isAuthenticated } from '../authenticate.js';
import {createPost,
  incrementLikes, decrementLikes, 
  fetchPostAndComments, createComment, hasLiked, canRepost, getLikesCount, getInfoCount, createRepost,
  getRepostsCount, getCommentAuthor, deleteComment, getPostAuthor,
  deleteAllLikes,
  deleteAllReposts,
  deleteAllComments,
  deletePost} from '../database.js';

import { createCommentNotification,
    deleteCommentNotification,
    createLikeMilestoneNotification,
    createRepostNotification,
    removeLikeMilestoneNotificacion,
    deleteAllNotificationsReferringToPost } from '../database/notificationDatabase.js';

const router = Router();

router.get('/:id', (req, res) => {
    const postId = req.params.id;
    const postAndCommentsRaw = fetchPostAndComments(postId);
    const postRaw = postAndCommentsRaw.post;
    const commentsRaw = postAndCommentsRaw.comments;

    if (postRaw == null) {
        res.status(404).send("Post not found");
        return;
    }
  
    console.log(postAndCommentsRaw)
  
    //Map commentsRaw to cooments, where each ends up as {username, content}
    const comments = commentsRaw.map(comment => {
      return {
        username_comment: comment.username,
        content: comment.text_content,
        comment_id: comment.id,
        is_own: comment.user_id == req.session.userId
      }})
  
    // console.log(postAndCommentsRaw)
  
    const estaAutenticadoBool = estaAutenticado(req);
  
    let liked_by_user = estaAutenticadoBool ? hasLiked(postRaw.id, req.session.userId) : false;
    res.render('post', {
      do_sidebar: estaAutenticadoBool,
      username: req.session.user,
      loggedIn: estaAutenticadoBool,
      is_own: req.session.userId == postRaw.user_id,
      username_post: postRaw.username,
      book_id: postRaw.book_id,
      book_name: postRaw.book_name,
      author_topic: postRaw.author_topic,
      content: postRaw.text_content,
      number_likes: postRaw.likes,
      review_score: postRaw.review_score,
      number_reposts: 0,
      number_comments: commentsRaw.length,
      comments: comments,
      post_id: postId,
      liked_by_user
    });
  });
  
// post a post (not a review) to be shown on the feed
router.post('/',isAuthenticated, (req, res) => {
    const userId = req.session.userId;
    const postContent = req.body["post-content"];

    const book_topic = req.body.book;
    const author_topic = req.body.author;

    const topic_type = req.body.type;
    let final_topic;

    if (topic_type == "book") {
        final_topic = book_topic;
    } else if (topic_type == "author") {
        final_topic = author_topic;
    } else {
        res.status(400).send("Invalid topic type");
        return;
    }

    createPost(userId, postContent, final_topic, topic_type);
    
    //Quiero saber si tengo que volver al feed de libro, o al feed general.
    const goBackToFeed = req.body.goBackToFeed;

    if (goBackToFeed == "book") {
        res.redirect(`/?book_id=${final_topic}`);
    } else if (goBackToFeed == "author") {
        res.redirect(`/?author=${final_topic}`);
    } else {
        res.redirect('/')
    }
});

router.post('/:id/comment',isAuthenticated, (req, res) => {
    const postId = req.params.id;
    const userId = req.session.userId;
    const commentContent = req.body["comment-content"];
    createComment(postId, userId, commentContent);
    res.redirect(`/post/${postId}`);

    createCommentNotification(postId, userId);
});

// Endpoint for liking a post
// test: curl -X POST /post/1/like
router.post('/:id/like', isAuthenticated, (req, res) => {
    const postId = req.params.id;
    const userId = req.session.userId;

    if (postId == "null" || postId == "undefined") {
        const code = 500;
        const like_count = 0;
        const msg = "bad post id";
        const data = {
        message: msg,
        like_count: like_count,
        result: code,
        };
        res.json(data);

        return; 
    }

    // TODO: fetch like count should be a separate method
    const {code, like_count, msg } = incrementLikes(postId, userId)
    const data = {
    message: msg,
    like_count: like_count,
    result: code,
    };
    res.json(data);

    if (isLikeMilestone(like_count)) {
        createLikeMilestoneNotification(postId, like_count);
    }
});


function isLikeMilestone(like_count) {
    const esPotenciaDe10 = Math.log10(like_count) % 1 === 0 ; //1,10,100,1000,10000
    const esPotenciaDe10Por5 = Math.log10(like_count/5) % 1 === 0; //5,50,500,5000,50000

    return esPotenciaDe10 || esPotenciaDe10Por5;
}

// Endpoint for liking a post
// test: curl -X POST /post/1/like
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

    if (isLikeMilestone(like_count+1)) {
        //Si la cantidad de likes actual +1 es un milestone, quiere decir
        //que se esta bajando de un milestone, por lo que se debe borrar la notificacion
        removeLikeMilestoneNotificacion(postId);
    }
});

// Endpoint for checking if user likes a post
router.get('/:id/like', (req, res) => {
    const postId = req.params.id;
    const userId = req.session.userId;
    const result = hasLiked(postId, userId)
    const number_of_likes = getLikesCount(postId)
    //res.redirect(`/?result=${result}`); // TODO: avoid reload
    res.json({
    liked: result,
    like_count: number_of_likes,
    });
});

router.get('/:id/info', (req, res) => {
    //obtains number of likes, if the user liked it, number of reposts, if the user reposted it, number of comments
    const postId = req.params.id;
    const userId = req.session.userId;
    
    const liked = hasLiked(postId, userId);
    const can_repost = canRepost(postId, userId);
    const info = getInfoCount(postId);
    res.json({
        liked: liked,
        like_count: info.likes,
        can_repost: can_repost,
        repost_count: info.reposts,
        comment_count: info.comments
    });
});

router.post('/:id/repost', isAuthenticated, (req, res) => {
    const postId = req.params.id;
    const userId = req.session.userId;


    if (canRepost(postId, userId)) {
        createRepost(postId, userId);
        res.sendStatus(201)

        createRepostNotification(postId, userId);
    } else {
        res.sendStatus(403)
    }


});

router.get('/:id/repost', isAuthenticated, (req, res) => {
    const postId = req.params.id;
    const userId = req.session.userId;

    const can_repost = canRepost(postId, userId);
    const repostCount = getRepostsCount(postId);

    res.json({
        can_repost: can_repost,
        repost_count: repostCount
    });
});

router.delete('/:postId/comment/:commentId', isAuthenticated, (req, res) => {
    const commentId = req.params.commentId;
    const userId = req.session.userId;
    const postId = req.params.postId;

    const commentAuthor = getCommentAuthor(commentId);

    if (commentAuthor == userId) {
        deleteComment(commentId);
        deleteCommentNotification(postId, commentAuthor);
        res.sendStatus(200);
    } else {
        res.status(403).send("You cannot delete a comment that is not yours.");
    }
});

router.delete('/:postId', isAuthenticated, (req, res) => {
    const postId = req.params.postId;
    const userId = req.session.userId;

    const postAuthor = getPostAuthor(postId);

    if (postAuthor == userId) {
        deleteRepostAndPostAndComments(postId);
        res.sendStatus(200);
    } else {
        res.status(403).send("You cannot delete a post that is not yours.");
    }
});


function deleteRepostAndPostAndComments(postId) {
    deleteAllNotificationsReferringToPost(postId);

    deleteAllLikes(postId);   
    deleteAllReposts(postId);
    deleteAllComments(postId);

    deletePost(postId);
}
  

export default router;

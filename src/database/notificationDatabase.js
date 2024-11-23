import Database from "better-sqlite3";
import { getPostAuthor, getUsernameFromId } from "../database.js";

function createNotificationsDB(db) {
    const db_stmt = /*sql*/`CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY NOT NULL,
      user_id INTEGER NOT NULL, -- user to be notified
      post_id INTEGER, -- post that triggered the notification, or NULL in case of follow
      interaction_with_user_id INTEGER, -- user that interacted with the post, null in case of like (because likes are anonymus)
      type TEXT NOT NULL, -- like_milestone, repost, comment, follow
      message TEXT NOT NULL, -- notification message
      date INTEGER NOT NULL, -- date of the interaction
      read BOOLEAN NOT NULL DEFAULT 0, -- whether the notification has been read
      FOREIGN KEY (user_id) REFERENCES insecure_users(id)
      FOREIGN KEY (post_id) REFERENCES posts(id)
      FOREIGN KEY (interaction_with_user_id) REFERENCES insecure_users(id)
    )`;
    db.prepare(db_stmt).run();
    console.log("Created notifications table.");
  }

  function createCommentNotification(post_id, commenting_user_id) {
    //Get post author
    const user_id_to_notify = getPostAuthor(post_id);
    const commenting_username = getUsernameFromId(commenting_user_id);
  
    const message = `${commenting_username} commented on your post`;
    createNotification(user_id_to_notify, post_id, commenting_user_id, 'comment', message);
  }

  function deleteCommentNotification(post_id, commenting_user_id) {
    const db = new Database("database_files/betterreads.db", {
      verbose: console.log,
    });
    const query = /* sql */ `DELETE FROM notifications WHERE post_id=? AND interaction_with_user_id=? AND type='comment'`;
    db.prepare(query).run(post_id, commenting_user_id);
  }
  
  function createRepostNotification(post_id, reposting_user_id) {
    //Get post author
    const user_id_to_notify = getPostAuthor(post_id);
    const reposting_username = getUsernameFromId(reposting_user_id);
  
    const message = `${reposting_username} reposted your post`;
    createNotification(user_id_to_notify, post_id, reposting_user_id, 'repost', message);
  }
  
  function createLikeMilestoneNotification(post_id, like_count) {
    const user_id_to_notify = getPostAuthor(post_id);
    const message = `Your post has reached ${like_count}` + (like_count == 1 ? ' like!' : ' likes!');
    createNotification(user_id_to_notify, post_id, null, 'like_milestone', message);
  }
  
  function removeLikeMilestoneNotificacion(post_id) {
    const db = new Database("database_files/betterreads.db", {
      verbose: console.log,
    });
  //Delete only the last like milestone notification from that post
    const query = /* sql */ `DELETE FROM notifications WHERE post_id=? AND type='like_milestone' ORDER BY date DESC LIMIT 1`;
    db.prepare(query).run(post_id);
  }
  
  function createFollowNotification(follower_user_id, following_user_id) {
    const message = `${getUsernameFromId(follower_user_id)} started following you`;
    createNotification(following_user_id, null, follower_user_id, 'follow', message);
  }
  
  function removeFollowNotification(follower_user_id, following_user_id) {
    const db = new Database("database_files/betterreads.db", {
      verbose: console.log,
    });
    const query = /* sql */ `DELETE FROM notifications WHERE user_id=? AND interaction_with_user_id=? AND type='follow'`;
    db.prepare(query).run(following_user_id, follower_user_id); 
  }
  
  
  function createNotification(user_id_to_notify, post_id_of_interaction, interaction_with_user_id, type, message) {
    const db = new Database("database_files/betterreads.db", {verbose: console.log});
  
    const operation = /* sql */ `INSERT INTO notifications (
          user_id, post_id, interaction_with_user_id, type, message, date
       ) VALUES (?,?,?,?,?,unixepoch('subsec'))`
    db.prepare(operation).run(user_id_to_notify, post_id_of_interaction, interaction_with_user_id, type, message);
  
  }

  function deleteRepostNotification(post_id, reposting_user_id) {
    const db = new Database("database_files/betterreads.db", {
      verbose: console.log,
    });
    const query = /* sql */ `DELETE FROM notifications WHERE post_id=? AND interaction_with_user_id=? AND type='repost'`;
    db.prepare(query).run(post_id, reposting_user_id);
  }



  function getNotificationsForUserId(user_id) {
    const db = new Database("database_files/betterreads.db", {verbose: console.log});
    const query = /* sql */ `SELECT * FROM notifications WHERE user_id=? ORDER BY date DESC`;
    const notifications = db.prepare(query).all(user_id);
    return notifications;
  }

  function getCountOfNotificationsForUserId(user_id) {
    const db = new Database("database_files/betterreads.db", {verbose: console.log});
    const query = /* sql */ `SELECT COUNT(1) FROM notifications WHERE user_id=?`;
    const count = db.prepare(query).get(user_id)["COUNT(1)"];
    return count;
  }

  function getCountOfUnreadNotificationsForUserId(user_id) {
    const db = new Database("database_files/betterreads.db", {verbose: console.log});
    const query = /* sql */ `SELECT COUNT(1) FROM notifications WHERE user_id=? AND read=FALSE`;
    const count = db.prepare(query).get(user_id)["COUNT(1)"];
    return count;
  }

  function readNotification(notification_id) {
    const db = new Database("database_files/betterreads.db", {verbose: console.log});
    const query = /* sql */ `UPDATE notifications SET read=1 WHERE id=?`;
    db.prepare(query).run(notification_id);
  }


  function deleteAllNotificationsFromUser(user_id) {
    const db = new Database("database_files/betterreads.db", {verbose: console.log});
    const query = /* sql */ `DELETE FROM notifications WHERE user_id=?`;
    db.prepare(query).run(user_id);
  }

  function deleteNotification(notification_id) {
    const db = new Database("database_files/betterreads.db", {verbose: console.log});
    const query = /* sql */ `DELETE FROM notifications WHERE id=?`;
    db.prepare(query).run(notification_id);
  }

  function deleteAllNotificationsReferringToPost(post_id) {
    const db = new Database("database_files/betterreads.db", {verbose: console.log});
    const query = /* sql */ `DELETE FROM notifications WHERE post_id=?`;
    db.prepare(query).run(post_id);
  }

  export { createNotificationsDB,
    createCommentNotification,
    deleteCommentNotification,
  createRepostNotification,
  createLikeMilestoneNotification,
  removeLikeMilestoneNotificacion,
  createFollowNotification,
  removeFollowNotification,
  getNotificationsForUserId,
  readNotification,
  deleteAllNotificationsFromUser,
  deleteNotification,
  getCountOfNotificationsForUserId,
  getCountOfUnreadNotificationsForUserId,
  deleteAllNotificationsReferringToPost,
  deleteRepostNotification
   }
//Actualiza el contador de likes en la vista de un post
async function updateLikes(posts, post_id) {
  let response = await fetch(`/post/${post_id}/like`, {
    method: "GET",
  });
  let data = await response.json();

  if (!(posts?.[Symbol.iterator])) {
    posts = [posts];
  }

  posts.forEach(post => {
    updateLikeHtml(post, data.like_count, data.liked);
  });
}

async function updateReposts(posts, post_id) {
  let response = await fetch(`/post/${post_id}/repost`, {
    method: "GET",
  });
  let data = await response.json();

  if (!(posts?.[Symbol.iterator])) {
    posts = [posts];
  }

  posts.forEach(post => {
    updateRepostHtml(post, data.repost_count, data.has_reposted);
  });
}


function updateLikeHtml(post, like_count, liked) {
  //agregar al .like-button-icon la clase liked si liked es true
  if (liked) {
    post.querySelector(".like-button-icon").classList.add("liked");
  } else {
    post.querySelector(".like-button-icon").classList.remove("liked");
  }

  post.querySelector(".like-counter").textContent = `${like_count}`;
}

function updateRepostHtml(post, repost_count, has_reposted) {
  //agregar al .repost-button-icon la clase reposted si has_reposted es true
  if (has_reposted) {
    post.querySelector(".repost-button-icon").classList.add("reposted");
  } else {
    post.querySelector(".repost-button-icon").classList.remove("reposted");
  }

  post.querySelector(".repost-counter").textContent = `${repost_count}`;
}



function updateCommentHtml(post, comment_count, has_commented) {
  //agregar al .repost-button-icon la clase reposted si has_reposted es true
  if (has_commented) {
    post.querySelector(".comment-button-icon").classList.add("commented");
  } else {
    post.querySelector(".comment-button-icon").classList.remove("commented");
  }

  post.querySelector(".comment-counter").textContent = `${comment_count}`;
}




async function updateInfo(posts, post_id) {  
  try{
      let response = await fetch(`/post/${post_id}/info`, {
        method: "GET",
      });
      let data = await response.json();
    
      if (!(posts?.[Symbol.iterator])) {
        posts = [posts];
      }
    
      posts.forEach(post => {
        updateLikeHtml(post, data.like_count, data.liked);
        updateRepostHtml(post, data.repost_count, data.has_reposted);
        updateCommentHtml(post, data.comment_count, data.has_commented);
      });

  }catch(e){
    console.error(e);
  }

}
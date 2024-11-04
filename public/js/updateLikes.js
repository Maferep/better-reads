//Actualiza el contador de likes en la vista de un post
async function updateLikes(post, post_id) {
  let response = await fetch(`http://localhost/post/${post_id}/like`, {
    method: "GET",
  });
  let data = await response.json();
  updateLikeHtml(post, data.like_count, data.liked);
}

async function updateReposts(post, post_id) {
  let response = await fetch(`http://localhost/post/${post_id}/repost`, {
    method: "GET",
  });
  let data = await response.json();
  updateRepostHtml(post, data.repost_count, data.reposted);
}



function updateLikeHtml(post, like_count, liked) {
  const heartToUse= liked ? "❤️" : "🤍";
  post.querySelector(".like-counter").textContent = `${heartToUse} ${like_count}`;
}

function updateRepostHtml(post, repost_count, can_repost) {
  modifyRespostButton(post, can_repost);

  post.querySelector(".repost-counter").textContent = `🔁 ${repost_count}`;
}

function modifyRespostButton(post, can_repost) {
  if (can_repost) {
    post.querySelector(".repost-button").classList.remove("disabled");
  } else {
    post.querySelector(".repost-button").classList.add("disabled");
  }
}


function updateCommentHtml(post, comment_count) {
  post.querySelector(".comment-counter").textContent = `💬 ${comment_count}`;
}




async function updateInfo(post, post_id) {
  let response = await fetch(`http://localhost/post/${post_id}/info`, {
    method: "GET",
  });
  let data = await response.json();

  console.log(post_id, data);

  updateLikeHtml(post, data.like_count, data.liked);
  updateRepostHtml(post, data.repost_count, data.can_repost);
  updateCommentHtml(post, data.comment_count);
}
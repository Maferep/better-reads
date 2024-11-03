//Actualiza el contador de likes en la vista de un post
async function updateLikes(post, post_id) {
  let response = await fetch(`http://localhost/post/${post_id}/like`, {
    method: "GET",
  });
  let data = await response.json();
  const heartToUse= data.liked ? "❤️" : "🤍";
  post.querySelector(".like-counter").textContent = `${heartToUse} ${data.like_count}`;
}
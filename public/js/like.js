
document.getElementById("container").addEventListener("click", function(event) {
  if (event.target.closest(".like-button")) {
    event.preventDefault();
    const postDiv = event.target.closest(".post");
    const post_id = postDiv.getAttribute("post-id");
    const likeCountElement = postDiv.querySelector(".like-counter");

    fetch(`http://localhost/post/${post_id}/like`, {
      method: "GET",
    })
    .then(res => {
      return res.json();
    })
    .then(data => {
      if (data.liked == true) {
        return fetch(`http://localhost/post/${post_id}/unlike`, {
          method: "POST",
        })

      } else if (data.liked == false) {
        return fetch(`http://localhost/post/${post_id}/like`, {
          method: "POST",
        })
      }
    })
    .then(res => {
      updateLikes();
    })
  }
}); 
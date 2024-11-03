var this_js_script = document.currentScript; // or better regexp to get the file name..

var event_listener_location = this_js_script.getAttribute("event_listener_location");  

document.getElementById(event_listener_location).addEventListener("click", function(event) {
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

//Actualiza el contador de likes en la vista de un post
async function updateLikes() {
  const post = document.getElementsByClassName("post")[0]
  const post_id = post.getAttribute("post-id");

  let response = await fetch(`http://localhost/post/${post_id}/like`, {
    method: "GET",
  });
  let data = await response.json();

  const heartToUse= data.liked ? "❤️" : "🤍";
  post.querySelector(".like-counter").textContent = `${heartToUse} ${data.like_count}`;
}

//Actualiza el contador de likes en la vista de un post cuando se muestra la pagina
window.addEventListener('pageshow', function(event) {
    updateLikes();
});
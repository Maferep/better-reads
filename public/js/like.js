var this_js_script = document.currentScript; // or better regexp to get the file name..

var event_listener_location = this_js_script.getAttribute("event_listener_location");  

document.getElementById(event_listener_location).addEventListener("click", function(event) {
  const postDiv = event.target.closest(".post");
  const post_id = postDiv.getAttribute("post-id");
  if (event.target.closest(".like-button")) {
    event.preventDefault();

    fetch(`/post/${post_id}/like`, {
      method: "GET",
    })
    .then(res => {
      return res.json();
    })
    .then(data => {
      return fetch(`/post/${post_id}/` + (data.liked?"unlike":"like"), {
        method: "POST",
      })
    })
    .then(res => {
      const posts_with_id = document.querySelectorAll(".post[post-id='"+post_id+"']");
      updateLikes(posts_with_id,post_id);
    })

  } else if (event.target.closest(".repost-button")) {
    event.preventDefault();

    try{
    playFullscreenVideo();
    } catch (e) {
      console.log("Experimental feature not enabled. To enable, go to /?experimental=true.")
    }

    fetch(`/post/${post_id}/repost`, {
      method: "POST",
    })
    .then(res => {
      const posts_with_id = document.querySelectorAll(".post[post-id='"+post_id+"']");
      updateReposts(posts_with_id,post_id);
    })
  }
}); 

//Actualiza el contador de likes en la vista de un post cuando se muestra la pagina
window.addEventListener('pageshow', function(event) {
  const posts = document.querySelectorAll(".post");
  posts.forEach(post => {
    const post_id = post.getAttribute("post-id");
    updateInfo(post, post_id);
  });
});
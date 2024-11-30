import {faker} from '@faker-js/faker';
import { v4 as uuid4 } from "uuid";

import {createUser, addReview, createPost, getRandomBookId, getRandomAuthorId, createRepost, incrementLikes} from '../database.js';

const NUMEREO_DE_POSTS = 20;
const NUMERO_DE_USUARIOS = 10;
const NUMERO_DE_LIBROS_A_LOS_QUE_HACER_REVIEWS = 10;
const PROBABILIDAD_DE_HACER_REVIEW = 0.5;
const POPORCION_DE_REPOSTS_POR_POST = 0.7;
const PROBABILIDAD_DE_LIKEAR_POST = 0.3;


//setear seed
faker.seed(123);


//Asistido por chatgpt
const posts = [
    { post: "The plot was engaging and kept me hooked until the end.", type: "book", score: 5 },
    { post: "I felt like the pacing could have been better in some parts.", type: "book", score: 3 },
    { post: "The characters felt so real and relatable.", type: "book", score: 5 },
    { post: "It was an easy read, but it lacked depth.", type: "book", score: 2 },
    { post: "The writing style was very unique and captivating.", type: "book", score: 5 },
    { post: "I didn’t connect with the story as much as I hoped.", type: "book", score: 2 },
    { post: "The themes explored in this book were thought-provoking.", type: "book", score: 4 },
    { post: "The ending left me wanting more, but in a good way.", type: "book", score: 4 },
    { post: "It was an enjoyable read, but not one I would revisit.", type: "book", score: 3 },
    { post: "This book has a strong emotional impact, I couldn't put it down.", type: "book", score: 5 },
    { post: "The narrative structure was unique and refreshing.", type: "book", score: 5 },
    { post: "I felt the story dragged in the middle.", type: "book", score: 2 },
    { post: "The dialogue felt authentic and well-crafted.", type: "book", score: 5 },
    { post: "I struggled to stay invested in the story.", type: "book", score: 1 },
    { post: "The setting was vividly described and immersive.", type: "book", score: 5 },
    { post: "I enjoyed the twists, even though they were predictable.", type: "book", score: 3 },
    { post: "This book had a lot of heart and depth.", type: "book", score: 5 },
    { post: "The humor in this book didn’t really land for me.", type: "book", score: 2 },
    { post: "It was a solid story, but not particularly memorable.", type: "book", score: 3 },
    { post: "The emotional weight of this book stayed with me for days.", type: "book", score: 5 },
    { post: "I appreciated the clever use of symbolism throughout.", type: "book", score: 4 },
    { post: "The story was good, but the characters lacked development.", type: "book", score: 3 },
    { post: "This book left me with a deep sense of satisfaction.", type: "book", score: 5 },
    { post: "The pacing felt uneven at times, but the ending was strong.", type: "book", score: 3 },
    { post: "I found myself re-reading certain passages because they were so beautifully written.", type: "book", score: 5 },
    { post: "This book was an interesting concept but fell short in execution.", type: "book", score: 2 },
    { post: "The mystery element kept me guessing until the end.", type: "book", score: 5 },
    { post: "I didn’t feel like the protagonist had much of an arc.", type: "book", score: 2 },
    { post: "The way the book tackled complex issues was impressive.", type: "book", score: 4 },
    { post: "It was an enjoyable read, though not groundbreaking.", type: "book", score: 3 },
    { post: "This book felt like it was written just for me.", type: "book", score: 5 },
    { post: "The plot had potential, but the ending felt rushed.", type: "book", score: 2 },
    { post: "The author weaves together multiple perspectives seamlessly.", type: "book", score: 4 },
    { post: "The themes of resilience and hope really stood out.", type: "book", score: 5 },
    { post: "I wish there had been more closure to certain subplots.", type: "book", score: 3 },
    { post: "This book made me laugh, cry, and think deeply.", type: "book", score: 5 },
    { post: "The plot twists felt forced and out of place.", type: "book", score: 2 },
    { post: "The exploration of morality in this story was fascinating.", type: "book", score: 4 },
    { post: "The world-building was extensive but sometimes overwhelming.", type: "book", score: 3 },
    { post: "This book was a quick, fun read with lots of charm.", type: "book", score: 4 },
    { post: "I found the ending satisfying and thought-provoking.", type: "book", score: 5 },
    { post: "The relationships between characters felt underdeveloped.", type: "book", score: 2 },
    { post: "The author captured the essence of human emotions so well.", type: "book", score: 5 },
    { post: "I found the structure of the book confusing at times.", type: "book", score: 2 },
    { post: "The mix of humor and drama worked really well.", type: "book", score: 4 },
    { post: "The tension kept me on edge throughout the entire story.", type: "book", score: 5 },
    { post: "I felt like some of the themes were overly simplistic.", type: "book", score: 3 },
    { post: "The ending was bittersweet and perfectly executed.", type: "book", score: 5 },
    { post: "This book had a beautiful message that resonated with me.", type: "book", score: 5 },
    { post: "The imagery in this book was breathtaking.", type: "book", score: 5 },
    { post: "The character arcs felt incomplete by the end.", type: "book", score: 2 },
    { post: "I loved the clever way the story unfolded.", type: "book", score: 5 },
    { post: "The tone of the book felt inconsistent at times.", type: "book", score: 3 },
    { post: "This book was a masterclass in suspense.", type: "book", score: 5 },
    { post: "The ending was predictable but still satisfying.", type: "book", score: 4 },
    { post: "I couldn’t connect with the protagonist’s motivations.", type: "book", score: 2 },
    { post: "The narrative was beautifully layered and complex.", type: "book", score: 5 },
    { post: "Some parts of the book felt like filler.", type: "book", score: 2 },
    { post: "This book was impossible to put down.", type: "book", score: 5 },
    { post: "The relationships between characters felt so authentic.", type: "book", score: 5 },
    { post: "The book started strong but lost momentum halfway through.", type: "book", score: 3 },
    { post: "The world-building was imaginative and detailed.", type: "book", score: 5 },
    { post: "This book felt a bit derivative of other stories in the genre.", type: "book", score: 2 },
    { post: "I loved the emotional depth of the characters.", type: "book", score: 5 },
    { post: "The book’s pacing was too slow for my taste.", type: "book", score: 2 },
    { post: "The plot twist completely caught me off guard.", type: "book", score: 5 },
    { post: "The themes were interesting but not explored deeply enough.", type: "book", score: 3 },
    { post: "This book was an unforgettable journey.", type: "book", score: 5 },
    { post: "I felt the book was overly reliant on exposition.", type: "book", score: 2 },
    { post: "The dialogue was sharp and realistic.", type: "book", score: 5 },
    { post: "The book felt overly ambitious and unfocused.", type: "book", score: 3 },
    { post: "I appreciated the rich cultural elements woven into the story.", type: "book", score: 5 },
    { post: "The plot had a few holes that bothered me.", type: "book", score: 3 },
    { post: "This book felt like a love letter to its genre.", type: "book", score: 5 },
    { post: "The story was compelling, but the ending was abrupt.", type: "book", score: 3 },
    { post: "The tension in this book was palpable throughout.", type: "book", score: 5 },
    { post: "I found the flashbacks confusing and unnecessary.", type: "book", score: 2 },
    { post: "The author’s use of symbolism added so much depth to the story.", type: "book", score: 5 },
    { post: "I struggled to keep track of the large cast of characters.", type: "book", score: 2 },
    { post: "This book tackled difficult topics with grace and sensitivity.", type: "book", score: 5 },
    { post: "I felt the story relied too much on clichés.", type: "book", score: 2 },
    { post: "The way the author built tension was masterful.", type: "book", score: 5 },
    { post: "The book had an intriguing concept but poor execution.", type: "book", score: 3 },
    { post: "The story had a timeless quality that will resonate with readers.", type: "book", score: 5 },
    { post: "The humor in this book felt forced and out of place.", type: "book", score: 2 },
    { post: "I loved the way the book explored family dynamics.", type: "book", score: 5 },
    { post: "The book’s middle section dragged, but the ending was worth it.", type: "book", score: 4 },
    { post: "The twists were surprising without feeling contrived.", type: "book", score: 5 },
    { post: "I couldn’t connect with the book’s central themes.", type: "book", score: 2 },
    { post: "This book had me reflecting on its message long after finishing.", type: "book", score: 5 },
    { post: "I wish the story had more depth and complexity.", type: "book", score: 3 },
    { post: "The book’s exploration of morality was nuanced and compelling.", type: "book", score: 5 },
    { post: "The action scenes were thrilling and vividly described.", type: "book", score: 5 },
    { post: "I felt like some of the subplots were unnecessary.", type: "book", score: 3 },
    { post: "The book’s structure was unconventional but effective.", type: "book", score: 4 },
    { post: "This book was a heartfelt and deeply moving story.", type: "book", score: 5 },
    { post: "The romantic subplot felt out of place in the narrative.", type: "book", score: 2 },
    { post: "This book was both entertaining and thought-provoking.", type: "book", score: 5 },
    { post: "The main character’s decisions didn’t feel believable.", type: "book", score: 2 },
    { post: "The book’s mix of humor and tragedy worked perfectly.", type: "book", score: 5 },
    { post: "The stakes didn’t feel high enough to keep me invested.", type: "book", score: 3 },
    { post: "The writing in this book was simply exquisite.", type: "book", score: 5 },
    { post: "I found the constant shifts in perspective distracting.", type: "book", score: 2 },
    { post: "The book was rich with cultural and historical detail.", type: "book", score: 5 },
    { post: "The narrative lacked focus and meandered too much.", type: "book", score: 3 },
    { post: "I found the book’s exploration of identity very compelling.", type: "book", score: 5 },
    { post: "The book felt like it was trying too hard to be profound.", type: "book", score: 3 },
    { post: "This book had a magical quality that swept me away.", type: "book", score: 5 },
    { post: "The ending left too many questions unanswered.", type: "book", score: 3 },
    { post: "The characters felt like old friends by the end.", type: "book", score: 5 },
    { post: "The story was gripping but lacked emotional resonance.", type: "book", score: 3 },
    { post: "This book took me on an emotional rollercoaster.", type: "book", score: 5 },
    { post: "The prose was beautiful, but the story was hard to follow.", type: "book", score: 3 },
    { post: "I loved the way the author incorporated folklore into the story.", type: "book", score: 5 },
    { post: "The book’s repetitive nature made it hard to enjoy.", type: "book", score: 2 },
    { post: "This book had a slow start, but it paid off in the end.", type: "book", score: 4 },
    { post: "The moral dilemmas in this book were fascinating.", type: "book", score: 5 },
    { post: "The pacing was uneven, with some sections dragging.", type: "book", score: 3 },
    { post: "This book reminded me why I love reading.", type: "book", score: 5 },
    { post: "The book’s metaphors felt heavy-handed at times.", type: "book", score: 3 },
    { post: "I loved the multi-generational story arc.", type: "book", score: 5 },
    { post: "The book’s resolution felt unearned.", type: "book", score: 2 },
    { post: "This book was a deeply personal and intimate story.", type: "book", score: 5 },
    { post: "The plot twists felt predictable but still enjoyable.", type: "book", score: 3 },
    { post: "I loved how the story explored the passage of time.", type: "book", score: 5 },
    { post: "The book’s overuse of flashbacks broke the momentum.", type: "book", score: 2 },
    { post: "This book is a must-read for fans of the genre.", type: "book", score: 5 },
    { post: "The main character’s voice was authentic and engaging.", type: "book", score: 5 },
    { post: "I struggled with the book’s dense writing style.", type: "book", score: 2 },   
    { post: "The emotional highs and lows were perfectly balanced.", type: "book", score: 5 },
  { post: "The characters felt one-dimensional and unrelatable.", type: "book", score: 2 },
  { post: "This book kept me on the edge of my seat from start to finish.", type: "book", score: 5 },
  { post: "The story felt formulaic and uninspired.", type: "book", score: 2 },
  { post: "The book’s atmosphere was dark and haunting in the best way.", type: "book", score: 5 },
  { post: "The ending felt anticlimactic after such a strong start.", type: "book", score: 3 },
  { post: "The book’s world-building was intricate and fascinating.", type: "book", score: 5 },
  { post: "The pacing was too slow for me to stay interested.", type: "book", score: 2 },
  { post: "This book was a beautifully woven tapestry of stories.", type: "book", score: 5 },
  { post: "I felt like the plot relied too heavily on coincidences.", type: "book", score: 3 },
  { post: "The way the author described emotions was incredibly moving.", type: "book", score: 5 },
  { post: "The middle section of the book dragged unnecessarily.", type: "book", score: 3 },
  { post: "I loved the creative and original premise of the book.", type: "book", score: 5 },
  { post: "The dialogue didn’t feel natural and often took me out of the story.", type: "book", score: 2 },
  { post: "The twists and turns made this book an unforgettable read.", type: "book", score: 5 },
  { post: "The writing style was dense and difficult to follow.", type: "book", score: 2 },
  { post: "I appreciated the balance of action and introspection.", type: "book", score: 5 },
  { post: "The conclusion felt rushed and left me wanting more closure.", type: "book", score: 3 },
  { post: "This book explored complex themes with incredible finesse.", type: "book", score: 5 },
  { post: "The story didn’t live up to its initial promise.", type: "book", score: 2 },
  { post: "The author’s ability to build tension was phenomenal.", type: "book", score: 5 },
  { post: "I felt like the book lacked a clear direction.", type: "book", score: 2 },
  { post: "The characters’ relationships were beautifully and realistically portrayed.", type: "book", score: 5 },
  { post: "The prose was overly descriptive and bogged down the narrative.", type: "book", score: 3 },
  { post: "This book felt like a celebration of life and resilience.", type: "book", score: 5 },
  { post: "The main plotline was engaging, but the subplots were confusing.", type: "book", score: 3 },
  { post: "I found myself completely immersed in this book’s world.", type: "book", score: 5 },
  { post: "The book’s pacing was inconsistent and hard to follow.", type: "book", score: 2 },
  { post: "The ending tied up all the loose ends perfectly.", type: "book", score: 5 },
  { post: "The story lacked the emotional impact I was hoping for.", type: "book", score: 3 },
  { post: "This book was full of profound and thought-provoking moments.", type: "book", score: 5 },
  { post: "The story was good, but the characters didn’t feel fully developed.", type: "book", score: 3 },
  { post: "I was completely captivated by the story’s unique perspective.", type: "book", score: 5 },
  { post: "The book’s themes felt heavy-handed and overly moralistic.", type: "book", score: 2 },
  { post: "I couldn’t put this book down—it was that compelling.", type: "book", score: 5 },
  { post: "The transitions between chapters felt abrupt and disjointed.", type: "book", score: 3 },
  { post: "The exploration of cultural identity was handled with great care.", type: "book", score: 5 },
  { post: "The book’s tone was uneven and hard to pin down.", type: "book", score: 3 },
  { post: "This book was a deeply moving exploration of grief and healing.", type: "book", score: 5 },
  { post: "The mystery kept me engaged, but the resolution was disappointing.", type: "book", score: 3 },
  { post: "The writing was so vivid, I could picture every scene.", type: "book", score: 5 },
  { post: "I struggled to care about any of the characters.", type: "book", score: 2 },
  { post: "The book’s blend of history and fiction was seamless.", type: "book", score: 5 },
  { post: "The ending felt abrupt and unresolved.", type: "book", score: 3 },
  { post: "The book explored themes of love and sacrifice beautifully.", type: "book", score: 5 },
  { post: "The book’s reliance on flashbacks made the timeline confusing.", type: "book", score: 2 },
  { post: "I loved the poetic language used throughout the book.", type: "book", score: 5 },
  { post: "The plot twists were predictable and uninspiring.", type: "book", score: 2 },
  { post: "The book left me with a feeling of hope and renewal.", type: "book", score: 5 },
  { post: "I found the narrative structure hard to follow.", type: "book", score: 3 },
  { post: "The character growth in this book was deeply satisfying.", type: "book", score: 5 },
  { post: "The story felt too drawn out and repetitive.", type: "book", score: 2 },
  { post: "I appreciated how the book challenged my perspective.", type: "book", score: 5 },
  { post: "The descriptions were so vivid, it felt like watching a movie.", type: "book", score: 5 },
  { post: "The book’s unique format added to the storytelling experience.", type: "book", score: 5 },
  { post: "I found the main character’s development truly inspiring.", type: "book", score: 5 },
  { post: "The climax of the book was absolutely breathtaking.", type: "book", score: 5 },
  { post: "The book’s attention to detail made the story feel real.", type: "book", score: 5 },
  { post: "This book was emotionally draining, but in a good way.", type: "book", score: 5 },
  { post: "I loved the layered complexity of the narrative.", type: "book", score: 5 },
  { post: "The character interactions were natural and heartfelt.", type: "book", score: 5 },
  { post: "The themes of the book felt deeply relevant to today’s world.", type: "book", score: 5 },
  { post: "I was mesmerized by the poetic beauty of the prose.", type: "book", score: 5 },
  { post: "This book left me in tears and inspired at the same time.", type: "book", score: 5 },
  { post: "The exploration of humanity’s flaws was masterful.", type: "book", score: 5 },
  { post: "I can’t stop recommending this book to everyone I know.", type: "book", score: 5 },
  { post: "The story’s resolution was satisfying and memorable.", type: "book", score: 5 },
  { post: "The book’s pace was relentless in the best possible way.", type: "book", score: 5 },
  { post: "The story blended fantasy and reality seamlessly.", type: "book", score: 5 },
  { post: "I appreciated the book’s raw honesty about its subject matter.", type: "book", score: 5 },
  { post: "The exploration of relationships felt genuine and raw.", type: "book", score: 5 },
  { post: "The way the book explored time and memory was fascinating.", type: "book", score: 5 },
  { post: "This book was an emotional rollercoaster I’d gladly ride again.", type: "book", score: 5 },
  { post: "The balance of tension and release made this book unforgettable.", type: "book", score: 5 },
  { post: "The book’s subtle moments packed the most emotional punch.", type: "book", score: 5 },
   
    { post: "This author has a distinctive voice that sets them apart.", type: "author" },
    { post: "I find the author’s work to be consistently entertaining.", type: "author" },
    { post: "The author's writing can sometimes feel repetitive.", type: "author" },
    { post: "I admire how the author creates such intricate worlds.", type: "author" },
    { post: "The author's style just doesn’t resonate with me.", type: "author" },
    { post: "The author has a great ability to explore complex emotions.", type: "author" },
    { post: "This author is hit or miss for me, but when they’re on, it’s great.", type: "author" },
    { post: "The author’s character development is always top-notch.", type: "author" },
    { post: "I appreciate the depth the author brings to every story.", type: "author" },
    { post: "While I respect the author's skill, I don’t always enjoy the themes.", type: "author" },// Comments about authors
    { post: "The author has a knack for creating deeply flawed but lovable characters.", type: "author" },
    { post: "I love how the author’s work often blends genres in unexpected ways.", type: "author" },
    { post: "The author’s humor doesn’t always resonate with me, but I respect their creativity.", type: "author" },
    { post: "This author’s ability to write vivid, atmospheric settings is unmatched.", type: "author" },
    { post: "I sometimes feel like the author reuses the same tropes in their stories.", type: "author" },
    { post: "This author is a master of writing complex, multi-dimensional villains.", type: "author" },
    { post: "I find the author’s work to be thought-provoking and emotionally impactful.", type: "author" },
    { post: "The author’s latest works feel a bit repetitive compared to their earlier ones.", type: "author" },
    { post: "I appreciate how the author isn’t afraid to tackle controversial topics.", type: "author" },
    { post: "The author has a way of making even ordinary moments feel profound.", type: "author" },
    { post: "This author excels at writing fast-paced, action-packed stories.", type: "author" },
    { post: "The author’s unique writing style takes some getting used to, but it’s worth it.", type: "author" },
    { post: "I’ve always admired how the author writes strong, independent protagonists.", type: "author" },
    { post: "The author’s attention to detail sometimes slows down the pacing.", type: "author" },
    { post: "This author has a talent for creating deeply emotional and personal narratives.", type: "author" },
    { post: "The author’s character-driven stories are always a highlight for me.", type: "author" },
    { post: "I find the author’s works to be hit-or-miss, but when they’re good, they’re amazing.", type: "author" },
    { post: "The author’s exploration of humanity is both compelling and haunting.", type: "author" },
    { post: "I’ve learned so much from the historical accuracy in the author’s works.", type: "author" },
    { post: "The author is known for their imaginative and boundary-pushing ideas.", type: "author" },
    { post: "This author has inspired me to think differently about storytelling.", type: "author" },
    { post: "I find the author’s works uplifting and empowering.", type: "author" },
    { post: "The author’s ability to balance humor with heavier themes is impressive.", type: "author" },
    { post: "The author’s storytelling is always a journey worth taking.", type: "author" },
    { post: "I’ve been following this author for years, and their growth is remarkable.", type: "author" },
    { post: "The author’s prose is so poetic and beautiful to read.", type: "author" },
    { post: "I sometimes feel like the author sacrifices plot for philosophical musings.", type: "author" },
    { post: "The author’s books always leave me thinking long after I’ve finished them.", type: "author" },
    { post: "I appreciate the diversity in the characters the author writes.", type: "author" },
    { post: "The author has a gift for writing stories that are deeply personal yet universal.", type: "author" },
    { post: "The author’s books always make it to my favorites list.", type: "author" },
    { post: "The author has an impressive range, from light-hearted to deeply profound stories.", type: "author" },
    { post: "I wish the author would take more risks with their stories.", type: "author" },
    { post: "This author’s use of language is nothing short of magical.", type: "author" },
    { post: "The author has a way of making even fantastical worlds feel grounded.", type: "author" },
    { post: "The author’s earlier works are my favorite, but I still enjoy their new releases.", type: "author" },
    { post: "I love how the author incorporates subtle humor into their writing.", type: "author" },
    { post: "The author’s storytelling feels so effortless and natural.", type: "author" },
]


posts.sort(() => Math.random() - 0.5);

var users = []


function initializeMockUsers(n) {
    for (let i = 0; i < n; i++) {
        users.push({ id: uuid4(), username: faker.internet.username() , password: faker.internet.password() });
    }
}

initializeMockUsers(NUMERO_DE_USUARIOS);

function createMockUsers() {
    for (let user of users) {
        createUser(user.id, user.username, user.password);
    }
}

function getRandomUser() {
    return users[Math.floor(Math.random() * users.length)];
}

function createMockReviewsPostsAndReposts() {
    let faltante = NUMEREO_DE_POSTS;

    for (let i = 0; i < NUMEREO_DE_POSTS && i < posts.length; i++) {
        const post = posts[i]
        const user = getRandomUser();

        if (post.type === "book") {
            const bookId = getRandomBookId();

            if (Math.random() < PROBABILIDAD_DE_HACER_REVIEW) {
                //Hacer review
                addReview(bookId, user.id, post.score, post.post);
                createPost(user.id, post.post, bookId, "book", post.score);
            } else {
                //Hacer solo post
                createPost(user.id, post.post, bookId, "book");
            }
        }else if (post.type === "author") {
            
            const authorId = getRandomAuthorId();
            createPost(user.id, post.post, authorId, "author");
        }

        

        //Probabilidad de hacer un repost de posts existentes
        if (Math.random() < POPORCION_DE_REPOSTS_POR_POST) {
            const user = getRandomUser();
            //Repostear post con id entre 0 e i, favoreciendo más a los ultimos posts
            // (ya que los primeros tienen muchas instancias de ser elegidos)
            const postIdToRepost = Math.floor((Math.random()**2) * i+1);

            console.log("Reposteando post con id", postIdToRepost, "de", user.username);

            try{
                createRepost(postIdToRepost, user.id);
            } catch(e) {
                console.log("repost abortado, ya se realizó");
            }
        }

        faltante -=1;

        if (faltante % Math.floor(NUMEREO_DE_POSTS/20) === 0) {
            console.log("Faltan", faltante, "posts o reviews");
        }


    }
}

function createMockOnlyReviews() {
    var hacerReviewsAPrimeros = NUMERO_DE_LIBROS_A_LOS_QUE_HACER_REVIEWS;
    var faltante = hacerReviewsAPrimeros;

    for (let i = 0; i < hacerReviewsAPrimeros; i++) {

        const book_id = i;
        const numeroReviews = Math.floor(Math.random() * 5) + 2;

        for (let j = 0; j < numeroReviews; j++) {
            const user = getRandomUser();
            const post = posts[Math.floor(Math.random() * posts.length)];
            addReview(book_id, user.id, post.score, post.post);
        }

        faltante -=1;

        if (i % Math.max(Math.floor(hacerReviewsAPrimeros/20),1) == 0) {
            console.log("Faltan", faltante, "reviews");
        }
    }
}

function createMockLikes() {
    const cantidadIntentosLikes = NUMEREO_DE_POSTS * users.length;

    let likesIntentados = 0;

    for (let user of users) {
        for (let i = 1; i < NUMEREO_DE_POSTS; i++) {
            if (Math.random() < PROBABILIDAD_DE_LIKEAR_POST) {
                incrementLikes(i, user.id);
            }
            likesIntentados += 1;

            if (likesIntentados % Math.floor(cantidadIntentosLikes/20) === 0) {
                console.log("Falta intentar", cantidadIntentosLikes - likesIntentados, "likes");
            }
        }
    }
}

function createMockComments() {
    
    

export function createAllMockData() {
    console.log("CREANDO USUARIOS MOCK")
    createMockUsers();

    console.log("CREANDO REVIEWS Y POSTS MOCK");
    createMockReviewsPostsAndReposts();

    console.log("CREANDO SOLO REVIEWS MOCK");
    createMockOnlyReviews();

    console.log("CREANDO LIKES MOCK");
    createMockLikes();    
}

const Database = require('better-sqlite3');
function postRegister (req, res) {
  const db = new Database('foobar.db', { verbose: console.log }); 
  const id = Math.floor(Math.random()*10000000);
  // TODO: validate input
  const username = req.body.name
  const password = req.body.password
  // TODO check existing sql const check = db.prepare('')
  try {
    const run = db.prepare('INSERT INTO insecure_users VALUES (?,?,?)').run(id, username, password);
    res.end("Registered!");
  } catch (e) {
    console.error(e)
    res.end("Failed to register");
  }
}

module.exports = {postRegister}
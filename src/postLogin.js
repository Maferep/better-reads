const Database = require('better-sqlite3');
function postLogin (req, res) {
  // TODO: validate input
  const db = new Database('foobar.db', { verbose: console.log }); 
  const username = req.body.name
  const password = req.body.password
  try {
    const rows = db.prepare('SELECT *  FROM insecure_users WHERE username=? AND insecure_password=?').all(username, password);
    if (rows.length == 0) {
      console.log(rows)
      res.end("Invalid credentials");
    } else {
      res.end("Logged in!");
    }
  } catch (e) {
    console.error(e)
    res.end("Failed to log in");
  }
}

module.exports = {postLogin}
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
      // successful login!
      // regenerate session to prevent session fixation
      req.session.regenerate(function (err) {
        if (err) {
          console.log("NEXT")
          next(err)
        } else {
          // store user information in session, typically a user id
          req.session.user = req.body.name
          console.log("set user ", req.session.user)
          // save the session before redirection to ensure page
          // load does not happen before session is saved
          req.session.save(function (err) {
            console.log("saving...")
            if (err) {
              next(err)
              return
            } else {
              res.redirect('/')
              return
            }
          })
        }
      })
    }
  } catch (e) {
    console.error(e)
    if(!res.writableEnded) res.end("Failed to log in");
  }
}

module.exports = {postLogin}
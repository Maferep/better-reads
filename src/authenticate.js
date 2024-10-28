import Database from 'better-sqlite3';

// middleware to test if authenticated
export function isAuthenticated (req, res, next) {
  console.log("Checking authentication", req.session)
  if (req.session.user &&
      req.session.userId &&
      estaEnBaseDeDatosUsuarios(req.session.userId, req.session.user)) next()
    else next('route')
}

function estaEnBaseDeDatosUsuarios(userId, username) {
  const db = new Database('database_files/betterreads.db', { verbose: console.log });
  const check = db.prepare('SELECT 1 FROM insecure_users WHERE id = ? AND username = ?');
  const rows = check.all(userId, username);
  return rows.length > 0;
}
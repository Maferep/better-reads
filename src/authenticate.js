import Database from 'better-sqlite3';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

export const firebaseConfig = {
  apiKey: "AIzaSyDLGOsjjpnKBRTjjLqbJDjdDu-PlIMcpQo",
  authDomain: "better-reads-1232b.firebaseapp.com",
  projectId: "better-reads-1232b",
  storageBucket: "better-reads-1232b.firebasestorage.app",
  messagingSenderId: "768926573598",
  appId: "1:768926573598:web:f8a0c7a5e2afbde44d7a0f"
};

initializeApp(firebaseConfig);

const auth = getAuth();

// middleware to test if authenticated
export function isAuthenticated (req, res, next) {
  console.log("Checking authentication", req.session)
  if (estaAutenticado(req)) next()
    else next('route')
}

export function estaAutenticado(req) {
    console.log("Usuario firebase: ", auth.currentUser);
    if (auth.currentUser != null) {
        req.session.userId = auth.currentUser.uid;
    }
    return auth.currentUser != null;
    //return req.session.user && req.session.userId && estaEnBaseDeDatosUsuarios(req.session.userId, req.session.user);
}

function estaEnBaseDeDatosUsuarios(userId, username) {
  const db = new Database('database_files/betterreads.db', { verbose: console.log });
  const check = db.prepare('SELECT 1 FROM insecure_users WHERE id = ? AND username = ?');
  const rows = check.all(userId, username);
  return rows.length > 0;
}

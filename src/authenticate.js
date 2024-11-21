import Database from 'better-sqlite3';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

export const firebaseConfig = {
  apiKey: "AIzaSyDLGOsjjpnKBRTjjLqbJDjdDu-PlIMcpQo",
  authDomain: "better-reads-1232b.firebaseapp.com",
  projectId: "better-reads-1232b",
  storageBucket: "better-reads-1232b.firebasestorage.app",
  messagingSenderId: "768926573598",
  appId: "1:768926573598:web:f8a0c7a5e2afbde44d7a0f"
};

initializeApp(firebaseConfig);


// middleware to test if authenticated
export function isAuthenticated (req, res, next) {
  console.log("Checking authentication", req.session)
  console.log("Payload", req.body)
  if (estaAutenticado(req, res, next)) {
    next()
  } else {
    res.redirect("/login");
  }
}

export function estaAutenticado(req, res, next) {
    console.log(`User: ${req.session.userId}`);

    if (req.session.user && req.session.userId) {
        return true;

    } else if (req.body.token != null) {
        const auth = getAuth();
        console.log("TOKEN: ", req.body.token);
        auth.verifyIdToken(req.body.token).then(decodedToken => {
            console.log("Decoded token: ", decodedToken);
            //res.status(200).send('Token is valid');
            crearUsuarioSiNoExiste(decodedToken.uid, decodedToken.email);

            // store user information in session, typically a user id
            req.session.userId = decodedToken.uid;
            req.session.user = decodedToken.email;
            console.log("set user ", req.session.user)
            // save the session before redirection to ensure page
            // load does not happen before session is saved
            req.session.save(function (err) {
                console.log("saving...")
                if (err) {
                    console.log("ERROR"); 
                } else {
                    return true;
                }
            });
        })
        .catch(error => {
          console.error('Error verifying ID token:', error);
          //res.status(401).send('Unauthorized: Invalid token');
          return false;
        });
    } else {
        return false;
    }
}

function crearUsuarioSiNoExiste(userId, username) {
    if (estaEnBaseDeDatosUsuarios(userId, username)) {
        return;
    }
    fetch("http://localhost/register", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            "uid": userId,
            "name": username,
        }),
    }).then(res => {
        console.log("REGISTERED: ", res.ok);
    });
}

function estaEnBaseDeDatosUsuarios(userId, username) {
  const db = new Database('database_files/betterreads.db', { verbose: console.log });
  const check = db.prepare('SELECT 1 FROM insecure_users WHERE id = ? AND username = ?');
  const rows = check.all(userId, username);
  return rows.length > 0;
}


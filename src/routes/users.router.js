import { Router } from 'express';
import { searchUsers } from '../database.js';

const router = Router();

router.get('/', function (req, res) {
    const amount = 10;
    const offset = 0;

    const rows = searchUsers("", amount, offset);

    res.render("users", {
        username: req.session.user,
        do_sidebar: true,
        loggedIn: true,
        title: "Browse Users",
        userEntries: rows
    });
});

// New route for searching users
router.get('/users/search', function (req, res) {
    const searchTerm = req.query.search || "";
    const amount = 10;
    const offset = 0;

    const rows = searchUsers(searchTerm, amount, offset);
    res.json({ userEntries: rows });
});


export default router;
import { Router } from 'express';
import { searchUsers } from '../database.js';

const router = Router();

// Página principal para explorar usuarios
router.get('/', async (req, res) => {
    try {
        const amount = 10; // Cantidad de usuarios por página
        const offset = 0;  // Offset inicial
        const rows = await searchUsers("", amount, offset); // Aseguramos que sea asíncrono
        console.log(rows);
        res.render("users", {
            username: req.session.user,
            loggedIn: true,
            title: "Browse Users",
            userEntries: rows
        });
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).send("An error occurred while fetching users.");
    }
});

export default router;

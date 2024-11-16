import { Router } from 'express';
import { estaAutenticado, isAuthenticated } from '../authenticate.js';

const router = Router();


router.get('/count', isAuthenticated , function (req, res) {
    res.json({ count: getRandomInt(101) });
    });


router.get('/', isAuthenticated , function (req, res) {

    res.render("notifications",
        {
            title: "Notifications",
            notifications: [
                {
                    message: "una notificacion",
                    date: "2021-10-10",
                },
                {
                    message: "otra notificacion",
                    date: "2021-10-11",
                },
                {
                    message: "una notificacion mas",
                    date: "2021-10-12",
                },]
            }
    );
    }
);

export default router;


function getRandomInt(max) {
    return Math.floor(Math.random() * max);
  }
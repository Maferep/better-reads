import { Router } from 'express';
import { isAuthenticated } from '../authenticate.js';
import authRouter from './authRouter.js';

const router = Router();

router.get('/', isAuthenticated, async function (req, res) {
  res.render("index", { username: req.session.user, loggedIn: true })
})

router.get('/', function (req, res) {
  res.redirect('login')
})

router.use(authRouter)

export default router;
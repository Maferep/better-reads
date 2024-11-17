import { Router } from 'express';
import { estaAutenticado, isAuthenticated } from '../authenticate.js';
import { getNotificationsForUserId, readNotification, 
    deleteAllNotificationsFromUser,
    deleteNotification, getCountOfNotificationsForUserId } from '../database/notificationDatabase.js';
import { getUsernameFromId } from '../database.js';


const router = Router();


router.get('/count', isAuthenticated , function (req, res) {
    res.json({ count: getCountOfNotificationsForUserId(req.session.userId) });
    });


router.get('/', isAuthenticated , function (req, res) {
    const notifications = getNotificationsForUserId(req.session.userId);

    console.log(notifications);

    
    const estaAutenticadoBool = estaAutenticado(req);

    res.render("notifications",
        {
            do_sidebar: estaAutenticadoBool,
            username: req.session.user,
            loggedIn: estaAutenticadoBool,
            title: "Notifications",
            notifications: parseNotifications(notifications)
            }
    );
    }
);


router.put('/read/:id', isAuthenticated , function (req, res) {
    readNotification(req.params.id);
    res.json({ success: true });
});


router.delete('', isAuthenticated , function (req, res) {
    deleteAllNotificationsFromUser(req.session.userId);
    res.json({ success: true });
});

router.delete('/:id', isAuthenticated , function (req, res) {
    deleteNotification(req.params.id);
    res.json({ success: true });
});


export default router;


function parseNotifications(notifications) {
    return notifications.map(notification => {
        const date = new Date(notification.date*1000);

        let link = null;

        switch (notification.type) {
            case 'like_milestone':
            case 'comment':
            case 'repost':
                link = `/post/${notification.post_id}`;
                break;
            case 'follow':
                const username = getUsernameFromId(notification.interaction_with_user_id);
                link = `/${username}/profile`;
                break;
            default:
                link = null;
                break;
        }

        

        return {
            id: notification.id,
            message: notification.message,
            date: date.toLocaleString(),
            link,
            read: notification.read
        }
    });
}


function getRandomInt(max) {
    return Math.floor(Math.random() * max);
  }
// middleware to test if authenticated
export function isAuthenticated (req, res, next) {
  if (req.session.user) next()
    else next('route')
}
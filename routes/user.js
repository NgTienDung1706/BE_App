const router = require('express').Router()
const ctrls = require('../controllers/user')

router.get('/getUserByUsername/:username', ctrls.getUserByUsername)
router.post('/login', ctrls.login);
router.post('/register', ctrls.register);
router.post('/verify', ctrls.verifyAccount);
router.post('/forgot-password', ctrls.forgotPassword);
router.post('/reset-password', ctrls.resetPassword);

module.exports = router
const { User } = require('../models'); // Import model User từ Sequelize
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { sendMail } = require('../utils/mail');

const getUserByUsername = async (req, res) => {
    const { username } = req.params;

    try {
        const user = await User.findOne({ where: { username }, attributes: { exclude: ['password'] } });
        
        if (!user) {
            return res.status(404).json({ message: 'Không tìm thấy người dùng' });
        }

        return res.status(200).json(user);
    } catch (error) {
        console.error('Lỗi khi lấy dữ liệu người dùng:', error);
        return res.status(500).json({ message: 'Đã xảy ra lỗi khi lấy dữ liệu người dùng' });
    }
};

const login = async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: 'Vui lòng cung cấp username và password' });
    }

    try {
        const user = await User.findOne({ where: { username } });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ message: 'Sai username hoặc password' });
        }
        const userData = user.toJSON();
        delete userData.password;
        return res.status(200).json({ message: 'Đăng nhập thành công', user: userData });
    } catch (error) {
        console.error('Lỗi khi đăng nhập:', error);
        return res.status(500).json({ message: 'Đã xảy ra lỗi, vui lòng thử lại sau' });
    }
};

const register = async (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
        return res.status(400).json({ message: 'Vui lòng cung cấp đầy đủ thông tin' });
    }

    try {
        const existingUser = await User.findOne({ where: { [Op.or]: [{ username }, { email }] } });
        if (existingUser) {
            return res.status(400).json({ message: 'Username hoặc email đã tồn tại' });
        }

        const otp = crypto.randomInt(100000, 999999).toString();
        const hashedPassword = await bcrypt.hash(password, 10);

        await User.create({ username, email, password: hashedPassword, otp, otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000) });
        await sendMail(email, 'Xác minh tài khoản', `Mã OTP của bạn là: ${otp}`);
        return res.status(200).json({ message: 'Đăng ký thành công. Vui lòng kiểm tra email để xác minh tài khoản.' });
    } catch (error) {
        console.error('Lỗi đăng ký:', error);
        return res.status(500).json({ message: 'Đã xảy ra lỗi, vui lòng thử lại.' });
    }
};

const verifyAccount = async (req, res) => {
    const { email, otp } = req.body;
    if (!email || !otp) {
        return res.status(400).json({ message: 'Vui lòng cung cấp email và mã OTP' });
    }

    try {
        const user = await User.findOne({ where: { email, otp } });
        if (!user) {
            return res.status(400).json({ message: 'Mã OTP không hợp lệ hoặc đã hết hạn' });
        }

        await user.update({ isVerified: true, otp: null, otpExpiresAt: null });
        return res.status(200).json({ message: 'Xác minh tài khoản thành công!' });
    } catch (error) {
        console.error('Lỗi xác minh tài khoản:', error);
        return res.status(500).json({ message: 'Đã xảy ra lỗi, vui lòng thử lại.' });
    }
};

const forgotPassword = async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ message: 'Vui lòng cung cấp email' });
    }

    try {
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(404).json({ message: 'Email không tồn tại' });
        }

        const otp = crypto.randomInt(100000, 999999).toString();
        await user.update({ otp });
        await sendMail(email, 'Quên mật khẩu', `Mã OTP của bạn là: ${otp}`);
        return res.status(200).json({ message: 'Đã gửi mã OTP đến email của bạn.' });
    } catch (error) {
        console.error('Lỗi quên mật khẩu:', error);
        return res.status(500).json({ message: 'Đã xảy ra lỗi, vui lòng thử lại.' });
    }
};

const resetPassword = async (req, res) => {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
        return res.status(400).json({ message: 'Vui lòng cung cấp đầy đủ thông tin' });
    }

    try {
        const user = await User.findOne({ where: { email, otp } });
        if (!user) {
            return res.status(400).json({ message: 'Mã OTP không hợp lệ' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await user.update({ password: hashedPassword, otp: null, otpExpiresAt: null });
        return res.status(200).json({ message: 'Đặt lại mật khẩu thành công.' });
    } catch (error) {
        console.error('Lỗi đặt lại mật khẩu:', error);
        return res.status(500).json({ message: 'Đã xảy ra lỗi, vui lòng thử lại.' });
    }
};

module.exports = {
    getUserByUsername,
    login,
    register,
    verifyAccount,
    forgotPassword,
    resetPassword
};

const { sql, pool, poolConnect } = require('../config/SqlServer');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { sendMail } = require('../utils/mail');
// API lấy thông tin người dùng dựa trên username
const getUserByUsername = async (req, res) => {
    const { username } = req.params;  // Lấy username từ URL parameter

    try {
        // Truy vấn người dùng từ cơ sở dữ liệu chỉ lấy những cột cần thiết
        const result = await sql.query`SELECT * FROM [User] WHERE username = ${username}`;

        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy người dùng' });
        }

        // Lấy thông tin người dùng từ kết quả truy vấn
        const user = result.recordset[0];

        // Trả về dữ liệu người dùng
        return res.status(200).json(user);
    } catch (err) {
        console.error('Lỗi khi lấy dữ liệu người dùng:', err);
        return res.status(500).json({ message: 'Đã xảy ra lỗi khi lấy dữ liệu người dùng' });
    }
};



const login = async (req, res) => {
    const { username, password } = req.body;

    // Kiểm tra đầu vào
    if (!username || !password) {
        return res.status(400).json({ message: 'Vui lòng cung cấp username và password' });
    }

    try {
        await pool.connect(); // Đảm bảo kết nối pool
        const result = await pool.request()
            .input('username', sql.NVarChar, username)
            .query('SELECT * FROM [User] WHERE username = @username');

        // Kiểm tra nếu không tìm thấy người dùng
        if (result.recordset.length === 0) {
            return res.status(401).json({ message: 'Sai username hoặc password' });
        }

        const user = result.recordset[0];

        // So sánh mật khẩu nhập vào với mật khẩu được hash trong cơ sở dữ liệu
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Sai username hoặc password' });
        }

        // Xóa mật khẩu trước khi trả về thông tin người dùng
        delete user.password;

        return res.status(200).json({ message: 'Đăng nhập thành công', user });
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
        await pool.connect();

        // Kiểm tra trùng lặp email hoặc username
        const checkUser = await pool.request()
            .input('username', sql.NVarChar, username)
            .input('email', sql.NVarChar, email)
            .query('SELECT * FROM [User] WHERE username = @username OR email = @email');

        if (checkUser.recordset.length > 0) {
            return res.status(400).json({ message: 'Username hoặc email đã tồn tại' });
        }

        // Tạo OTP và mã hóa mật khẩu
        const otp = crypto.randomInt(100000, 999999).toString();
        const hashedPassword = await bcrypt.hash(password, 10);

        // Lưu thông tin vào DB
        await pool.request()
            .input('username', sql.NVarChar, username)
            .input('email', sql.NVarChar, email)
            .input('password', sql.NVarChar, hashedPassword)
            .input('otp', sql.NVarChar, otp)
            .input('otpExpiresAt', sql.DateTime, new Date(Date.now() + 10 * 60 * 1000)) // 10 phút
            .query('INSERT INTO [User] (username, email, password, otp, otpExpiresAt) VALUES (@username, @email, @password, @otp, @otpExpiresAt)');

        // Gửi email OTP
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
        await pool.connect();

        // Kiểm tra OTP
        const result = await pool.request()
            .input('email', sql.NVarChar, email)
            .input('otp', sql.NVarChar, otp)
            .query('SELECT * FROM [User] WHERE email = @email AND otp = @otp');

        if (result.recordset.length === 0) {
            return res.status(400).json({ message: 'Mã OTP không hợp lệ hoặc đã hết hạn' });
        }

        // Cập nhật trạng thái xác minh
        await pool.request()
            .input('email', sql.NVarChar, email)
            .query('UPDATE [User] SET isVerified = 1, otp = NULL, otpExpiresAt = NULL WHERE email = @email');

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
        await pool.connect();

        // Kiểm tra email
        const result = await pool.request()
            .input('email', sql.NVarChar, email)
            .query('SELECT * FROM [User] WHERE email = @email');

        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'Email không tồn tại' });
        }

        // Tạo OTP
        const otp = crypto.randomInt(100000, 999999).toString();

        // Lưu OTP vào DB
        await pool.request()
            .input('email', sql.NVarChar, email)
            .input('otp', sql.NVarChar, otp)
            .query('UPDATE [User] SET otp = @otp WHERE email = @email');

        // Gửi email OTP
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
        await pool.connect();

        // Kiểm tra OTP
        const result = await pool.request()
            .input('email', sql.NVarChar, email)
            .input('otp', sql.NVarChar, otp)
            .query('SELECT * FROM [User] WHERE email = @email AND otp = @otp');

        if (result.recordset.length === 0) {
            return res.status(400).json({ message: 'Mã OTP không hợp lệ' });
        }

        // Cập nhật mật khẩu
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await pool.request()
            .input('email', sql.NVarChar, email)
            .input('password', sql.NVarChar, hashedPassword)
            .query('UPDATE [User] SET password = @password, otp = NULL, otpExpiresAt = NULL WHERE email = @email');

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

//Hmm
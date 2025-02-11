const { Sequelize } = require('sequelize');
require('dotenv').config(); // Đọc biến môi trường từ .env

// Tạo kết nối Sequelize
const sequelize = new Sequelize(process.env.DB_DATABASE, process.env.DB_USER, process.env.DB_PASSWORD, {
    host: process.env.DB_SERVER,
    dialect: 'mssql',
    port: parseInt(process.env.DB_PORT, 10),
    dialectOptions: {
        options: {
            encrypt: false, // Nếu có SSL thì bật true
            enableArithAbort: true,
        },
    },
    pool: {
        max: 100,
        idle: 300000,
    },
    logging: false, // Tắt log query trong console
});

// Kiểm tra kết nối
const testConnection = async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ Kết nối SQL Server thành công!');
    } catch (error) {
        console.error('❌ Kết nối thất bại:', error);
    }
};

testConnection();

module.exports = sequelize;

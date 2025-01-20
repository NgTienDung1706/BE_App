const sql = require('mssql');
require('dotenv').config();  // Để sử dụng biến môi trường từ file .env

// Cấu hình kết nối
const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    driver: process.env.DB_DRIVER,
    port: parseInt(process.env.DB_PORT, 10),  // Chuyển đổi từ chuỗi sang số
    options: {
        encrypt: false,  // Nếu bạn sử dụng SSL để kết nối
        enableArithAbort: false,
    },
    connectionTimeout: 300000,
    requestTimeout: 300000,
    pool: {
        idleTimeoutMillis: 300000,
        max: 100,
    },
};

const pool = new sql.ConnectionPool(config);
const poolConnect = pool.connect(); // Quản lý kết nối

// Kiểm tra kết nối
pool.on('error', err => {
    console.error('SQL Pool Error:', err);
});

module.exports = {
    sql,          // Để sử dụng các phương thức của mssql
    pool,         // Đối tượng pool để gửi query
    poolConnect,  // Promise đảm bảo kết nối
};
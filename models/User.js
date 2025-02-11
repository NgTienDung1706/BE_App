const { DataTypes } = require('sequelize');
const sequelize = require('../config/SqlServer');

const User = sequelize.define('User', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    username: { type: DataTypes.STRING },
    email: { type: DataTypes.STRING },
    password: { type: DataTypes.STRING },
    isVerified: { type: DataTypes.BOOLEAN }, 
    otp: { type: DataTypes.STRING(6) },
    otpExpiresAt: { type: DataTypes.DATE }
  }, {
    tableName: 'User', // Không dùng "dbo.User" ở đây
    schema: 'dbo', // Thêm schema dbo
    timestamps: false
  });
  

module.exports = User;

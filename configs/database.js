const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: 'mysql',
    logging: false,
  }
);

sequelize.query("SET GLOBAL max_allowed_packet = 67108864")
  .then(() => console.log('Đã cập nhật max_allowed_packet'))
  .catch(err => console.error('Lỗi khi cập nhật max_allowed_packet:', err));

module.exports = sequelize;

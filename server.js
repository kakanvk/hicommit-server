const express = require('express');
const http = require('http');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const { initializeSocket } = require('./socket');

const app = express();
const server = http.createServer(app);

// Khởi tạo socket.io với server
initializeSocket(server);

const sequelize = require('./configs/database');
const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/authRoutes');
const postRoutes = require('./routes/postRoutes');
const courseRoutes = require('./routes/courseRoutes');
const problemRoutes = require('./routes/problemRoutes');
const submissionRoutes = require('./routes/submissionRoutes');
const adminRoutes = require('./routes/adminRoutes');

// Tăng giới hạn kích thước payload cho JSON
app.use(bodyParser.json({ limit: '20mb' }));

// Tăng giới hạn kích thước payload cho URL-encoded
app.use(bodyParser.urlencoded({ limit: '20mb', extended: true }));

app.use(cookieParser());

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}));

// [ADMIN]
app.use('/admin', adminRoutes);

// [USER]
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/posts', postRoutes);
app.use('/courses', courseRoutes);
app.use('/problems', problemRoutes);
app.use('/submissions', submissionRoutes);

const port = 5174;
sequelize.sync({ alter: false })
  .then(() => {
    server.listen(port, () => {
      console.log(`Server is running on http://localhost:${port}`);
    });
  })
  .catch(err => {
    console.error('Unable to connect to the database:', err);
  });

const express = require("express");
const cors = require("cors");
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth.routes');
const pollRoutes = require('./routes/poll.routes');
const voteRoutes = require('./routes/vote.routes');
const resultRoutes = require('./routes/result.routes');


const app = express();

app.use(helmet());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: process.env.CORS_ORIGIN }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 100, 
  message: 'Too many requests from this IP, please try again later',
});

app.use('/api/', limiter);

app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});


app.use('/api/auth', authRoutes);
app.use("/api/polls", pollRoutes);
app.use('/api/votes', voteRoutes);
app.use('/api/results', resultRoutes);



app.get("/", (req, res) => {
  res.send(" API is running and connected to MongoDB!");
});

app.use(errorHandler);

module.exports = app;

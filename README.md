# Real-Time Polling System - Backend

A production-ready real-time polling system built with Node.js, Express, MongoDB, Redis, and Socket.IO.

##  Features

- **Authentication**: JWT-based authentication for organizers
- **Poll Management**: Create, start, pause, end, and delete polls
- **Real-time Updates**: Live vote counting using Socket.IO and Redis Pub/Sub
- **Async Processing**: Background job processing with BullMQ
- **Multiple Question Types**: Single-choice, multiple-choice, and text questions
- **Live Results**: Real-time results display for participants
- **Export Data**: Export poll results as CSV
- **Security**: Helmet, CORS, rate limiting, and input validation

##  Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or Atlas)
- Redis (local or cloud)
- npm or yarn

##  Installation

### 1. Clone and Install Dependencies

```bash
git clone https://github.com/mohammedarshath2705/Polling-System-Backend.git
cd polling-system-backend
npm install
```

### 2. Set Up Environment Variables

Create a `.env` file in the root directory:

```env
# Server
PORT=5000
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/polling-system

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRE=7d

# CORS
CORS_ORIGIN=http://localhost:3000
```

### 3. Start MongoDB and Redis

**Local Installation**

Make sure MongoDB and Redis are installed and running on your system.

### 4. Run the Application

```bash
# Development mode with auto-reload
npm run dev

# In a separate terminal, start the worker
npm run worker
```

## Project Structure

```
backend/
├── src/
│   ├── config/           # Database and Redis configuration
│   ├── models/           # Mongoose schemas
│   ├── middleware/       # Authentication and error handling
│   ├── controllers/      # Request handlers
│   ├── routes/           # API routes
│   ├── queue/            # BullMQ job queue setup
│   ├── utils/            # Helper functions
│   ├── app.js            # Express app configuration
│   ├── socket.js         # Socket.IO setup
│   └── server.js         # Server entry point
├── .env                  # Environment variables
└── package.json
```

## API Endpoints

### Authentication

```
POST   /api/auth/signup      - Register new organizer
POST   /api/auth/login       - Login organizer
GET    /api/auth/me          - Get current organizer (protected)
```

### Polls

```
POST   /api/polls            - Create new poll (protected)
GET    /api/polls            - Get all polls for organizer (protected)
GET    /api/polls/:id        - Get poll by ID (protected)
GET    /api/polls/join/:code - Get poll by join code (public)
PUT    /api/polls/:id        - Update poll (protected)
DELETE /api/polls/:id        - Delete poll (protected)
POST   /api/polls/:id/start  - Start poll (protected)
POST   /api/polls/:id/pause  - Pause poll (protected)
POST   /api/polls/:id/end    - End poll (protected)
```

### Votes

```
POST   /api/votes                        - Submit vote (public)
GET    /api/votes/check/:pollId/:sessionId - Check if voted (public)
```

### Results

```
GET    /api/results/:pollId          - Get poll results (protected)
GET    /api/results/live/:joinCode   - Get live results (public)
GET    /api/results/:pollId/export   - Export results as CSV (protected)
```

## Socket.IO Events

### Client → Server

```javascript
socket.emit('join-poll', joinCode);  // Join poll room
socket.emit('leave-poll', joinCode); // Leave poll room
```

### Server → Client

```javascript
socket.on('vote-update', (data) => {
  // { totalVotes, questions: [...] }
});

socket.on('poll-status', (data) => {
  // { type: 'POLL_STARTED|POLL_PAUSED|POLL_ENDED', pollId }
});
```

## Testing API with Postman

### 1. Register Organizer

```
POST http://localhost:5000/api/auth/signup
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "organization": "My Company"
}
```

### 2. Create Poll

```
POST http://localhost:5000/api/polls
Authorization: Bearer <your-jwt-token>
Content-Type: application/json

{
  "title": "Product Feedback Survey",
  "description": "Help us improve",
  "questions": [
    {
      "questionText": "How satisfied are you?",
      "type": "single-choice",
      "options": [
        { "text": "Very Satisfied" },
        { "text": "Satisfied" },
        { "text": "Neutral" },
        { "text": "Dissatisfied" }
      ]
    }
  ],
  "settings": {
    "allowAnonymous": true,
    "showResultsLive": true,
    "allowMultipleResponses": false
  }
}
```

### 3. Start Poll

```
POST http://localhost:5000/api/polls/<poll-id>/start
Authorization: Bearer <your-jwt-token>
```

### 4. Submit Vote (as participant)

```
POST http://localhost:5000/api/votes
Content-Type: application/json

{
  "pollId": "<poll-id>",
  "sessionId": "unique-session-id",
  "answers": [
    {
      "questionId": "<question-id>",
      "selectedOptions": ["<option-id>"]
    }
  ]
}
```

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt with salt rounds
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Helmet**: Security headers
- **Input Validation**: Comprehensive validation on all inputs
- **CORS**: Configurable cross-origin resource sharing

## Background Jobs

The system uses BullMQ for async vote processing:

1. When a vote is submitted, it's added to a queue
2. A separate worker process handles vote counting
3. Results are published via Redis Pub/Sub
4. Socket.IO broadcasts updates to connected clients

### Manual Deployment

1. Set up MongoDB and Redis (cloud or self-hosted)
2. Update `.env` with production credentials
3. Build and start:

```bash
npm install --production
npm start
```

4. Use PM2 for process management:

```bash
npm install -g pm2
pm2 start src/server.js --name polling-api
pm2 start src/queue/worker.js --name polling-worker
```

##  Environment Variables Explained

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 5000 |
| `NODE_ENV` | Environment mode | development |
| `MONGODB_URI` | MongoDB connection string | localhost |
| `REDIS_HOST` | Redis host | localhost |
| `REDIS_PORT` | Redis port | 6379 |
| `JWT_SECRET` | Secret key for JWT | required |
| `JWT_EXPIRE` | Token expiration time | 7d |
| `CORS_ORIGIN` | Allowed origins | * |

## Notes

- Always run both the API server and worker in production
- Redis is required for real-time features and job queue
- Use MongoDB Atlas for production database
- Consider using Redis Cloud for production Redis
- Rate limiting can be adjusted in `src/app.js`

## Troubleshooting

**MongoDB Connection Error**
```
Make sure MongoDB is running and MONGODB_URI is correct
```

**Redis Connection Error**
```
Check if Redis is running: redis-cli ping
Should return: PONG
```

**Worker Not Processing Jobs**
```
Make sure worker is running: npm run worker
Check Redis connection in worker logs
```

## License

MIT License - feel free to use this project for any purpose.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

---

Built with ❤️ using Node.js, Express, MongoDB, Redis, and Socket.IO

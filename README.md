# Streaming Platform 🎥

A full-stack live streaming and video sharing platform built with React, Express, PostgreSQL, and Socket.io. Stream live with OBS using RTMP to HLS conversion, chat in real-time, and share videos with the community.

## Features ✨

- **Live Streaming** 🔴 - Stream from OBS using RTMP with automatic HLS conversion via nginx-rtmp
- **Video Upload & Sharing** 📹 - Upload, manage, and share videos with other users
- **Real-Time Chat** 💬 - Private user-to-user messaging and live stream chat with Socket.io
- **User Authentication** 🔐 - OAuth2 support (Google, Microsoft, Discord) + email/password auth
- **User Profiles** 👤 - Customizable profiles with following system
- **Control Panel** 🎛️ - Dashboard for managing streams, videos, and account settings
- **Responsive Design** 📱 - Works seamlessly on desktop and mobile devices
- **HLS Streaming** 📡 - Adaptive bitrate streaming compatible with all browsers (via hls.js)

## Tech Stack 🛠️

**Frontend:**
- React 18
- React Router v6
- Socket.io Client (real-time communication)
- hls.js (HLS video player)
- Recharts (analytics/charts)
- React Icons

**Backend:**
- Node.js + Express
- PostgreSQL
- Socket.io (WebSocket server)
- Passport.js (OAuth authentication)
- JWT (authentication tokens)
- node-pg-migrate (database migrations)
- Multer (file uploads)
- node-cron (scheduled tasks)

**Infrastructure:**
- Docker & Docker Compose
- nginx-rtmp (RTMP server + HLS converter)
- PostgreSQL 16

## Project Structure 📁

```
streaming-platform/
├── backend/              # Express API server
│   ├── src/
│   │   ├── app.js       # Express app setup
│   │   ├── server.js    # Server entry point + Socket.io
│   │   ├── db/          # Database repositories
│   │   ├── routes/      # API endpoints
│   │   ├── middleware/  # Auth & CORS middleware
│   │   ├── socket.js    # Socket.io event handlers
│   │   ├── cron/        # Scheduled tasks
│   │   └── utils/       # Utilities (auth, validation)
│   ├── Dockerfile
│   └── package.json
├── frontend/            # React web application
│   ├── public/
│   ├── src/
│   │   ├── pages/       # Page components (Login, Profile, Stream, etc)
│   │   ├── features/    # Feature components (NavBar, Sidebar, Chat)
│   │   ├── context/     # React context (ChatProvider)
│   │   ├── services/    # API & auth services
│   │   ├── App.js       # Main router
│   │   └── index.js
│   ├── Dockerfile
│   └── package.json
├── nginx-rtmp/          # nginx-rtmp configuration
│   ├── nginx.direct-hls.conf
│   └── (HLS output directory)
├── docker-compose.yml   # Development environment
├── docker-compose.prod.yml # Production environment
└── README.md

```

## Quick Start 🚀

### Prerequisites
- Docker & Docker Compose
- OBS Studio (for streaming)
- Node.js 18+ (optional, for local development)

### Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/snxwisalive/streaming-platform.git
   cd streaming-platform
   ```

2. **Create environment file**
   ```bash
   cp .env.example .env
   ```
   Configure the following variables:
   ```
   JWT_SECRET=your_jwt_secret_here
   BACKEND_URL=http://localhost:5000/api
   
   # OAuth (optional)
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   MICROSOFT_CLIENT_ID=your_microsoft_client_id
   MICROSOFT_CLIENT_SECRET=your_microsoft_client_secret
   DISCORD_CLIENT_ID=your_discord_client_id
   DISCORD_CLIENT_SECRET=your_discord_client_secret
   
   # Email service (Resend)
   RESEND_API_KEY=your_resend_api_key
   ```

3. **Start services**
   ```bash
   docker-compose up --build
   ```

4. **Access the application**
   - Frontend: `http://localhost:3000`
   - Backend API: `http://localhost:5000/api`
   - PostgreSQL: `localhost:5432`

### Database Migrations

Run migrations to set up database schema:
```bash
docker-compose exec backend npm run migrate:up
```

## Live Streaming with OBS 🔴

### Configuration

1. **Start the Docker services**
   ```bash
   docker-compose up --build
   ```

2. **Open OBS Studio**

3. **Configure Stream Settings:**
   - **Service:** Custom
   - **Server:** `rtmp://localhost:1935/stream`
   - **Stream Key:** `stream`

4. **Start Streaming**
   - Click "Start Streaming" in OBS
   - HLS playlist will be available at: `http://localhost:8081/hls/stream.m3u8`

5. **Watch the Stream**
   - Go to `http://localhost:3000/live` in the frontend
   - The video player will automatically play the live stream

### How It Works

```
OBS (RTMP) → nginx-rtmp (RTMP Server) → HLS Conversion → hls.js Player
                                    ↓
                                /tmp/hls/ (HLS segments)
```

- **nginx-rtmp** receives RTMP stream from OBS on port `1935`
- Automatically converts to HLS (HTTP Live Streaming) format
- Stores HLS fragments (.ts files) in `/tmp/hls/`
- Frontend uses **hls.js** to play the HLS stream over HTTP

### Troubleshooting

- **Can't connect from OBS?** Check if RTMP server is running: `docker ps`
- **No video in player?** Ensure `REACT_APP_STREAM_URL` points to correct HLS endpoint
- **Video stuttering?** Check nginx-rtmp logs: `docker logs nginx-rtmp`

## API Routes 🔌

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/logout` - Logout
- `GET /api/auth/oauth/:provider/callback` - OAuth callback

### Users
- `GET /api/users/me` - Get current user
- `GET /api/users/:userId` - Get user profile
- `PUT /api/users/profile` - Update profile
- `DELETE /api/users/account` - Delete account

### Videos
- `GET /api/videos` - List all videos
- `POST /api/videos/upload` - Upload video
- `GET /api/videos/:videoId` - Get video details
- `DELETE /api/videos/:videoId` - Delete video

### Streams
- `GET /api/streams` - List active streams
- `GET /api/streams/:userId` - Get user's stream

### Chat
- `GET /api/chats` - List user chats
- `POST /api/chats/:userId/messages` - Send message
- `GET /api/chats/:chatId/messages` - Get messages

*See backend routes for complete API documentation*

## Real-Time Features 🔄

### Socket.io Events

**Private Chat:**
- `join_chat(chatId)` - Join private chat room
- `send_message({chatId, senderId, text})` - Send message
- `new_message(message)` - Receive message

**Stream Chat:**
- `join_stream_chat(streamUserId)` - Join stream chat
- `stream_chat_message({streamUserId, text, token})` - Send stream chat message
- `leave_stream_chat(streamUserId)` - Leave stream chat

## Database Schema 🗄️

### Core Tables
- **users** - User accounts, profiles, OAuth data
- **videos** - Uploaded videos metadata
- **streams** - Active stream sessions
- **messages** - Private messages between users
- **stream_chat_messages** - Public stream chat messages
- **chats** - Conversation threads

*See backend migrations for complete schema*

## Authentication Flow 🔐

### Email/Password
```
User Input → Hash Password (bcrypt) → Store in DB → JWT Token → Local Storage
```

### OAuth (Google, Microsoft, Discord)
```
User Clicks OAuth Login → Redirect to Provider → Provider Callback → Create/Link User → JWT Token
```

### JWT Protection
- Tokens stored in localStorage
- Included in API requests (Authorization header)
- Verified on backend for protected routes
- Auto-logout on token expiration

## Deployment 🚀

### Production Build

1. **Update environment variables**
   ```bash
   cp .env.example .env.production
   # Edit with production values
   ```

2. **Build and deploy**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d --build
   ```

3. **SSL/TLS**
   - Use reverse proxy (nginx, Cloudflare) for HTTPS
   - Configure CORS and allowed origins in .env

### Scaling Considerations
- Use managed PostgreSQL for database
- Configure Redis for session management (optional)
- Set up CDN for video delivery
- Use load balancer for multiple backend instances

## Project Pages 📄

### Available Routes

| Path | Description |
|------|-------------|
| `/` | Home/Landing page |
| `/login` | Email/password login |
| `/register` | New user registration |
| `/password-reset` | Password recovery flow |
| `/profile/:userId` | User profile page |
| `/settings` | Account settings |
| `/live` | Live stream viewer |
| `/stream/:userId` | Individual user stream |
| `/upload` | Video upload page |
| `/controlpanel` | Admin/user dashboard |
| `/chat` | Private messaging |

## Troubleshooting 🔧

### Common Issues

**Backend won't start**
- Check .env file is configured
- Verify PostgreSQL is running: `docker ps`
- Check logs: `docker logs app-backend`

**Frontend can't connect to API**
- Verify REACT_APP_API_URL in .env
- Check backend is running on port 5000
- Check CORS settings

**Live stream not working**
- Verify RTMP server running: `docker logs nginx-rtmp`
- Check OBS connection to `rtmp://localhost:1935/stream`
- Verify HLS path: `http://localhost:8081/hls/stream.m3u8`

**Database issues**
- Reset database: `docker compose down -v && docker compose up --build`
- Check migrations: `docker compose exec backend npm run migrate:up`

**Socket.io connection failed**
- Check CORS origin in backend/src/app.js
- Verify backend and frontend are on same network
- Check browser console for connection errors

## Development Notes 📝

- Backend uses **ESM** (ES Modules) - `"type": "module"` in package.json
- Frontend uses Create React App with custom webpack config (if needed)
- All API endpoints require authentication except login/register/public pages
- Real-time events use Socket.io with JWT verification
- File uploads stored in `/uploads` directory (backend)
- HLS stream fragments stored in `/tmp/hls` (nginx-rtmp container)

## Environment Variables 🔑

```
# Server
NODE_ENV=development
PORT=5000
HOST=0.0.0.0

# Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=streaming_platform

# JWT
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=7d

# Frontend
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_STREAM_URL=http://localhost:8081/hls

# CORS
CORS_ORIGIN=*

# OAuth (Google, Microsoft, Discord)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=

# Email Service
RESEND_API_KEY=
```

## Contributing 🤝

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push and create a Pull Request

## License 📄

This project is open source and available under the MIT License.

## Support 💬

For issues, questions, or suggestions:
- Open an issue on GitHub
- Check existing documentation
- Review Socket.io and Express.js documentation
# ServiceEase Application

A full-stack application for service management.

## Project Structure

```
serviceease/
├── client/                 # Frontend application
│   ├── public/            # Static assets
│   │   ├── images/
│   │   └── index.html
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── pages/        # Page components
│   │   ├── assets/       # Images and other assets
│   │   ├── styles/       # CSS files
│   │   └── js/           # JavaScript utilities
│   └── package.json      # Frontend dependencies
│
├── server/                # Backend application
│   ├── config/           # Configuration files
│   ├── models/           # Database models
│   ├── routes/           # API routes
│   ├── middleware/       # Custom middleware
│   └── index.js          # Server entry point
│
└── package.json          # Root package.json
```

## Setup

### 1. Database Setup

Import the database schema:

```bash
# In MySQL Workbench or MySQL CLI
mysql -u root -p < serviceease_export.sql
```

This will create the `serviceease` database with all required tables.

### 2. Environment Configuration

Copy the example environment file and configure your settings:

```bash
cd server
cp .env.example .env
```

Edit `server/.env` with your credentials:
- `DB_PASSWORD` - Your MySQL password
- `CLOUDINARY_*` - Your Cloudinary credentials for image uploads
- `MAILJET_*` - Your Mailjet API keys for email notifications
- `JWT_SECRET` - A secure random string for token generation

### 3. Install Dependencies

```bash
npm install                      # Install root dependencies
cd client && npm install         # Install frontend dependencies
cd ../server && npm install      # Install backend dependencies
```

### 4. Start the Application

```bash
# From root directory
npm start         # Starts both frontend and backend
```

Or run separately:

```bash
# Terminal 1 - Backend
cd server
node index.js

# Terminal 2 - Frontend  
cd client
npm start
```

## Development

- Frontend runs on http://localhost:3000
- Backend API runs on http://localhost:3000 (same port, Express serves both)
- Backend API runs on http://localhost:5000

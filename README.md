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

1. Install dependencies:

```bash
npm install        # Install root dependencies
cd client && npm install  # Install frontend dependencies
cd ../server && npm install  # Install backend dependencies
```

2. Start the application:

```bash
# In root directory
npm start         # Starts both frontend and backend
```

## Development

- Frontend runs on http://localhost:3000
- Backend API runs on http://localhost:5000

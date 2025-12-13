#!/bin/bash
# Render build script for ServiceEase

echo "Installing Python dependencies..."
pip install -r server/scripts/requirements.txt

echo "Installing Node.js dependencies..."
npm install
cd server && npm install
cd ..

echo "Build completed successfully!"

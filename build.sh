#!/bin/bash
# Render build script for ServiceEase

echo "Installing Python dependencies..."
pip install -r server/scripts/requirements.txt

echo "Installing Node.js dependencies..."
cd server && yarn

echo "Build completed successfully!"

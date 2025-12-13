#!/bin/bash
# Render build script for ServiceEase

echo "Installing Python dependencies..."
pip install -r scripts/requirements.txt

echo "Installing Node.js dependencies..."
yarn

echo "Build completed successfully!"

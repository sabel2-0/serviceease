#!/bin/bash
echo "=== Testing Server Connectivity ==="

echo "1. Testing basic server response:"
curl -s -w "Status: %{http_code}\n" http://localhost:3000/ || echo "Connection failed"

echo -e "\n2. Testing coordinator login:"
curl -s -w "Status: %{http_code}\n" \
  -H "Content-Type: application/json" \
  -d '{"email":"markivan.night@gmail.com","password":"password123"}' \
  http://localhost:3000/api/coordinator/auth/login || echo "Login request failed"

echo -e "\n3. Testing invalid endpoint:"
curl -s -w "Status: %{http_code}\n" http://localhost:3000/api/test || echo "Test request failed"
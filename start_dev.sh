#!/bin/bash
# ILES Local Development Startup Script
set -e

echo "Starting ILES — Internship Logging & Evaluation System"
echo "======================================================="

# Backend
echo ""
echo "[1/3] Setting up backend..."
cd backend
pip install -r requirements.txt -q
python manage.py migrate --run-syncdb
python manage.py seed_demo 2>/dev/null || echo "  (demo data already seeded)"

echo ""
echo "[2/3] Starting Django server on http://localhost:8000 ..."
python manage.py runserver 0.0.0.0:8000 &
DJANGO_PID=$!

# Frontend
echo ""
echo "[3/3] Starting React frontend on http://localhost:5173 ..."
cd ../frontend
npm install -q
npm run dev &
VITE_PID=$!

echo ""
echo "======================================================="
echo "ILES is running!"
echo "  Frontend: http://localhost:5173"
echo "  Backend:  http://localhost:8000"
echo "  Admin:    http://localhost:8000/admin"
echo ""
echo "Demo accounts (password: Demo@1234):"
echo "  admin / alice / bob / john_sup / dr_peter"
echo ""
echo "Press Ctrl+C to stop both servers."
echo "======================================================="

wait $DJANGO_PID $VITE_PID

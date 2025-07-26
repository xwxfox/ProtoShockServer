#!/bin/bash

PING_ENDPOINT_URL="http://localhost:3000/api/ping"
PING_RESPONSE='{"message":"Pong"}'
WEB_PORT=3000
SOCKET_PORT=8880
WORKING_DIR=${PWD}

echo "Starting ProtoShock Server..."
echo "Working directory: $WORKING_DIR"

start_socket() {
    echo "Starting socket server..."
    cd $WORKING_DIR/apps/socket
    npm run start &
    SOCKET_PID=$!
    echo "Socket server started with PID $SOCKET_PID"
}

start_web() {
    echo "Starting web server..."
    cd $WORKING_DIR/apps/web
    npm run start &
    WEB_PID=$!
    echo "Web server started with PID $WEB_PID"
}

start_socket
start_web

echo "Waiting for services to start..."
echo "Socket PID: $SOCKET_PID"
echo "Web PID: $WEB_PID"

# Wait 10 seconds before first health check
sleep 10

check_web() {
    curl -s $PING_ENDPOINT_URL | grep -q "$PING_RESPONSE" || return 1
}

check_socket() {
    kill -0 $SOCKET_PID 2>/dev/null
}

kill_socket() {
    echo "Killing socket process..."

    if [ ! -z "$SOCKET_PID" ]; then
        echo "Killing npm process $SOCKET_PID and its children..."
        pkill -P $SOCKET_PID 2>/dev/null || true
        kill $SOCKET_PID 2>/dev/null || true
    fi
    
        # Kill any processes using port (multiple approaches)
    echo "Killing processes on port $SOCKET_PORT..."

    # Try with lsof first
    if command -v lsof >/dev/null 2>&1; then
        lsof -ti:$SOCKET_PORT | xargs kill -9 2>/dev/null || true
    fi
    
    # Try with netstat as backup
    if command -v netstat >/dev/null 2>&1; then
        netstat -tlnp 2>/dev/null | grep ":$SOCKET_PORT " | awk '{print $7}' | cut -d'/' -f1 | xargs kill -9 2>/dev/null || true
    fi
    
    # Kill any node processes that might be Next.js
    pkill -f "next start" 2>/dev/null || true
    pkill -f "next-server" 2>/dev/null || true
    
    echo "Waiting for port to be freed..."
    sleep 5
    
    # Final check - if port is still in use, wait longer
    for i in {1..10}; do
        if ! netstat -ln 2>/dev/null | grep -q ":$SOCKET_PORT " && ! ss -ln 2>/dev/null | grep -q ":$SOCKET_PORT "; then
            echo "Port $SOCKET_PORT is now free"
            break
        fi
        echo "Port $SOCKET_PORT still in use, waiting... (attempt $i/10)"
        sleep 2
    done
}

kill_web() {
    echo "Killing web processes..."
    # Kill the npm process and all its children

    if [ ! -z "$WEB_PID" ]; then
        echo "Killing npm process $WEB_PID and its children..."
        pkill -P $WEB_PID 2>/dev/null || true
        kill $WEB_PID 2>/dev/null || true
    fi
    
    # Kill any processes using port (multiple approaches)
    echo "Killing processes on port $WEB_PORT..."

    # Try with lsof first
    if command -v lsof >/dev/null 2>&1; then
        lsof -ti:$WEB_PORT | xargs kill -9 2>/dev/null || true
    fi
    
    # Try with netstat as backup
    if command -v netstat >/dev/null 2>&1; then
        netstat -tlnp 2>/dev/null | grep ":$WEB_PORT " | awk '{print $7}' | cut -d'/' -f1 | xargs kill -9 2>/dev/null || true
    fi
    
    # Kill any node processes that might be Next.js
    pkill -f "next start" 2>/dev/null || true
    pkill -f "next-server" 2>/dev/null || true
    
    echo "Waiting for port to be freed..."
    sleep 5
    
    # Final check - if port is still in use, wait longer
    for i in {1..10}; do
        if ! netstat -ln 2>/dev/null | grep -q ":$WEB_PORT " && ! ss -ln 2>/dev/null | grep -q ":$WEB_PORT "; then
            echo "Port $WEB_PORT is now free"
            break
        fi
        echo "Port $WEB_PORT still in use, waiting... (attempt $i/10)"
        sleep 2
    done
}

while true; do
    # Check web
    if ! check_web; then
        echo "Web not responding, restarting..."
        kill_web
        
        start_web
        
        # Wait and verify it started successfully
        sleep 15
        if ! check_web; then
            echo "Web failed to start properly, will retry on next cycle"
        else
            echo "Web restarted successfully"
        fi
    fi

    # Check CCHP
    if ! check_socket; then
        echo "Socket server not running, restarting..."
        kill_socket

        start_socket

        echo "New Socket PID: $SOCKET_PID"

        # Wait and verify it started successfully
        sleep 15

        if ! check_socket; then
            echo "Socket server failed to start properly, will retry on next cycle"
        else
            echo "Socket server restarted successfully"
        fi
    fi

    sleep 60  # Check every minute
done
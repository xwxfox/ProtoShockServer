#!/usr/bin/env bash
# script to run / manage every service in the protoshock server, also runs health checks etc to make sure everything works, and restarts services if not.
# --- Configuration ---
set -o pipefail # Fail a pipeline if any command fails.

PING_ENDPOINT_URL="http://localhost:3000/api/ping"
PING_RESPONSE='{"message":"Pong"}'
WEB_PORT=3000
SOCKET_PORT=8880

# Get the script's directory for robust paths
SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

# Use associative arrays to track process info
declare -A PIDS
declare -A PGIDS
cd ./packages/database && npm run migrate && cd "$SCRIPT_DIR"

rm -rf ./apps/web/.env.production
rm -rf ./apps/socket/.env.production
rm -rf ./packages/database/.env.production
rm -rf ./shared/magic.db
cp ./.socket.production.env ./apps/socket/.env.production
cp ./.web.production.env ./apps/web/.env.production
cp ./.database.production.env ./packages/database/.env.production
cp ./shared/_magic.db ./shared/magic.db
# --- Universal Cleanup Function ---
cleanup() {
    # Disable the trap to prevent recursive calls during cleanup
    trap - SIGINT SIGTERM EXIT

    echo -e "\nSignal caught, initiating cleanup..."
    # The kill_service function now contains all the waiting logic.
    kill_service "web" "${PGIDS['web']}" "$WEB_PORT"
    kill_service "socket" "${PGIDS['socket']}" "$SOCKET_PORT"
    echo "✅ Cleanup complete. ProtoShock Server stopped."

    # Explicitly exit the script with a success code to prevent the main loop from continuing.
    exit 0
}

# --- Set Trap Immediately ---
# This guarantees the cleanup function will run, no matter how the script exits.
trap cleanup SIGINT SIGTERM EXIT

# --- Service Management Functions ---

kill_service() {
    local service_name="$1"
    local pgid="$2"
    local port="$3"

    echo "--- Stopping $service_name service ---"
    if [[ -z "$pgid" && -z "$port" ]]; then
        echo "No PGID or Port for $service_name to stop."
        return
    fi

    # Step 1: Attempt graceful shutdown via Process Group
    if [[ -n "$pgid" ]]; then
        echo "Sending SIGTERM to process group $pgid..."
        kill -TERM "-$pgid" 2>/dev/null || true
        sleep 2 # Give it a moment to shut down gracefully
    fi

    # Step 2: Force-kill anything still listening on the port (Your robust method)
    echo "Ensuring port $port is free..."
    if command -v lsof >/dev/null; then
        lsof -ti:"$port" | xargs --no-run-if-empty kill -9 2>/dev/null || true
    elif command -v netstat >/dev/null; then
        netstat -tlnp 2>/dev/null | grep ":$port " | awk '{print $7}' | cut -d'/' -f1 | xargs --no-run-if-empty kill -9 2>/dev/null || true
    fi

    # Step 3: Loop to verify the port is actually free
    for i in {1..10}; do
        if ! ss -lnt 2>/dev/null | grep -q ":$port "; then
             echo "Port $port is now free."
             if [[ -n "${PIDS[$service_name]}" ]]; then wait "${PIDS[$service_name]}" 2>/dev/null; fi
             echo "--- $service_name service stopped ---"
             return 0
        fi
        echo "Port $port still in use, waiting... (attempt $i/10)"
        sleep 1
    done

    # Step 4: Final effort if port is still blocked
    echo "⚠️ ERROR: Port $port could not be freed after 10 seconds."
    if [[ -n "$pgid" ]]; then
        echo "Sending SIGKILL to process group $pgid as a last resort."
        kill -KILL "-$pgid" 2>/dev/null || true
        wait "${PIDS[$service_name]}" 2>/dev/null
    fi
    echo "--- $service_name service stopped ---"
}

start_service() {
    local service_name="$1"
    local service_dir="$2"
    
    echo "Starting $service_name server..."
    cd "$SCRIPT_DIR/apps/$service_dir"
    setsid npm run start &
    local pid=$!
    PIDS["$service_name"]=$pid
    PGIDS["$service_name"]=$(ps -o pgid= "$pid" | tr -d ' ')
    echo "$service_name server starting with PID $pid and PGID ${PGIDS[$service_name]}"
}

# --- Health Check Functions ---

check_web() {
    curl -s "$PING_ENDPOINT_URL" 2>/dev/null | grep -q "$PING_RESPONSE"
}

check_socket() {
    nc -z localhost "$SOCKET_PORT" 2>/dev/null
}

# --- Main Execution Logic ---

echo "Starting ProtoShock Server..."

echo "Cleaning up any existing services if they exist..."
kill_service "web" "" "$WEB_PORT"
kill_service "socket" "" "$SOCKET_PORT"

echo "Starting services..."
start_service "socket" "socket"
start_service "web" "web"

echo "Waiting for services to become available..."
sleep 5

# Main monitoring loop
while true; do
    if ! check_web; then
        echo "Web health check failed. Restarting..."
        kill_service "web" "${PGIDS['web']}" "$WEB_PORT"
        start_service "web" "web"
        sleep 5
    fi

    if ! check_socket; then
        echo "Socket health check failed. Restarting..."
        kill_service "socket" "${PGIDS['socket']}" "$SOCKET_PORT"
        start_service "socket" "socket"
        sleep 5
    fi

    sleep 10
done

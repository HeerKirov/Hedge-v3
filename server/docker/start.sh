#!/bin/sh

PORT=${PORT:-19000}
TOKEN=${TOKEN:-dev}
PARAMS="--remote --dir /server --port $PORT --token $TOKEN"
if [ -n "$STORAGE_DIR" ]; then
    PARAMS="$PARAMS --storage-dir $STORAGE_DIR"
fi
ARGS=""
if [ -n "$TZ" ]; then
    ARGS="$ARS -Duser.timezone=$TZ"
fi

java $ARGS -jar hedge-v3-server.jar $PARAMS
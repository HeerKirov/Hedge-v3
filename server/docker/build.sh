#!/bin/sh

SCRIPT_DIR=$(dirname "$(readlink -f "$0")")
TAG=${1:-dev}

if [ ! -f "$SCRIPT_DIR/hedge-v3-server.jar" ]; then
    echo "hedge-v3-server.jar not found."
    exit 1
fi

if [ ! -x "$SCRIPT_DIR/start.sh" ]; then
    chmod +x $SCRIPT_DIR/start.sh
fi

sudo docker build $SCRIPT_DIR -t hedge-v3-server:$TAG
#!/bin/sh

SCRIPT_DIR=$(dirname "$(readlink -f "$0")")
TAG=${1:-dev}
FILE=${2:-$SCRIPT_DIR/hedge-v3-server.jar}

if [ ! -f "$FILE" ]; then
    echo "hedge-v3-server.jar not found."
    exit 1
fi

if [ ! -x "$SCRIPT_DIR/start.sh" ]; then
    chmod +x $SCRIPT_DIR/start.sh
fi

cp $FILE $SCRIPT_DIR/hedge-v3-server.jar
docker build $SCRIPT_DIR -t hedge-v3-server:$TAG
rm $SCRIPT_DIR/hedge-v3-server.jar

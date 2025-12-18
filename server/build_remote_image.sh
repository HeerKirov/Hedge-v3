#!/bin/bash

source /usr/local/shells/develops.sh

VERSION=$(./gradlew printVersion -q)
IMAGE_VERSION=${1:-$VERSION}
REMOTE_HOST=home-nas

echo "=== Build linux server image VER.$IMAGE_VERSION at $REMOTE_HOST ==="

jdk 21

./gradlew build -PtargetPlatform=linux

scp build/libs/hedge-v3-server-$VERSION-all.jar home-nas:~/Compose/hedge-v3-server-develop/build/

ssh $REMOTE_HOST "cd ~/Compose/hedge-v3-server-develop/build/ && ./build.sh $IMAGE_VERSION hedge-v3-server-$VERSION-all.jar"
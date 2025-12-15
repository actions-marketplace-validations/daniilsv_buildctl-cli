#!/bin/sh
set -e

ACTION="$1"
TOKEN="$2"
BACKEND="$3"
PROJECT="$4"
BRANCH="$5"
COMMIT="$6"
STATUS="$7"
LOG="$8"
FILE="$9"
IMAGE="${10}"
DIGEST="${11}"

if [ -z "$ACTION" ]; then
  echo "Error: action input is required"
  exit 1
fi

if [ -z "$TOKEN" ]; then
  echo "Error: token input is required"
  exit 1
fi

if [ -z "$BACKEND" ]; then
  echo "Error: backend input is required"
  exit 1
fi

if [ -z "$PROJECT" ]; then
  echo "Error: project input is required"
  exit 1
fi

if [ -z "$BRANCH" ]; then
  echo "Error: branch input is required"
  exit 1
fi

if [ -z "$COMMIT" ]; then
  echo "Error: commit input is required"
  exit 1
fi

case "$ACTION" in
  event)
    if [ -z "$STATUS" ]; then
      echo "Error: status input is required for event action"
      exit 1
    fi

    echo "Sending build event: status=$STATUS"

    if [ -n "$LOG" ]; then
      /buildctl event \
        --token="$TOKEN" \
        --backend="$BACKEND" \
        --project="$PROJECT" \
        --branch="$BRANCH" \
        --commit="$COMMIT" \
        --status="$STATUS" \
        --log="$LOG"
    else
      /buildctl event \
        --token="$TOKEN" \
        --backend="$BACKEND" \
        --project="$PROJECT" \
        --branch="$BRANCH" \
        --commit="$COMMIT" \
        --status="$STATUS"
    fi
    ;;

  artifact)
    if [ -z "$FILE" ]; then
      echo "Error: file input is required for artifact action"
      exit 1
    fi

    if [ ! -f "$FILE" ]; then
      echo "Error: file not found: $FILE"
      exit 1
    fi

    echo "Uploading artifact: $FILE"

    /buildctl artifact upload \
      --token="$TOKEN" \
      --backend="$BACKEND" \
      --project="$PROJECT" \
      --branch="$BRANCH" \
      --commit="$COMMIT" \
      --file="$FILE"
    ;;

  container)
    if [ -z "$IMAGE" ]; then
      echo "Error: image input is required for container action"
      exit 1
    fi

    if [ -z "$DIGEST" ]; then
      echo "Error: digest input is required for container action"
      exit 1
    fi

    echo "Registering container image: $IMAGE"

    if [ -n "$FILE" ] && [ -f "$FILE" ]; then
      echo "Including image tarball: $FILE"
      /buildctl container register \
        --token="$TOKEN" \
        --backend="$BACKEND" \
        --project="$PROJECT" \
        --branch="$BRANCH" \
        --commit="$COMMIT" \
        --image="$IMAGE" \
        --digest="$DIGEST" \
        --file="$FILE"
    else
      /buildctl container register \
        --token="$TOKEN" \
        --backend="$BACKEND" \
        --project="$PROJECT" \
        --branch="$BRANCH" \
        --commit="$COMMIT" \
        --image="$IMAGE" \
        --digest="$DIGEST"
    fi
    ;;

  *)
    echo "Error: invalid action '$ACTION'. Must be one of: event, artifact, container"
    exit 1
    ;;
esac

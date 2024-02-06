#!/bin/bash

# Assign command line arguments to variables
TARGET_PROJECT_ID=$1
MSG_TO=$2
MSG_BODY=$3

# Create the JSON payload
MESSAGE_PAYLOAD=$(jq -n \
                  --arg to "$MSG_TO" \
                  --arg body "$MSG_BODY" \
                  '{to: $to, body: $body}')

# Publish the message to the "sms" topic
gcloud pubsub topics publish sms --message="$MESSAGE_PAYLOAD" --project="$TARGET_PROJECT_ID"

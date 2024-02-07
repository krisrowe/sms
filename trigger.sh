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

# Wait for a short delay (e.g., 3 seconds)
sleep 3

# Publish the message one more time
gcloud pubsub topics publish sms --message="$MESSAGE_PAYLOAD" --project="$TARGET_PROJECT_ID"

# Wait for a short delay (e.g., 3 seconds)
sleep 3

# Determine the URL of the Cloud Function named sms
CLOUD_FUNCTION_URL=$(gcloud functions describe sms --format="value(httpsTrigger.url)" --project="$TARGET_PROJECT_ID")

# Invoke the Cloud Function
curl -X POST "$CLOUD_FUNCTION_URL" -d "$MESSAGE_PAYLOAD"

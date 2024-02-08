#!/bin/bash

# Check for required command-line arguments
if [ "$#" -ne 2 ] && [ "$#" -ne 3 ]; then
    echo "Usage: $0 PROJECT_ID MSG_COUNT [--local]"
    exit 1
fi

# Assign command line arguments to variables
TARGET_PROJECT_ID=$1
MSG_COUNT=$2

# Check if PHONE_NUMBER env var is set
if [ -z "$PHONE_NUMBER" ]; then
    echo "Error: PHONE_NUMBER environment variable is not set."
    exit 1
fi

# Set Cloud Function URL
if [ "$3" == "--local" ]; then
    CLOUD_FUNCTION_URL="http://localhost:8080"
else
    CLOUD_FUNCTION_URL=$(gcloud functions describe sms --format="value(httpsTrigger.url)" --project="$TARGET_PROJECT_ID")
fi

# Loop to publish messages
for ((i=1; i<=$MSG_COUNT; i++)); do
    # Construct the message id
    MESSAGE_ID=$((1000 + i))

    # Construct the JSON payload for the message body
    MESSAGE_BODY=$(echo "{\"to\": \"$PHONE_NUMBER\", \"body\": \"Test message $i\"}")

    # Print the prettified JSON payload to the console
    echo "JSON payload for message $i:"
    echo "$MESSAGE_BODY" | jq '.'

    # Publish the message to the "sms" topic
    gcloud pubsub topics publish sms --message="$MESSAGE_BODY" --project="$TARGET_PROJECT_ID"
done

# Wait for a short delay (e.g., 3 seconds)
sleep 3

# Invoke the Cloud Function once the loop is done
curl -X POST "$CLOUD_FUNCTION_URL"

#!/bin/bash

# Check for required command-line arguments
if [ "$#" -ne 1 ]; then
    echo "Usage: $0 PROJECT_ID"
    exit 1
fi

# Assign command-line arguments to variables
PROJECT_ID=$1

# Get the directory of the current script
SCRIPT_DIR=$(dirname "$(realpath "$0")")

# Service account for bookings
SERVICE_ACCOUNT_NAME="messenger"
SERVICE_ACCOUNT_EMAIL="${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
SECRETS_DIR="$SCRIPT_DIR/../secrets"
KEY_FILE_PATH="$SECRETS_DIR/service-account.json"

# Create secrets directory if it doesn't exist
mkdir -p "$SECRETS_DIR"

# Check if the bookings service account exists
if ! gcloud iam service-accounts describe ${SERVICE_ACCOUNT_EMAIL} --project ${PROJECT_ID} &>/dev/null; then
    echo "Error: Service account ${SERVICE_ACCOUNT_NAME} does not exist."
    exit 1
fi

# Check if twilio.json exists
TWILIO_SECRETS_FILE="$SECRETS_DIR/twilio.json"
if [ ! -f "$TWILIO_SECRETS_FILE" ]; then
    echo "Error: Twilio secrets file ($TWILIO_SECRETS_FILE) not found."
    exit 1
fi

# Create a key for the service account and save it to the specified file
if [ ! -f "$KEY_FILE_PATH" ]; then
    echo "Creating a new key for the service account..."
    gcloud iam service-accounts keys create $KEY_FILE_PATH \
        --iam-account ${SERVICE_ACCOUNT_EMAIL} \
        --project ${PROJECT_ID}
else
    echo "Key file $KEY_FILE_PATH already exists. Skipping creation."
fi

echo "Local setup complete."

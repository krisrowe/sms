# Purpose
Receives aysnc messages via Cloud Pub/Sub and sends SMS messages via Twilio using the message body and phone number received in the message payload.

# Prerequisites to run locally
1. Create a local folder named `secrets` with `service-account.json`
2. Make sure the service account has access these permissions in the GCP project that owns the account
   * Access to the `twilio` secret in Secrets Manager within the GCP project
   * Access to write logs to Cloud Logging 
3. Install dependencies
```bash
npm install
```

# Run Locally for Debugging in VS Code
1. Open the root folder of this repo in VS Code.
2. The .vscode folder and the launch.json will be automatically loaded
3. You will have an option Run Tests under Debug

# Run Locally via npm
## Run tests
```bash
npm test 
```
## Run server
```bash
npm start
```

# Deploy to Cloud Functions
```bash
gcloud builds submit --substitutions=_TARGET_PROJECT_ID=my-project-id,_REGION=us-central1,_ACCOUNT_NAME=messenger
```

# Test in the Cloud
```bash
chmod +x trigger.sh
TARGET_PROJECT_ID=$(gcloud config get-value project)
MSG_TO=800-555-1212
MSG_BODY="Hello World"
./trigger.sh $TARGET_PROJECT_ID, $MSG_TO, $MSG_BODY
```
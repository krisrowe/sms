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
## Run unit tests
```bash
npm test 
```
## Run server
```bash
npm start
```

# Run an integration test locally
```bash
export PHONE_NUMBER=800-555-1212
scripts/test-pull.sh my-gcp-project-id 10 --local # number indicates how many messages to publish
```

# Deploy to Cloud Functions as a pull subscription
1. Clone this repo
2. Confirm target project has a service account named 'messenger' (or see available Cloud Build substitution)
3. Set the TARGET_PROJECT_ID env var used below
4. Kick-off the Cloud Build script
## Pull Subscription
```bash
# Note that passing the mode as pull is not required here, as that's the default,
# but showing that param is available.
# NOTE: Using pull with Cloud Scheduler invocation is recommended to allow control over the number
# of messages processed, which can be controlled via env vars and a Cloud Build substitution.
gcloud builds submit --region=us-central1 --substitutions=_TARGET_PROJECT_ID=$TARGET_PROJECT_ID,_MODE=pull
```
## Push Subscription
```bash
# Note that passing the mode as pull is not required here, as that's the default,
# but showing that param is available.
gcloud builds submit --region=us-central1 --substitutions=_TARGET_PROJECT_ID=$TARGET_PROJECT_ID,_MODE=push
```

# Test in the Cloud
```bash
chmod +x scripts/trigger.sh
TARGET_PROJECT_ID=$(gcloud config get-value project)
MSG_TO=800-555-1212
MSG_BODY="Hello World"
scripts/trigger.sh $TARGET_PROJECT_ID, $MSG_TO, $MSG_BODY
```
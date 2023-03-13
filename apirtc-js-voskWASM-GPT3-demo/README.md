# ApiRTC + Vosk WASM + OpenAI GPT3 Demo
## Setup environment
Download the model library in your local focal
```wget https://ccoreilly.github.io/vosk-browser/models/vosk-model-small-en-us-0.15.tar.gz```

# Get Apikeys
- ApiRTC: https://cloud.apirtc.com/enterprise/api
- OpenAI: https://platform.openai.com/account/api-keys

Set up `apiKey` (ApiRTC) and `openAiKey` variables with the Apikeys in a mysecrets.env.js file.
```javascript
var apiKey = "<YOUR_APIRTC_KEY>"
var openAiKey = "<YOUR_OPENAI_KEY>"
```

## Start
```npx live-server```

Open a browser and navigate to http://127.0.0.1:8080

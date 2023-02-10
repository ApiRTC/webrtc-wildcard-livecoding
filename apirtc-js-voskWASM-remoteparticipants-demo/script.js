
//apiRTC.setLogLevel(10);

let connectedSession;
let connectedConversation;
let streamMap = {};
let localStream;

let currentSpeaker = "";
let previousSpeaker = "prevSpeaker";

let userAgent = new apiRTC.UserAgent({
  uri: "apiKey:" + apiKey
});

console.log("userAgent declared");

userAgent
  .register({
    cloudUrl: "https://cloud.apirtc.com"
  })
  .then((session) => {
    console.log("UserAgent registered.");


    userAgent.enableActiveSpeakerDetecting(true, { threshold: 30 });

    // Save session
    connectedSession = session;
    connectedConversation = connectedSession.getOrCreateConversation("conversation_name", {
      //meshModeEnabled: true
    });

    connectedConversation.on("streamListChanged", function (streamInfo) {
      if (streamInfo.listEventType === "added") {
        // A new stream has been published.

        // Add it to me own list copy?
        if (streamInfo.isRemote) {
          // The stream has been published by an other participant.
          console.log("remote stream published " + streamInfo.streamId);
          connectedConversation
            .subscribeToStream(streamInfo.streamId)
            .then(function (stream) {
              console.log("subscribeToStream success");
            })
            .catch(function (err) {
              console.log("subscribeToStream error", err);
            });
        } else {
          // The stream has been published by me.
          console.log("local stream published " + streamInfo.streamId);
          // Subscribe to it?
        }
      } else if (streamInfo.listEventType === "removed") {
        // A stream has been unpublished.
        console.log("stream unpublished " + streamInfo.streamId);
        // Remove it from with own list copy.


      } else if (streamInfo.listEventType === "updated") {
        console.log("Stream updated +");
        // Properties of the published stream has changed.
      }
    });

    connectedConversation.on("streamAdded", function (stream) {
      console.log("New stream added " + stream.getContact().getId());
      streamMap[stream.streamId] = stream;
      stream.addInDiv('remote-videos-container', 'remote-video-' + stream.streamId, {}, true);

    });

    connectedConversation.on("streamRemoved", function (stream) {
      console.log("Stream removed " + stream.getContact().getId());

      delete streamMap[stream.streamId]

      stream.removeFromDiv('remote-videos-container', 'remote-video-' + stream.streamId);
    });

    connectedConversation.on('audioAmplitude', amplitudeInfo => {
      if (amplitudeInfo.isSpeaking && transcriptionActivated) {

        currentSpeaker = amplitudeInfo.streamId == localStream.streamId ? userAgent.getUsername() : connectedConversation.getStreamInfo(amplitudeInfo.streamId).contact.getUsername()


        if (previousSpeaker !== currentSpeaker) {
          const newSpeakerHandle = document.createElement('span')
          newSpeakerHandle.className = "speaker-handler"
          newSpeakerHandle.textContent = " > " + currentSpeaker + ": "

          document.getElementById('recognition-result').insertBefore(document.createElement('br'), document.getElementById('partial'))
          document.getElementById('recognition-result').insertBefore(newSpeakerHandle, document.getElementById('partial'))
        }

        console.log("localid : " + localStream.streamId + " talking: " + amplitudeInfo.streamId)
        document.getElementById('current_speakers_id').innerText = currentSpeaker
      }

    });

    let createStreamOptions = {};
    createStreamOptions.constraints = {
      audio: true,
      video: true
    };


    userAgent
      .createStream(createStreamOptions)
      .then((stream) => {
        localStream = stream;

        console.log("stream created");

        let video = document.getElementById("local-video");

        let label = document.getElementById("local-video-label");
        label.innerHTML = 'You (' + userAgent.getUsername() + ')';

        stream.attachToElement(video);

        console.log("stream attached to DOM tag");

        connectedConversation
          .join()
          .then((joinResult) => {
            console.log(
              "conversation CloudID" +
              connectedConversation.getCloudConversationId() +
              " - Instance Id : " +
              connectedConversation.getInstanceId() +
              " joined as " +
              connectedSession.getId() +
              " on mode " +
              joinResult.mode
            );

            console.log(JSON.stringify(connectedConversation));

            connectedConversation.publish(localStream);
            console.log(
              "Local stream published in conversation " +
              connectedConversation.getCloudConversationId() +
              " - Instance Id : " +
              connectedConversation.getInstanceId()
            );
          })
          .catch((err) => {
            console.log("Error : " + err);
          });
      })
      .catch((err) => {
        console.log("error : " + err);
      });
  })
  .catch((err) => {
    console.log("Error User Agent : " + JSON.stringify(err));
  });


let audioContext = new AudioContext();
let recognizerProcessor = null;
let transcriptionActivated = false;


async function init() {
  const resultsContainer = document.getElementById('recognition-result');
  const partialContainer = document.getElementById('partial');

  partialContainer.textContent = "Loading...";

  const channel = new MessageChannel();
  const model = await Vosk.createModel('apirtc-js-voskWASM-remoteparticipants-demo/vosk-model-small-en-us-0.15.tar.gz');
  model.registerPort(channel.port1);

  const sampleRate = 48000;

  const recognizer = new model.KaldiRecognizer(sampleRate);
  recognizer.setWords(true);

  recognizer.on("result", (message) => {
    const result = message.result;
    const newSpan = document.createElement('span');
    newSpan.textContent = `${result.text} `;
    resultsContainer.insertBefore(newSpan, partialContainer);
  });

  recognizer.on("partialresult", (message) => {
    const partial = message.result.partial;
    partialContainer.textContent = partial;

  });

  partialContainer.textContent = "Ready";
  transcriptionActivated = true;

  await audioContext.audioWorklet.addModule('recognizer-processor.js')
  recognizerProcessor = new AudioWorkletNode(audioContext, 'recognizer-processor', { channelCount: 1, numberOfInputs: 1, numberOfOutputs: 1 });
  recognizerProcessor.port.postMessage({ action: 'init', recognizerId: recognizer.id }, [channel.port2])
  recognizerProcessor.connect(audioContext.destination);


  for (streamId in streamMap) {
    const source = audioContext.createMediaStreamSource(streamMap[streamId].getData());
    source.connect(recognizerProcessor);
  }

  const source = audioContext.createMediaStreamSource(localStream.getData());
  source.connect(recognizerProcessor);
}

function OpenaiFetchAPI() {
  console.log("Calling GPT3")
  var url = "https://api.openai.com/v1/completions";
  var bearer = 'Bearer ' + openAi_key

  const clearedContent = document.getElementById('recognition-result').innerHTML.replace("<span>", "").replace("</span>","").replace("<br/>","")

  // const prompt = "Get a summary a meeting represented by the conversation below: begin with a list of participants to this conversation, followed with the list of topics discussed, and finishing with a list of decisions made and actions to be taken. Format as an innerHTML of the body tag with the main parts titles as H1 tags:  > guest-e2c54c2f-e1b1: i think we should go forward on attending this conference, what do you think?  > guest-50b0f439-ccfb: yes agreed, but only if the traveling expenses are paid by the company.  > guest-e2c54c2f-e1b1: ok, let's do that then"
  const prompt = "Get a summary a meeting represented by the conversation below: begin with a list of participants to this conversation, followed with the list of topics discussed, and finishing with a list of decisions made and actions to be taken. Format as an innerHTML of the body tag with the main parts titles as H1 tags:  "+ clearedContent

  fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': bearer,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      "model": "text-davinci-003",
      "prompt": prompt,
      "max_tokens": 256,
      "temperature": 0,
      "top_p": 1,
      "n": 1,
      "stream": false
    })

  }).then(response => {

    return response.json()

  }).then(data => {

    document.getElementById('notes-panel').innerHTML = data['choices'][0].text

  })
    .catch(error => {
      console.log('Something bad happened ' + error)
    });

}


window.onload = () => {
  const trigger = document.getElementById('trigger');
  trigger.onmouseup = () => {
    trigger.disabled = true;
    init();
  };

  const endTranscriptionButton = document.getElementById('end-transcription');
  endTranscriptionButton.onmouseup = () => {
    //endTranscriptionButton.disabled = true;
    OpenaiFetchAPI()
  };
}
let apiKey = "myDemoApiKey"; //Insert your own API Key here - Find it at https://cloud.apirtc.com/enterprise/api (free plan available)

let connectedSession;
let connectedConversation;
let localStream = null;

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
    // Save session
    connectedSession = session;
    connectedConversation = connectedSession.getOrCreateConversation("conversation_name", {
      meshModeEnabled: true
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

      stream.addInDiv('remote-videos-container', 'remote-video-' + stream.streamId, {}, true);

    });

    connectedConversation.on("streamRemoved", function (stream) {
      console.log("Stream removed " + stream.getContact().getId());
      stream.removeFromDiv('remote-videos-container', 'remote-video-' + stream.streamId);
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

async function init() {
  const resultsContainer = document.getElementById('recognition-result');
  const partialContainer = document.getElementById('partial');

  partialContainer.textContent = "Loading...";

  const channel = new MessageChannel();
  const model = await Vosk.createModel('vosk-model-small-en-us-0.15.tar.gz');
  model.registerPort(channel.port1);

  const sampleRate = 48000;

  const recognizer = new model.KaldiRecognizer(sampleRate);
  recognizer.setWords(true);

  recognizer.on("result", (message) => {
    const result = message.result;

    if (result.text == "return return") {
      const newBr = document.createElement('br');
      resultsContainer.insertBefore(newBr, partialContainer);
    } else {
      const newSpan = document.createElement('span');
      newSpan.textContent = `${result.text} `;
      resultsContainer.insertBefore(newSpan, partialContainer);
    }
  });
  recognizer.on("partialresult", (message) => {
    const partial = message.result.partial;

    if (partial == "return return") {
      partialContainer.textContent = `<br/>`;
    } else {
      partialContainer.textContent = partial;
    }

    partialContainer.textContent = partial;
  });

  partialContainer.textContent = "Ready";

  /*     const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: false,
          audio: {
              echoCancellation: true,
              noiseSuppression: true,
              channelCount: 1,
              sampleRate
          },
      });
   */


  const audioContext = new AudioContext();

  await audioContext.audioWorklet.addModule('recognizer-processor.js')
  const recognizerProcessor = new AudioWorkletNode(audioContext, 'recognizer-processor', { channelCount: 1, numberOfInputs: 1, numberOfOutputs: 1 });
  recognizerProcessor.port.postMessage({ action: 'init', recognizerId: recognizer.id }, [channel.port2])
  recognizerProcessor.connect(audioContext.destination);

  const source = audioContext.createMediaStreamSource(localStream.getData());
  source.connect(recognizerProcessor);
}

window.onload = () => {
  const trigger = document.getElementById('trigger');
  trigger.onmouseup = () => {
    trigger.disabled = true;
    init();
  };
}
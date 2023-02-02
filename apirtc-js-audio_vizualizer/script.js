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
      .then(stream => stream.applyAudioProcessor('none'))
      .then((stream) => {
        localStream = stream;

        // create an audio context
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        // create an analyser node
        const analyser = audioCtx.createAnalyser();
        // set the FFT size for the analyser
        analyser.fftSize = 2048;
        // get the frequency data from the analyser
        const frequencyData = new Uint8Array(analyser.frequencyBinCount);
        // create a source node from the audio stream
        const source = audioCtx.createMediaStreamSource(stream);
        // connect the source node to the analyser
        source.connect(analyser);

        // create a canvas to display the audio visualization
        const canvas = document.getElementById('local-canvas');

        const canvasCtx = canvas.getContext('2d');

        // function to draw the audio visualization on the canvas
        function draw() {
          // get the frequency data from the analyser
          analyser.getByteFrequencyData(frequencyData);
          // clear the canvas
          canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
          canvasCtx.fillStyle = "#fff";

          // draw a bar for each frequency data point
          for (let i = 0; i < frequencyData.length; i++) {
            const barHeight = frequencyData[i];
            canvasCtx.fillRect(i * 4, canvas.height - barHeight, 2, barHeight);
          }
          requestAnimationFrame(draw);
        }

        // start the audio visualization
        draw();

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


// get access to the audio stream
navigator.mediaDevices.getUserMedia({ audio: true, video: false })
  .then(stream => {

  });

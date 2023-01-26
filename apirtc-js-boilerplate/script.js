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

      stream.addInDiv('remote-videos-container', 'remote-video-'+ stream.streamId,{}, true );
    });

    connectedConversation.on("streamRemoved", function (stream) {
        console.log("Stream removed " + stream.getContact().getId()); 
        stream.removeFromDiv('remote-videos-container', 'remote-video-'+ stream.streamId);
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
        label.innerHTML = 'You ('+stream.getId()+')';

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

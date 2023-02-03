let apiKey = "myDemoApiKey"; // <-- Insert your own API Key here (free plan on https://cloud.apirtc.com)

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


      //--- Add a video element and a canvas element for each new participant joining the conversation
      let remoteVideosContainer = document.getElementById('remote-videos-container');

      let containerElt = document.createElement('div');
      containerElt.className = 'video-container';
      containerElt.id = 'video-container-' + stream.getId();

      let videoElt = document.createElement('video');
      videoElt.className = 'video-element';
      videoElt.id = 'remote-video-' + stream.getId();
      videoElt.autoplay = true;
      videoElt.width = '320px';
      videoElt.height = '240px';

      stream.attachToElement(videoElt);

      let canvasElt = document.createElement('canvas');
      canvasElt.className = 'video-element';
      canvasElt.width = '320';
      canvasElt.height = '240';

      let labelElt = document.createElement('span');
      labelElt.className = 'video-label video-element';
      labelElt.innerHTML = 'Remote (' + stream.getContact().getUsername() + ')'

      containerElt.appendChild(videoElt)
      containerElt.appendChild(canvasElt)
      containerElt.appendChild(labelElt)

      remoteVideosContainer.appendChild(containerElt)

      //----
      //---- Start tracking face on this new video element

      let context = canvasElt.getContext("2d");

      // Use the tracking module
      let tracker = new tracking.ObjectTracker("face");

      //attach the tracker the video element
      tracking.track("#" + videoElt.id, tracker, {});

      //each time the track event is fired
      tracker.on("track", function (event) {

        //clear the canvas of all rectangles
        context.clearRect(0, 0, canvasElt.width, canvasElt.height);

        //For each face detected
        event.data.forEach(function (rect) {

          //Draw a rectangle and the coordinates
          context.strokeStyle = "#a64ceb";
          context.strokeRect(rect.x, rect.y, rect.width, rect.height);
          context.font = "11px Helvetica";
          context.fillStyle = "#fff";
          context.fillText(
            "x: " + rect.x + "px",
            rect.x + rect.width + 5,
            rect.y + 11
          );
          context.fillText(
            "y: " + rect.y + "px",
            rect.x + rect.width + 5,
            rect.y + 22
          );
        });
      });

    });

    connectedConversation.on("streamRemoved", function (stream) {
      console.log("Stream removed " + stream.getContact().getId());
      document.getElementById('video-container-' + stream.streamId).remove()
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

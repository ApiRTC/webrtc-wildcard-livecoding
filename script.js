let apiKey = "myDemoApiKey";

function consoleWrite(text = "") {
  if (typeof text === Error) text = text.toString();

  console.log(text);
  return;
}

let addCanvasTracking = (videoElt, canvasElt) => {

  let context = canvasElt.getContext("2d");

  let tracker = new tracking.ObjectTracker("face");
  tracker.setInitialScale(4);
  tracker.setStepSize(2);
  tracker.setEdgesDensity(0.1);

  console.log('video id ' + videoElt.id)

  tracking.track("#" + videoElt.id, tracker, {});

  tracker.on("track", function (event) {
    context.clearRect(0, 0, canvasElt.width, canvasElt.height);

    event.data.forEach(function (rect) {
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
}

consoleWrite("Start:");

let connectedSession;
let connectedConversation;
let localStream = null;

let userAgent = new apiRTC.UserAgent({
  uri: "apiKey:" + apiKey
});

consoleWrite("userAgent declared");

userAgent
  .register({
    cloudUrl: "https://cloud.apirtc.com"
  })
  .then((session) => {
    consoleWrite("UserAgent registered.");
    // Save session
    connectedSession = session;
    connectedConversation = connectedSession.getOrCreateConversation("bla2", {
      meshModeEnabled: true
    });

    connectedConversation.on("streamListChanged", function (streamInfo) {
      if (streamInfo.listEventType === "added") {
        // A new stream has been published.

        // Add it to me own list copy?
        if (streamInfo.isRemote) {
          // The stream has been published by an other participant.
          consoleWrite("remote stream published " + streamInfo.streamId);
          connectedConversation
            .subscribeToStream(streamInfo.streamId)
            .then(function (stream) {
              consoleWrite("subscribeToStream success");
            })
            .catch(function (err) {
              consoleWrite("subscribeToStream error", err);
            });
        } else {
          // The stream has been published by me.
          consoleWrite("local stream published " + streamInfo.streamId);
          // Subscribe to it?
        }
      } else if (streamInfo.listEventType === "removed") {
        // A stream has been unpublished.
        consoleWrite("stream unpublished " + streamInfo.streamId);
        // Remove it from with own list copy.


      } else if (streamInfo.listEventType === "updated") {
        consoleWrite("Stream updated +");
        // Properties of the published stream has changed.
      }
    });

    connectedConversation.on("streamAdded", function (stream) {
      consoleWrite("New stream added " + stream.getContact().getId());


      let remoteVideosContainer = document.getElementById('remote-videos-container');

      let addVideoStuff = ((videosContainerDivElement) => {

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
        labelElt.innerHTML = 'Remote ' + stream.getId()


        containerElt.appendChild(videoElt)
        containerElt.appendChild(canvasElt)
        containerElt.appendChild(labelElt)

        videosContainerDivElement.appendChild(containerElt)

        addCanvasTracking(videoElt, canvasElt)


      });

      addVideoStuff(remoteVideosContainer)


    });

    connectedConversation.on("streamRemoved", function (stream) {
      consoleWrite("Stream removed " + stream.getContact().getId());
      document.getElementById('video-container-' + stream.streamId).remove()
    });

    let createStreamOptions = {};
    createStreamOptions.constraints = {
      audio: true,
      video: true
    };


    userAgent
      .createStream(createStreamOptions)
      .then((stream) => {http://127.0.0.1:5500/index.html
        localStream = stream;

        consoleWrite("stream created");

        let video = document.getElementById("local-video");
        let canvas = document.getElementById("local-canvas");

        let label = document.getElementById("local-video-label");
        label.innerHTML = 'You ('+stream.getId()+')';

        stream.attachToElement(video);

        consoleWrite("stream attached to DOM tag");

        connectedConversation
          .join()
          .then((joinResult) => {
            consoleWrite(
              "conversation CloudID" +
              connectedConversation.getCloudConversationId() +
              " - Instance Id : " +
              connectedConversation.getInstanceId() +
              " joined as " +
              connectedSession.getId() +
              " on mode " +
              joinResult.mode
            );

            consoleWrite(JSON.stringify(connectedConversation));

            connectedConversation.publish(localStream);
            consoleWrite(
              "Local stream published in conversation " +
              connectedConversation.getCloudConversationId() +
              " - Instance Id : " +
              connectedConversation.getInstanceId()
            );
          })
          .catch((err) => {
            consoleWrite("Error : " + err);
          });
      })
      .catch((err) => {
        consoleWrite("error : " + err);
      });
  })
  .catch((err) => {
    consoleWrite("Error User Agent : " + JSON.stringify(err));
  });

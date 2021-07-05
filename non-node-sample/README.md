OpenTok Network Test non-node sample app
========================================

This sample shows how to load the opentok-network-test-js module without using Node or webpack.

## Configuring the app:

1. Copy the built opentok-network-test-js/index.js file to the sample. You can do either of the following:

   * Build the project in the root of this project (opentok-network-test-js). Copy the index.js
     file from the opentok-network-test-js/dist/NetworkTest/ directory into the
     non-node-sample/opentok-network-test-js-dist directory.

   * Download the opentok-network-test-js Node module from npmjs. Copy the index.js
     file from the opentok-network-test-js/dist/NetworkTest/ directory into the
     non-node-sample/opentok-network-test-js-dist directory.

2. Make a copy of the non-node-sample/configSample.js file, saving it to non-node-sample/config.js.
   Edit the properties in that file:

   * `apiKey` -- The API key corresponding to the OpenTok project the app uses.

   * `sessionId` -- A test session ID.

     In a real (not test) app, this session ID must be for a different session than
     the one that the app will use for communication. And you will generate a unique test
     session ID for each client. This session ID is used for the network test, and it
     must be different than the session ID used for communication in the app. The test
     session must be a routed session -- one that uses the [OpenTok Media
     Router](https://tokbox.com/developer/guides/create-session/#media-mode).

   * `token` -- A token corresponding to the test session. Generate a test
     token that has its role set to `publisher` or `moderator`.

For test purposes, you can obtain a test session ID an token from the [TokBox account
page](https://tokbox.com/account). However, in a real application, use the [OpenTok server
SDKs](https://tokbox.com/developer/sdks/server/) to generate a unique test session ID (and a
corresponding token) for each client.

## To run this test app:

1. Make sure you have configured the app (see the previous section). Then:

2. Open the /sample/index.html page in a web browser.

3. Click the *Start Test* button.

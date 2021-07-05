const resultsDiv = document.getElementById('results');
let otNetworkTest;

document.getElementById('start-btn').addEventListener('click', function () {
  startTest();
});

function startTest() {
  // Set options, if needed:
  var options = {
      // audioOnly: true,
      // timeout: 10000,
  };
  otNetworkTest = new OpenTokNetworkConnectivity.default(OT, sessionInfo, options);
  otNetworkTest.testConnectivity()
      .then((results) => logJson('test connectivity results:', results))
      .then(testQuality);
}

function testQuality() {
  otNetworkTest.testQuality(function updateCallback(stats) {
    logJson('testQuality stats: ', stats);
  }).then(results => {
    logJson('testQuality results: ', results)
  }).catch(error => {
    logJson('testQuality error: ', error);
  });
}

function logJson(label, json) {
  console.log(json)
  resultsDiv.innerHTML = label + JSON.stringify(json, null, 2) + '<br><br>' + resultsDiv.innerHTML;
}

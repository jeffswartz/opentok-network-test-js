/**
 * @module Test/Publishing
 * @preferred
 *
 * Defines the methods required for the Publishing Test Flow
 */

/**
 * Publishing Test Flow
 */


import * as Promise from 'promise';
import { get, getOr, pick } from '../../util';
import * as e from './errors/';
import { OTErrorType, errorHasName } from '../errors/types';
import subscriberMOS from './helpers/subscriberMOS';
import MOSState from './helpers/MOSState';
import config from './helpers/config';
import isSupportedBrowser from './helpers/isSupportedBrowser';

type QualityTestResultsBuilder = {
  state: MOSState,
  subscriber: OT.Subscriber,
  credentials: SessionCredentials,
  mosScore?: number,
  bandwidth?: Bandwidth,
};

type MOSResultsCallback = (state: MOSState) => void;

let audioOnly = false; // The initial test is audio-video

/**
 * If not already connected, connect to the OpenTok Session
 */
function connectToSession(session: OT.Session, token: string): Promise<OT.Session> {
  return new Promise((resolve, reject) => {
    if (session.connection) {
      resolve(session);
    } else {
      session.connect(token, (error?: OT.OTError) => {
        if (error) {
          if (errorHasName(error, OTErrorType.AUTHENTICATION_ERROR)) {
            reject(new e.ConnectToSessionTokenError());
          } else if (errorHasName(error, OTErrorType.INVALID_SESSION_ID)) {
            reject(new e.ConnectToSessionSessionIdError());
          } else if (errorHasName(error, OTErrorType.CONNECT_FAILED)) {
            reject(new e.ConnectToSessionNetworkError());
          } else {
            reject(new e.ConnectToSessionError());
          }
        }
        resolve(session);
      });
    }
  });
}

/**
 * Ensure that audio and video devices are available
 */
function validateDevices(OT: OpenTok): Promise<void> {
  return new Promise((resolve, reject) => {

    type DeviceMap = { [deviceId: string]: OT.Device };
    type AvailableDevices = { audio: DeviceMap, video: DeviceMap };

    OT.getDevices((error?: OT.OTError, devices: OT.Device[] = []) => {

      if (error) {
        reject(new e.FailedToObtainMediaDevices());
      } else {

        const availableDevices: AvailableDevices = devices.reduce(
          (acc: AvailableDevices, device: OT.Device) => {
            const type: AV = device.kind === 'audioInput' ? 'audio' : 'video';
            return { ...acc, [type]: { ...acc[type], [device.deviceId]: device } };
          },
          { audio: {}, video: {} },
        );

        if (!Object.keys(availableDevices.audio).length) {
          reject(new e.NoAudioCaptureDevicesError());
        } else if (!Object.keys(availableDevices.video).length) {
          reject(new e.NoVideoCaptureDevicesError());
        } else {
          resolve();
        }
      }
    });
  });
}

function getWhiteNoiseVideoTrack(): HTMLCanvasElement2 {
  const randomArraySize = 83547;
  const randomBytes: number[] = [];
  for (let i = 0; i < randomArraySize; i += 1) {
    randomBytes[i] = Math.floor(Math.random() * 256);
  }

  const pubCanvas: HTMLCanvasElement2 = document.createElement('canvas') as HTMLCanvasElement2;
  const context: CanvasRenderingContext2D | null = pubCanvas.getContext('2d');
  if (!context) {
    throw new e.HTMLCanvasError();
  }
  pubCanvas.width = 1280;
  pubCanvas.height = 720;
  const imageData: ImageData = context.getImageData(0, 0, 1280, 720);
  const dataArray: Uint8ClampedArray = imageData.data;
  const drawWhiteNoise = (seed: number) => {
    for (let i = 0; i < 1280 * 720 * 4; i += 4) {
      dataArray[i] = randomBytes[(seed + i) % randomArraySize];
      dataArray[i + 1] = randomBytes[(seed + i + 1) % randomArraySize];
      dataArray[i + 2] = randomBytes[(seed + i + 2) % randomArraySize];
      dataArray[i + 3] = randomBytes[(seed + i + 3) % randomArraySize];
    }

    context.putImageData(imageData, 0, 0);
  };

  setInterval(() => {
    drawWhiteNoise(Math.floor(Math.random() * randomArraySize));
  }, 30);

  return pubCanvas;
}

function getWhiteNoiseAudioTrack(): MediaStreamTrack {
  const audioCtx: any = new AudioContext();
  const myArrayBuffer = audioCtx.createBuffer(2, audioCtx.sampleRate * 30, audioCtx.sampleRate);

  for (let channel = 0; channel < myArrayBuffer.numberOfChannels; channel += 1) {
    const nowBuffering = myArrayBuffer.getChannelData(channel);
    for (let i = 0; i < myArrayBuffer.length; i += 1) {
      nowBuffering[i] = Math.random() * 2 - 1;
    }
  }
  const source = audioCtx.createBufferSource();
  source.buffer = myArrayBuffer;

  // connect the AudioBufferSourceNode to the
  // destination so we can hear the sound
  source.connect(audioCtx.destination);

  // start the source playing
  // source.start();

  const node = audioCtx.createMediaStreamDestination();
  const mediaRecorder: MediaRecorder = new MediaRecorder(node.stream);
  mediaRecorder.start();
  const track: MediaStreamTrack = node.stream.getAudioTracks()[0];
  return track;
}

/**
 * Create a test publisher and subscribe to the publihser's stream
 */
function publishAndSubscribe(OT: OpenTok) {
  return (session: OT.Session): Promise<OT.Subscriber> =>
    new Promise((resolve, reject) => {
      type StreamCreatedEvent = OT.Event<'streamCreated', OT.Publisher> & { stream: OT.Stream };
      const containerDiv = document.createElement('div');
      containerDiv.style.position = 'fixed';
      containerDiv.style.bottom = '-1px';
      containerDiv.style.width = '1px';
      containerDiv.style.height = '1px';
      containerDiv.style.opacity = '0';
      document.body.appendChild(containerDiv);
      const publisherOptions: OT.PublisherProperties = {
        resolution: '1280x720',
        // This causes publishing to fail
        // audioSource: MediaStreamTrack = getWhiteNoiseAudioTrack(),
        videoSource: getWhiteNoiseVideoTrack().captureStream(30).getVideoTracks()[0],
        width: '100%',
        height: '100%',
        insertMode: 'append',
        showControls: false,
      };
      validateDevices(OT)
        .then(() => {

          const publisher = OT.initPublisher(containerDiv, publisherOptions, (error?: OT.OTError) => {
            if (error) {
              reject(new e.InitPublisherError(error.message));
            } else {
              session.publish(publisher, (publishError?: OT.OTError) => {
                if (publishError) {
                  if (errorHasName(publishError, OTErrorType.NOT_CONNECTED)) {
                    return reject(new e.PublishToSessionNotConnectedError());
                  }
                  if (errorHasName(publishError, OTErrorType.UNABLE_TO_PUBLISH)) {
                    return reject(new e.PublishToSessionPermissionOrTimeoutError());
                  }
                  return reject(new e.PublishToSessionError());
                  // return reject(new e.PublishToSessionError(publishError.message));
                }
              });
            }
          });
          publisher.on('streamCreated', (event: StreamCreatedEvent) => {
            const subscriber =
              session.subscribe(event.stream,
                containerDiv,
                { testNetwork: true, insertMode: 'append' },
                (subscribeError?: OT.OTError) => {
                  return subscribeError ?
                    reject(new e.SubscribeToSessionError(subscribeError.message)) :
                    resolve(subscriber);
                });
          });
        })
        .catch(reject);
    });
}
/**
 *  Connect to the OpenTok session, create a publisher, and subsribe to the publisher's stream
 */
function subscribeToTestStream(
  OT: OpenTok,
  session: OT.Session,
  credentials: SessionCredentials): Promise<OT.Subscriber> {
  return new Promise((resolve, reject) => {
    connectToSession(session, credentials.token)
      // Is this needed when the publisher does not use a camera or mic source?:
      // .then(OT.getUserMedia)
      .then(publishAndSubscribe(OT))
      .then(resolve)
      .catch(reject);
  });
}

function buildResults(builder: QualityTestResultsBuilder): QualityTestResults {
  const baseProps: (keyof AverageStats)[] = ['bitrate', 'packetLossRatio', 'supported', 'reason'];
  return {
    mos: builder.state.qualityScore(),
    audio: pick(baseProps, builder.state.stats.audio),
    video: pick(baseProps.concat(['frameRate', 'recommendedResolution', 'recommendedFrameRate']),
      builder.state.stats.video),
  };
}

function isAudioQualityAcceptable(results: QualityTestResults): boolean {
  return !!results.audio.bitrate && (results.audio.bitrate > config.qualityThresholds.audio[0].bps)
    && (!!results.audio.packetLossRatio &&
    (results.audio.packetLossRatio < config.qualityThresholds.audio[0].plr)
    || results.audio.packetLossRatio === 0);
}

function checkSubscriberQuality(
  OT: OpenTok,
  session: OT.Session,
  credentials: SessionCredentials,
  onUpdate?: UpdateCallback<OT.SubscriberStats>): Promise<QualityTestResults> {

  let mosEstimatorTimeoutId: number;

  return new Promise((resolve, reject) => {
    subscribeToTestStream(OT, session, credentials)
      .then((subscriber: OT.Subscriber) => {
        if (!subscriber) {
          reject(new e.MissingSubscriberError());
        } else {
          try {
            const builder: QualityTestResultsBuilder = {
              state: new MOSState(),
              ... { subscriber },
              ... { credentials },
            };

            const getStatsListener = (error?: OT.OTError, stats?: OT.SubscriberStats) => {
              const updateStats = (subscriberStats: OT.SubscriberStats): UpdateCallbackStats => ({
                ...subscriberStats,
                phase: audioOnly ? 'audio-only' : 'audio-video',
              });
              stats && onUpdate && onUpdate(updateStats(stats));
            };

            const processResults = () => {
              const audioVideoResults: QualityTestResults = buildResults(builder);
              if (!audioOnly && !isAudioQualityAcceptable(audioVideoResults)) {
                audioOnly = true;
                checkSubscriberQuality(OT, session, credentials, onUpdate)
                  .then((results: QualityTestResults) => {
                    resolve(results);
                  });
              } else {
                session.on('sessionDisconnected', () => {
                  resolve(audioVideoResults);
                  session.off();
                });
                session.disconnect();
              }
            };

            const resultsCallback: MOSResultsCallback = (state: MOSState) => {
              clearTimeout(mosEstimatorTimeoutId);
              processResults();
            };

            subscriberMOS(builder.state, subscriber, getStatsListener, resultsCallback);

            mosEstimatorTimeoutId = window.setTimeout(processResults, audioOnly ? config.getStatsAudioOnlyDuration
              : config.getStatsVideoAndAudioTestDuration);

          } catch (exception) {
            reject(new e.SubscriberGetStatsError());
          }
        }
      })
      .catch(reject);
  });
}

/**
 * Ensure that the test is being run in a supported browser.
 */
function validateBrowser(): Promise<void> {
  return new Promise((resolve, reject) => {
    const { supported, browser } = isSupportedBrowser();
    return supported ?  resolve() : reject(new e.UnsupportedBrowserError(browser));
  });
}

/**
 * This method checks to see if the client can publish to an OpenTok session.
 */
export default function testQuality(
  OT: OpenTok,
  credentials: SessionCredentials,
  otLogging: OTKAnalytics,
  onUpdate?: UpdateCallback<UpdateCallbackStats>,
  onComplete?: CompletionCallback<QualityTestResults>): Promise<QualityTestResults> {
  return new Promise((resolve, reject) => {

    const onSuccess = (results: QualityTestResults) => {
      onComplete && onComplete(undefined, results);
      otLogging.logEvent({ action: 'testQuality', variation: 'Success' });
      resolve(results);
    };

    const onError = (error: Error) => {
      otLogging.logEvent({ action: 'testQuality', variation: 'Failure' });
      onComplete && onComplete(error, null);
      reject(error);
    };

    validateBrowser()
    .then(() => {
      const session = OT.initSession(credentials.apiKey, credentials.sessionId);
      checkSubscriberQuality(OT, session, credentials, onUpdate)
        .then(onSuccess)
        .catch(onError);
    })
    .catch(onError);
  });
}

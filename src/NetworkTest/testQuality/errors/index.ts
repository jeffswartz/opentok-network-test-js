/**
 * @module Errors/Quality
 */

/**
 * Define errors for Connectivity Test
 */

import { NetworkTestError } from '../../errors';

 /**
  * Base class for errors used throughout Network Quality test.
  */
export class QualityTestError extends NetworkTestError {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, QualityTestError.prototype);
    this.name = this.constructor.name;
    this.stack = (new Error(message)).stack;
  }
}

/**
 * Browser Error
 */
export class UnsupportedBrowserError extends QualityTestError {
  name: string;
  constructor(browser: string) {
    const message =
      `Your current browser (${browser}) is not supported. Please run the test in Chrome or Firefox`;
    super(message);
    Object.setPrototypeOf(this, UnsupportedBrowserError.prototype);
    this.name = this.constructor.name;
  }
}

/**
 * Session Errors
 */
export class ConnectToSessionError extends QualityTestError {
  name: string;
  constructor(message?: string) {
    const defaultMessage = 'Failed to connect to the session due to a network error.';
    super(message || defaultMessage);
    Object.setPrototypeOf(this, ConnectToSessionError.prototype);
    this.name = this.constructor.name;
  }
}

/**
 * Missing Device Errors
 */

export class MediaDeviceError extends QualityTestError {
  name: string;
  constructor(message?: string) {
    const defaultMessage = 'OpenTok failed to find media devices for this browser.';
    super(message || defaultMessage);
    Object.setPrototypeOf(this, MediaDeviceError.prototype);
    this.name = this.constructor.name;
  }
}

export class FailedToObtainMediaDevices extends QualityTestError {
  constructor() {
    super('Failed to obtain media devices from OT.getDevices()');
  }
}

export class NoVideoCaptureDevicesError extends QualityTestError {
  constructor() {
    super('This browser has no video capture devices');
  }
}

export class NoAudioCaptureDevicesError extends QualityTestError {
  constructor() {
    super('This browser has no audio capture devices.');
  }
}

/**
 * Publisher Errors
 */

export class PublishToSessionError extends QualityTestError {
  name: string;
  constructor(message?: string) {
    const defaultMessage = 'Encountered an unknown error while attempting to publish to a session.';
    super(message || defaultMessage);
    Object.setPrototypeOf(this, PublishToSessionError.prototype);
    this.name = this.constructor.name;
  }
}

export class InitPublisherError extends PublishToSessionError {
  constructor(message?: string) {
    super(message || 'Failed to initialize publisher.');
  }
}

/**
 * Subscriber Errors
 */
export class SubscribeToSessionError extends QualityTestError {
  constructor(message?: string) {
    const defaultMessage = 'Encountered an unknown error while attempting to publish to a session.';
    super(message || defaultMessage);
    Object.setPrototypeOf(this, SubscribeToSessionError.prototype);
    this.name = this.constructor.name;
  }
}

export class SubscriberGetStatsError extends SubscribeToSessionError {
  constructor() {
    super('Failed to get network stats for a subscriber.');
  }
}

export class MissingSubscriberError extends SubscribeToSessionError {
  constructor() {
    super('Call checkSubscribeToSession before calling checkSubscriberQuality.');
  }
}


/*
 * Node.js polyfills for browser environments.
 * Import this module before any other code that relies on Node globals.
 */
import { Buffer } from 'buffer';
import process from 'process/browser';
import crypto from 'crypto-browserify';
import stream from 'stream-browserify';

// Determine the true global object
const globalObj = typeof globalThis !== 'undefined'
  ? globalThis
  : typeof window !== 'undefined'
    ? window
    : self;

// Ensure `global` points to the global object (Node code expects global/global.Buffer)
if (!globalObj.global) globalObj.global = globalObj;

// Attach Buffer, process and other Node polyfills if missing
if (!globalObj.Buffer) globalObj.Buffer = Buffer;
if (!globalObj.process) globalObj.process = process;
if (!globalObj.crypto) globalObj.crypto = crypto;
if (!globalObj.stream) globalObj.stream = stream;

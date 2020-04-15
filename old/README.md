# Notes on old file deprecation

##jsAudioAverager-worklet.js
Exploring the webadui api I came across some difficulties conserning the ScriptProcessor and the AudioWorklet. The scriptprocessor provides nice functionalities but it sadly deprecated.
While the AudioWorklet has been introduced a while back, but is not yet supported in most browsers. This is a little frustrating, but I've found a way to (for now) bypass the need for these custom
audio functionalities. This file is a working AudioWorklet file, archived in here in case this technology will be used again.
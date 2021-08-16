// Copyright (c) 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// const SHOULD_LOG = true;

/**
 * A jsAudioAverager.
 *
 * @class jsAudioAverager
 * @extends AudioWorkletProcessor
 */
class jsAudioAverager extends AudioWorkletProcessor {
    process (inputs, outputs, parameters) {
        var array = inputs[0];
        this.port.postMessage(array.length);
        
        var values = 0;
        var average;
        var length = 128;

        // get all the frequency amplitudes
        for (var i = 0; i < length; i++) {
            values += Math.abs(array[i]);
        }
        this.port.postMessage(values);
        // average = values / length;
        
        // this.port.postMessage(length);
        // this.port.postMessage(average);
        
        for(var i = 0; i < inputs.length; i++) {
            for(var j = 0; j < 128; j++) {
                outputs[i][j] = inputs[i][j];
            }
        }
        
        return true;
    }
}

registerProcessor('jsAudioAverager', jsAudioAverager);
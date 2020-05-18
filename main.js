const NUM_FILES = urls.length;
console.log("LOGGING LEVEL:",SHOULD_LOG);
console.log("USE_REVERB_NODES:", USE_REVERB_NODES);
console.log("NUM_FILES:", NUM_FILES);

window.binauralplayer = new class{}; // empty functionpointer container
// available functions:
// - window.binauralplayer.playPause()

// cross browser audio context
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioContext;
audioContext = new AudioContext();
audioContext.suspend();

reverbjs.extend(audioContext);

// const SPEAKER_DIST = 30.0;
const REVERB_DIST = SPEAKER_DIST*1.3;

// Table of contents:
// **TO BE FILLED IN**






/*------------------------------------------ VARIABLES AND OBJECTS ------------------------------------------------*/
/*-----------------------------------------------------------------------------------------------------------------*/
/*-----------------------------------------------------------------------------------------------------------------*/

// AUDIO NODES
var tracks = [];
var panner = [];
var analyserNodes = [];
var binauralReverb = null;

const masterGainNode = audioContext.createGain();

// drawing
var positionableElements = null;
const drawContext = document.getElementById("canvas").getContext("2d");
const drawCanvas = document.getElementById("canvas");



function log(txt, niveau=0) {
    if(niveau <= SHOULD_LOG) {
        console.log(txt);
        if(SHOULD_LOG >= 0) {
            var consoleElement = document.getElementById("console");
            if(consoleElement) {
                consoleElement.innerHTML += "<br>"+txt;
            }
        }
    }
}

// drawingvariables container
class DrawingVariables {
    constructor() {
		// state switch between drawmodes    
		this.drawMode = 1;
				
		this.viewDistance = SPEAKER_DIST;
    
		this.speakerPositionCanvas = [];
		this.speakerPositionXOnMouseDown = [];
		this.speakerPositionZOnMouseDown = [];
		this.speakerIsBeingDragged = [];
	}
    
    // drawing look constants
    get DIAM() { return 1 };
    get RAD() { return 0.5*this.DIAM };
    get EXTRA_VIEW_RAD() { return 1.4; };
    get R_EXTRA_VIEW_RADIUS() { return 1 / this.EXTRA_VIEW_RAD; };
    
    get frontColor() { return colortheme == "light" ? "rgba(30, 30, 30, 1)" : "rgba(222, 222, 222, 1)"; }
    get midColor() { return colortheme == "light" ? "rgba(180, 180, 180, 0.6)" : "rgba(180, 180, 180, 0.6)"; }
    get backColor() { return colortheme == "light" ? "rgba(222, 222, 222, 0.6)" : "rgba(120, 120, 120, 0.6)"; }
};
// !!! extra variables will be dynamicly added to this object
vars = new DrawingVariables();

function drawSVG(svgData, rotation, positionX, positionY, scale=1, offsetX = 0, offsetY = 0) {
    drawContext.save();
    drawContext.translate(positionX, positionY);
    drawContext.rotate( Math.PI + rotation );
    drawContext.translate(offsetX, offsetY);
    drawContext.scale(scale, scale);
            
    for(var i = 0; i < svgData.length; i++) {
        var path = new Path2D(svgData[i]);
        // console.log(path);
        drawContext.fill(path);
    }
    
    drawContext.restore();
}
function drawPath(path, rotation, positionX, positionY, scale=1, offsetX = 0, offsetY = 0) {
    drawContext.save();
    drawContext.translate(positionX, positionY);
    drawContext.rotate( Math.PI + rotation );
    drawContext.translate(offsetX, offsetY);
    drawContext.scale(scale, scale);
            
    for(var i = 0; i < path.length; i++) {
        drawContext.fill(path[i]);
    }
    
    drawContext.restore();
}

// empty container for functions that should be globally available
class GlobalFunctions {
    constructor() {}
    
    getAngle(x, y) {
        const val = Math.atan2(x, y) + 2 * Math.PI;
        return val % (2 * Math.PI);
    }
    
    angleToArrow(angle) {
        const D_PI = 2 * Math.PI;
        const arrows = ["\u2191", "\u2197", "\u2192", "\u2198", "\u2193", "\u2199", "\u2190", "\u2196"];
        angle = (angle + 10 * D_PI) % (D_PI);
        
        for(var i = 0; i < 8; i++) {
            if(angle < ( (0.125 + 0.25 * i) * Math.PI ) ) {
                return arrows[i];
            }
        }
        return arrows[0];
    }
}
globals = new GlobalFunctions();





// simple rectangle class to reduce duplicate code and to simplify rectangle interactions
class Rectangle {
    constructor(x, y, w, h) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
    }
    
    isInside(xpos, ypos) {
        log("isInside: xpos="+xpos+" ; ypos="+ypos, 1);
        if(xpos >= this.x && xpos < this.x+this.w && ypos >= this.y && ypos <= this.y+this.h) {
            return true;
        } else {
            return false;
        }
    }
    
    getRelativePosition(xpos, ypos) {
        const _xpos = (xpos-this.x) / (this.w-this.x);
        const _ypos = (ypos-this.y) / (this.h-this.y);
        return [_xpos, _ypos];
    }
}



// get the color from a corresponding amplitude point
// @pre val{0-1}, exponent{>0 - <inf}
// @post fillStyle{"rgb(<r>,<g>,<b>,<a>)"}
function colorFromAmplitude(val, exponent = 1.0) {
    // return "hsl("+(80-80*(Math.pow(val, 0.7))) + ", " + (68+val*15) + "%, " + (40+val*30)+"%)";
    console.assert(colorPoints != null, "colorFromAmplitude, colorpoints array is never created!");
    // console.assert(val >= 0 && val <= 1.0, "colorFromAmplitude, value is not inside range: "+val);
    
    const shiftedVal = Math.pow(val, exponent);
    
    // find colors to interpolate with
    var colorFound = false;
    var baseColorIndex = colorPoints.length - 2;
    for(var i = 1; i < colorPoints.length; i++) {
        if(colorPoints[i][0] >= shiftedVal && !colorFound) {
            baseColorIndex = i-1;
            colorFound = true;
        }
    }
    console.assert(baseColorIndex < colorPoints.length-1 && baseColorIndex >= 0, "colorFromAmplitude: baseColorIndex should larger then zero and smaller then the colorPoints array size: "+baseColorIndex);
    
    // get linear interpolation amount
    const rangeBetweenColors = colorPoints[baseColorIndex+1][0] - colorPoints[baseColorIndex][0];
    const rangeToValue = shiftedVal - colorPoints[baseColorIndex][0];
    const amount = rangeToValue / rangeBetweenColors;
    console.assert(rangeToValue >= 0.0, "colorFromAmplitude: index should be larger then 0");
    
    // get interpolated color (for r,g,b and a)
    var fillStyle = "rgba(";
    for(var i = 0; i < 4; i++) {
        const val = (amount) * colorPoints[baseColorIndex+1][1][i] + (1.0-amount) * colorPoints[baseColorIndex][1][i];
        if(i < 3) {
            fillStyle += parseInt( val );
            fillStyle += ", ";
        } else {
            fillStyle += parseFloat( val );
        }
    }
    fillStyle += ")";
    
    return fillStyle;
}

const abrevs = [ [0, "b"], [1000, "Kb"], [1000000, "Kb"], [1000000000, "Mb"], [1000000000000, "Gb"], [1000000000000000, "Tb"] ];
function bytesToAbrieviatedSize(bytes) {
    var out = "";
    for(var i = 0; i < abrevs.length-1; i++) {
        if(bytes < abrevs[i+1][0]) {
            out = "" + Math.round(bytes / abrevs[i][0]) + abrevs[i+1][1];
            return out;
        }
    }
}



class AudioListener {
// const
    get LISTENER_INITIAL_X() { return 0; };
    get LISTENER_INITIAL_Y() { return 0; };
    get LISTENER_INITIAL_Z() { return 0; };
    
// private
    get listener() { return audioContext.listener; };
    
// public
    constructor() {
        this._listenerPosition = [0, 0, 0];
        this._listenerDirection = [0, 0, 0];
        this.listenerHorizontalAngle = 0;
        
        this.setListenerPosition(this.LISTENER_INITIAL_X, this.LISTENER_INITIAL_Y, this.LISTENER_INITIAL_Z);
        this.setListenerDirection();
    }
    
    setListenerPosition(x, y, z=null) {
        if(this.listener.positionX) {
            this.listener.positionX.setValueAtTime(x, audioContext.currentTime);
            this.listener.positionY.setValueAtTime(y, audioContext.currentTime);
            this.listener.positionZ.setValueAtTime(z, audioContext.currentTime);
        } else {
            this.listener.setPosition(x, y, z);
        }
        
        this._listenerPosition[0] = x;
        this._listenerPosition[1] = y;
        this._listenerPosition[2] = z;
    }
    setListenerDirection(x=0, y=0, z=-1) {
        if(this.listener.forwardX) 
        {
            // point nose points to
            this.listener.forwardX.setValueAtTime(x, audioContext.currentTime);
            this.listener.forwardY.setValueAtTime(y, audioContext.currentTime);
            this.listener.forwardZ.setValueAtTime(z, audioContext.currentTime);
            // point where head faces to????
            this.listener.upX.setValueAtTime(0, audioContext.currentTime);
            this.listener.upY.setValueAtTime(1, audioContext.currentTime);
            this.listener.upZ.setValueAtTime(0, audioContext.currentTime);
        } else {
            this.listener.setOrientation(x, y, z, 0, 1, 0);
        }
        this._listenerDirection = [x, y, z];
        
        this.listenerHorizontalAngle = globals.getAngle(x, z);
    }
    
    get x() { return this._listenerPosition[0]; }
    get y() { return this._listenerPosition[1]; }
    get z() { return this._listenerPosition[2]; }
    get listenerPosition() { return this._listenerPosition; }
    get listenerDirection() { return this._listenerDirection; }
    get horizontalAngle() { return this.listenerHorizontalAngle; }
    get horizontalAngleInDegrees() { return parseInt(360 * (this.listenerHorizontalAngle / (2 * Math.PI))); }
    get initialPosition() { return [this.LISTENER_INITIAL_X, this.LISTENER_INITIAL_Y, this.LISTENER_INITIAL_Z]; }
    
    get info() { return "AudioListener: " + "pos(" + this._listenerPosition + "); dir(" + this._listenerDirection + "); angle(" + this.horizontalAngleInDegrees + ", " + globals.angleToArrow(this.horizontalAngle) + ");" }
    log() { console.log(this.info); }
};
var audioListener = new AudioListener();
// audioListener.log();



class PreloadedAudioNode {
// private
    reloadBufferSource() {
        this.source = audioContext.createBufferSource(); // creates a sound source
        this.source.buffer = this.audioBuffer;
        this.source.connect( this.gainNode );
        for(var i = 0; i < this.connectedNodes.length; i++) {
            this.gainNode.connect(this.connectedNodes[i]);
        }
    }
// public
    constructor(url, callback, loadingCallback=null) {
        this.source = audioContext.createBufferSource();
        this.gainNode = audioContext.createGain();

        this.audioBuffer = null;
        this.loglevel = 1;
        this.connectedNodes = [];
        this.fileExists = null;
        this.fileURL = null;

        this.startedAt = 0;
        this.pausedAt = 0;
        this.paused = false;
        
        this.loadSound(url, callback, loadingCallback);
        this.setGain(1.0);
    }

    connect(node) {
        this.gainNode.connect(node);
        this.connectedNodes.push(node);
    }
    disconnect(node) {
        this.gainNode.disconnect(node);
        this.connectedNodes = this.connectedNodes.filter( function(e) { return e == node; } );
    }
    
    get node() { return source; }
    get gain() { return this.gainNode.gain.value; }
    get duration() { return this.audioBuffer.duration; } 
    get currentTime() { 
        var time = this.paused ? this.pausedAt / 1000 : (Date.now() - this.startedAt) / 1000;
        return time > this.duration ? 0 : time;
    }
    
    setGain(gainvalue) { 
        this.gainNode.gain.value = gainvalue; 
    }
    // setTime() {
    // }

    
    loadSound(url, loadedCallback, loadingCallback = null) {
      this.fileURL = url;
      this.loadingProgress = 0;  // value from 0 to 1
      this.fileSize = 0;

      var request = new XMLHttpRequest();
      request.open('GET', url, true);
      request.responseType = 'arraybuffer';
      
      // pointer to this object
      var thisclass = this;
      
      // Decode asynchronously
      request.onreadystatechange = function() {
        thisclass.fileExists = this.status === 404 ? false : true;
        if(request.readyState == 2) {
            const headers = request.getAllResponseHeaders().split('\r\n').reduce((result, current) => {
                let [name, value] = current.split(': ');
                result[name] = value;
                return result;
              }, {});
            thisclass.fileSize = parseInt(headers['content-length']);
        }
      }
      request.onload = function() {
        thisclass.fileExists = this.status === 404 ? false : true;
        if (thisclass.fileExists) {
            var audioData = request.response;
            
            audioContext.decodeAudioData(audioData, function(buffer) {
                thisclass.audioBuffer = buffer;
                thisclass.reloadBufferSource();
                thisclass.createWaveForm( thisclass.audioBuffer );

                log("PreloadedAudioNode, calling loadedCallback", thisclass.loglevel);
                if(typeof loadedCallback == "function") {
                    loadedCallback();
                } else {
                    console.error("loadedCallback is not a function");
                }
            }, ()=>{console.log("error")});
        }
      }
      request.onprogress = function(e) {
        thisclass.fileExists = this.status === 404 ? false : true;
        if (e.lengthComputable) {
            thisclass.loadingProgress = e.loaded / e.total;
        }
        if(typeof loadingCallback == "function") {
            loadingCallback();
        }
      }
      
      request.send();
    }
    
// private
    createWaveForm(buffer, numPoints=500) {
        var samplesPerPoint = buffer.length / numPoints;
        var channel0 = buffer.getChannelData(0);
        var w = [];
        this.waveform = new Path2D();
        
        this.waveform.moveTo(0, 0.5);
        
        for(var i = 0; i < numPoints; i++) {
            var startI = Math.floor(i * samplesPerPoint);
            var endI = Math.floor((i+1) * samplesPerPoint);
            var pathPoint = i / numPoints;
            
            var max = 0;
            for(var j = startI; j < endI; j++) {
                max = Math.max(max, channel0[j]);
            }
            
            w.push(max);
            this.waveform.lineTo( pathPoint, 0.5 + 0.5 * max );
        }
        this.waveform.lineTo(1, 0.5);
        for(var i = numPoints - 1; i > 0; i = i - 1) {
            // console.log(i);
            var pathPoint = i / numPoints;
            this.waveform.lineTo( pathPoint, 0.5 - 0.5 * w[i] );
        }
        this.waveform.closePath();
    }
    
// public
    play(timeToPlay=0) {
        this.paused = false;

        if (this.pausedAt) {
            log("PreloadedAudioNode: resume playing", this.loglevel);
            this.startedAt = Date.now() - this.pausedAt;
            if(this.pausedAt / 1000 >= this.duration) {
                this.pausedAt = null;
                this.play(timeToPlay);
            } else {
                this.source.start(audioContext.currentTime + timeToPlay, this.pausedAt / 1000);
            }
        }
        else {
            log("PreloadedAudioNode: start playing", this.loglevel);
            this.startedAt = Date.now();
            this.source.start(audioContext.currentTime + timeToPlay);
        }
    };
    playFromTimePoint(time) {
        this.startedAt = Date.now();
        this.source.start(audioContext.currentTime, time);
    }

    stop(timeToPlay=0) {
        log("PreloadedAudioNode: stop playing called", this.loglevel);
        this.source.stop(audioContext.currentTime + timeToPlay);
        this.reloadBufferSource();
        
        this.pausedAt = Date.now() - this.startedAt;
        this.paused = true;
    };
};




class MultiPreloadedAudioNodes {
// public
    constructor(urls, onLoadedCallback = null) {
        this.loglevel = 1;
        
        this.numfiles = 0;
        this.urls = [];
        this.nodes = [];
        this.loadedStates = [];
        
        this._isPlaying = false;

        this.loadAudioFiles(urls, onLoadedCallback);
    }

    loadAudioFiles(urls, onLoadedCallback = null) {
        console.assert(urls.length >= 0, "MultiPreloadedAudioNodes did not receive an URL array larger 1");
        this.urls = urls;
        this.numfiles = urls.length;
        this.allLoaded = false;
        
        for(var i = 0; i < this.numfiles; i++)
            this.loadedStates[i] = false;
        for(var i = 0; i < this.numfiles; i++) {
            this.nodes[i] = new PreloadedAudioNode(urls[i], function(multiAudiofile, i) { 
                return ()=> {
                    multiAudiofile.loadedStates[i] = true;
                    multiAudiofile.allLoaded = multiAudiofile.checkWhetherAllLoaded();
                    
                    if(multiAudiofile.allLoaded == true) {
                        if(typeof onLoadedCallback == "function") {
                            onLoadedCallback();
                        }
                    }
                }
            }(this, i), ()=> { this.progressReporter(this.nodes, document.getElementById("loading-text")); }
            );
        }
    }
    progressReporter(nodes, elementToReportTo) {
        var total = 0;
        var size = 0;
        var allFilesValid = true;
        for(var i = 0; i < nodes.length; i++) {
            total += nodes[i].loadingProgress;
            size += nodes[i].fileSize;
            if(nodes[i].fileExists == false) {
                allFilesValid = false;
            }
        }
        
        var loadingProgress = allFilesValid ? "" + parseInt(100 * (total / nodes.length))+"% of " + bytesToAbrieviatedSize(size) : "";
        if(allFilesValid == false) {            
            for(var i = 0; i < nodes.length; i++) {
                if(nodes[i].fileExists == false) {
                    loadingProgress += "File '" + nodes[i].fileURL + "' not found!<br>";
                }
            }
        }
        elementToReportTo.innerHTML = loadingProgress;
    }
    
    connectToAudioContext() {   this.connectToSingleNode(audioContext.destination);     }
    connectToSingleNode(node) { 
        for(var i = 0; i < this.numfiles; i++) {
            this.nodes[i].connect(node);
        }
    }
    connectToNodes(nodes) {
        console.assert(nodes.length = this.numfiles, "MultiPreloadedAudioNodes, connecting failed: number of input nodes ("+nodes.length+") is not "+this.numfiles);
        for(var i = 0; i < this.numfiles; i++) {
            this.nodes[i].connect(nodes[i]);
        }
    }
    connectToObjects(objects) {
        console.assert(objects.length = this.numfiles, "MultiPreloadedAudioNodes, connecting failed: number of input objects ("+objects.length+") is not "+this.numfiles);
        for(var i = 0; i < this.numfiles; i++) {
            this.nodes[i].connect(objects[i].node);
        }
    }
    
    playAll(timeToPlay=0) {
        if(!this.isPlaying) {
            if (audioContext.state === 'suspended') { audioContext.resume(); }
        
            log("MultiPreloadedAudioNodes, play all", this.loglevel);
            for(var i = 0; i < this.numfiles; i++) {
                this.nodes[i].play(timeToPlay);
            }
            this._isPlaying = true;
        }
    }
    playAllFromTimePoint(time) {
        if(!this.isPlaying) {
            if (audioContext.state === 'suspended') { audioContext.resume(); }
        
            // log("MultiPreloadedAudioNodes, play all", this.loglevel);
            for(var i = 0; i < this.numfiles; i++) {
                this.nodes[i].playFromTimePoint(time);
            }
            this._isPlaying = true;
        }
    }
    
    stopAll(timeToStop=0) {
        if(this.isPlaying) {
            if (audioContext.state === 'suspended') { audioContext.resume(); }

            log("MultiPreloadedAudioNodes, stop all", this.loglevel);
            for(var i = 0; i < this.numfiles; i++) {
                this.nodes[i].stop(timeToStop);
            }
            this._isPlaying = false;
        }
    }

    getAudioTrack(i) { return this.nodes[i]; }
    get duration() { return this.nodes[0].duration; }
    get gain() { return this.nodes[0].gain; }
    get isPlaying() { return this._isPlaying; }
    
    setGain(gainvalue) { 
        for(var i = 0; i < this.numfiles; i++) {
            this.nodes[i].setGain(gainvalue);
        }
    }
    
// private
    checkWhetherAllLoaded() {
        var al = true;
        for(var i = 0; i < this.numfiles; i++) {
            if(this.loadedStates[i] == false) {
                al = false;
            }
        }
        return al;
    }
    
    // wip
    // assertSync() {}
};




class BinauralPanner {
//public
    constructor() {
        this.horizontalAngleFromCenter = 0;
        this._position = [0, 0, 0];
        this._orientation = [0, 0, 0];

        this.panner = audioContext.createPanner(); 
        
        this.panner.panningModel = 'HRTF';
        this.panner.distanceModel = 'inverse';
        this.panner.refDistance = 1;                     // 0 - INF  def: 1
        this.panner.maxDistance = 10000;                 // 0 - INF  def: 10000
        this.panner.rolloffFactor = 0.5;                   // 0 - 1    def: 1
        this.panner.coneInnerAngle = 50;
        this.panner.coneOuterAngle = 150;
        this.panner.coneOuterGain = 0.3;
        
        this.setPosition(audioListener.LISTENER_INITIAL_X, audioListener.LISTENER_INITIAL_Y, audioListener.LISTENER_INITIAL_Z - 5); // set in front of listener
        this.setOrientation(0, 0, 1); // aim to front;
    }
    
    setPosition(xPos, yPos, zPos) {
        if(this.panner.positionX) {
            this.panner.positionX.setValueAtTime(xPos, audioContext.currentTime);
            this.panner.positionY.setValueAtTime(yPos, audioContext.currentTime);
            this.panner.positionZ.setValueAtTime(zPos, audioContext.currentTime);
        } else {
            this.panner.setPosition(xPos, yPos, zPos);
        }
        this._position = [xPos, yPos, zPos];
        
        this.horizontalAngleFromCenter = globals.getAngle(xPos, zPos);
        // console.assert(xPos >= 0 ? (this.horizontalAngleFromCenter >= 0 && this.horizontalAngleFromCenter <= 3.14) : (this.horizontalAngleFromCenter >= 3.14 && this.horizontalAngleFromCenter <= 6.28), "xPos: "+xPos+" ;horizontalAngleFromCenter: "+this.horizontalAngleFromCenter);
    }
    setOrientation(x, y, z) {
        if(this.panner.orientationX) {
            this.panner.orientationX.value = x;
            this.panner.orientationY.value = y;
            this.panner.orientationZ.value = z;
        } else {
            this.panner.setOrientation(x, y, z);
        }
        this._orientation = [x, y, z];
    }
    
    connect(node) { this.panner.connect(node); }
    
    get orientation() { return this._orientation };
    get position() { return this._position };
    get positionX() { return this._position[0]; }
    get positionY() { return this._position[1]; }
    get positionZ() { return this._position[2]; }
    get node() { return this.panner; }
    get horizontalAngleFromCenterInDegrees() { return parseInt(360 * (this.horizontalAngleFromCenter / (2 * Math.PI))); }
    
    get info() { return "BinauralPanner: " + "pos(" + this._position + ");\t horizontalAngleFromCenter(" + this.horizontalAngleFromCenterInDegrees + ", " + globals.angleToArrow(this.horizontalAngleFromCenter) + ");\t dir(" + this._orientation + ");" }
    log() { console.log(this.info); }
}




class PositionableElement {
    constructor(setPositionFromCanvasFunction, getPositionFromElementFunction, getAngleFunction = null, svg = null) {
        // THESE FUNCTIONS WILL HANDLE CANVAS <-> AUDIO POSITION CONVERSION
        // function to set the position of the element from canvas coordinates
        this.setPositionFromCanvasFunction = setPositionFromCanvasFunction;
        // function to get the drawPosition of the element
        this.getPositionFromElementFunction = getPositionFromElementFunction;
        this.getAngleFunction = getAngleFunction;
        this.updateDrawingVariables();

        this.svg = null;
        this.drawSize = 10;
        this.drawSpaceOnCanvas = new Rectangle(0, 0, 2 * this.drawRadius, 2 * this.drawRadius);

        this.hoveredOver = false;
        this.isBeingDragged = false;
        this.elementPositionOnMouseDown = [0, 0];

        // console.log(svg);
        if(svg != null) {
            this.loadSVG(svg);
        }
    }
    
    loadSVG(svg, size=10) {
        this.drawSize = size;
        this.svg = [];
        
        // FIND OUT SIZE OF SVG
        var svgElem = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svgElem.setAttribute("id", "test");
        svgElem.setAttribute("width", 200);
        svgElem.setAttribute("height", 200);
        svgElem.setAttribute("style", "position:absolute;top:100%;");
        
        var x = 1000000000000;
        var y = 1000000000000;
        var endx = 0; 
        var endy = 0;
        
        var pathElem = [];
        for(var i = 0; i < svg.length; i++) {
            pathElem[i] = document.createElementNS("http://www.w3.org/2000/svg", "path");
            pathElem[i].setAttribute("d", svg[i]);
            svgElem.appendChild(pathElem[i]);
        }
        document.getElementsByTagName("body")[0].appendChild(svgElem);
        const bboxes = document.getElementById("test").children;
        for(var i = 0; i < svg.length; i++) {
            const box = bboxes[i].getBBox();
            x = Math.min(x, box.x);
            y = Math.min(y, box.y);
            endx = Math.max(box.x + box.width, endx);
            endy = Math.max(box.y + box.height, endy);
        }
        const width = endx - x;
        const height = endy - y;
        
        document.getElementsByTagName("body")[0].removeChild(svgElem);
        // SIZE OF SVG FOUND
        
        // NORMALIZE SVG TO 1
        var newSvg = [];
        for(var i = 0; i < svg.length; i++) {
            // split svg by spaces
            var splitsvgpart = svg[i].split(" ");
            
            var isRelative = false;         // uppercase or lowercase svg (M/m)
            var elementsToBypass = [];      // indices to non-normalizable 
            var isX = true;                 // x or y coord flag
            
            for(var j = 0; j < splitsvgpart.length; j++) {
                // if not supposed to be bypassed
                if(!elementsToBypass.includes(j)) {
                    // if is number
                    if(!isNaN(splitsvgpart[j])) 
                    { 
                        if(isX) {
                            splitsvgpart[j] = !isRelative ? ( parseFloat( splitsvgpart[j] ) - x - 0.5 * width ) / (0.5 * width) : parseFloat(splitsvgpart[j]) / (0.5 * width);
                        } else {
                            splitsvgpart[j] = !isRelative ? ( parseFloat( splitsvgpart[j] ) - y - 0.5 * height ) / (0.5 * width) : parseFloat(splitsvgpart[j]) / (0.5 * width);
                        }
                        
                        isX = !isX;
                        splitsvgpart[j] = parseFloat(splitsvgpart[j].toFixed(2));   // reduce decimal points
                    } 
                    else 
                    {
                        isRelative = splitsvgpart[j] == splitsvgpart[j].toUpperCase() ? false : true;
                        
                        // detecting non-normalizable elements
                        if(splitsvgpart[j] == "a") {
                            for(var n = 3; n < 3+3; n++) 
                                elementsToBypass.push(j+n);
                        }
                    }
                }
            }
            
            newSvg[i] = "";
            for(var j = 0; j < splitsvgpart.length; j++) {
                newSvg[i] += splitsvgpart[j] + " ";
            }
        }
        
        for(var i = 0; i < svg.length; i++) {
            this.svg[i] = new Path2D(newSvg[i]);
        }
    }
    
    updateDrawingVariables() {
            var posOnCanvas = this.getPositionFromElementFunction();
        this.drawSpaceOnCanvas = new Rectangle(
            vars.canvasXMid + vars.positionToCanvasMultY * posOnCanvas[0] - this.drawRadius, 
            vars.canvasYMid + vars.positionToCanvasMultY * posOnCanvas[1] - this.drawRadius, 
            2 * this.drawRadius, 
            2 * this.drawRadius
        );
    }
    
    mouseMove(mousePosOnCanvas) {
        this.hoveredOver = this.isBeingDragged == true || this.drawSpaceOnCanvas.isInside( mousePosOnCanvas[0], mousePosOnCanvas[1] );
    }
    mouseDown(mousePosOnCanvas) {
        this.isBeingDragged = this.drawSpaceOnCanvas.isInside(mousePosOnCanvas[0], mousePosOnCanvas[1]);
        if(this.isBeingDragged) {
            const pos = this.getPositionFromElementFunction();
            this.elementPositionOnMouseDown[0] = pos[0];
            this.elementPositionOnMouseDown[1] = pos[1];
        }
        return this.isBeingDragged;
    }
    mouseDrag(dragDistanceOnCanvas) {
        console.assert(dragDistanceOnCanvas.length == 2);
        if(this.isBeingDragged) {
            const xy = [ this.elementPositionOnMouseDown[0] + dragDistanceOnCanvas[0], this.elementPositionOnMouseDown[1] + dragDistanceOnCanvas[1] ];
            this.setPositionFromCanvasFunction(xy);
        }
        return this.isBeingDragged;
    }
    mouseUp() { this.isBeingDragged = false; }
    touchEnd() { this.hoveredOver = false; }
    
    draw() {
        if(this.svg != null) {
            drawPath( this.svg, this.getAngleFunction(), this.drawSpaceOnCanvas.x + 0.5 * this.drawSpaceOnCanvas.w, this.drawSpaceOnCanvas.y + 0.5 * this.drawSpaceOnCanvas.h, 26 + (this.hoveredOver ? 10 : 0) + this.drawSize * vars.DIAM * vars.windowTocanvasMultX * ( 5.0 / SPEAKER_DIST ) );
        } else {
            drawContext.beginPath();
            const h = (this.hoveredOver ? 10 : 0);
            drawContext.rect(this.drawSpaceOnCanvas.x - 0.5 * h, this.drawSpaceOnCanvas.y - 0.5 * h, this.drawSpaceOnCanvas.w + h, this.drawSpaceOnCanvas.h + h);
            drawContext.stroke();
        }
    }   
    
    get drawRadius() { return vars.canvasRad; }
    get drawSpace() { return this.drawSpaceOnCanvas; } 
    get hovered() { return this.hoveredOver; }
};




class PositionableElementsContainer {
    constructor() {
        this.positionableElements = [];    
    };
    
    addElement(setPositionFromCanvasFunction, getPositionFromElementFunction, getAngleFunction=null, svg=null) {
        this.positionableElements[this.positionableElements.length] = new PositionableElement(setPositionFromCanvasFunction, getPositionFromElementFunction, getAngleFunction, svg);
    }
    
    updateDrawingVariables() {
        for(var i = 0; i < this.positionableElements.length; i++) {
            this.positionableElements[i].updateDrawingVariables();
        }
    }
    
    mouseMove(mousePosOnCanvas) {
        for(var i = 0; i < this.positionableElements.length; i++) {
            this.positionableElements[i].mouseMove(mousePosOnCanvas);
        }
    }
    mouseDown(mousePosOnCanvas) {
        for(var i = 0; i < this.positionableElements.length; i++) {
            if(this.positionableElements[i].mouseDown(mousePosOnCanvas)) {
                return true;
            }
        }
        return false;
    }
    mouseDrag(dragDistanceOnCanvas) {
        for(var i = 0; i < this.positionableElements.length; i++) {
            if(this.positionableElements[i].mouseDrag(dragDistanceOnCanvas)) {
                return true;
            }
        }
        return false;
    }
    mouseUp() {
        for(var i = 0; i < this.positionableElements.length; i++) {
            this.positionableElements[i].mouseUp();
        }
    }
    touchEnd() {
        for(var i = 0; i < this.positionableElements.length; i++) {
            this.positionableElements[i].touchEnd();
        }
    }
    
    getDrawSpace(i) { return this.positionableElements[i].drawSpace; }
    isHovered(i) { return this.positionableElements[i].hovered; }
    
    setDrawSize(i, size) { this.positionableElements[i].drawSize = size; }
    
    // drawing
    draw() {
        for(var i = 0; i < this.positionableElements.length; i++) {
            this.positionableElements[i].draw();
        }
    }
    drawElement(i) {
        this.positionableElements[i].draw();
    }
}




class BinauralReverb {
//private
    get init_reverb_level() { return 0.4; };
    get NUM_NODES() { return 5; }
    get defaultReverbs() { ["http://reverbjs.org/Library/AbernyteGrainSilo.m4a", "http://reverbjs.org/Library/EmptyApartmentBedroom.m4a",  "http://reverbjs.org/Library/DomesticLivingRoom.m4a"] };
        
    setDistributed() {
        const angle = 0;
        const toAdd = 2 * Math.PI / this.NUM_NODES;
        
        for(var i = 0; i < this.NUM_NODES; i++) {
            const r = vars.R_EXTRA_VIEW_RADIUS * REVERB_DIST * 0.5;
            const curAng = angle + i * toAdd;
            const speakerX = r * ( Math.cos ( curAng ) );
            const speakerZ = r * ( Math.sin ( curAng ) );
            this.pannerNodes[i].setPosition( speakerX, this.pannerNodes[i].positionY, speakerZ );
            
            const speakerR = Math.sqrt( Math.pow( speakerX, 2 ) + Math.pow( speakerZ, 2 ) );
            const angleX = - speakerX / speakerR;
            const angleZ = - speakerZ / speakerR;
            this.pannerNodes[i].setOrientation( angleX, 0, angleZ );
        }
    }
    
    loadReverb(onLoadedCallback) {
        this.reverbsLoaded = [];
        for(var i = 0; i < this.NUM_NODES; i++) {
            this.reverbsLoaded[i] = false;
            var that = this;
            
            this.reverbNodes[i] = audioContext.createReverbFromUrl(this.reverbURL, function(_i) {
                return function() {
                    that.reverbsLoaded[_i] = true;
                    if( !that.reverbsLoaded.includes(false) ) {
                        console.log("allLoaded!");
                        if(typeof onLoadedCallback == "function") {
                            onLoadedCallback();
                        }
                    }
                }
            }(i));
        }
    }
//public
    constructor(onLoadedCallback = null, reverbURL = "http://reverbjs.org/Library/AbernyteGrainSilo.m4a") {
        // gainNodes[n][n] -> presumnodes[n] -> reverbnodes[n] -> pannernodes[n] -> reverbGainNode
        this.pannerNodes = [];
        this.reverbNodes = [];
        this.preSumNodes = [];
        this.gainNodes = [];
        this.reverbGainNode = audioContext.createGain();
        
        this.connectedNodes = [];

        this.reverbURL = reverbURL;
        this.loadReverb(onLoadedCallback);

        for(var i = 0; i < this.NUM_NODES; i++) {
            this.pannerNodes[i] = new BinauralPanner();
            this.preSumNodes[i] = audioContext.createGain();
            this.preSumNodes[i].gain.value = 1;
        }
        
        for(var i = 0; i < this.NUM_NODES; i++) {
            this.preSumNodes[i].connect( this.reverbNodes[i] );
            this.reverbNodes[i].connect( this.pannerNodes[i].node );
            this.pannerNodes[i].connect( this.reverbGainNode );
        }
        this.setDistributed();
        
        this.reverbGainNode.gain.value = this.init_reverb_level;
        this.reverbGainNode.connect( audioContext.destination );
    }
    
    connectToReverb(binauralNode) {
        var newGainNodes = [];
        for(var i = 0; i < this.NUM_NODES; i++) {
            newGainNodes.push( audioContext.createGain() );
            
            binauralNode.connect( newGainNodes[i] );
            newGainNodes[i].connect( this.preSumNodes[i] );
        }
        
        this.connectedNodes.push( binauralNode );
        this.gainNodes.push( newGainNodes );
        this.calculateGains();
    }
    
    disconnectFromReverb(binauralNode) {
        if(this.connectedNodes.includes(binauralNode)) {
            var index = this.connectedNodes.indexOf(binauralNode);
            
            for(var i = 0; i < this.NUM_NODES; i++) {
                binauralNode.disconnect( this.gainNodes[index][i] );
                this.gainNodes[index][i].disconnect( this.preSumNodes[i] );
            }
            
            this.gainNodes.splice( index, 1 );
            this.connectedNodes.splice( index, 1 );
        }
    }
    
    calculateGains() {
        for( var i = 0; i < this.connectedNodes.length; i++ ) {
            for( var j = 0; j < this.NUM_NODES; j++ ) {
                const distance = Math.sqrt( Math.pow( this.connectedNodes[i].positionX - this.pannerNodes[j].positionX , 2 ) + Math.pow( this.connectedNodes[i].positionZ - this.pannerNodes[j].positionZ , 2 ) );
                this.gainNodes[i][j].gain.value = Math.sqrt( 0.5 / (distance * 0.1) );
            }
        }
    }
}



/*-----------------------------------------------------------------------------------------------------------------*/
/*---------------------------------------------  Testing       ----------------------------------------------------*/
/*-----------------------------------------------------------------------------------------------------------------*/






// test audiofile
// var audiofile = new PreloadedAudioNode("audio/aesthetics/aesthetics1.wav", ()=>{ 
    // audiofile.connect(audioContext.destination); 
    // audiofile.play(audioContext.currentTime); 
    // audiofile.stop(audioContext.currentTime+1); 
    // }
// );

// test multiaudiofile
/*urls = [];
for(var i = 0; i < NUM_FILES; i++) {
    urls[i] = "audio/test/Harold_Insert "+(i+1)+".wav";
}*/
// console.log(urls);
// var multiAudioNodes = new MultiPreloadedAudioNodes(urls, ()=> { multiAudioNodes.connectToAudioContext(); multiAudioNodes.playAll(); });









/*-----------------------------------------------------------------------------------------------------------------*/
/*--------------------------------------------- Audio pipeline ----------------------------------------------------*/
/*-----------------------------------------------------------------------------------------------------------------*/

log("Start audiopipeline code");

function initNodes() 
{
    log("Start initializing");
    console.assert(audioContext);
    
    // ---- CREATE MASTER GAIN NODE
    const volumeControl = document.querySelector('[data-action="volume"]');
    const init_master_gain = 0.85;
    volumeControl.value = init_master_gain;
    masterGainNode.gain.value = init_master_gain;
    volumeControl.addEventListener('input', function() {
        masterGainNode.gain.value = this.value;
        log("master gain: "+ masterGainNode.gain.value, 1 );
    }, false);
    
    setupAnalyzingNodes(NUM_FILES);
    setupPanningNodes();
    
    // ---- CONNECT ALL NODES
    tracks.connectToNodes(analyserNodes);
    for(var i = 0; i < NUM_FILES; i++) {
        analyserNodes[i].connect(panner[i].panner);
        panner[i].connect(masterGainNode);
    }

    masterGainNode.connect(audioContext.destination);
    
    // ---- SETUP DRAWING
    setupDrawingFunctions();
    
    log("Finished initializing");
}

function enableInteractions() 
{
    
    const trackVolumeControl = document.querySelector('[data-action="trackVolume"]');
    
    //-----------------------------------------------------------------------------------------------//
    // -----------------------          SETUP AUDIONODES            -------------------------------- /
    const track_init_volume = 1.0;
    trackVolumeControl.value = track_init_volume;
    tracks.setGain( track_init_volume );
    
    //-----------------------------------------------------------------------------------------------//
    // -----------------------          SETUP HTML ELEMENTS         -------------------------------- /
    /*audioElements[0].addEventListener('ended', 
        () => 
        {
            playButton.dataset.playing = 'false';
            playButton.setAttribute( "aria-checked", "false" );
        }
    , false);*/

    trackVolumeControl.addEventListener('input', 
        function() 
        {
            tracks.setGain( Math.pow(this.value, 2) );
            log("track gain: ", tracks.gain, 1 );
        }   
    , false);
    
    // play pause audio
    const playButton = document.getElementById('playbutton');
    window.binauralplayer.playPause = function() 
    {
        // check if context is in suspended state (autoplay policy)
        if (audioContext.state === 'suspended') {
            audioContext.resume();
            log("resuming audio context");
        }

        if (playButton.dataset.playing === 'false') 
        {
            tracks.playAll();
            playButton.dataset.playing = 'true';
        } 
        else if (playButton.dataset.playing === 'true') 
        {
            tracks.stopAll();
            // audioContext.suspend();
            log("supsended audio context");
            playButton.dataset.playing = 'false';
        }

        let state = playButton.getAttribute('aria-checked') === "true" ? true : false;
        playButton.setAttribute( 'aria-checked', state ? "false" : "true" );
    };
    playButton.addEventListener('click', window.binauralplayer.playPause, false);
    
    if(USE_REVERB_NODES) {
        binauralReverb.calculateGains();
    }
}

function setupPanningNodes() 
{
    // CREATE PANNER NODES (for the reverbs and for the audiofiles)
    for(var i = 0; i < 2 * NUM_FILES; i++) 
    {
        panner[i] = new BinauralPanner();
    }

    // ---- set panning of all panners
    globals.fromRotatedPositionToStaticPosition = function(i) {
        // const angle = parseFloat(panControl.value);
        const staticAngle = globals.getAngle( panner[i].positionX, panner[i].positionZ ) - parseFloat(panControl.value);
        // console.log(i, globals.angleToArrow(staticAngle));
        const staticRadius = Math.sqrt( Math.pow( panner[i].positionZ, 2 ) + Math.pow( panner[i].positionX, 2 ) );
        
        return [staticRadius * ( Math.cos ( staticAngle ) ), staticRadius * ( Math.sin ( staticAngle ) )]; // new [X,Z];
    }
    function setPanning() {
        const angle = parseFloat(panControl.value);
        for(var i = 0; i < NUM_FILES; i++) {
            const speakerR = Math.sqrt( Math.pow(panner[i].hg_staticPosX, 2) + Math.pow(panner[i].hg_staticPosZ, 2));
            const speakerAngle = globals.getAngle( panner[i].hg_staticPosX, panner[i].hg_staticPosZ );
            // console.log(speakerR, speakerAngle);
        
            const speakerX = speakerR * ( Math.cos ( angle + speakerAngle ) );
            const speakerZ = speakerR * ( Math.sin ( angle + speakerAngle ) );
            // console.log(speakerX, speakerZ);
            
            // set positions
            panner[i].setPosition(          speakerX, panner[i].positionY, speakerZ);

            // set to point speakers in direction of center
            const angleX = - speakerX / speakerR;
            const angleZ = - speakerZ / speakerR;
            panner[i].setOrientation(angleX, 0, angleZ);
            if(USE_REVERB_NODES) {
                panner[NUM_FILES+i].setOrientation( angleX, 0, angleZ);
            }

            panner[i].hg_angle = (angle + speakerAngle) % (2 * Math.PI);
            panner[i].hg_radius = speakerR;
            
            log("panner:\tx: "+panner[i].positionX +" \t z: "+panner[i].positionZ , 2); 
        }
    }
    globals.setPanning = setPanning;
    function setDistributed(angle) {
        const toAdd = 2 * Math.PI / NUM_FILES;
        for(var i = 0; i < NUM_FILES; i++) {
            const speakerX = vars.R_EXTRA_VIEW_RADIUS * SPEAKER_DIST * 0.5 * ( Math.cos ( angle + i * toAdd ) );
            const speakerZ = vars.R_EXTRA_VIEW_RADIUS * SPEAKER_DIST * 0.5 * ( Math.sin ( angle + i * toAdd ) );
            
            panner[i].setPosition(              speakerX, panner[i].positionY, speakerZ);
            panner[i].hg_staticPosX = speakerX;
            panner[i].hg_staticPosZ = speakerZ;
            
            if(USE_REVERB_NODES) {
                panner[NUM_FILES + i].setPosition(  speakerX, panner[i].positionY, speakerZ);
            }
            
            panner[i].hg_angle = (angle + i * toAdd) % (2 * Math.PI);
            panner[i].hg_radius = 0.5 * SPEAKER_DIST;
            log("panner:\tx: "+panner[i].positionX +" \t z: "+panner[i].positionZ , 2); 
            
            if(USE_REVERB_NODES) {
                const reverbX = vars.R_EXTRA_VIEW_RADIUS * 2.5 * SPEAKER_DIST * 0.5 * ( Math.cos ( angle + i * toAdd ) );
                const reverbZ = vars.R_EXTRA_VIEW_RADIUS * 2.5 * SPEAKER_DIST * 0.5 * ( Math.sin ( angle + i * toAdd ) );
                panner[NUM_FILES+i].setPosition(reverbX, panner[i].positionY, reverbZ);
            }
        }
    }
    
    // panning slider callback
    const panControl = document.querySelector('[data-action="pan"]');
    panControl.circularSliderCallback = function() {
        setPanning();
    };
    panControl.value = 0.0;
    setDistributed(0.0);
    setPanning();
}

function setupAnalyzingNodes(numNodes) 
{
    console.assert(numNodes > 0, "Num nodes shouldn't be zero!");
    console.assert(numNodes == NUM_FILES, "Num nodes should equal to num audio elements!");
    
    //----------------------------------------------------------------------------//
    // ------------------------ INIT + CONNECT AUDIONODES ------------------------//
    for(var i = 0; i < numNodes; i++) 
    {
        analyserNodes[i] = audioContext.createAnalyser();
        analyserNodes[i].smoothingTimeConstant = 0.85;
        analyserNodes[i].fftSize = 1024;
    }
    
    log("Analyzing nodes initialized");
}
function connectAnalyzingNodes(startNodes) 
{
    console.assert(startNodes != null);
    const numNodes = startNodes.length;
    console.assert(numNodes != 0);
    console.assert(numNodes == NUM_FILES, "analyzing nodes has a different amount of inputs then the number of audiofiles presented (given:"+numNodes+")");
    console.assert(numNodes == NUM_FILES, "numNodes ("+numNodes+") should be NUM_FILES!");
    console.assert(startNodes.length == numNodes, "startNodes ("+startNodes.length+") is not of same length as numNodes ("+numNodes+")!");
    
    for(var i = 0; i < numNodes; i++) 
    {
        startNodes[i].connect(analyserNodes[i]);
    }
    
    log("Analyzing nodes connected");
}

function setupDrawingFunctions() 
{
    positionableElements = new PositionableElementsContainer();
    positionableElements.addElement(
        (newPosition)=>{ audioListener.setListenerPosition(newPosition[0], audioListener.listenerPosition[1], newPosition[1]); }
        , ()=>{ return [audioListener.x, audioListener.z]; }
        , ()=>{ return audioListener.horizontalAngle; } 
        , ["M 2454 3791 c -21 -34 -48 -64 -59 -66 -11 -3 -48 -9 -83 -15 -284 -49 -563 -237 -737 -499 -59 -89 -154 -285 -155 -318 0 -7 -11 -13 -24 -13 -18 0 -27 -8 -35 -30 -6 -20 -17 -30 -30 -30 -49 0 -81 -110 -81 -279 1 -145 26 -248 67 -266 15 -6 23 -21 28 -54 10 -65 61 -214 102 -296 157 -313 425 -536 755 -627 76 -21 104 -23 318 -23 214 0 242 2 318 23 330 91 598 314 755 627 41 82 92 231 102 296 5 33 13 48 28 54 78 35 93 409 21 523 -8 12 -24 22 -35 22 -13 0 -24 10 -30 30 -9 23 -17 30 -37 30 -25 0 -30 9 -65 99 -147 386 -494 672 -892 736 -85 14 -92 17 -120 52 -16 20 -39 48 -51 61 l -20 25 -40 -62 z m 178 -146 c 308 -41 584 -210 751 -462 94 -141 177 -353 193 -488 l 6 -53 -48 -10 c -27 -6 -112 -20 -189 -33 l -141 -22 -314 130 -315 130 -3 -749 -2 -748 -50 0 -50 0 -2 748 -3 749 -314 -130 -315 -130 -110 17 c -61 10 -149 25 -195 33 l -83 16 6 52 c 16 135 100 347 193 488 165 248 443 421 742 462 125 17 119 17 243 0"
        , "M 2084 3309 c -41 -45 -15 -159 36 -159 31 0 55 39 55 90 0 51 -24 90 -55 90 -9 0 -25 -9 -36 -21"
        , "M 2844 3309 c -41 -45 -15 -159 36 -159 31 0 55 39 55 90 0 51 -24 90 -55 90 -9 0 -25 -9 -36 -21 z"]
    );
    for(var i = 0; i < NUM_FILES; i++) {
        positionableElements.addElement(
            function(i) {
                return (newPosition)=>{ 
                    panner[i].setPosition( newPosition[0], this.panner[i].positionY, newPosition[1] );
                    var staticPosition = globals.fromRotatedPositionToStaticPosition(i);
                    panner[i].hg_staticPosX = staticPosition[0];
                    panner[i].hg_staticPosZ = staticPosition[1];
                    if(USE_REVERB_NODES) {
                        binauralReverb.calculateGains();
                    }
                }
            }(i) 
            , function(i) {
                return ()=>{ return[panner[i].positionX, panner[i].positionZ]; }
            }(i)
            , function(i) {
                return ()=>{ return panner[i].hg_angle; }
            }(i)
            // wikimedia svg: https://upload.wikimedia.org/wikipedia/commons/2/21/Speaker_Icon.svg
            , ["M 39.389 13.769 L 22.235 28.606 L 6 28.606 L 6 47.699 L 21.989 47.699 L 39.389 62.75 L 39.389 13.769 z"
            , "M 48 27.6 a 19.5 19.5 0 0 1 0 21.4"
            , "M 55.1 20.5 a 30 30 0 0 1 0 35.6"
            , "M 61.6 14 a 38.8 38.8 0 0 1 0 48.6"]
        );
        positionableElements.setDrawSize(i+1, 8);
    }
    if(USE_REVERB_NODES) {
        for(var i = 0; i < binauralReverb.NUM_NODES; i++) {
            positionableElements.addElement(
                function(i) {
                    return (newPosition)=>{
                        binauralReverb.pannerNodes[i].setPosition( newPosition[0], binauralReverb.pannerNodes[i].positionY, newPosition[1] );
                    }
                }(i) 
                , function(i) {
                    return ()=>{ return[ binauralReverb.pannerNodes[i].positionX , binauralReverb.pannerNodes[i].positionZ ]; }
                }(i)
                , ()=>{ return 0.0; }
            );
            positionableElements.setDrawSize(i+1+NUM_FILES, 4);
        }
    }
    
    //----------------------------------------------------------------------------//
    // -------------------- ASSERT, PRIVATE FUNCTIONS & MAIN VARIABLES -----------//
    
    // convert time to string
    function convertElapsedTime(inputSeconds) 
    {
        var seconds = Math.floor(inputSeconds % 60)
        if (seconds < 10) 
        {
            seconds = "0" + seconds
        }
        var minutes = Math.floor(inputSeconds / 60)
        return minutes + ":" + seconds
    }
    
    function getAverageVolume(array) 
    {
        const length = array.length;
        
        var values = 0;
        for (var i = 0; i < length; i++) 
            values += array[i];
        
        return values / length;
    }
    
    //----------------------------------------------------------------------------//
    // ------------------------ DRAWING VARIABLES   ------------------------------//
    function setDrawingVariables() {
        vars.drawSpaceCanvas = new Rectangle(0, 0, drawCanvas.width, drawCanvas.height);

        vars.canvasXMid = 0.5 * vars.drawSpaceCanvas.w;
        vars.canvasYMid = 0.5 * vars.drawSpaceCanvas.h;
        
        // canvas internalWidth to screenWidth multiplier
        vars.windowTocanvasMultX = vars.drawSpaceCanvas.w / drawCanvas.offsetWidth;
        vars.canvasToWindowMultX = 1 / vars.windowTocanvasMultX;
        vars.windowTocanvasMultY = vars.drawSpaceCanvas.h / drawCanvas.offsetHeight;
        vars.canvasToWindowMultY = 1 / vars.windowTocanvasMultY;

        // const isInsideScreen = vars.drawSpaceCanvas.isInside(vars.windowDragX, vars.windowDragY);
        vars.viewDistance = /*isInsideScreen ? SPEAKER_DIST * 1.1 * vars.viewDistance :*/ vars.viewDistance;
        
        vars.positionToCanvasMultY = vars.drawSpaceCanvas.h / vars.viewDistance; // for converting the actual positions to pixel coordinates
        vars.positionToCanvasMultX = vars.drawSpaceCanvas.w / vars.viewDistance; // for converting the actual positions to pixel coordinates
        
        vars.canvasRad = vars.RAD * vars.positionToCanvasMultY;
        vars.canvasDiam = vars.DIAM * vars.positionToCanvasMultY; 

        positionableElements.updateDrawingVariables();
        
        debugDrawingVariables(2);
    }
    function debugDrawingVariables(debugamount) {
        if(debugamount >= -2 && debugamount <= 10) {
            const debuglevel = debugamount;
            log("vars.drawSpaceCanvas: "+ vars.drawSpaceCanvas, debuglevel);
            log("vars.canvasXMid: "+ vars.canvasXMid, debuglevel);
            log("vars.canvasYMid: "+ vars.canvasYMid, debuglevel);
            log("vars.windowTocanvasMultX: "+ vars.windowTocanvasMultX, debuglevel);
            log("vars.canvasToWindowMultX: "+ vars.canvasToWindowMultX, debuglevel);
            log("vars.windowTocanvasMultY: "+ vars.windowTocanvasMultY, debuglevel);
            log("vars.canvasToWindowMultY: "+ vars.canvasToWindowMultY, debuglevel);        
            log("vars.viewDistance: "+ vars.viewDistance, debuglevel);
            log("vars.positionToCanvasMultY: "+ vars.positionToCanvasMultY, debuglevel);
            log("vars.positionToCanvasMultX: "+ vars.positionToCanvasMultX, debuglevel);
            log("vars.canvasRad: "+ vars.canvasRad, debuglevel);
            log("vars.canvasDiam: "+ vars.canvasDiam, debuglevel);
        }
    }
    setDrawingVariables();
    
    //----------------------------------------------------------------------------//
    // ------------------------ LISTENER EVENTS FROM CANVAS BUTTOn ---------------//
    var canvasButton = document.getElementById("drawCanvasButtons");
    // console.log("canvasButton", canvasButton)
    for(var i = 0; i < canvasButton.children.length; i++) {
        canvasButton.children[i].addEventListener("mousedown", function(i) {
            return function() {
                vars.drawMode = (i+1) % 3;
                log("drawmode = " + vars.drawMode);
            }
        }(i));
    }
    function canvasMouseUp(e) {
        vars.isMouseDown = false;
        // getMouseDown(e);
        // setDrawingVariables();
        // const mousePositionCanvas = [vars.windowTocanvasMultX * vars.windowMouseDownX, vars.windowTocanvasMultY * vars.windowMouseDownY];
        
        if(vars.drawMode == 1) {
            positionableElements.mouseUp();
        } else if(vars.drawMode == 2) {
            const val = tracks.duration * ( mousePositionCanvas[0] / drawCanvas.width );
            // tracks.playAllFromTimePoint(val);
        }
    }
    drawCanvas.addEventListener("mouseup", (e) => { canvasMouseUp(e); });
    drawCanvas.addEventListener("touchend", (e) => {
        e.preventDefault();
        canvasMouseUp(e);
        positionableElements.touchEnd();
    }, { passive:false });
   
    //----------------------------------------------------------------------------//
    // ------------------------ LISTENER EVENTS FROM CANVAS  ---------------------//
    function getEventX(e) { return (e.clientX != null ? e.clientX : e.changedTouches[0].clientX); }
    function getEventY(e) { return (e.clientY != null ? e.clientY : e.changedTouches[0].clientY); }
    
    drawCanvas.addEventListener("touchstart", (e) => {
        e.preventDefault();
        canvasMouseDown(e);
    }, { passive:false });
    drawCanvas.addEventListener("mousedown", (e) => {
        canvasMouseDown(e);
    }, false);
    function getMouseDown(e) {
        setDrawingVariables();
        vars.isMouseDown = true;
        vars.windowMouseDownX = getEventX(e) - drawCanvas.offsetLeft;
        vars.windowMouseDownY = getEventY(e) - drawCanvas.offsetTop;
    }
    function canvasMouseDown(e) {
        setDrawingVariables();
        getMouseDown(e);
        
        const mousePositionCanvas = [vars.windowTocanvasMultX * vars.windowMouseDownX, vars.windowTocanvasMultY * vars.windowMouseDownY];
        if(vars.drawMode == 1) {
            
            var elementBeingDragged = positionableElements.mouseDown(mousePositionCanvas);
            
            // listener direction
            if(!elementBeingDragged) {
                const listenerPositionCanvas = positionableElements.getDrawSpace(0);
                const x = vars.windowTocanvasMultX * vars.windowMouseDownX - ( listenerPositionCanvas.x + 0.5 * listenerPositionCanvas.w );
                const z = vars.windowTocanvasMultX * vars.windowMouseDownY - ( listenerPositionCanvas.y + 0.5 * listenerPositionCanvas.h );
                audioListener.setListenerDirection(x, 0, -z);
            }
        } else if(vars.drawMode == 2) {
            // tracks.stopAll();
        }
    }

    drawCanvas.addEventListener("touchmove", (e) => {
        e.preventDefault();
        canvasMove(e);
    }/*, vars.hoverListener ? { passive:false } : { passive:true }*/);
    drawCanvas.addEventListener("mousemove", (e) => {
        canvasMove(e);
    }, false);
    function canvasMove(e) {
        if(vars.drawMode == 1) 
        {
            setDrawingVariables();
            vars.windowDragX = getEventX(e) - drawCanvas.offsetLeft;
            vars.windowDragY = getEventY(e) - drawCanvas.offsetTop;
            
            const mousePosOnCanvas = [vars.windowTocanvasMultX * vars.windowDragX, vars.windowTocanvasMultY * vars.windowDragY];
            positionableElements.mouseMove(mousePosOnCanvas);
            
            // mouse drag
            if(vars.isMouseDown) {
                const canvasXDistanceFromDragStart = (vars.windowDragX - vars.windowMouseDownX) * vars.windowTocanvasMultX;
                const canvasYDistanceFromDragStart = (vars.windowDragY - vars.windowMouseDownY) * vars.windowTocanvasMultX;
                const dragDistanceOnCanvas = [canvasXDistanceFromDragStart / vars.positionToCanvasMultX, canvasYDistanceFromDragStart / vars.positionToCanvasMultY];
                
                var elementIsBeingDragged = positionableElements.mouseDrag( dragDistanceOnCanvas );
                
                // listener direction
                if(!elementIsBeingDragged) {
                    const listenerPositionCanvas = positionableElements.getDrawSpace(0);
                    var x = vars.windowTocanvasMultX * vars.windowDragX - ( listenerPositionCanvas.x + 0.5 * listenerPositionCanvas.w );
                    var z = vars.windowTocanvasMultX * vars.windowDragY - ( listenerPositionCanvas.y + 0.5 * listenerPositionCanvas.h );
                    audioListener.setListenerDirection(x, 0, -z);
                }
                globals.setPanning();
            }
        }
    }

    //----------------------------------------------------------------------------//
    // ------------------------ DRAWING THE CANVAS  ------------------------------//
    const drawArray = new Uint8Array(analyserNodes[0].frequencyBinCount);
    function draw() 
    {
        // init draw loop???? (recursion?)
        drawVisual = requestAnimationFrame(draw);
        setDrawingVariables();
        
        // draw background
        drawContext.clearRect(0, 0, vars.drawSpaceCanvas.w, vars.drawSpaceCanvas.h);
        drawContext.fillStyle = vars.backColor;
        drawContext.fillRect(0, 0, vars.drawSpaceCanvas.w, vars.drawSpaceCanvas.h);

        // get average gain for all audiofiles
        var average = [];
        for(var i = 0; i < NUM_FILES; i++) 
        {
            analyserNodes[i].getByteFrequencyData(drawArray);
            average[i] = getAverageVolume(drawArray) / 130;
        }
        
        // draw all elements
        if(vars.drawMode == 0) {    // draw track gain meters
            const bottombar = Math.max(vars.drawSpaceCanvas.h / 12, 20);
            const height = vars.drawSpaceCanvas.h - bottombar;
            const widthPerElement = vars.drawSpaceCanvas.w / NUM_FILES;

            for(var i = 0; i < NUM_FILES; i++) 
            {
                log(average[i], 1);
                const audioEl = tracks.getAudioTrack(i);
                const currentTime = convertElapsedTime(audioEl.currentTime);
                const x = i * widthPerElement;
                
                // draw meters
                drawContext.fillStyle = colorFromAmplitude(average[i]);
                const gainYPos = height - height * average[i];
                drawContext.fillRect(x, gainYPos, widthPerElement - 3, height - gainYPos);
                
                // report whether sync!
                var durationIsSync = true;
                for(var j = 0; j < NUM_FILES; j++) 
                {
                durationIsSync = Math.abs(audioEl.currentTime - tracks.getAudioTrack(j).currentTime) >= 0.1 ? false : durationIsSync; 
                }
                if(!durationIsSync) 
                {
                    drawContext.fillStyle = "rgba(150, 0, 0, 0.4)";
                    drawContext.fillRect(x, height, widthPerElement, bottombar );
                    if(SHOULD_LOG >= 2) 
                    {
                        var toPrint = "";
                        for(var j = 0; j < NUM_FILES; j++) {
                            toPrint += convertElapsedTime(document.getElementsByTagName("audio")[j].currentTime)+", ";
                        }
                        log("["+toPrint+"]", 2);
                    }
                }

                // draw duration
                const duration = convertElapsedTime(audioEl.duration);
                drawContext.fillStyle = "rgba(0, 0, 0, 1)";
                drawContext.font = 'normal bold '+bottombar/3+'px sans-serif'; 
                drawContext.textAlign = 'center'; 
                drawContext.fillText(currentTime+"/"+duration, x + 0.5 * widthPerElement, vars.drawSpaceCanvas.h - 0.5 * (vars.drawSpaceCanvas.h - height) );
            }
        } 
        else if(vars.drawMode == 1)
        {    
            // draw axis
            drawContext.strokeStyle = vars.midColor;
            drawContext.lineWidth = 2;
            drawContext.beginPath();
            drawContext.moveTo(vars.canvasXMid, 0);
            drawContext.lineTo(vars.canvasXMid, vars.drawSpaceCanvas.h);
            drawContext.moveTo(0, vars.canvasYMid);
            drawContext.lineTo(vars.drawSpaceCanvas.w, vars.canvasYMid);
            drawContext.stroke();
            
            // draw elements
            for(var i = 0; i < positionableElements.positionableElements.length; i++) {
                if(i == 0) {
                    drawContext.fillStyle = vars.frontColor;
                } else if(i < 1 + NUM_FILES) {
                    drawContext.fillStyle = colorFromAmplitude(average[i-1], 0.5);
                }
            
                positionableElements.drawElement(i);
            }
            
            // draw speaker numbers
            for(var i = 0; i < NUM_FILES; i++) {
                const drawSpace = positionableElements.getDrawSpace(i+1);
                const speakerXMid = drawSpace.x + 0.5 * drawSpace.w;
                const speakerYMid = drawSpace.y + 0.5 * drawSpace.h;
                drawContext.fillStyle = vars.frontColor
                drawContext.font = 'normal '+ (10 + vars.canvasRad  * 0.5) + 'px sans-serif'; 
                drawContext.textAlign = 'center'; 
                // drawContext.fillText( i+1, speakerXMid - 0.5*vars.canvasRad, speakerYMid - 0.5*vars.canvasRad  );
                drawContext.fillText( i+1, drawSpace.x - 10, drawSpace.y - 10  );
            }
        } 
        else 
        {
            var width = drawContext.canvas.width;
         
            const audioEl = tracks.getAudioTrack(0);
            const progress = audioEl.currentTime / audioEl.duration;
            
            drawContext.strokeStyle = vars.midColor;
            drawContext.lineWidth = width / 100;
            drawContext.beginPath();
            drawContext.moveTo(progress * width, 0);
            drawContext.lineTo(progress * width, drawContext.canvas.height);
            drawContext.stroke();
            
            for(var i = 0; i < NUM_FILES; i++) {
                drawContext.fillStyle = vars.frontColor;
                drawContext.save();
                drawContext.translate(0, (i / NUM_FILES) * width);
                drawContext.scale( width, (1 / NUM_FILES) * width);
                drawContext.fill( tracks.nodes[i].waveform );
                drawContext.restore();
            }
            
        }
        
                
        // autorotate
        if(false) {
            var panControl = document.querySelector('[data-action="pan"]');
            panControl.value = (parseFloat(panControl.value) + 0.01) % (2 * Math.PI);
            globals.setPanning();
            // document.getElementById("debug-dist").innerHTML = panControl.value;
        }
        
        log("canvas updated", 1);
    };
    draw();
}




/*-----------------------------------------------------------------------------------------------------------------*/
/*--------------------------------------------- loading resources  ------------------------------------------------*/
/*-----------------------------------------------------------------------------------------------------------------*/

var canplay = false;
var reverbready = USE_REVERB_NODES ? false : true;

function initIfAllLoaded() {
    var al = true;
    
    // check whether all tracks are loaded
    if(canplay != true)
        al = false;
    
    if(!reverbready)
        al = false;
    
    if(al) {
        log("init called");
        enableInteractions();
        log("init finished");
        
        // enable view
        var loaddiv = document.getElementById("loading screen");
        loaddiv.style.display = "none";
        var playerdiv = document.getElementById("octophonic player");
        playerdiv.style.display = "flex";
    }
}

// RUN EVERYTHING
jQuery('document').ready(() => {
    // load all tracks
    tracks = new MultiPreloadedAudioNodes(urls, ()=> { canplay = true; initIfAllLoaded(); } );
    
    if(USE_REVERB_NODES) {
        binauralReverb = new BinauralReverb( ()=> { 
            reverbready = true;
            for(var i = 0; i < NUM_FILES; i++) {
                binauralReverb.connectToReverb(panner[i]);
            }
            initIfAllLoaded(); 
        } );
    }

    // initialize all nodes
    initNodes();
});










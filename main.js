const NUM_FILES = urls.length;
const EXPERIMENTAL_REVERB_ENABLED = false;
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

const SPEAKER_DIST = 20.0;

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

/*
const reverbGainNode = USE_REVERB_NODES ? audioContext.createGain() : null;
var reverbNodes = USE_REVERB_NODES ? [] : null;
var tempgainNodes = USE_REVERB_NODES ? [] : null;
*/
    
const trackGainNode = audioContext.createGain();
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
    // state switch between drawmodes
    drawMode = 1;
    
    // drawing look constants
    get DIAM() { return 3 };
    get RAD() { return 0.5*this.DIAM };
    get EXTRA_VIEW_RAD() { return 1.4; };
    get R_EXTRA_VIEW_RADIUS() { return 1 / this.EXTRA_VIEW_RAD; };

    viewDistance = SPEAKER_DIST;
    
    speakerPositionCanvas = [];
    speakerPositionXOnMouseDown = [];
    speakerPositionZOnMouseDown = [];
    speakerIsBeingDragged = [];
    
    constructor() {}
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
        var val = Math.atan2(x, y) + 2 * Math.PI;
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
    LISTENER_INITIAL_X = 0;
    LISTENER_INITIAL_Y = 0;
    LISTENER_INITIAL_Z = 0;
    
// private
    listener = audioContext.listener;
    listenerPosition = [0, 0, 0];
    listenerDirection = [0, 0, 0];
    listenerHorizontalAngle = 0;
    
// public
    constructor() {
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
        
        this.listenerPosition[0] = x;
        this.listenerPosition[1] = y;
        this.listenerPosition[2] = z;
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
        this.listenerDirection = [x, y, z];
        
        this.listenerHorizontalAngle = globals.getAngle(x, z);
    }
    
    get x() { return this.listenerPosition[0]; }
    get y() { return this.listenerPosition[1]; }
    get z() { return this.listenerPosition[2]; }
    get listenerPosition() { return this.listenerPosition; }
    get listenerDirection() { return this.listenerDirection; }
    get horizontalAngle() { return this.listenerHorizontalAngle; }
    get horizontalAngleInDegrees() { return parseInt(360 * (this.listenerHorizontalAngle / (2 * Math.PI))); }
    get initialPosition() { return [this.LISTENER_INITIAL_X, this.LISTENER_INITIAL_Y, this.LISTENER_INITIAL_Z]; }
    
    get info() { return "AudioListener: " + "pos(" + this.listenerPosition + "); dir(" + this.listenerDirection + "); angle(" + this.horizontalAngleInDegrees + ", " + globals.angleToArrow(this.horizontalAngle) + ");" }
    log() { console.log(this.info); }
};
var audioListener = new AudioListener();
audioListener.log();



class PreloadedAudioNode {
// private
    source = audioContext.createBufferSource();
    audioBuffer = null;
    loglevel = 1;
    connectedNodes = [];
    fileExists = null;
    fileURL = null;
    
    reloadBufferSource() {
        this.source = audioContext.createBufferSource(); // creates a sound source
        this.source.buffer = this.audioBuffer;
        for(var i = 0; i < this.connectedNodes.length; i++) {
            this.source.connect(this.connectedNodes[i]);
        }
    }
// public
    constructor(url, callback, loadingCallback=null) {
        this.loadSound(url, callback, loadingCallback);
    }

    connect(node) {
        this.source.connect(node);
        this.connectedNodes.push(node);
    }
    disconnect(node) {
        this.source.disconnect(node);
        this.connectedNodes = this.connectedNodes.filter( function(e) { return e == node; } );
    }
    
    get node() { return source; }
    get duration() { return this.audioBuffer.duration; } 
    get currentTime() { 
        var time = this.paused ? this.pausedAt / 1000 : (Date.now() - this.startedAt) / 1000;
        return time > this.duration ? 0 : time;
    }

    loadingProgress = 0;  // value from 0 to 1
    fileSize = 0;
    
    loadSound(url, callback, loadingCallback = null) {
      this.fileURL = url;
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

                log("PreloadedAudioNode, calling callback", thisclass.loglevel);
                if(typeof callback == "function") {
                    callback();
                } else {
                    console.error("callback is not a function");
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
    startedAt = 0;
    pausedAt = 0;
    paused = false;
    
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
                this.source.start(timeToPlay, this.pausedAt / 1000);
            }
        }
        else {
            log("PreloadedAudioNode: start playing", this.loglevel);
            this.startedAt = Date.now();
            this.source.start(timeToPlay);
        }
    };

    stop(timeToPlay=0) {
        log("PreloadedAudioNode: stop playing called", this.loglevel);
        this.source.stop(timeToPlay);
        this.reloadBufferSource();
        
        this.pausedAt = Date.now() - this.startedAt;
        this.paused = true;
    };
};




class MultiPreloadedAudioNodes {
// private
    loglevel = 1;

    numfiles = 0;
    urls = [];
    nodes = [];
    
    allLoaded = false;
    loadedStates = [];

// public
    constructor(urls, onLoadedCallback = null) {
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
        log("MultiPreloadedAudioNodes, play all", this.loglevel);
        for(var i = 0; i < this.numfiles; i++) {
            this.nodes[i].play(timeToPlay);
        }
    }
    
    stopAll(timeToStop=0) {
        log("MultiPreloadedAudioNodes, stop all", this.loglevel);
        for(var i = 0; i < this.numfiles; i++) {
            this.nodes[i].stop(timeToStop);
        }
    }

    getAudioTrack(i) { return this.nodes[i]; }
    
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
//private
    panner = null;
    // horizontalDirection = 0;
    horizontalAngleFromCenter = 0;
    position = [0, 0, 0];
    orientation = [0, 0, 0];
    
//public
    constructor() {
        this.panner = new PannerNode(audioContext, 
        {
            panningModel: 'HRTF',
            distanceModel: 'inverse',
            refDistance: 1,                     // 0 - INF  def: 1
            maxDistance: 10000,                 // 0 - INF  def: 10000
            rolloffFactor: 0.5,                   // 0 - 1    def: 1
            coneInnerAngle: 50,
            coneOuterAngle: 150,
            coneOuterGain: 0.3
        });
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
        this.position = [xPos, yPos, zPos];
        
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
        this.orientation = [x, y, z];
    }
    
    get orientation() { return this.orientation };
    get position() { return this.position };
    get positionX() { return this.position[0]; }
    get positionY() { return this.position[1]; }
    get positionZ() { return this.position[2]; }
    get node() { return this.panner; }
    get horizontalAngleFromCenterInDegrees() { return parseInt(360 * (this.horizontalAngleFromCenter / (2 * Math.PI))); }
    
    connect(node) { this.panner.connect(node); }
    
    get info() { return "BinauralPanner: " + "pos(" + this.position + ");\t horizontalAngleFromCenter(" + this.horizontalAngleFromCenterInDegrees + ", " + globals.angleToArrow(this.horizontalAngleFromCenter) + ");\t dir(" + this.orientation + ");" }
    log() { console.log(this.info); }
}



class PositionableElement {
    svg = null;
    
    drawRadius = vars.canvasRad;
    drawSize = 10;
    drawSpaceOnCanvas = new Rectangle(0, 0, 2 * this.drawRadius, 2 * this.drawRadius);
    hoveredOver = false;
    isBeingDragged = false;
    
    elementPositionOnMouseDown = [0, 0];
    
    // THESE FUNCTIONS WILL HANDLE CANVAS <-> AUDIO POSITION CONVERSION
    // function to set the position of the element from canvas coordinates
    setPositionFromCanvasFunction = null;
    // function to get the drawPosition of the element
    getPositionFromElementFunction = null;
    getAngleFunction = null;
    
    constructor(setPositionFromCanvasFunction, getPositionFromElementFunction, getAngleFunction = null, svg = null) {
        this.setPositionFromCanvasFunction = setPositionFromCanvasFunction;
        this.getPositionFromElementFunction = getPositionFromElementFunction;
        this.getAngleFunction = getAngleFunction;
        this.updateDrawingVariables();
        
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
        this.drawRadius = vars.canvasRad;    
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
            drawPath( this.svg, this.getAngleFunction(), this.drawSpaceOnCanvas.x + 0.5 * this.drawSpaceOnCanvas.w, this.drawSpaceOnCanvas.y + 0.5 * this.drawSpaceOnCanvas.h, (this.hoveredOver ? 1.2 : 1) * this.drawSize * vars.DIAM * vars.windowTocanvasMultX);
        } else {
            drawContext.beginPath();
            drawContext.rect(this.drawSpaceOnCanvas.x, this.drawSpaceOnCanvas.y, this.drawSpaceOnCanvas.w, this.drawSpaceOnCanvas.h);
            drawContext.stroke();
        }
    }   
    get drawSpace() { return this.drawSpaceOnCanvas; } 
    get hovered() { return this.hoveredOver; }
};




class PositionableElementsContainer {
    positionableElements = [];
    
    constructor() {};
    
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
    
    // draw()
    getDrawSpace(i) { return this.positionableElements[i].drawSpace; }
    isHovered(i) { return this.positionableElements[i].hovered; }
    setDrawSize(i, size) { this.positionableElements[i].drawSize = size; }
    draw() {
        for(var i = 0; i < this.positionableElements.length; i++) {
            this.positionableElements[i].draw();
        }
    }
    drawElement(i) {
        this.positionableElements[i].draw();
    }
}



/*-----------------------------------------------------------------------------------------------------------------*/
/*---------------------------------------------  Testing       ----------------------------------------------------*/
/*-----------------------------------------------------------------------------------------------------------------*/



class BinauralReverb {
//private
    init_reverb_level = 0.7;
    relativeReverbDistance = 1.5;
    
    NUM_NODES = 3;
    pannerNodes = [];
    reverbNodes = [];
    
    gainNodes = [];
    connectedNodes = [];
    reverbGainNode = audioContext.createGain();
        
    setDistributed() {
        const angle = 0;
        const toAdd = 2 * Math.PI / this.NUM_NODES;
        
        for(var i = 0; i < this.NUM_NODES; i++) {
            const r = vars.R_EXTRA_VIEW_RADIUS * this.relativeReverbDistance * SPEAKER_DIST * 0.5;
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

    reverbUrl = "http://reverbjs.org/Library/AbernyteGrainSilo.m4a";
    // reverbUrl = "http://reverbjs.org/Library/DomesticLivingRoom.m4a";
    
    reverbsLoaded = [];
    loadReverb(onLoadedCallback) {
        for(var i = 0; i < this.NUM_NODES; i++) {
            this.reverbsLoaded[i] = false;
            var that = this;
            
            this.reverbNodes[i] = audioContext.createReverbFromUrl(this.reverbUrl, function(_i) {
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
        this.reverbURL = reverbURL;
        this.loadReverb(onLoadedCallback);

        for(var i = 0; i < this.NUM_NODES; i++) {
            this.pannerNodes[i] = new BinauralPanner();
            this.pannerNodes[i].connect( this.reverbNodes[i] );
            this.reverbNodes[i].connect( this.reverbGainNode );
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
            newGainNodes[i].connect( this.pannerNodes[i].node );
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
                this.gainNodes[index][i].disconnect( this.pannerNodes[i].node );
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


// class OctophonicReverb {
    
// }








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
        panner[i].connect(trackGainNode);
    }
    
    if(USE_REVERB_NODES) {
        setupReverbNodes(tracks.nodes, masterGainNode);
    }
    
    trackGainNode.connect(masterGainNode);
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
    trackGainNode.gain.value = track_init_volume;
    
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
            trackGainNode.gain.value = this.value;
            log("track gain: ", trackGainNode.gain.value, 1 );
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
    
    binauralReverb.calculateGains();
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

/*
function setupReverbNodes(inputNodes, endNode) 
{

    if(USE_REVERB_NODES) 
    {
        if(EXPERIMENTAL_REVERB_ENABLED) {
            for(var index = 0; index < reverbNodes.length; index++) {
                tempgainNodes[index] = [];
                for(var i = 0; i < reverbNodes.length; i++) {
                    tempgainNodes[index][i] = audioContext.createGain();
                    tempgainNodes[index][i].gain.value = Math.pow(0.9, 1+25*Math.abs((i-index)/reverbNodes.length));
                }
            }
        }
        
        const reverbControl = document.querySelector('[data-action="reverb"]');
        const reverbButton = document.getElementById("reverbbutton");

        var reverbOn = false;
        
        //-----------------------------------------------------------------------------------------------//
        // ----------------------- CONNECT REVERB TO ALL TRACKS FUNCTION-------------------------------- //
        function connectToReverbNodes(track_to_connect, index) 
        {
            if(!EXPERIMENTAL_REVERB_ENABLED) {
                track_to_connect.connect(reverbNodes[index]);
            } else {
                for(var i = 0; i < reverbNodes.length; i++) {
                    track_to_connect.connect(tempgainNodes[index][i]).connect(reverbNodes[i]);
                }
            }
            // reverbNodes[index].connect(analyserNodes[index]);
        }
        
        function connectReverb(shouldConnect) 
        {
            if(shouldConnect) 
            {
                for(var i = 0; i < inputNodes.length; i++) 
                {
                    connectToReverbNodes(inputNodes[i], i);
                    reverbNodes[i].connect(panner[inputNodes.length+i].node).connect(reverbGainNode);
                }
                reverbGainNode.connect(endNode);
            }
            else {
                // disconnect
                for(var i = 0; i < inputNodes.length; i++) 
                {
                    if(EXPERIMENTAL_REVERB_ENABLED) 
                    {
                        for(var j = 0; j < inputNodes.length; j++) 
                        {
                            inputNodes[i].disconnect(tempgainNodes[i][j]);
                            tempgainNodes[i][j].disconnect(reverbNodes[j]);
                        }
                    } 
                    else 
                    {
                        inputNodes[i].disconnect(reverbNodes[i]);
                    }
                    reverbNodes[i].disconnect(panner[inputNodes.length+i].node);
                    panner[inputNodes.length+i].node.disconnect(reverbGainNode);
                    // reverbNodes[i].disconnect(analyserNodes[i]);
                }
                reverbGainNode.disconnect(endNode);
            }
        }
        
        //----------------------------------------------------------------------------//
        // ----------------------- SET REVERB ELEMENTS------------------------------- //
        
        const init_reverb_level = 0.5;
        reverbGainNode.gain.value = init_reverb_level;
        reverbControl.value = init_reverb_level;
        reverbControl.addEventListener('input', 
            function() 
            {
                reverbGainNode.gain.value = this.value;
                log("reverb gain: ", reverbGainNode.gain.value, 1 );
            }
        , false);
        
        function toggleReverb(onOff) 
        {
            const wasAlreadySet = reverbOn == onOff;
            reverbOn = onOff != null ? onOff : !reverbOn;

            if(!reverbOn) 
            {
                if(!wasAlreadySet)
                    connectReverb(false);
                reverbButton.innerHTML = "reverb off";
            } 
            else 
            {
                if(!wasAlreadySet)
                    connectReverb(true);
                reverbButton.innerHTML = "reverb on";
            }
            console.log(reverbOn);
        }
        toggleReverb(reverbOn);
        
        reverbButton.addEventListener('click', 
            function() 
            {
                toggleReverb();
            }
        );

        //----------------------------------------------------------------------------//
        // ----------------------- SET REVERB ------ -------------------------------- //
        if(reverbOn) 
        {
            connectReverb(true);
        }
    
    } 
    else 
    {
        reverbButton.style = "display:none;"
    }
}
*/

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
                    binauralReverb.calculateGains();
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
    for(var i = 0; i < binauralReverb.NUM_NODES; i++) {
        positionableElements.addElement(
            function(i) {
                return (newPosition)=>{}
            }(i) 
            , function(i) {
                return ()=>{ return[ binauralReverb.pannerNodes[i].positionX , binauralReverb.pannerNodes[i].positionZ ]; }
            }(i)
            , ()=>{ return 0.0; }
        );
        positionableElements.setDrawSize(i+1+NUM_FILES, 4);
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
    var canvasButton = document.getElementById("drawCanvasButton");
    canvasButton.addEventListener("mousedown", (e) => {
        vars.drawMode = ( vars.drawMode + 1 ) % 2;
        log("drawmode = " + vars.drawMode);
    });
    function canvasMouseUp() {
        vars.isMouseDown = false;
        if(vars.drawMode == 1) {
            positionableElements.mouseUp();
        }
    }
    drawCanvas.addEventListener("mouseup", (e) => { canvasMouseUp(); });
    drawCanvas.addEventListener("touchend", (e) => {
        e.preventDefault();
        canvasMouseUp();
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
        
        if(vars.drawMode == 1) {
            const mousePositionCanvas = [vars.windowTocanvasMultX * vars.windowMouseDownX, vars.windowTocanvasMultY * vars.windowMouseDownY];
            
            var elementBeingDragged = positionableElements.mouseDown(mousePositionCanvas);
            
            // listener direction
            if(!elementBeingDragged) {
                const listenerPositionCanvas = positionableElements.getDrawSpace(0);
                var x = vars.windowTocanvasMultX * vars.windowMouseDownX - ( listenerPositionCanvas.x + 0.5 * listenerPositionCanvas.w );
                var z = vars.windowTocanvasMultX * vars.windowMouseDownY - ( listenerPositionCanvas.y + 0.5 * listenerPositionCanvas.h );
                audioListener.setListenerDirection(x, 0, -z);
            }
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
        drawContext.fillStyle = "rgba(240, 240, 240, 0.6)";
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
        else 
        {    
            // draw axis
            drawContext.fillStyle = "rgba(180, 180, 180, 0.4)";
            drawContext.lineWidth = 1;
            drawContext.beginPath();
            drawContext.moveTo(vars.canvasXMid, 0);
            drawContext.lineTo(vars.canvasXMid, vars.drawSpaceCanvas.h);
            drawContext.moveTo(0, vars.canvasYMid);
            drawContext.lineTo(vars.drawSpaceCanvas.w, vars.canvasYMid);
            drawContext.stroke();
            
            // draw elements
            for(var i = 0; i < positionableElements.positionableElements.length; i++) {
                if(i == 0) {
                    drawContext.fillStyle = "rgba(120, 120, 120, 0.9)";
                    drawContext.lineWidth = 5;
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
                drawContext.fillStyle = "rgb(0, 0, 0)";
                drawContext.font = 'normal '+ vars.canvasRad  * 0.5 + 'px sans-serif'; 
                drawContext.textAlign = 'center'; 
                drawContext.fillText( i+1, speakerXMid - 0.5*vars.canvasRad, speakerYMid - 0.5*vars.canvasRad  );
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

var reverbNodesLoaded = [];
var canplay = false;
var reverbready = false;

function initIfAllLoaded() {
    var al = true;
    
    // check whether all tracks are loaded
    if(canplay != true)
        al = false;
    
    // check whether reverb nodes are loaded
    // if(USE_REVERB_NODES) {
        // for(var i = 0; i < NUM_FILES; i++) {
            // if(reverbNodesLoaded[i] != true)
                // al = false;
        // }
    // }
    
    if(!reverbready)
        al = false;
    
    if(al) {
        log("init called");
        enableInteractions();
        log("init finished");
        
        // enable view
        var loaddiv = document.getElementById("loading screen");
        loaddiv.style = "display:none";
        var playerdiv = document.getElementById("octophonic player");
        playerdiv.style = "";
    }
}

// RUN EVERYTHING
jQuery('document').ready(() => {
    // init reverb nodes
    /*if(USE_REVERB_NODES) {
        //------------------------ the reverb to use ------------------------------
        const reverbUrl = "http://reverbjs.org/Library/AbernyteGrainSilo.m4a";
        // var reverbUrl = "http://reverbjs.org/Library/DomesticLivingRoom.m4a";
        
        for(var i = 0; i < NUM_FILES; i++) {
            reverbNodesLoaded[i] = false;
            reverbNodes[i] = audioContext.createReverbFromUrl(reverbUrl, function(_i) {
                return function() {
                    reverbNodesLoaded[_i] = true;
                    initIfAllLoaded();
                }
            }(i));
        }
    }*/


    // load all tracks
    tracks = new MultiPreloadedAudioNodes(urls, ()=> { canplay = true; initIfAllLoaded(); } );
    binauralReverb = new BinauralReverb( ()=> { 
        reverbready = true;
        for(var i = 0; i < NUM_FILES; i++) {
            binauralReverb.connectToReverb(panner[i]);
        }
        initIfAllLoaded(); 
    } );

    // initialize all nodes
    initNodes();
});










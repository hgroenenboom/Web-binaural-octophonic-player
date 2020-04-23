// const audioElements = document.getElementsByTagName('audio');
const NUM_FILES = urls.length;
const USE_REVERB_NODES = true;
const EXPERIMENTAL_REVERB_ENABLED = false;
console.log("LOGGING LEVEL:",SHOULD_LOG);

// for cross browser way
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioContext;
audioContext = new AudioContext();

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
var tempgainNodes = [];
var reverbNodes = [];
var analyserNodes = [];

const reverbGainNode = audioContext.createGain();
const trackGainNode = audioContext.createGain();
const gainNode = audioContext.createGain();

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
log("Num audio sources found: "+ urls.length);

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
    speakerPositionYOnMouseDown = [];
    speakerIsBeingDragged = [];
    
    constructor() {}
};
// !!! extra variables will be dynamicly added to this object
vars = new DrawingVariables();



// empty container for functions that should be globally available
class GlobalFunctions {
    constructor() {}
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



class AudioListener {
// const
    LISTENER_INITIAL_X = 0;
    LISTENER_INITIAL_Y = 0;
    LISTENER_INITIAL_Z = 40;
    
// private
    listener = audioContext.listener;
    listenerPosition = [0, 0, 0];
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
        this.listenerHorizontalAngle = 3.14 + Math.atan2(-x, z);
        // console.log(this.listenerHorizontalAngle, x, z);
    }
    
    get x() { return this.listenerPosition[0]; }
    get y() { return this.listenerPosition[1]; }
    get z() { return this.listenerPosition[2]; }
    get listenerPosition() { return this.listenerPosition; }
    get horizontalAngle() { return this.listenerHorizontalAngle; }
    get initialPosition() { return [this.LISTENER_INITIAL_X, this.LISTENER_INITIAL_Y, this.LISTENER_INITIAL_Z]; }
};
var audioListener = new AudioListener();




class PreloadedAudioNode {
// private
    source = null;
    audioBuffer = null;
    loglevel = 1;
    connectedNodes = [];
    
    reloadBufferSource() {
        this.source = audioContext.createBufferSource(); // creates a sound source
        this.source.buffer = this.audioBuffer;
        for(var i = 0; i < this.connectedNodes.length; i++) {
            this.source.connect(this.connectedNodes[i]);
        }
    }
// public
    constructor(url, callback) {
        this.loadSound(url, callback);
    }

    connect(node) {
        this.source.connect(node);
        this.connectedNodes.push(node);
    }
    disconnect(node) {
        this.source.disconnect(node);
        this.connectedNodes = this.connectedNodes.filter( function(e) { return e == node; } );
    }
    
    get audioNode() { return source; }
    get duration() { return this.audioBuffer.duration; } 
    get currentTime() { 
        var time;
        if(this.paused) {
            time = this.pausedAt / 1000;
        } else {
            time = (Date.now() - this.startedAt) / 1000;
        }
        return time > this.duration ? 0 : time;
    }

    loadSound(url, callback) {
      var request = new XMLHttpRequest();
      request.open('GET', url, true);
      request.responseType = 'arraybuffer';
      
      var thisclass = this;
      
      // Decode asynchronously
      request.onload = function() {
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
            }(this, i)
            );
        }
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
    
    get nodes() { 
        var nodes = [];
        for(var i = 0; i < this.numfiles; i++) {
            nodes[i] = this.nodes[i].audioNode;
        }
        return nodes;
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




/*class BinauralPanner {
//private
    panner = null;
    
    // PANNER NODE SETTINGS
    pannerModel = 'HRTF';
    innerCone = 50;
    outerCone = 150;
    outerGain = 0.3;
    distanceModel = 'inverse';
    maxDistance = 10000;          // 0 - INF  def: 10000
    refDistance = 1;              // 0 - INF  def: 1
    rollOff = 1;                  // 0 - 1    def: 1
    positionX = audioListener.LISTENER_INITIAL_X;
    positionY = audioListener.LISTENER_INITIAL_Y;
    positionZ = audioListener.LISTENER_INITIAL_Z - 5;
    orientationX = 1.0;
    orientationY = 0.0;
    orientationZ = 0.0;
    
//public
    constructor() {
        panner = new PannerNode(audioContext, 
        {
            panningModel: this.pannerModel,
            distanceModel: this.distanceModel,
            positionX: this.positionX,
            positionY: this.positionY,
            positionZ: this.positionZ,
            orientationX: this.orientationX,
            orientationY: this.orientationY,
            orientationZ: this.orientationZ,
            refDistance: this.refDistance,
            maxDistance: this.maxDistance,
            rolloffFactor: this.rollOff,
            coneInnerAngle: this.innerCone,
            coneOuterAngle: this.outerCone,
            coneOuterGain: this.outerGain
        })
    }
}*/

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
console.assert(urls.length == NUM_FILES, "Audiosources is not "+NUM_FILES+"! ("+urls.length+")");

function init() 
{
    log("Start initializing");
    console.assert(audioContext);
    
    // ---- CREATE MASTER GAIN NODE
    const volumeControl = document.querySelector('[data-action="volume"]');
    const init_master_gain = 0.85;
    volumeControl.value = init_master_gain;
    gainNode.gain.value = init_master_gain;
    volumeControl.addEventListener('input', function() {
        gainNode.gain.value = this.value;
        log("master gain: "+ gainNode.gain.value, 1 );
    }, false);
    
    setupAnalyzingNodes(NUM_FILES);
    
    // ---- CONNECT ALL NODES
    // connect panning nodes
    const SHOULD_USE_PANNING_NODES = true;
    if(SHOULD_USE_PANNING_NODES) {
        setupPanningNodes(analyserNodes, trackGainNode);
        trackGainNode.connect(gainNode);
    }
    else {
        for(var i = 0; i < NUM_FILES; i++) {
            analyserNodes[i].connect(gainNode);
        }
    }

    setupAudioTrackNodes();
    
    var firstPanners = panner.slice(0, panner.length / 2);
    tracks.connectToNodes(analyserNodes);
    // tracks.connectToSingleNode(audioContext.destination);
    tracks.connectToNodes(firstPanners);
    
    setupReverbNodes(tracks.nodes, gainNode);
    
    setupDrawingFunctions();
    
    gainNode.connect(audioContext.destination);
    
    log("Finished initializing");
}

function setupAudioTrackNodes() 
{
    const trackVolumeControl = document.querySelector('[data-action="trackVolume"]');
    const playButton = document.getElementById('playbutton');
    
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
    playButton.addEventListener('click', 
        function() 
        {
            // check if context is in suspended state (autoplay policy)
            if (audioContext.state === 'suspended') {
                audioContext.resume();
                log("resuming audio context");
            }

            if (this.dataset.playing === 'false') 
            {
                tracks.playAll();
                this.dataset.playing = 'true';
            } 
            else if (this.dataset.playing === 'true') 
            {
                tracks.stopAll();
                log("supsended audio context");
                this.dataset.playing = 'false';
            }

            let state = this.getAttribute('aria-checked') === "true" ? true : false;
            this.setAttribute( 'aria-checked', state ? "false" : "true" );
        }
    , false);
    
}

function setupPanningNodes(inputNodes, outputNode) 
{
    // PANNER NODE SETTINGS
    const pannerModel = 'HRTF';
    const innerCone = 50;
    const outerCone = 150;
    const outerGain = 0.3;
    const distanceModel = 'inverse';
    const maxDistance = 10000;          // 0 - INF  def: 10000
    const refDistance = 1;              // 0 - INF  def: 1
    const rollOff = 1;                  // 0 - 1    def: 1
    const positionX = audioListener.LISTENER_INITIAL_X;
    const positionY = audioListener.LISTENER_INITIAL_Y;
    const positionZ = audioListener.LISTENER_INITIAL_Z - 5;
    const orientationX = 1.0;
    const orientationY = 0.0;
    const orientationZ = 0.0;

    // CREATE PANNER NODES (for the reverbs and for the audiofiles)
    for(var i = 0; i < 2*NUM_FILES; i++) 
    {
        panner[i] = new PannerNode(audioContext, 
        {
            panningModel: pannerModel,
            distanceModel: distanceModel,
            positionX: positionX,
            positionY: positionY,
            positionZ: positionZ,
            orientationX: orientationX,
            orientationY: orientationY,
            orientationZ: orientationZ,
            refDistance: refDistance,
            maxDistance: maxDistance,
            rolloffFactor: rollOff,
            coneInnerAngle: innerCone,
            coneOuterAngle: outerCone,
            coneOuterGain: outerGain
        })
    }
    
    for(var i = 0; i < NUM_FILES; i++) {
        panner[i].connect(outputNode);
    }
    
    // ---- set panning of all panners
    function fromRotatedPositionToStaticPosition(i) {
        // const angle = parseFloat(panControl.value);
        const staticAngle = Math.atan2( panner[i].positionY.value, panner[i].positionX.value ) - parseFloat(panControl.value);
        const staticRadius = Math.sqrt( Math.pow(panner[i].positionY.value, 2) + Math.pow(panner[i].positionX.value, 2));
        
        return [staticRadius * ( Math.cos ( staticAngle ) ), staticRadius * ( Math.sin ( staticAngle ) )];
    }
    globals.fromRotatedPositionToStaticPosition = fromRotatedPositionToStaticPosition;
    function setPanning() {
        const angle = parseFloat(panControl.value);
        for(var i = 0; i < NUM_FILES; i++) {
            const speakerR = Math.sqrt( Math.pow(panner[i].hg_staticPosX, 2) + Math.pow(panner[i].hg_staticPosY, 2));
            const speakerAngle = Math.atan2( panner[i].hg_staticPosY, panner[i].hg_staticPosX );
            // console.log(speakerAngle, panner[i].hg_staticPosY, panner[i].hg_staticPosX);
        
            const speakerX = speakerR * ( Math.cos ( angle + speakerAngle ) );
            const speakerY = speakerR * ( Math.sin ( angle + speakerAngle ) );
            // console.log(i, speakerX / speakerR, speakerY / speakerR);
            
            // set positions
            panner[i].positionX.value = speakerX;
            panner[NUM_FILES+i].positionX.value = speakerX;
            panner[i].positionY.value = speakerY;
            panner[NUM_FILES+i].positionY.value = speakerY;

            // set angles
            const angleX = - speakerX / speakerR;
            const angleY = - speakerY / speakerR;
            if(panner[i].orientationX) {
                panner[i].orientationX.value = angleX;
                panner[i].orientationY.value = angleY;
            } else {
                panner[i].setOrientation(angleX, angleY, 0.0);
            }

            panner[i].hg_angle = (angle + speakerAngle) % (2*Math.PI);
            panner[i].hg_radius = speakerR;
            
            log("panner:\tx: "+panner[i].positionX.value+" \t y: "+panner[i].positionY.value, 2); 
        }
    }
    globals.setPanning = setPanning;
    function setDistributed(angle) {
        const toAdd = 2*Math.PI / NUM_FILES;
        for(var i = 0; i < NUM_FILES; i++) {
            const speakerX = vars.R_EXTRA_VIEW_RADIUS * SPEAKER_DIST * 0.5 * ( Math.cos ( angle + i * toAdd ) );
            const speakerY = vars.R_EXTRA_VIEW_RADIUS * SPEAKER_DIST * 0.5 * ( Math.sin ( angle + i * toAdd ) );
            panner[i].positionX.value = speakerX;
            panner[NUM_FILES+i].positionX.value = speakerX;
            panner[i].hg_staticPosX = speakerX;
            panner[i].positionY.value = speakerY;
            panner[NUM_FILES+i].positionY.value = speakerY;
            panner[i].hg_staticPosY = speakerY;
            
            panner[i].hg_angle = (angle + i*toAdd) % (2*Math.PI);
            panner[i].hg_radius = 0.5*SPEAKER_DIST;
            log("panner:\tx: "+panner[i].positionX.value+" \t y: "+panner[i].positionY.value, 2); 
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
                    reverbNodes[i].connect(panner[inputNodes.length+i]).connect(reverbGainNode);
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
                    reverbNodes[i].disconnect(panner[inputNodes.length+i]);
                    panner[inputNodes.length+i].disconnect(reverbGainNode);
                    // reverbNodes[i].disconnect(analyserNodes[i]);
                }
                reverbGainNode.disconnect(endNode);
            }
        }
        
        //----------------------------------------------------------------------------//
        // ----------------------- SET REVERB ELEMENTS------------------------------- //
        
        const init_reverb_level = 0.2;
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
    //----------------------------------------------------------------------------//
    // -------------------- ASSERT, PRIVATE FUNCTIONS & MAIN VARIABLES -----------//
    
    var drawContext = document.getElementById("canvas").getContext("2d");
    var drawCanvas = document.getElementById("canvas");

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
        
        vars.listenerPositionCanvas = new Rectangle( 
            vars.canvasXMid + vars.positionToCanvasMultY * audioListener.listenerPosition[0] - vars.canvasRad, 
            vars.canvasYMid + vars.positionToCanvasMultY * audioListener.listenerPosition[1] - vars.canvasRad, 
            vars.canvasDiam, 
            vars.canvasDiam
        );
        for(var i = 0; i < NUM_FILES; i++) {
            vars.speakerPositionCanvas[i] = new Rectangle( 
                vars.canvasXMid + vars.positionToCanvasMultY * panner[i].positionX.value - vars.canvasRad, 
                vars.canvasYMid + vars.positionToCanvasMultY * panner[i].positionY.value - vars.canvasRad, 
                vars.canvasDiam, 
                vars.canvasDiam
            );
        }
        
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
            log("vars.listenerPositionCanvas: "+ vars.listenerPositionCanvas, debuglevel);
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
            vars.listenerIsBeingDragged = false;
            for(var i = 0; i < NUM_FILES; i++) {
                vars.speakerIsBeingDragged[i] = false;
            }
        }
    }
    drawCanvas.addEventListener("mouseup", (e) => { canvasMouseUp(); });
    drawCanvas.addEventListener("touchend", (e) => {
        e.preventDefault();
        canvasMouseUp();
        vars.hoverListener = false;
    }, { passive:false });
   
    //----------------------------------------------------------------------------//
    // ------------------------ LISTENER EVENTS FROM CANVAS  ---------------------//
    function getEventX(e) { return (e.clientX != null ? e.clientX : e.changedTouches[0].clientX); }
    function getEventY(e) { return (e.clientY != null ? e.clientY : e.changedTouches[0].clientY); }
    
    function getMouseDown(e) {
        setDrawingVariables();
        vars.isMouseDown = true;
        vars.windowMouseDownX = getEventX(e) - drawCanvas.offsetLeft;
        vars.windowMouseDownY = getEventY(e) - drawCanvas.offsetTop;
    }
    function canvasMouseDown(e) {
        setDrawingVariables();
        getMouseDown(e);
        
        // check whether mouse down on listener (to drag the listener position)
        if(vars.drawMode == 1) {
            const mousePositionCanvas = [vars.windowTocanvasMultX * vars.windowMouseDownX, vars.windowTocanvasMultY * vars.windowMouseDownY];
            if( vars.listenerPositionCanvas.isInside( mousePositionCanvas[0], mousePositionCanvas[1] ) ) {
                vars.listenerIsBeingDragged = true;
                
                // save old listener position
                vars.listenerXPositionOnMouseDown = audioListener.x;
                vars.listenerYPositionOnMouseDown = audioListener.y;
            }
            vars.aSpeakerIsAlreadyBeingDragged = false;
            for(var i = 0; i < NUM_FILES; i++) {
                if( vars.speakerPositionCanvas[i].isInside( mousePositionCanvas[0], mousePositionCanvas[1]) && !vars.aSpeakerIsAlreadyBeingDragged ) {
                    vars.speakerIsBeingDragged[i] = true;
                    vars.aSpeakerIsAlreadyBeingDragged = true;
                    
                    // save old listener position
                    vars.speakerPositionXOnMouseDown[i] = panner[i].positionX.value;
                    vars.speakerPositionYOnMouseDown[i] = panner[i].positionY.value;
                }
            }
            if(!vars.listenerIsBeingDragged && !vars.aSpeakerIsAlreadyBeingDragged) {
                var x = vars.windowTocanvasMultX * vars.windowMouseDownX - ( vars.listenerPositionCanvas.x + 0.5 * vars.listenerPositionCanvas.w );
                var z = vars.windowTocanvasMultX * vars.windowMouseDownY - ( vars.listenerPositionCanvas.y + 0.5 * vars.listenerPositionCanvas.h );
                audioListener.setListenerDirection(x, 0, z);
            }
        }
    }
    drawCanvas.addEventListener("touchstart", (e) => {
        e.preventDefault();
        canvasMouseDown(e);
    }, { passive:false });
    drawCanvas.addEventListener("mousedown", (e) => {
        canvasMouseDown(e);
    }, false);

    function canvasDrag(e) {
        setDrawingVariables();
        vars.windowDragX = getEventX(e) - drawCanvas.offsetLeft;
        vars.windowDragY = getEventY(e) - drawCanvas.offsetTop;
        
        vars.hoverListener = (vars.listenerIsBeingDragged == true || vars.listenerPositionCanvas.isInside( vars.windowTocanvasMultX * vars.windowDragX, vars.windowTocanvasMultY * vars.windowDragY ) );
        
        if(vars.isMouseDown) {
            if(vars.drawMode == 1) {
                const canvasXDistanceFromDragStart = (vars.windowDragX - vars.windowMouseDownX) * vars.windowTocanvasMultX;
                const canvasYDistanceFromDragStart = (vars.windowDragY - vars.windowMouseDownY) * vars.windowTocanvasMultX;
                
                if(vars.listenerIsBeingDragged == true) {
                    const xy = [vars.listenerXPositionOnMouseDown + canvasXDistanceFromDragStart / vars.positionToCanvasMultX, vars.listenerYPositionOnMouseDown + canvasYDistanceFromDragStart / vars.positionToCanvasMultY ]
                    audioListener.setListenerPosition(xy[0], xy[1], audioListener.listenerPosition[2]);
                }
                if(!vars.listenerIsBeingDragged) {
                    for(var i = 0; i < NUM_FILES; i++) {
                        if(vars.speakerIsBeingDragged[i] == true) {
                            const xy = [vars.speakerPositionXOnMouseDown[i] + canvasXDistanceFromDragStart / vars.positionToCanvasMultX, vars.speakerPositionYOnMouseDown[i] + canvasYDistanceFromDragStart / vars.positionToCanvasMultY ]
                            panner[i].positionX.value = xy[0];
                            panner[i].positionY.value = xy[1];
                            
                            staticPosition = globals.fromRotatedPositionToStaticPosition(i);
                            panner[i].hg_staticPosX = staticPosition[0];
                            panner[i].hg_staticPosY = staticPosition[1];
                        }
                    }
                }
                if(!vars.listenerIsBeingDragged && !vars.aSpeakerIsAlreadyBeingDragged) {
                    var x = vars.windowTocanvasMultX * vars.windowDragX - ( vars.listenerPositionCanvas.x + 0.5 * vars.listenerPositionCanvas.w );
                    var z = vars.windowTocanvasMultX * vars.windowDragY - ( vars.listenerPositionCanvas.y + 0.5 * vars.listenerPositionCanvas.h );
                    audioListener.setListenerDirection(x, 0, z);
                }
                globals.setPanning();
            }
        }
    }
    drawCanvas.addEventListener("touchmove", (e) => {
        e.preventDefault();
        canvasDrag(e);
    }, vars.hoverListener ? { passive:false } : { passive:true });
    drawCanvas.addEventListener("mousemove", (e) => {
        canvasDrag(e);
    }, false);
    
    function drawSVG(svgData, rotation, positionX, positionY, scale=1, offsetX = 0, offsetY = 0) {
        drawContext.save();
        drawContext.translate(positionX, positionY);
        drawContext.rotate( Math.PI + rotation );
        drawContext.translate(offsetX, offsetY);
        drawContext.scale(scale, scale);
                
        for(var i = 0; i < svgData.length; i++) {
            var path = new Path2D(svgData[i]);
            drawContext.fill(path);
        }
        
        drawContext.restore();
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
        if(vars.drawMode == 0) {
            // draw track gain meters
            
            // constants
            const bottombar = Math.max(vars.drawSpaceCanvas.h / 12, 20);
            const height = vars.drawSpaceCanvas.h - bottombar;
            const widthPerElement = vars.drawSpaceCanvas.w / NUM_FILES;

            for(var i = 0; i < NUM_FILES; i++) 
            {
                log(average[i], 1);
                // audio specific constants
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
            
            for(var i = 0; i < NUM_FILES; i++) {
                drawContext.beginPath();
                const SPEAKER_ANGLE = panner[i].hg_angle;
                const speakerXMid = vars.canvasXMid + vars.positionToCanvasMultX * panner[i].hg_radius * Math.cos(SPEAKER_ANGLE);
                const speakerYMid = vars.canvasYMid + vars.positionToCanvasMultY * panner[i].hg_radius * Math.sin(SPEAKER_ANGLE);
                
                drawContext.fillStyle = colorFromAmplitude(average[i], 0.5);
                // wikimedia svg: https://upload.wikimedia.org/wikipedia/commons/2/21/Speaker_Icon.svg
                drawSVG(["M48,27.6a19.5,19.5 0 0 1 0,21.4M55.1,20.5a30,30 0 0 1 0,35.6M61.6,14a38.8,38.8 0 0 1 0,48.6", "M39.389,13.769 L22.235,28.606 L6,28.606 L6,47.699 L21.989,47.699 L39.389,62.75 L39.389,13.769z"], SPEAKER_ANGLE, speakerXMid, speakerYMid, 1.4, -43, -43);

                drawContext.fillStyle = "rgb(0, 0, 0)";
                drawContext.font = 'normal '+ vars.canvasRad  * 0.5 + 'px sans-serif'; 
                drawContext.textAlign = 'center'; 
                drawContext.fillText( i+1, speakerXMid - 0.5*vars.canvasRad, speakerYMid - 0.5*vars.canvasRad  );
                
            }
            
            // draw listener position
            drawContext.beginPath();
            const sizeMult = vars.hoverListener ? 1.15 : 1;
            drawContext.fillStyle = "rgba(120, 120, 120, 0.9)";
            drawContext.lineWidth = 5;
            /*
            drawContext.arc( vars.listenerPositionCanvas.x + vars.canvasRad , vars.listenerPositionCanvas.y + vars.canvasRad , sizeMult * vars.canvasRad , 0, 2 * Math.PI);
            drawContext.fill();
            */
            
            const svgHead = ["M2454 3791 c-21 -34 -48 -64 -59 -66 -11 -3 -48 -9 -83 -15 -284 -49 -563 -237 -737 -499 -59 -89 -154 -285 -155 -318 0 -7 -11 -13 -24 -13 -18 0 -27 -8 -35 -30 -6 -20 -17 -30 -30 -30 -49 0 -81 -110 -81 -279 1 -145 26 -248 67 -266 15 -6 23 -21 28 -54 10 -65 61 -214 102 -296 157 -313 425 -536 755 -627 76 -21 104 -23 318 -23 214 0 242 2 318 23 330 91 598 314 755 627 41 82 92 231 102 296 5 33 13 48 28 54 78 35 93 409 21 523 -8 12 -24 22 -35 22 -13 0 -24 10 -30 30 -9 23 -17 30 -37 30 -25 0 -30 9 -65 99 -147 386 -494 672 -892 736 -85 14 -92 17 -120 52 -16 20 -39 48 -51 61 l-20 25 -40 -62z m178 -146 c308 -41 584 -210 751 -462 94 -141 177 -353 193 -488 l6 -53 -48 -10 c-27 -6 -112 -20 -189 -33 l-141 -22 -314 130 -315 130 -3 -749 -2 -748 -50 0 -50 0 -2 748 -3 749 -314 -130 -315 -130 -110 17 c-61 10 -149 25 -195 33 l-83 16 6 52 c16 135 100 347 193 488 165 248 443 421 742 462 125 17 119 17 243 0z", "M2084 3309 c-41 -45 -15 -159 36 -159 31 0 55 39 55 90 0 51 -24 90 -55 90 -9 0 -25 -9 -36 -21z", "M2844 3309 c-41 -45 -15 -159 36 -159 31 0 55 39 55 90 0 51 -24 90 -55 90 -9 0 -25 -9 -36 -21z"];
            if(vars.hoverListener) {
                drawSVG( svgHead, audioListener.horizontalAngle, vars.listenerPositionCanvas.x + 74, vars.listenerPositionCanvas.y + 70, 0.05, -128, -128);
                drawContext.stroke();
            } else {
                drawSVG( svgHead, audioListener.horizontalAngle, vars.listenerPositionCanvas.x + 74, vars.listenerPositionCanvas.y + 72, 0.043, -110, -110);
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
function initIfAllLoaded() {
    var al = true;
    
    if(canplay != true)
        al = false;
    for(var i = 0; i < NUM_FILES; i++) {
        if(reverbNodesLoaded[i] != true)
            al = false;
    }
    
    if(al) {
        log("init called");
        init();
        log("init finished");
        
        // audioContext.resume();
        
        var loaddiv = document.getElementById("loading screen");
        loaddiv.style = "display:none";
        var playerdiv = document.getElementById("octophonic player");
        playerdiv.style = "";
    }
}

// RUN EVERYTHING
jQuery('document').ready(() => {

// init reverb nodes
if(USE_REVERB_NODES) {
    //------------------------ the reverb to use ------------------------------
    var reverbUrl = "http://reverbjs.org/Library/AbernyteGrainSilo.m4a";
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
} else {
    for(var i = 0; i < NUM_FILES; i++) {
        reverbNodesLoaded[i] = true;
    }
}


tracks = new MultiPreloadedAudioNodes(urls, ()=> { canplay = true; initIfAllLoaded(); } );

});










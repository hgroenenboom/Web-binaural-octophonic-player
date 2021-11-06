// Constant/innitial settings
const init_master_gain = 0.85;

// Audio nodes
var tracks = [];
var panner = [];
var analyserNodes = [];
var binauralReverb = null;
let audioListener = new AudioListener();
const masterGainNode = audioContext.createGain();

// Drawing variables
var positionableElements = null;

// HTML components
const drawContext = document.getElementById("canvas").getContext("2d");
const drawCanvas = document.getElementById("canvas");
const canvas = document.getElementsByClassName('canvas')[0];
const footer = document.getElementsByTagName('footer')[0];
const canvasButtonsDiv = document.getElementById("drawCanvasButtons");

// Controllers
const panSlider = document.querySelector('[data-action="pan"]');
const gainSlider = document.querySelector('[data-action="volume"]');
const playButton = document.getElementById('playbutton');

// drawingvariables container
// TODO: this should probably be a global class. Something like DrawingEnvironment
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
// TODO: remove this
vars = new DrawingVariables();

/*-----------------------------------------------------------------------------------------------------------------*/
/*--------------------------------------------- Audio pipeline ----------------------------------------------------*/
/*-----------------------------------------------------------------------------------------------------------------*/

log("Start audiopipeline code");

function initNodes() 
{
    log("Start initializing");
    console.assert(audioContext);
    
    masterGainNode.gain.value = init_master_gain;

    setupAnalyzingNodes(NUM_FILES);
    
    setupPanningNodes();
    
    // ---- Connect all nodes
    tracks.connectToNodes(analyserNodes);

    for(var i = 0; i < NUM_FILES; i++) 
    {
        analyserNodes[i].connect(panner[i].panner);
        panner[i].connect(masterGainNode);
    }

    masterGainNode.connect(audioContext.destination);
    
    // ---- Setup drawing
    setupDrawingFunctions();
    
    log("Finished initializing");
}

function enableInteractions() 
{
    const trackVolumeControl = document.querySelector('[data-action="trackVolume"]');
    
    const track_init_volume = 1.0;
    trackVolumeControl.value = track_init_volume;
    tracks.setGain( track_init_volume );
    
    trackVolumeControl.addEventListener('input', function() {
            tracks.setGain( Math.pow(this.value, 2) );
            log("track gain: ", tracks.gain, 1 );
    }   
    , false);

    gainSlider.value = init_master_gain;
    gainSlider.addEventListener('input', function() 
    {
        masterGainNode.gain.value = this.value;
        log("master gain: "+ masterGainNode.gain.value, 1 );
    }, false);

    panSlider.circularSliderCallback = function() {
        setPanning();
    };
    panSlider.value = 0.0;
    
    window.binauralplayer.updatePlayButton = function() 
    {
        if(tracks.isPlaying) 
        {
            playButtonSVG.style="display:none;";
            pauseButtonSVG.style="display:block;";
            playButton.dataset.playing = 'true';
        } 
        else 
        {
            playButtonSVG.style="display:block;";
            pauseButtonSVG.style="display:none;";
            playButton.dataset.playing = 'false';
        }
    }
    
    window.binauralplayer.startFromTime = function(timeToStartFromInSeconds = 0) 
    {
        tracks.playAllFromTimePoint(timeToStartFromInSeconds);
        playButton.dataset.playing = 'true';
        window.binauralplayer.updatePlayButton();
    }

    window.binauralplayer.resume = function() 
    {
        tracks.playAll();
        playButton.dataset.playing = 'true';
        window.binauralplayer.updatePlayButton();
    }

    window.binauralplayer.pause = function() 
    {
        tracks.stopAll();
        log("supsended audio context");
        playButton.dataset.playing = 'false';
        window.binauralplayer.updatePlayButton();
    }

    window.binauralplayer.playPause = function() 
    {
        // check if context is in suspended state (autoplay policy)
        if (audioContext.state === 'suspended') 
        {
            audioContext.resume();
            log("resuming audio context");
        }

        if (playButton.dataset.playing === 'false') 
        {
            window.binauralplayer.resume();
        } 
        else if (playButton.dataset.playing === 'true') 
        {
            window.binauralplayer.pause();
        }

        const state = playButton.getAttribute('aria-checked') === "true" ? true : false;
        playButton.setAttribute( 'aria-checked', state ? "false" : "true" );
    };

    window.binauralplayer.setSpeakerDistance = function(newDistance) 
    {
        vars.SPEAKER_DIST = newDistance;
    }
    
    playButton.addEventListener('click', window.binauralplayer.playPause, false);
    playButtonSVG.addEventListener('click', window.binauralplayer.playPause, false);
    pauseButtonSVG.addEventListener('click', window.binauralplayer.playPause, false);
    window.x = playButtonSVG;
    
    // TODO: this seems like a strange location for this piece of code
    if(USE_REVERB_NODES) 
    {
        binauralReverb.calculateGains();
    }
    
    // TODO: is this below here supposed to be here?
    const viewHeight = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
    const viewWidth  = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
    canvas.style.height = (viewHeight - 30) + "px";
    canvas.style.width  = (viewWidth - 30) + "px";
    
    drawCanvas.width  = canvas.style.width.replace(/\D/g, '');
    drawCanvas.height = canvas.style.height.replace(/\D/g, '');

    footer.style.top = drawCanvas.height + "px";
}

/** Update panning of all panners from the panSlider */ 
function setPanning() 
{
    const angle = parseFloat(panSlider.value);
    
    for (let i = 0; i < NUM_FILES; i++) 
    {
        const speakerRadius = Math.sqrt( Math.pow(panner[i].hg_staticPosX, 2) + Math.pow(panner[i].hg_staticPosZ, 2));
        const speakerAngle = getAngle( panner[i].hg_staticPosX, panner[i].hg_staticPosZ );
    
        const speakerX = speakerRadius * ( Math.cos ( angle + speakerAngle ) );
        const speakerZ = speakerRadius * ( Math.sin ( angle + speakerAngle ) );
        
        panner[i].setPosition( speakerX, panner[i].positionY, speakerZ);

        // set to point speakers in direction of center
        const angleX = - speakerX / speakerRadius;
        const angleZ = - speakerZ / speakerRadius;
        panner[i].setOrientation(angleX, 0, angleZ);

        if (USE_REVERB_NODES) 
        {
            panner[NUM_FILES + i].setOrientation( angleX, 0, angleZ);
        }

        panner[i].hg_angle = (angle + speakerAngle) % (2 * Math.PI);
        panner[i].hg_radius = speakerRadius;
        
        log("panner:\tx: " + panner[i].positionX + " \t z: " + panner[i].positionZ, 2); 
    }
}

function setupPanningNodes() 
{
    // ---- Create panner nodes (for the reverbs and for the audiofiles)
    for(let i = 0; i < 2 * NUM_FILES; i++) 
    {
        panner[i] = new BinauralPanner();
    }

    /** Distributes all panners in a circle */
    function setDistributed(angle) 
    {
        const toAdd = 2 * Math.PI / NUM_FILES;
        for(var i = 0; i < NUM_FILES; i++) 
        {
            const speakerX = vars.R_EXTRA_VIEW_RADIUS * SPEAKER_DIST * 0.5 * ( Math.cos ( angle + i * toAdd ) );
            const speakerZ = vars.R_EXTRA_VIEW_RADIUS * SPEAKER_DIST * 0.5 * ( Math.sin ( angle + i * toAdd ) );
            
            panner[i].setPosition(              speakerX, panner[i].positionY, speakerZ);
            panner[i].hg_staticPosX = speakerX;
            panner[i].hg_staticPosZ = speakerZ;
            
            if(USE_REVERB_NODES) 
            {
                panner[NUM_FILES + i].setPosition(  speakerX, panner[i].positionY, speakerZ);
            }
            
            panner[i].hg_angle = (angle + i * toAdd) % (2 * Math.PI);
            panner[i].hg_radius = 0.5 * SPEAKER_DIST;
            log("panner:\tx: " + panner[i].positionX + " \t z: " + panner[i].positionZ, 2); 
            
            if(USE_REVERB_NODES) 
            {
                const reverbX = vars.R_EXTRA_VIEW_RADIUS * 2.5 * SPEAKER_DIST * 0.5 * ( Math.cos ( angle + i * toAdd ) );
                const reverbZ = vars.R_EXTRA_VIEW_RADIUS * 2.5 * SPEAKER_DIST * 0.5 * ( Math.sin ( angle + i * toAdd ) );
                panner[NUM_FILES + i].setPosition(reverbX, panner[i].positionY, reverbZ);
            }
        }
    }
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

    // Add AudioListener positionable component
    positionableElements.addElement(
        (newPosition)=>{ audioListener.setListenerPosition(newPosition[0], audioListener.listenerPosition[1], newPosition[1]); },
        ()=>{ return [audioListener.x, audioListener.z]; },
        ()=>{ return audioListener.horizontalAngle; }, 
        ["M 2454 3791 c -21 -34 -48 -64 -59 -66 -11 -3 -48 -9 -83 -15 -284 -49 -563 -237 -737 -499 -59 -89 -154 -285 -155 -318 0 -7 -11 -13 -24 -13 -18 0 -27 -8 -35 -30 -6 -20 -17 -30 -30 -30 -49 0 -81 -110 -81 -279 1 -145 26 -248 67 -266 15 -6 23 -21 28 -54 10 -65 61 -214 102 -296 157 -313 425 -536 755 -627 76 -21 104 -23 318 -23 214 0 242 2 318 23 330 91 598 314 755 627 41 82 92 231 102 296 5 33 13 48 28 54 78 35 93 409 21 523 -8 12 -24 22 -35 22 -13 0 -24 10 -30 30 -9 23 -17 30 -37 30 -25 0 -30 9 -65 99 -147 386 -494 672 -892 736 -85 14 -92 17 -120 52 -16 20 -39 48 -51 61 l -20 25 -40 -62 z m 178 -146 c 308 -41 584 -210 751 -462 94 -141 177 -353 193 -488 l 6 -53 -48 -10 c -27 -6 -112 -20 -189 -33 l -141 -22 -314 130 -315 130 -3 -749 -2 -748 -50 0 -50 0 -2 748 -3 749 -314 -130 -315 -130 -110 17 c -61 10 -149 25 -195 33 l -83 16 6 52 c 16 135 100 347 193 488 165 248 443 421 742 462 125 17 119 17 243 0",
            "M 2084 3309 c -41 -45 -15 -159 36 -159 31 0 55 39 55 90 0 51 -24 90 -55 90 -9 0 -25 -9 -36 -21",
            "M 2844 3309 c -41 -45 -15 -159 36 -159 31 0 55 39 55 90 0 51 -24 90 -55 90 -9 0 -25 -9 -36 -21 z"
        ]
    );

    // Add Speakers positionable components
    // wikimedia svg: https://upload.wikimedia.org/wikipedia/commons/2/21/Speaker_Icon.svg
    for(var i = 0; i < NUM_FILES; i++) 
    {
        positionableElements.addElement(
            function(i) {
                return (newPosition)=>{ 
                    panner[i].setPosition( newPosition[0], this.panner[i].positionY, newPosition[1] );
                    const normalizedPosition = fromRotatedPositionToNormalizedPosition(this.panner[i].positionX, this.panner[i].positionZ, parseFloat(panSlider.value));
                    panner[i].hg_staticPosX = normalizedPosition[0];
                    panner[i].hg_staticPosZ = normalizedPosition[1];
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
            , ["M 39.389 13.769 L 22.235 28.606 L 6 28.606 L 6 47.699 L 21.989 47.699 L 39.389 62.75 L 39.389 13.769 z",
                "M 48 27.6 a 19.5 19.5 0 0 1 0 21.4",
                "M 55.1 20.5 a 30 30 0 0 1 0 35.6",
                "M 61.6 14 a 38.8 38.8 0 0 1 0 48.6"
            ]
        );
    }

    for(var i = 0; i < NUM_FILES+1; i++) 
    {
        positionableElements.setDrawSize(i, 37);
    }
    
    // Add reverb walls positionable components
    if(USE_REVERB_NODES) 
    {
        for(var i = 0; i < binauralReverb.NUM_NODES; i++) 
        {
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
    // ------------------------ DRAWING VARIABLES   ------------------------------//
    function setDrawingVariables() {
        vars.drawSpaceCanvas = new Rectangle(0, 0, drawCanvas.width, drawCanvas.height);

        vars.canvasXMid = 0.5 * vars.drawSpaceCanvas.w;
        vars.canvasYMid = 0.5 * vars.drawSpaceCanvas.h;

        // const isInsideScreen = vars.drawSpaceCanvas.isInside(vars.windowDragX, vars.windowDragY);
        vars.viewDistance = /*isInsideScreen ? SPEAKER_DIST * 1.1 * vars.viewDistance :*/ vars.viewDistance;
        
        const wLargerH = drawCanvas.width > drawCanvas.height;
        
        // for converting the actual positions to pixel coordinates
        vars.positionToCanvasMultY = vars.drawSpaceCanvas.h / vars.viewDistance; 
        vars.positionToCanvasMultX = vars.drawSpaceCanvas.w / vars.viewDistance;
        if(wLargerH) {
            vars.positionToCanvasMultX = vars.positionToCanvasMultY;
        } else {
            vars.positionToCanvasMultY = vars.positionToCanvasMultX;
        }
        
        vars.canvasRad = vars.RAD * vars.positionToCanvasMultY;
        vars.canvasDiam = vars.DIAM * vars.positionToCanvasMultY; 

        positionableElements.updateDrawingVariables();
        
        debugDrawingVariables(2);
    }

    function debugDrawingVariables(debugamount) 
    {
        if(debugamount >= -2 && debugamount <= 10) 
        {
            const debuglevel = debugamount;
            log("vars.drawSpaceCanvas: "+ vars.drawSpaceCanvas, debuglevel);
            log("vars.canvasXMid: "+ vars.canvasXMid, debuglevel);
            log("vars.canvasYMid: "+ vars.canvasYMid, debuglevel);
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
    for(var i = 0; i < canvasButtonsDiv.children.length; i++) 
    {
        canvasButtonsDiv.children[i].addEventListener("mousedown", function(i) 
        {
            return function() {
                vars.drawMode = (i + 1) % 3;
                log("drawmode = " + vars.drawMode);
            }
        }(i));
    }

    function canvasMouseUp(e) {
        vars.isMouseDown = false;
        
        if(vars.drawMode == 1) {
            positionableElements.mouseUp();
        } else if(vars.drawMode == 2) {
            getMouseDown(e);
            setDrawingVariables();
            const mousePositionCanvas = [vars.windowMouseDownX, vars.windowMouseDownY];
            
            const val = tracks.duration * ( mousePositionCanvas[0] / drawCanvas.width );
            tracks.playAllFromTimePoint(val);
            window.binauralplayer.updatePlayButton();
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
        
        const mousePositionCanvas = [vars.windowMouseDownX, vars.windowMouseDownY];
        if(vars.drawMode == 1) {
            
            var elementBeingDragged = positionableElements.mouseDown(mousePositionCanvas);
            
            // listener direction
            if(!elementBeingDragged) {
                const listenerPositionCanvas = positionableElements.getDrawSpace(0);
                const x = vars.windowMouseDownX - ( listenerPositionCanvas.x + 0.5 * listenerPositionCanvas.w );
                const z = vars.windowMouseDownY - ( listenerPositionCanvas.y + 0.5 * listenerPositionCanvas.h );
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
            
            const mousePosOnCanvas = [vars.windowDragX, vars.windowDragY];
            positionableElements.mouseMove(mousePosOnCanvas);
            
            // mouse drag
            if(vars.isMouseDown) {
                const canvasXDistanceFromDragStart = vars.windowDragX - vars.windowMouseDownX;
                const canvasYDistanceFromDragStart = vars.windowDragY - vars.windowMouseDownY;
               
                const dragDistancePosition = [canvasXDistanceFromDragStart / vars.positionToCanvasMultX, canvasYDistanceFromDragStart / vars.positionToCanvasMultY];
                
                var elementIsBeingDragged = positionableElements.mouseDrag( dragDistancePosition );
                
                // listener direction
                if(!elementIsBeingDragged) {
                    const listenerPositionCanvas = positionableElements.getDrawSpace(0);
                    var x = vars.windowDragX - ( listenerPositionCanvas.x + 0.5 * listenerPositionCanvas.w );
                    var z = vars.windowDragY - ( listenerPositionCanvas.y + 0.5 * listenerPositionCanvas.h );
                    audioListener.setListenerDirection(x, 0, -z);
                }
                setPanning();
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
            average[i] = arrayMean(drawArray) / 130;
        }
        
        // draw all elements
        if(vars.drawMode == 0) {    // draw track gain meters
            const bottombar = Math.max(vars.drawSpaceCanvas.h / 12, 20);
            const height = vars.drawSpaceCanvas.h - bottombar;
            const widthPerElement = Math.min(100, vars.drawSpaceCanvas.w / NUM_FILES);

            for(var i = 0; i < NUM_FILES; i++) 
            {
                log(average[i], 1);
                const audioEl = tracks.getAudioTrack(i);
                const currentTime = timeToString(audioEl.currentTime);
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
                            toPrint += timeToString(document.getElementsByTagName("audio")[j].currentTime)+", ";
                        }
                        log("["+toPrint+"]", 2);
                    }
                }

                // draw duration
                const duration = timeToString(audioEl.duration);
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
                drawContext.translate(0, (i / NUM_FILES) * drawCanvas.height);
                drawContext.scale( width, (1 / NUM_FILES) * drawCanvas.height);
                drawContext.fill( tracks.nodes[i].waveform );
                drawContext.restore();
            }
        }
        
                
        // autorotate
        if(false) {
            var panSlider = document.querySelector('[data-action="pan"]');
            panSlider.value = (parseFloat(panSlider.value) + 0.01) % (2 * Math.PI);
            setPanning();
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

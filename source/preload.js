const NUM_FILES = urls.length;

if(SHOULD_LOG >= 0)
{
    console.log("LOGGING LEVEL:",SHOULD_LOG);
}

function log(txt, niveau=0) {
    if(niveau <= SHOULD_LOG) {
        console.log(txt);

        if(SHOULD_LOG >= 0) {
            let consoleElement = document.getElementById("console");
            consoleElement.innerHTML += "<br>" + txt;
        }
    }
}

log("USE_REVERB_NODES:" + USE_REVERB_NODES, 1);
log("NUM_FILES:" + NUM_FILES, 1);

window.binauralplayer = new class{}; // empty functionpointer container
// available functions:
// - window.binauralplayer.playPause()

// cross browser audio context
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioContext = new AudioContext();
audioContext.suspend();

reverbjs.extend(audioContext);

const REVERB_DIST = 1.3 * SPEAKER_DIST;

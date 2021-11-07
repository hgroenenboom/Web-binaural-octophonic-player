/** Playable audio file which gets fully loaded before playback */
class PreloadedAudioNode 
{
// public
    /**
     * @param url               url to load the AudioFile from
     * @param loadedCallback    called the audiofile is succesfull loaded
     * @param loadingCallback   called while loading the audiofile
     */
    constructor(url, loadedCallback, loadingCallback=null) 
    {
        this.source = audioContext.createBufferSource();
        this.gainNode = audioContext.createGain();

        this.audioBuffer = null;
        this.loglevel = 1;
        this.connectedNodes = [];
        this.fileExists = null;
        this.fileURL = null;

        this.currentPosition = 0;
        this.startedAt = 0;
        this.pausedAt = 0;
        this.paused = false;
        
        this.loadSound(url, loadedCallback, loadingCallback);
        this.setGain(1.0);
    }

    loadSound(url, loadedCallback, loadingCallback = null) 
    {
        this.fileURL = url;
        this.loadingProgress = 0;       // value from 0 to 1
        this.fileSize = 0;

        let request = new XMLHttpRequest();
        request.open('GET', url, true);
        request.responseType = 'arraybuffer';
        
        let thisclass = this;
        
        request.onreadystatechange = function() 
        {
            thisclass.fileExists = this.status === 404 ? false : true;
            if(request.readyState == 2) 
            {
                const headers = request.getAllResponseHeaders().split('\r\n').reduce((result, current) => 
                {
                    const [name, value] = current.split(': ');
                    result[name] = value;
                    return result;
                }, {});

                thisclass.fileSize = parseInt(headers['content-length']);
            }
        }

        request.onprogress = function(e) 
        {
            thisclass.fileExists = this.status === 404 ? false : true;
        
            if (e.lengthComputable) 
            {
                thisclass.loadingProgress = e.loaded / e.total;
            }
            
            console.assert(typeof loadingCallback == "function", "loadingCallback is not a function");
            loadingCallback();
        }

        request.onload = function() 
        {
            thisclass.fileExists = this.status === 404 ? false : true;

            if (thisclass.fileExists) 
            {
                var audioData = request.response;
                
                audioContext.decodeAudioData(audioData, function(buffer) 
                {
                    thisclass.audioBuffer = buffer;
                    thisclass.reloadBufferSource();
                    thisclass.createWaveForm( thisclass.audioBuffer );

                    log("PreloadedAudioNode, calling loadedCallback", thisclass.loglevel);
                    
                    console.assert(typeof loadedCallback == "function", "loadedCallback is not a function");
                    loadedCallback();

                }, ()=>{console.log("error")});
            }
        }
        
        request.send();
    }

    /** Connect to a audio processing node */
    connect(node) 
    {
        this.gainNode.connect(node);
        this.connectedNodes.push(node);
    }
    
    /** Disconnect from a audio processing node */
    disconnect(node) 
    {
        this.gainNode.disconnect(node);
        this.connectedNodes = this.connectedNodes.filter( function(connectNode) { return connectNode == node; } );
    }
    
    get currentTime() 
    { 
        if(this.paused) 
        {
            return 0.001 * this.currentPosition;
        } 
        else 
        {
            return 0.001 * Math.min(1000 * this.duration, this.currentPosition + Date.now() - this.startedAt);;
        }
    }
    
    setGain(gainvalue) 
    { 
        this.gainNode.gain.value = gainvalue; 
    }
    
    play(timeToPlayInSeconds = 0) 
    {
        this.paused = false;
        this.startedAt = Date.now(); // set new starttime
        
        if (this.pausedAt) 
        {
            log("PreloadedAudioNode: resume playing", this.loglevel);
            
            if(this.currentPosition / 1000 >= this.duration) 
            {
                // TODO: is this ever hit?
                this.play(timeToPlayInSeconds);
            } 
            else 
            {
                this.source.start(audioContext.currentTime + timeToPlayInSeconds, this.currentPosition / 1000);
            }
        }
        else 
        {
            log("PreloadedAudioNode: start playing", this.loglevel);
            this.startedAt = Date.now();
            this.currentPosition = 0;
            
            this.source.start(audioContext.currentTime + timeToPlayInSeconds);
        }
    };

    playFromTimePoint(timePointInSeconds) 
    {
        this.currentPosition = 1000 * timePointInSeconds;
        this.paused = false;
        this.startedAt = Date.now();
        this.source.start(audioContext.currentTime, timePointInSeconds);
    }

    stop(timeToStopInSeconds = 0) 
    {
        log("PreloadedAudioNode: stop playing called", this.loglevel);
        this.source.stop(audioContext.currentTime + timeToStopInSeconds);

        this.reloadBufferSource();
        
        this.pausedAt = Date.now();
        this.currentPosition = this.currentPosition + this.pausedAt - this.startedAt;
        this.paused = true;
    };

    get node() { return source; }
    get gain() { return this.gainNode.gain.value; }
    get duration() { return this.audioBuffer.duration; } 

// private
    /** Creates a new AudioBuffer source from the AudioContext */
    reloadBufferSource() 
    {
        this.source = audioContext.createBufferSource(); 
        
        this.source.buffer = this.audioBuffer;
        this.source.connect( this.gainNode );
        for(let i = 0; i < this.connectedNodes.length; i++)
        {
            this.gainNode.connect(this.connectedNodes[i]);
        }
    }

    createWaveForm(buffer, numPoints = 500) 
    {
        // NOTE: only analyzes channel 0
        const samplesPerPoint = buffer.length / numPoints;
        const channel0 = buffer.getChannelData(0);  
        
        this.waveform = new Path2D();
        this.waveform.moveTo(0, 0.5);
        
        var drawValues = [];

        for(let i = 0; i < numPoints; i++) 
        {
            // Get selected slice
            const startI = Math.floor(i * samplesPerPoint);
            const endI = Math.floor((i+1) * samplesPerPoint);
            const pathPoint = i / numPoints;
            
            // Find maximum sample from all samples in the current slice
            let max = 0;
            for(var j = startI; j < endI; j++) 
            {
                max = Math.max(max, channel0[j]);
            }
            
            drawValues.push(Math.sqrt(max));
            this.waveform.lineTo( pathPoint, 0.5 + 0.5 * drawValues[i] );
        }
        this.waveform.lineTo(1, 0.5);

        // Draw bottom part of waveform (fake symmetrical)
        for(let i = numPoints - 1; i > 0; i = i - 1) 
        {
            const pathPoint = i / numPoints;
            this.waveform.lineTo( pathPoint, 0.5 - 0.5 * drawValues[i] );
        }

        this.waveform.closePath();
    }
};
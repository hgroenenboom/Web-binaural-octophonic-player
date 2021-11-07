class MultiPreloadedAudioNodes 
{
// public
    constructor(urls, onLoadedCallback = null) 
    {
        this.loglevel = 1;
        
        this.numfiles = 0;
        this.urls = [];
        this.nodes = [];
        this.loadedStates = [];
        
        this._isPlaying = false;

        this.loadAudioFiles(urls, onLoadedCallback);
    }
    
    connectToAudioContext() 
    {   
        this.connectToSingleNode(audioContext.destination);     
    }
    
    connectToSingleNode(node) 
    { 
        for(let i = 0; i < this.numfiles; i++) 
        {
            this.nodes[i].connect(node);
        }
    }

    connectToNodes(nodes) 
    {
        console.assert(nodes.length = this.numfiles, "MultiPreloadedAudioNodes, connecting failed: number of input nodes ("+nodes.length+") is not "+this.numfiles);
        for(let i = 0; i < this.numfiles; i++) 
        {
            this.nodes[i].connect(nodes[i]);
        }
    }

    connectToObjects(objects) 
    {
        console.assert(objects.length = this.numfiles, "MultiPreloadedAudioNodes, connecting failed: number of input objects ("+objects.length+") is not "+this.numfiles);
        for(let i = 0; i < this.numfiles; i++) 
        {
            this.nodes[i].connect(objects[i].node);
        }
    }
    
    playAll(timeToPlayInSeconds = 0) 
    {
        if(!this.isPlaying) 
        {
            if (audioContext.state === 'suspended') { audioContext.resume(); }
        
            log("MultiPreloadedAudioNodes, play all", this.loglevel);
            for(let i = 0; i < this.numfiles; i++) 
            {
                this.nodes[i].play(timeToPlayInSeconds);
            }
            this._isPlaying = true;
        }
    }
    
    stopAll(timeToStopInSeconds = 0) 
    {
        if(this.isPlaying) 
        {
            if (audioContext.state === 'suspended') { audioContext.resume(); }

            log("MultiPreloadedAudioNodes, stop all", this.loglevel);
            for(let i = 0; i < this.numfiles; i++) 
            {
                this.nodes[i].stop(timeToStopInSeconds);
            }
            this._isPlaying = false;
        }
    }

    playAllFromTimePoint(timeInSeconds) 
    {
        if (audioContext.state === 'suspended') { audioContext.resume(); }

        if(this.isPlaying) 
        {
            this.stopAll();
        }
        if(!this.isPlaying) 
        {
            for(let i = 0; i < this.numfiles; i++) 
            {
                this.nodes[i].playFromTimePoint(timeInSeconds);
            }
            this._isPlaying = true;
        }
    }

    setGain(gainvalue) 
    { 
        for(let i = 0; i < this.numfiles; i++) 
        {
            this.nodes[i].setGain(gainvalue);
        }
    }
    
    getAudioTrack(i) { return this.nodes[i]; }
    get duration() { return this.nodes[0].duration; }
    get gain() { return this.nodes[0].gain; }
    get isPlaying() { return this._isPlaying; }
    
// private
    loadAudioFiles(urls, onLoadedCallback = null) 
    {
        console.assert(urls.length >= 0, "MultiPreloadedAudioNodes did not receive an URL array larger 1");
        this.urls = urls;
        this.numfiles = urls.length;
        this.allLoaded = false;
        
        for(let i = 0; i < this.numfiles; i++)
        {
            this.loadedStates[i] = false;
        }

        for(let i = 0; i < this.numfiles; i++) 
        {
            this.nodes[i] = new PreloadedAudioNode(urls[i], function(multiAudiofile, i) { 
                    return ()=> 
                    {
                        multiAudiofile.loadedStates[i] = true;
                        multiAudiofile.allLoaded = multiAudiofile.checkWhetherAllLoaded();
                        
                        if(multiAudiofile.allLoaded === true) 
                        {
                            console.assert(typeof onLoadedCallback === "function");
                            onLoadedCallback();
                        }
                    }
                }(this, i), 
                ()=> { 
                    this.progressReporter(this.nodes, document.getElementById("loading-text")); 
                }
            );
        }
    }

    progressReporter(nodes, elementToReportTo) 
    {
        // Find the accumulated progress for all files
        let total = 0;
        let size = 0;
        let allFilesValid = true;
        for(let i = 0; i < nodes.length; i++) 
        {
            total += nodes[i].loadingProgress;
            size += nodes[i].fileSize;
            
            if(nodes[i].fileExists == false) 
            {
                allFilesValid = false;
            }
        }
        
        const loadingProgress = allFilesValid ? "" + parseInt(100 * (total / nodes.length))+"% of " + bytesToReadableString(size) : "";
        elementToReportTo.innerHTML = loadingProgress;
        
        if(!allFilesValid) 
        {            
            for(let i = 0; i < nodes.length; i++) 
            {
                if(!nodes[i].fileExists) 
                {
                    elementToReportTo.innerHTML += "File '" + nodes[i].fileURL + "' not found!<br>";
                }
            }
        }
    }

    checkWhetherAllLoaded() 
    {
        for(let i = 0; i < this.numfiles; i++) 
        {
            if(!this.loadedStates[i]) 
            {
                return false;
            }
        }
        return true;
    }
};

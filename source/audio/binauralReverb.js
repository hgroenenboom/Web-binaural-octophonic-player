class BinauralReverb 
{
    get init_reverb_level() { return 0.4; };
    get NUM_NODES() { return 5; }
    get defaultReverbs() { ["http://reverbjs.org/Library/AbernyteGrainSilo.m4a", "http://reverbjs.org/Library/EmptyApartmentBedroom.m4a",  "http://reverbjs.org/Library/DomesticLivingRoom.m4a"] };

//public
    constructor(onLoadedCallback = null, reverbURL = "http://reverbjs.org/Library/AbernyteGrainSilo.m4a") 
    {
        // gainNodes[n][n] -> presumnodes[n] -> reverbnodes[n] -> pannernodes[n] -> reverbGainNode
        this.gainNodes = [];
        this.preSumNodes = [];
        this.reverbNodes = [];
        this.pannerNodes = [];
        this.reverbGainNode = audioContext.createGain();
        
        this.connectedNodes = [];

        this.reverbURL = reverbURL;
        this.loadReverb(onLoadedCallback);

        for(let i = 0; i < this.NUM_NODES; i++) 
        {
            this.preSumNodes[i] = audioContext.createGain();
            this.preSumNodes[i].gain.value = 1;
            this.pannerNodes[i] = new BinauralPanner();
        }
        
        for(let i = 0; i < this.NUM_NODES; i++) 
        {
            this.preSumNodes[i].connect( this.reverbNodes[i] );
            this.reverbNodes[i].connect( this.pannerNodes[i].node );
            this.pannerNodes[i].connect( this.reverbGainNode );
        }
        this.setDistributed();
        
        this.reverbGainNode.gain.value = this.init_reverb_level;
        this.reverbGainNode.connect( audioContext.destination );
    }
    
    connectToReverb(binauralNode) 
    {
        let newGainNodes = [];
        for(let i = 0; i < this.NUM_NODES; i++) 
        {
            newGainNodes.push( audioContext.createGain() );
            
            binauralNode.connect( newGainNodes[i] );
            newGainNodes[i].connect( this.preSumNodes[i] );
        }
        
        this.connectedNodes.push( binauralNode );
        this.gainNodes.push( newGainNodes );
        this.calculateGains();
    }
    
    disconnectFromReverb(binauralNode) 
    {
        if(this.connectedNodes.includes(binauralNode)) 
        {
            const index = this.connectedNodes.indexOf(binauralNode);
            
            for(let i = 0; i < this.NUM_NODES; i++) 
            {
                binauralNode.disconnect( this.gainNodes[index][i] );
                this.gainNodes[index][i].disconnect( this.preSumNodes[i] );
            }
            
            this.gainNodes.splice( index, 1 );
            this.connectedNodes.splice( index, 1 );
        }
    }
    
    calculateGains() 
    {
        for( let i = 0; i < this.connectedNodes.length; i++ ) 
        {
            for( let j = 0; j < this.NUM_NODES; j++ ) 
            {
                const distance = Math.sqrt( Math.pow( this.connectedNodes[i].positionX - this.pannerNodes[j].positionX , 2 ) + Math.pow( this.connectedNodes[i].positionZ - this.pannerNodes[j].positionZ , 2 ) );
                
                this.gainNodes[i][j].gain.value = Math.sqrt( 0.5 / (distance * 0.1) );
            }
        }
    }

// private
    setDistributed() 
    {
        const angle = 0;
        const toAdd = 2 * Math.PI / this.NUM_NODES;
        
        for(let i = 0; i < this.NUM_NODES; i++) 
        {
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

    loadReverb(onLoadedCallback) 
    {
        this.reverbsLoaded = [];

        for(let i = 0; i < this.NUM_NODES; i++) 
        {
            this.reverbsLoaded[i] = false;
            let that = this;
            
            this.reverbNodes[i] = audioContext.createReverbFromUrl(this.reverbURL, function(_i) 
            {
                return function() 
                {
                    that.reverbsLoaded[_i] = true;
                    if( !that.reverbsLoaded.includes(false) ) 
                    {
                        log("All reverbs loaded!");
                        if(typeof onLoadedCallback == "function") 
                        {
                            onLoadedCallback();
                        }
                    }
                }
            }(i));
        }
    }
}
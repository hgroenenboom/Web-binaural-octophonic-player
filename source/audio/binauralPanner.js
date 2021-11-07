class BinauralPanner 
{
//public
    constructor() 
    {
        this.horizontalAngleFromCenter = 0;
        this._position = [0, 0, 0];
        this._orientation = [0, 0, 0];

        this.panner = audioContext.createPanner(); 
        
        this.panner.panningModel = 'HRTF';
        this.panner.distanceModel = 'inverse';
        this.panner.refDistance = 1;                        // 0 - INF  def: 1
        this.panner.maxDistance = 10000;                    // 0 - INF  def: 10000
        this.panner.rolloffFactor = 0.5;                    // 0 - 1    def: 1
        this.panner.coneInnerAngle = 50;
        this.panner.coneOuterAngle = 150;
        this.panner.coneOuterGain = 0.3;
        
        // set in front of listener
        this.setPosition(audioListener.LISTENER_INITIAL_X, audioListener.LISTENER_INITIAL_Y, audioListener.LISTENER_INITIAL_Z - 5); 
        
        // aim to front;
        this.setOrientation(0, 0, 1); 
    }
    
    setPosition(xPos, yPos, zPos) 
    {
        // TODO: do we need this if statement? Does this have to do with multi browser support? look this up
        if(this.panner.positionX) 
        {
            this.panner.positionX.setValueAtTime(xPos, audioContext.currentTime);
            this.panner.positionY.setValueAtTime(yPos, audioContext.currentTime);
            this.panner.positionZ.setValueAtTime(zPos, audioContext.currentTime);
        } 
        else 
        {
            this.panner.setPosition(xPos, yPos, zPos);
        }

        this._position = [xPos, yPos, zPos];
        this.horizontalAngleFromCenter = getAngle(xPos, zPos);
    }

    setOrientation(x, y, z) 
    {
        // TODO: do we need this if statement? Does this have to do with multi browser support? look this up
        if(this.panner.orientationX) 
        {
            this.panner.orientationX.value = x;
            this.panner.orientationY.value = y;
            this.panner.orientationZ.value = z;
        } 
        else 
        {
            this.panner.setOrientation(x, y, z);
        }
        
        this._orientation = [x, y, z];
    }
    
    connect(node) 
    { 
        this.panner.connect(node); 
    }
    
    get orientation() { return this._orientation };
    get position() { return this._position };
    get positionX() { return this._position[0]; }
    get positionY() { return this._position[1]; }
    get positionZ() { return this._position[2]; }
    get node() { return this.panner; }
    get horizontalAngleFromCenterInDegrees() { return parseInt(360 * (this.horizontalAngleFromCenter / (2 * Math.PI))); }
    
    get info() 
    { 
        return "BinauralPanner: " + "pos(" + this._position + ");\t horizontalAngleFromCenter(" + this.horizontalAngleFromCenterInDegrees + ", " + 
            angleToUtf8Arrow(this.horizontalAngleFromCenter) + ");\t dir(" + this._orientation + ");" 
    }
    
    log() 
    { 
        console.log(this.info); 
    }
}

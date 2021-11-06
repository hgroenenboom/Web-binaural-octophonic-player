/** Represents the virtual microphone/listener which is essentially the audio output */
class AudioListener 
{
    // const
    get LISTENER_INITIAL_X() { return 0; };
    get LISTENER_INITIAL_Y() { return 0; };
    get LISTENER_INITIAL_Z() { return 0; };
    
    // private
    get listener() 
    { 
        return audioContext.listener; 
    };
    
    // public
    constructor() 
    {
        this._listenerPosition = [0, 0, 0];
        this._listenerDirection = [0, 0, 0];
        this.listenerHorizontalAngle = 0;
        
        this.setListenerPosition(this.LISTENER_INITIAL_X, this.LISTENER_INITIAL_Y, this.LISTENER_INITIAL_Z);
        this.setListenerDirection();
    }
    
    setListenerPosition(x, y, z = null) 
    {
        // TODO: do we need this if statement? Does this have to do with multi browser support? look this up
        if(this.listener.positionX) 
        {
            this.listener.positionX.setValueAtTime(x, audioContext.currentTime);
            this.listener.positionY.setValueAtTime(y, audioContext.currentTime);
            this.listener.positionZ.setValueAtTime(z, audioContext.currentTime);
        } 
        else 
        {
            this.listener.setPosition(x, y, z);
        }
        
        this._listenerPosition[0] = x;
        this._listenerPosition[1] = y;
        this._listenerPosition[2] = z;
    }

    setListenerDirection(x = 0, y = 0, z = -1) 
    {
        // TODO: do we need this if statement? Does this have to do with multi browser support? look this up
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
        } 
        else 
        {
            this.listener.setOrientation(x, y, z, 0, 1, 0);
        }

        this._listenerDirection = [x, y, z];
        this.listenerHorizontalAngle = getAngle(x, z);
    }
    
    get x() { return this._listenerPosition[0]; }
    get y() { return this._listenerPosition[1]; }
    get z() { return this._listenerPosition[2]; }
    get listenerPosition() { return this._listenerPosition; }
    get listenerDirection() { return this._listenerDirection; }
    get horizontalAngle() { return this.listenerHorizontalAngle; }
    get horizontalAngleInDegrees() { return parseInt(360 * (this.listenerHorizontalAngle / (2 * Math.PI))); }
    get initialPosition() { return [this.LISTENER_INITIAL_X, this.LISTENER_INITIAL_Y, this.LISTENER_INITIAL_Z]; }
    
    get info() 
    { 
        return "AudioListener: " + "pos(" + this._listenerPosition + "); dir(" + this._listenerDirection + 
            "); angle(" + this.horizontalAngleInDegrees + ", " + angleToUtf8Arrow(this.horizontalAngle) + ");"; 
    }

    log() 
    { 
        console.log(this.info); 
    }
};

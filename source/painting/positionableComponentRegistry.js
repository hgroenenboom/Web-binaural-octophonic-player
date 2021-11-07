class PositionableElementsContainer 
{
    constructor() 
    {
        this.positionableElements = [];    
    };
    
    addElement(setPositionFromCanvasFunction, getPositionFromElementFunction, getAngleFunction = null, svg = null) 
    {
        this.positionableElements[this.positionableElements.length] = new PositionableElement(setPositionFromCanvasFunction, getPositionFromElementFunction, getAngleFunction, svg);
    }
    
    updateDrawingVariables(midXPixel, midYPixel, positionToPixelMultiplierX, positionToPixelMultiplierY) 
    {
        for(let i = 0; i < this.positionableElements.length; i++) 
        {
            this.positionableElements[i].updateDrawingVariables(midXPixel, midYPixel, positionToPixelMultiplierX, positionToPixelMultiplierY);
        }
    }
    
    mouseMove(mousePosOnCanvas) 
    {
        for(let i = 0; i < this.positionableElements.length; i++) 
        {
            this.positionableElements[i].mouseMove(mousePosOnCanvas);
        }
    }

    mouseDown(mousePosOnCanvas) 
    {
        for(let i = 0; i < this.positionableElements.length; i++) 
        {
            if(this.positionableElements[i].mouseDown(mousePosOnCanvas)) 
            {
                return true;
            }
        }

        return false;
    }

    mouseDrag(dragDistanceOnCanvas) 
    {
        for(let i = 0; i < this.positionableElements.length; i++) 
        {
            if(this.positionableElements[i].mouseDrag(dragDistanceOnCanvas)) 
            {
                return true;
            }
        }

        return false;
    }
    
    mouseUp() 
    {
        for(let i = 0; i < this.positionableElements.length; i++) 
        {
            this.positionableElements[i].mouseUp();
        }
    }

    touchEnd() 
    {
        for(let i = 0; i < this.positionableElements.length; i++) 
        {
            this.positionableElements[i].touchEnd();
        }
    }
    
    getDrawSpace(i) 
    { 
        return this.positionableElements[i].drawSpace; 
    }
    
    isHovered(i) 
    { 
        return this.positionableElements[i].hovered; 
    }
    
    setDrawSize(i, size) 
    { 
        this.positionableElements[i].setDrawSize(size); 
    }
    
    draw() 
    {
        for(let i = 0; i < this.positionableElements.length; i++) 
        {
            this.positionableElements[i].draw();
        }
    }

    drawElement(i) 
    {
        this.positionableElements[i].draw();
    }
}

class PositionableElement 
{
    /** 
     * @param setPositionFromCanvasFunction     function that should set the audio position from a new canvas position
     * @param getPositionFromElementFunction    function that should set this components position from the audio position
     * @param getAngleFunction                  function that should obtain the current angle from the audio object
     * @param svg                               the SVG to load
    */
    constructor(setPositionFromCanvasFunction, getPositionFromElementFunction, getAngleFunction = null, svg = null) 
    {
        // function to set the position of the element from canvas coordinates
        this.setPositionFromCanvasFunction = setPositionFromCanvasFunction;

        // function to get the drawPosition of the element
        this.getPositionFromElementFunction = getPositionFromElementFunction;

        this.getAngleFunction = getAngleFunction;

        this.updateDrawingVariables();

        this.svg = null;
        this.drawSize = 10;
        this.drawSpaceOnCanvas = new Rectangle(0, 0, 2 * this.drawRadius, 2 * this.drawRadius);

        this.hoveredOver = false;
        this.isBeingDragged = false;
        this.elementPositionOnMouseDown = [0, 0];

        if(svg != null) 
        {
            this.loadSVG(svg, this.drawSize);
        }
    }
    
    loadSVG(svg, size = 10) 
    {
        this.drawSize = size;
        this.svg = [];
        
        // Obtain the size of the SVG by creating a dummy HTML element
        let svgElem = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svgElem.setAttribute("id", "test");
        svgElem.setAttribute("width", 200);
        svgElem.setAttribute("height", 200);
        svgElem.setAttribute("style", "position:absolute;top:100%;");
        
        let pathElem = [];
        for(let i = 0; i < svg.length; i++) 
        {
            pathElem[i] = document.createElementNS("http://www.w3.org/2000/svg", "path");
            pathElem[i].setAttribute("d", svg[i]);
            svgElem.appendChild(pathElem[i]);
        }
        document.getElementsByTagName("body")[0].appendChild(svgElem);
        
        const bboxes = document.getElementById("test").children;
        let x = 1000000000000;
        let y = 1000000000000;
        let endx = 0; 
        let endy = 0;

        for(let i = 0; i < svg.length; i++) 
        {
            const box = bboxes[i].getBBox();
            x = Math.min(x, box.x);
            y = Math.min(y, box.y);
            endx = Math.max(box.x + box.width, endx);
            endy = Math.max(box.y + box.height, endy);
        }
        
        // Size of the SVG is now found
        const width = endx - x;
        const height = endy - y;
        document.getElementsByTagName("body")[0].removeChild(svgElem);
        
        // Normalize the SVG size
        let newSvg = [];
        for(let i = 0; i < svg.length; i++) 
        {
            // Split svg by spaces
            let svgElements = svg[i].split(" ");
            
            let isRelative = false;         // uppercase or lowercase svg (M/m)
            let elementsToBypass = [];      // indices to non-normalizable 
            let isX = true;                 // x or y coord flag
            
            for(let j = 0; j < svgElements.length; j++) 
            {
                // if not supposed to be bypassed
                if(!elementsToBypass.includes(j)) 
                {
                    // if is number
                    if(!isNaN(svgElements[j])) 
                    { 
                        if(isX) 
                        {
                            svgElements[j] = !isRelative ? ( parseFloat( svgElements[j] ) - x - 0.5 * width ) / (0.5 * width) : parseFloat(svgElements[j]) / (0.5 * width);
                        } 
                        else 
                        {
                            svgElements[j] = !isRelative ? ( parseFloat( svgElements[j] ) - y - 0.5 * height ) / (0.5 * width) : parseFloat(svgElements[j]) / (0.5 * width);
                        }
                        
                        isX = !isX;
                        
                        // reduce decimal points
                        svgElements[j] = parseFloat(svgElements[j].toFixed(2));   
                    } 
                    else 
                    {
                        isRelative = svgElements[j] == svgElements[j].toUpperCase() ? false : true;
                        
                        // detecting non-normalizable elements
                        if(svgElements[j] == "a") 
                        {
                            for(let n = 3; n < 6; n++) 
                            {
                                elementsToBypass.push(j + n);
                            }
                        }
                    }
                }
            }
            
            newSvg[i] = "";
            for(let j = 0; j < svgElements.length; j++) 
            {
                newSvg[i] += svgElements[j] + " ";
            }
        }
        
        for(let i = 0; i < svg.length; i++) 
        {
            this.svg[i] = new Path2D(newSvg[i]);
        }
    }
    
    setDrawSize(size) 
    {
        this.drawSize = size;
    }
    
    updateDrawingVariables() 
    {
        const posOnCanvas = this.getPositionFromElementFunction();
        
        this.drawSpaceOnCanvas = new Rectangle(
            vars.canvasXMid + vars.positionToCanvasMultX * posOnCanvas[0] - this.drawRadius, 
            vars.canvasYMid + vars.positionToCanvasMultY * posOnCanvas[1] - this.drawRadius, 
            2 * this.drawRadius, 
            2 * this.drawRadius
        );
    }
    
    mouseMove(mousePosOnCanvas) 
    {
        this.hoveredOver = this.isBeingDragged == true || this.drawSpaceOnCanvas.isInside( mousePosOnCanvas[0], mousePosOnCanvas[1] );
    }

    mouseDown(mousePosOnCanvas) 
    {
        this.isBeingDragged = this.drawSpaceOnCanvas.isInside(mousePosOnCanvas[0], mousePosOnCanvas[1]);
        if(this.isBeingDragged) 
        {
            const pos = this.getPositionFromElementFunction();
            this.elementPositionOnMouseDown[0] = pos[0];
            this.elementPositionOnMouseDown[1] = pos[1];
        }
        return this.isBeingDragged;
    }

    mouseDrag(dragDistanceOnCanvas) 
    {
        console.assert(dragDistanceOnCanvas.length == 2);
        if(this.isBeingDragged) 
        {
            const xy = [ this.elementPositionOnMouseDown[0] + dragDistanceOnCanvas[0], this.elementPositionOnMouseDown[1] + dragDistanceOnCanvas[1] ];
            this.setPositionFromCanvasFunction(xy);
        }
        return this.isBeingDragged;
    }

    mouseUp() 
    { 
        this.isBeingDragged = false; 
    }
    
    touchEnd() 
    {
        this.hoveredOver = false; 
    }
    
    draw() 
    {
        if(this.svg != null) 
        {
            drawPath( 
                this.svg, 
                this.getAngleFunction(), 
                this.drawSpaceOnCanvas.x + 0.5 * this.drawSpaceOnCanvas.w, 
                this.drawSpaceOnCanvas.y + 0.5 * this.drawSpaceOnCanvas.h, 
                (this.hoveredOver ? 4 : 0) + this.drawSize * vars.DIAM * ( 5.0 / SPEAKER_DIST ) );
        } 
        else 
        {
            const h = (this.hoveredOver ? 4 : 0);

            drawContext.beginPath();
            drawContext.rect(this.drawSpaceOnCanvas.x - 0.5 * h, this.drawSpaceOnCanvas.y - 0.5 * h, this.drawSpaceOnCanvas.w + h, this.drawSpaceOnCanvas.h + h);
            drawContext.stroke();
        }
    }   
    
    get drawRadius() { return vars.canvasRad; }
    get drawSpace() { return this.drawSpaceOnCanvas; } 
    get hovered() { return this.hoveredOver; }
};

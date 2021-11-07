class Rectangle 
{
    constructor(x, y, w, h) 
    {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
    }
    
    isInside(xpos, ypos) 
    {
        log("isInside: xpos=" + xpos + " ; ypos=" + ypos, 1);
        return xpos >= this.x && xpos < this.x + this.w && ypos >= this.y && ypos <= this.y + this.h;
    }
    
    getRelativePosition(otherX, otherY) 
    {
        const relativeX = (otherX - this.x) / (this.w - this.x);
        const relativeY = (otherY - this.y) / (this.h - this.y);
        return [relativeX, relativeY];
    }
}

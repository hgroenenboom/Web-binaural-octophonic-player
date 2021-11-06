/** Returns the angle in radians for a given x and y position */
function getAngle(x, y) {
    const val = Math.atan2(x, y) + 2 * Math.PI;
    return val % (2 * Math.PI);
}

/** Returns a UTF8 arrow for a given angle in radians */
function angleToUtf8Arrow(angle) {
    const D_PI = 2 * Math.PI;
    const arrows = ["\u2191", "\u2197", "\u2192", "\u2198", "\u2193", "\u2199", "\u2190", "\u2196"];
    angle = (angle + 10 * D_PI) % (D_PI);
    
    for(var i = 0; i < 8; i++) {
        if(angle < ( (0.125 + 0.25 * i) * Math.PI ) ) {
            return arrows[i];
        }
    }
    return arrows[0];
}

function fromRotatedPositionToNormalizedPosition(positionX, positionZ, rotatedPanAngleInRadians) 
{
    const normalizedAngle = getAngle( positionX, positionZ ) - rotatedPanAngleInRadians;

    const normalizedRadius = Math.sqrt( Math.pow( positionZ, 2 ) + Math.pow( positionX, 2 ) );
    
    // return the normalized new coordinate pair
    return [normalizedRadius * ( Math.cos ( normalizedAngle ) ), normalizedRadius * ( Math.sin ( normalizedAngle ) )];
}

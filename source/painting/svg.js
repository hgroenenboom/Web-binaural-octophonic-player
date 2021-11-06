// TODO: document better
function drawSVG(svgData, rotation, positionX, positionY, scale=1, offsetX = 0, offsetY = 0) {
    drawContext.save();
    
    drawContext.translate(positionX, positionY);
    drawContext.rotate( Math.PI + rotation );
    drawContext.translate(offsetX, offsetY);
    drawContext.scale(scale, scale);
    
    for(var i = 0; i < svgData.length; i++) {
        var path = new Path2D(svgData[i]);
        drawContext.fill(path);
    }
    
    drawContext.restore();
}

// TODO: document better
function drawPath(path, rotation, positionX, positionY, scale=1, offsetX = 0, offsetY = 0) {
    drawContext.save();
    drawContext.translate(positionX, positionY);
    drawContext.rotate( Math.PI + rotation );
    drawContext.translate(offsetX, offsetY);
    drawContext.scale(scale, scale);
            
    for(var i = 0; i < path.length; i++) {
        drawContext.fill(path[i]);
    }
    
    drawContext.restore();
}

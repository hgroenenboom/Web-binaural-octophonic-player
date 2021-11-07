// Sets all available circular-sliders on the current webpage/iframe.
const sliders = document.getElementsByClassName("circular-slider");

for(let i = 0; i < sliders.length; i++) {
    function mouseDown(e) {
        if( !e.srcElement.classList.contains("drawing") ) {
            e.srcElement.classList.add("drawing");
        }
        return true;
    }
    sliders[i].onmousedown = (e) => { return mouseDown(e); }
    sliders[i].addEventListener("touchstart", (e) => { 
        e.preventDefault();
        return mouseDown(e); 
    }, false);
    
    function mouseUp(e) {
        e.srcElement.classList.remove("drawing");    
        return true;
    }
    sliders[i].onmouseup = (e) => { return mouseUp(e); }
    sliders[i].addEventListener("touchend", (e) => { 
        e.preventDefault();
        return mouseUp(e); 
    }, false);
    sliders[i].addEventListener("touchcancel", (e) => {
        e.preventDefault();
        return mouseUp(e); 
    }, false);
    
    sliders[i].circularSliderCallback = null;
    function mouseMove(e) {
        if(e.srcElement.classList.contains("drawing")) {
            const width = e.srcElement.offsetWidth;
            const xPos = (e.clientX != null ? e.clientX : e.touches[0].clientX) - e.srcElement.offsetLeft;
            const offset = (xPos + 100*width) % width;
            const val = e.srcElement.max * (offset / width);
            e.srcElement.value = val;
            if(typeof e.srcElement.circularSliderCallback == "function") {
                e.srcElement.circularSliderCallback();
            }
        }
        return true;
    }
    sliders[i].onmousemove = (e) => { return mouseMove(e); };
    sliders[i].addEventListener("touchmove", (e) => { 
        e.preventDefault();
        return mouseMove(e); 
    }, { passive:false });
}

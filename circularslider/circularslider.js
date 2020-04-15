// Use the defined slidercallback

const sliders = document.getElementsByClassName("circular-slider");

for(var i = 0; i < sliders.length; i++) {
    function mouseDown(e) {
        e.srcElement.classList.add("drawing");
    }
    sliders[i].onmousedown = (e) => { mouseDown(e); }
    sliders[i].addEventListener("touchstart", (e) => { mouseDown(e); });
    
    function mouseUp(e) {
        e.srcElement.classList.remove("drawing");    
    }
    sliders[i].onmouseup = (e) => {   mouseUp(e); }
    sliders[i].addEventListener("touchend", (e) => { mouseUp(e); });
    sliders[i].addEventListener("touchcancel", (e) => { mouseUp(e); });
    
    sliders[i].circularSliderCallback = null;
    function mouseMove(e) {
        if(e.srcElement.classList.contains("drawing")) {
          const width = e.srcElement.offsetWidth;
          const xPos = e.clientX - e.srcElement.offsetLeft;
          const offset = (xPos + 100*width) % width;
          const val = e.srcElement.max * (offset / width);
          e.srcElement.value = val;
          if(typeof e.srcElement.circularSliderCallback == "function") {
            e.srcElement.circularSliderCallback();
          }
        }
        return false;
    }
    sliders[i].onmousemove = (e) => { mouseMove(e); };
    sliders[i].addEventListener("touchmove", (e) => { mouseMove(e); });
}
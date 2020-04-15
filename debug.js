// Specific debug functions

document.getElementById("rollof").addEventListener('input', 
    function() 
    {
        for(var i = 0; i < panner.length; i++) {
            panner[i].rolloffFactor = this.value;
        }
    }
, false);
document.getElementById("refDistance").addEventListener('input', 
    function() 
    {
        for(var i = 0; i < panner.length; i++) {
            panner[i].refDistance = this.value;
        }
    }
, false);
document.getElementById("maxDistance").addEventListener('input', 
    function() 
    {
        for(var i = 0; i < panner.length; i++) {
            panner[i].maxDistance = Math.pow(this.value, 2);
        }
    }
, false);

initializeCallback = () => {
    console.log(Math.sqrt(panner[0].refDistance));
    document.getElementById("rollof").value = panner[0].rolloffFactor;
    document.getElementById("refDistance").value = panner[0].refDistance;
    document.getElementById("maxDistance").value = Math.sqrt(panner[0].maxDistance);
};
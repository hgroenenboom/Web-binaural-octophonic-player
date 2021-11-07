function timeToString(inputSeconds) 
{
    let seconds = Math.floor(inputSeconds % 60)
    if (seconds < 10) 
    {
        seconds = "0" + seconds
    }
    const minutes = Math.floor(inputSeconds / 60)
    return minutes + ":" + seconds
}

function arrayMean(array) 
{
    const length = array.length;
    
    var values = 0;
    for (var i = 0; i < length; i++) 
        values += array[i];
    
    return values / length;
}

function bytesToReadableString(bytes) 
{
    const abrevs = [ [0, "b"], [1000, "Kb"], [1000000, "Kb"], [1000000000, "Mb"], [1000000000000, "Gb"], [1000000000000000, "Tb"] ];

    for (let i = 0; i < abrevs.length - 1; i++) 
    {
        if (bytes < abrevs[i + 1][0]) 
        {
            return "" + Math.round(bytes / abrevs[i][0]) + abrevs[i + 1][1];
        }
    }
}

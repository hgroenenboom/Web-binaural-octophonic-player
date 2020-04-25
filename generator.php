<?php include("../../head.html"); ?>

<!DOCTYPE HTML>
<html>
<head>
    <style>
    <!-- .container {
        text-align: center;
        height: 100%;
        line-height: 100%;
        text-align: center;
        padding-bottom: 15px;
    } -->
    
    centered {
        display: inline-block;
        align-items: center;
        justify-content: center;
        height: 100%;
        width: 100%;
    }
    
    p {
      text-align: center;
      margin: auto;
    }
    
    label {
        position: absolute;
        height: 100%;
        margin-top: 5px;
        text-align: right;
        right: 70%;
        font-style:normal;
        font-size: 12px;
    }
    
    select {
        width: 50%;
        // margin-left: 5%;
        margin-bottom: 5px;
        position: relative;
        left: 32px;
    }
    input {
        width: 50%;
        // margin-left: 5%;
        margin-bottom: 5px;
        position: relative;
        left: 32px;
    }
    
    button {
        margin: auto;
    }
    
    .submit {
        height: 60px;
        margin: 30px;
    }
    </style>
    
    <script src="jquery-3.4.1.min.js"></script>
    <script>
    /*
    function allowDrop(ev) {
      ev.preventDefault();
    }

    function drag(ev) {
      ev.dataTransfer.setData("text", ev.target.id);
    }

    function drop(ev) {
      console.log(ev);
      window.ev = ev;
      ev.preventDefault();
      var data = ev.dataTransfer.getData("text");
      ev.target.appendChild(document.getElementById(data));
    }
    */
    
    // var framehtml = "";
    function onForm(form = document.getElementById("inputdata")) {
        var text = '';
        var i;
        for (i = 0; i < form.length ;i++) { 
            var e = form.elements[i];
            if(e.type != "button") {
                text += (i == 0 ? "?" : "&");
                if(form.elements[i].value != "") {
                    text += e.name+"=" + form.elements[i].value;
                }
            }
        } 
        // console.log(text);
        window.form = text;
        
        var frame = document.getElementById("frame");
        frame.src = "http://www.haroldgroenenboom.nl/other/binauralplayer/webaudio-binpanner.php"+text;
        <!-- console.log(frame); -->
        // framehtml = frame.outerHTML;
        document.getElementById("copyable").innerHTML = "" + frame.outerHTML;
    }
    
    function copyToClipboard() {
      document.getElementById("copyable").select();
      document.getElementById("copyable").setSelectionRange(0, 99999); /*For mobile devices*/

      /* Copy the text inside the text field */
      document.execCommand("copy");

      /* Alert the copied text */
      alert("Copied the text: " + document.getElementById("copyable").value);
    }
    </script>
</head>
<body>
    <?php include("../../header.html"); ?>
    
    <!-- <div class="container" style="line-height:100px;"> -->
        <!-- <div id="div1" class="centered" ondrop="drop(event)" ondragover="allowDrop(event)" style="border-style: dotted;width:200px;margin:auto;height:100px;"> -->
            <!-- <p>drop background link here</p> -->
        <!-- </div> -->
        <!-- <img id="drag1" src="img_logo.gif" draggable="true" ondragstart="drag(event)" width="336" height="69"> -->
    <!-- </div> -->
    <div class="container pt">
        <div class="row mt">
            <h3>EMBEDABLE BINAURAL PANNER GENERATOR</h3>
            <div class="row mt" id="frameSpace" style="resize:both; overflow:auto; margin: auto; width:50%; height:400px; border: 1px solid;margin-bottom: 20px;">
                <iframe id="frame" crossorigin="anonymous">
                </iframe>
            </div>
            <div>
                <h5>colorgradient</h5>
                <div id="colorpicker" style="width=50%;">
                </div>
                <!--<p>or...</p>
                <textarea id="colorgradienttext" name="colorgradienttext" rows="10" cols="30">The cat was playing in the garden.</textarea> -->
            </div>
            <br>
            <br>
            <form id="inputdata" class="centered" ACTION="" METHOD="GET" autocomplete="on"> <!-- action="console.log('test')"> -->
                <h5>other visual settings</h5>
                <label for="background_image">background image url</label>
                <input type="text" id="background_image" name="background_image" value="https://images.fineartamerica.com/images/artworkimages/mediumlarge/2/pastel-lake-sean-duan.jpg&opacity=0.5&colortheme=dark">
                <br>
                <label for="opacity">background image opacity</label>
                <input type="text" id="opacity" name="opacity" value="0.7">
                <br>
                <label for="colortheme">colortheme</label>
                <select name="colortheme">
                    <option value="dark">dark</option>
                    <option value="light" selected="selected">light</option>
                </select>
                <br>
                <br>

                <h5>numbered audio files to look for</h5>
                <label for="file">audiofiles</label>
                <input type="text" id="audiofiles" name="file" value="http://www.haroldgroenenboom.nl/other/binauralplayer/audio/ai/Harold%20">
                <br>
                <label for="ext">extension</label>
                <input type="text" id="extension" name="ext" value=".wav">
                <br>
                <label for="channels">numchannels</label>
                <input type="text" id="numchannels" name="channels" value="8">
                <br>
                <br>
                
                <!-- <label for="colorgradient">drawing gradient</label> -->
                <!-- <input type="text" id="colorgradient" name="colorgradient" value=""> -->
                <!-- <br> -->
                
                
                <input type="hidden" id="colorgradient" name="colorgradient">
                
                <input class="submit" type="button" value="Submit" onClick="onForm(this.form);">
            </form>
            <div>
                <button onclick="copyToClipboard()" style="display:block;">Copy to clipboard</button>
                <textarea id="copyable"></textarea>
            </div>
        </div>
    </div>
    
    <?php include("../../footer.html"); ?>
    
    <script>
    // COPYABLE ELEMENT AUTO RESIZE
    document.getElementById("copyable").setAttribute('style', 'width:50%;height:' + (document.getElementById("copyable").scrollHeight) + 'px;overflow-y:hidden;');
    document.getElementById("copyable").oninput = () => {
        document.getElementById("copyable").style.height = 'auto';
        document.getElementById("copyable").style.height = (document.getElementById("copyable").scrollHeight) + 'px';
    };
    
    // RESIZING IFRAME WINDOW
    document.getElementById("frameSpace").onmouseup = function() { 
        <!-- console.log("test");  -->
        var e = document.getElementById("frame");
        frame.width = document.getElementById("frameSpace").offsetWidth - 15;
        frame.height = document.getElementById("frameSpace").offsetHeight - 15;
        onForm();
        <!-- document.getElementById("copyable").innerHTML = e.outerHTML; -->
    }
    
    // HEX COLOR TO RGB FUNCTION
    function hexToRgb(hex) {
      // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
      var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
      hex = hex.replace(shorthandRegex, function(m, r, g, b) {
        return r + r + g + g + b + b;
      });

      var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : null;
    }
    
    // COLOR PICKER
    class ColorPicker {
        div = document.createElement("div");
        removebutton = document.createElement("button");
        addbutton = document.createElement("button");
        colorinput = document.createElement("input");
        textinput = document.createElement("input");
        divToAddTo = null;
        
        constructor(divToAddTo, startColor="#000000") {
            this.divToAddTo = divToAddTo;
            this.div.appendChild(this.removebutton);
            this.div.appendChild(this.addbutton);
            this.div.appendChild(this.colorinput);
            this.div.appendChild(this.textinput);
            divToAddTo.appendChild(this.div);
            
            this.removebutton.innerHTML = "remove";
            this.removebutton.type = "button";
            var div = this.div;
            this.removebutton.onclick = function(e) {
                if(divToAddTo.childElementCount > 1) {
                    divToAddTo.removeChild(div);
                }
            }
            
            var that = this;
            this.colorinput.type = "color";
            this.colorinput.value = startColor;
            this.colorinput.style = "width:30%;margin-left:10px;";
            this.colorinput.onchange = function() {
                that.textinput.value = that.colorinput.value;
                that.setInputElement();
            }
            
            this.textinput.type = "text";
            this.textinput.value = startColor;
            this.textinput.style = "width:15%;margin-left:10px;";
            this.textinput.onchange = function() {
                if(hexToRgb(that.textinput.value) != null) {
                    that.colorinput.value = that.textinput.value;
                    that.setInputElement();
                }
            }
            
            this.addbutton.innerHTML = "add";
            this.addbutton.type = "button";
            this.addbutton.onclick = function(e) {
                var test = new ColorPicker(divToAddTo, that.colorinput.value);
            }
            
            this.setInputElement();
        }
        
        setInputElement() {
            var input = document.getElementById("colorgradient");
            var inputs = this.divToAddTo.getElementsByTagName("input");
            
            var ins = [];
            for(var i = 0; i < inputs.length; i++) {
                if(inputs[i].type == "color") {
                    ins.push(inputs[i]);
                }
            }
            inputs = ins;
            
            var text = "[ ";
            for(var i = 0; i < inputs.length; i++) {
                text += "[ "+ (i / (inputs.length - 1)) + ", ";
                <!-- console.log(inputs[i]); -->
                const c = hexToRgb(inputs[i].value);
                text += "[" + c.r + ", "+ c.g + ", " + c.b + ", 1] ]";
                if(i < inputs.length - 1) {
                    text += ", ";
                }
            }
            text += " ]";
            input.value = text;
            // document.getElementById("colorgradienttext").value = text;
            <!-- console.log(input); -->
        }
    };
    
    var colorpicker = document.getElementById("colorpicker");
    var newtest = new ColorPicker(colorpicker, "#e1eee2");
    newtest = new ColorPicker(colorpicker, "#aaffaa");
    newtest = new ColorPicker(colorpicker, "#33aa33");
    newtest = new ColorPicker(colorpicker, "#ecdb64");
    newtest = new ColorPicker(colorpicker, "#ffa020");
    newtest = new ColorPicker(colorpicker, "#ff4444");

    onForm(document.getElementById("inputdata"));
    document.getElementById("frameSpace").onmouseup();
    document.getElementById("copyable").oninput();
    
    /*
    document.getElementById("colorgradienttext").oninput = (el)=> {
        var text = "";
        text += el.srcElement.value;
        text = text.replace(/\s/g, '');

        colors = [];

        if(text[0] == "[" && text[text.length-1] == "]") {
            text = text.substr(1, text.length - 2);
        } else {
            return null;
        }

        var elements = [];
        for(var i = 0; i < text.length; i++) {
            if(text[i] == "[") {
                var endindex = -1;
                var level = 0;
                var foundEnd = false;
                for(var j = i+1; j < text.length; j++) {
                    if(!foundEnd) {
                        if(text[j] == "[") {
                            level++;
                        }
                        if(text[j] == "]" && level == 0) {
                             foundEnd = true;
                             endindex = j;
                        }
                        if(text[j] == "]") {
                            level--;
                        }
                    }
                }
                if(endindex == -1) {
                    return null;
                }
                elements.push(text.substr(i, endindex));
                i = endindex;
            }
        }
        
        // UNFINISHED
        // console.log(elements);
    }
    */
    </script>
</body>
</html>
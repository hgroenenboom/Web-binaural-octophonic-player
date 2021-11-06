<!--- BINAURAL MULTICHANNEL AUDIO PLAYER --->
<!--- by Harold Groenenboom              --->
<!--- Source used: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Web_audio_spatialization_basics --->
<!DOCTYPE html>
<html>
    <head>
        <meta charset="utf-8">
        <meta http-equiv="x-ua-compatible" content="ie=edge">
        <title>Web Audio Spacialisation</title>
        <meta name="description" content="Binaural multi-channel audiofile player">
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
        
        <link href="https://fonts.googleapis.com/css?family=Montserrat:300,400,500,700" rel="stylesheet">
        <link href="css/bootstrap.min.css" rel="stylesheet">
        <link href="css/style.css" rel="stylesheet">
        <link href="css/customStyle.css" rel="stylesheet">
        <link href="source/circularslider/circularslider.css" rel="stylesheet">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css">
        
        <script src="https://code.jquery.com/jquery-3.4.1.slim.min.js" integrity="sha256-pasqAKBDmFT4eHoN2ndd6lN370kFiGUFyTiUHWhU7k8=" crossorigin="anonymous"></script>
        
        <?php
            parse_str(parse_url( "http://$_SERVER[HTTP_HOST]$_SERVER[REQUEST_URI]" )["query"], $array);
                        
            # generate javascript
            echo '<script type="text/javascript">';
            
            echo 'const SHOULD_LOG=' . ( isset($array["verbosity"]) ? 'parseFloat(' . $array["verbosity"] . ');' : '-1;' );
            
            if(isset($array["colorgradient"])) {
                echo 'const colorPoints = ' . $array["colorgradient"] . ';';
            } else {
                echo 'const colorPoints = [[0, [198, 207, 199, 0.7]],[0.1, [32, 209, 33, 1.0]], [0.33, [36, 66, 36, 1.0]], [0.666, [242, 128, 13, 1.0]], [1, [255, 0, 0, 1.0]]];';
            }

            echo 'const USE_REVERB_NODES = ' . (isset( $array["reverbon"] ) ? "true" : "false") . ';';

            echo 'const SPEAKER_DIST = ' . (isset( $array["speakerdist"] ) ? $array["speakerdist"] : '10') . ';';

            echo 'const colortheme = "' . ( ( isset($array["colortheme"]) && $array["colortheme"] == "dark" ) ? "dark" : "light") . '";';
            
            echo "</script>";
            
            if(isset($array["colortheme"]) && $array["colortheme"] == "dark") {
                echo "<link href='css/darkTheme.css' rel='stylesheet'>";
            }
        ?>
        <script>
            function toggleHelp() { 
                if(document.getElementById('helpmenu').style.display == 'none') {
                    document.getElementById('helpmenu').style.display='block'; document.getElementById('octophonic player').style.display='none';
                } else {
                    document.getElementById('helpmenu').style.display='none'; document.getElementById('octophonic player').style.display='block';
                }
            }
        </script>
    </head>
    
    <body class="wrapper">
        <div id="loading screen">
            <p style="margin-top:10vw;font-size:4vw;text-align:center">loading resources</p>
            <p id="loading-text" style="margin-top: 7vw;font-size:2.2vw;text-align:center;padding:7wh;overflow:auto;height:50vh;">waiting for server...</p>
        </div>
        <?php
            # DISPLAY FILES LOADED
            if(array_key_exists("verbosity", $array) && isset($array["verbosity"])) {
                echo '<div style="position:absolute;top:0px;margin:0px;"><p style="top:0px;font-size:8px;">' . $array["file"]."1".$array["ext"] . '</p></div>';
            }
        ?>
        
        <div id="octophonic player" class="content customContainer" style="display:none;">
            <div class="frameSpace drawFrameSpace">
                <canvas class="canvas" id="canvas" width="1000" height="1000">canvas</canvas>
                <div id="drawCanvasButtons">
                    <!--https://upload.wikimedia.org/wikipedia/commons/5/59/2D_Cartesian_Coordinates.svg -->
                    <svg xmlns:svg="http://www.w3.org/2000/svg" xmlns="http://www.w3.org/2000/svg" version="1.0" id="svg1415" class="canvas-menu-item" viewbox="0 0 300 300">
                        <line x1="150" y1="0" x2="150" y2="300" style="stroke-width:30" />
                        <line x1="0" y1="150" x2="300" y2="150" style="stroke-width:30" />
                    </svg>
                    <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" height="300px" width="300px" fill="#000000" version="1.1" x="0px" y="0px" viewBox="0 0 256 256" enable-background="new 0 0 256 256" xml:space="preserve" class="canvas-menu-item"><g><path d="M12,64H4c-2.2,0-4,1.8-4,4v120c0,2.2,1.8,4,4,4h8c2.2,0,4-1.8,4-4V68C16,65.8,14.2,64,12,64z"/><path d="M36,48h-8c-2.2,0-4,1.8-4,4v152c0,2.2,1.8,4,4,4h8c2.2,0,4-1.8,4-4V52C40,49.8,38.2,48,36,48z"/><path d="M60,0h-8c-2.2,0-4,1.8-4,4v248c0,2.2,1.8,4,4,4h8c2.2,0,4-1.8,4-4V4C64,1.8,62.2,0,60,0z"/><path d="M108,64h-8c-2.2,0-4,1.8-4,4v120c0,2.2,1.8,4,4,4h8c2.2,0,4-1.8,4-4V68C112,65.8,110.2,64,108,64z"/><path d="M84,32h-8c-2.2,0-4,1.8-4,4v184c0,2.2,1.8,4,4,4h8c2.2,0,4-1.8,4-4V36C88,33.8,86.2,32,84,32z"/><path d="M132,80h-8c-2.2,0-4,1.8-4,4v88c0,2.2,1.8,4,4,4h8c2.2,0,4-1.8,4-4V84C136,81.8,134.2,80,132,80z"/><path d="M180,64h-8c-2.2,0-4,1.8-4,4v120c0,2.2,1.8,4,4,4h8c2.2,0,4-1.8,4-4V68C184,65.8,182.2,64,180,64z"/><path d="M204,80h-8c-2.2,0-4,1.8-4,4v88c0,2.2,1.8,4,4,4h8c2.2,0,4-1.8,4-4V84C208,81.8,206.2,80,204,80z"/><path d="M156,48h-8c-2.2,0-4,1.8-4,4v152c0,2.2,1.8,4,4,4h8c2.2,0,4-1.8,4-4V52C160,49.8,158.2,48,156,48z"/><path d="M228,96h-8c-2.2,0-4,1.8-4,4v56c0,2.2,1.8,4,4,4h8c2.2,0,4-1.8,4-4v-56C232,97.8,230.2,96,228,96z"/><path d="M252,112h-8c-2.2,0-4,1.8-4,4v24c0,2.2,1.8,4,4,4h8c2.2,0,4-1.8,4-4v-24C256,113.8,254.2,112,252,112z"/></g></svg>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" class="canvas-menu-item"><path d="M6 23h-6v-2h6v2zm9-2h-6v2h6v-2zm9 0h-6v2h6v-2zm-18-4h-6v2h6v-2zm9 0h-6v2h6v-2zm9 0h-6v2h6v-2zm0-4h-6v2h6v-2zm-18 0h-6v2h6v-2zm9 0h-6v2h6v-2zm-9-4h-6v2h6v-2zm9 0h-6v2h6v-2zm0-4h-6v2h6v-2zm0-4h-6v2h6v-2z"/></svg>
                </div>
            </div> 
            <!-- /canvas space -->
            
            
            <div id="controlpanel" class="frameSpace">
                
                <!-- master volume fader -->
                <div class="sliders" <?php if(!isset($array["debug_level"])) { echo 'style="display:none;"'; } ?> >
                    <label for="volume">master</label>
                    <input type="range" id="volume" class="control-volume slider" min="0" max="1.5" value="0.9" list="gain-vals" step="0.01" data-action="volume" />
                    <datalist id="gain-vals">
                        <option value="0" label="min"></option>
                        <option value="1.5" label="max"></option>
                    </datalist>
                </div>
                
                <button data-playing="false" id="playbutton" style="display:none;" role="switch" aria-checked="false">
                    <span>Play/Pause</span>
                </button>
            </div> 
            <!-- control panel -->            
        </div> 
        <!-- octophonic player -->
        
        <div id="helpmenu" class="content customContainer" style="display:none;">
            <div style="position:relative;height:auto;">
                <h4 style="text-align:center;">Help & About</h4>
                <h5>How to use this software</h5>
                In the main view, you are able to move around the <i>listener</i> (the virtual position of your earbuds) and the <i>soundsources</i> (the speakers) by draging the icons. It's also possible to change the direction of the listener by clicking anywhere on the 2d field. This interaction enables new interesting virtual     3D listening experiences.
                
                <h5>Used techniques</h5>
                This software uses an audio technique called 'binaural audio'. This technique allows us to almost exactly simulate the location of any sound source. To experience this effect it is <u>required</u> to wear earbuds. <a href="https://hookeaudio.com/what-is-binaural-audio/" target="_blank">More info.</a>
                
                
                <h5>Credits, contact & copyrights</h5>
                This software and all of it's attachements are created and owned by Harold Groenenboom. <br>Contact: info@haroldgroenenboom.nl<br>
                <br>
                Copyright © 2019 Groenenboom Music Composition & Software Design
                
                <br><br><h4 style="text-align:center;"><a onclick="toggleHelp()">close</a></h4><br><br>
                <div style="top:0px;position:absolute;height:100%;width:100%;background-color:#ffe;opacity:0.25;z-index:-1;">
                </div>
            </div>
        </div>
        
        <footer>
            <div style="position:relative;height:100%;z-index:1">
                <div id="playButtonSVG" class="footerContainer"> 
                    <svg class="footerDrawable" viewBox="0 0 24 24" width="30" height="30" xmlns="http://www.w3.org/2000/svg">
                        <path style="stroke:#111;stroke-width:2;stroke-linejoin:round;fill:#111;" d="M23 12l-22 12v-24l22 12zm-21 10.315l18.912-10.315-18.912-10.315v20.63z"/>
                    </svg>
                </div>
                <div style="display:none;" id="pauseButtonSVG" class="footerContainer"> 
                    <svg class="footerDrawable" viewBox="0 0 24 24" width="30" height="30" xmlns="http://www.w3.org/2000/svg">
                        <path style="stroke:#111;stroke-width:2;stroke-linejoin:round;fill:#111;" d="M10 24h-6v-24h6v24zm10 0h-6v-24h6v24zm-11-23h-4v22h4v-22zm10 0h-4v22h4v-22z"/>
                    </svg>
                </div>
                <div class="footerContainer">
                    <svg class="footerDrawable" xmlns="http://www.w3.org/2000/svg" version="1.0" width="30" height="30" viewBox="0 0 75 75">
                        <path d="M39.389,13.769 L22.235,28.606 L6,28.606 L6,47.699 L21.989,47.699 L39.389,62.75 L39.389,13.769z" style="stroke:#111;stroke-width:5;stroke-linejoin:round;fill:#111;"/>
                        <path d="M48,27.6a19.5,19.5 0 0 1 0,21.4M55.1,20.5a30,30 0 0 1 0,35.6M61.6,14a38.8,38.8 0 0 1 0,48.6" style="stroke:#111;stroke-width:5;stroke-linecap:round;fill:#111;"/>
                    </svg>
                </div>
                
                <input type="range" id="trackVolume" class="footerContainer" style="width:100px" min="0" max="1.7" value="0.8" list="trackVolume-vals" step="0.001" data-action="trackVolume"></input>
                <datalist id="trackVolume-vals">
                    <option value="0" label="min"></option>
                    <option value="1.5" label="max"></option>
                </datalist>
                
                <!--
                <p class="footerContainer" style="width:auto;padding:2px;color:#ddd;margin:0 8px;" <?php if(!isset($array["reverbon"])) { echo 'style="display:none;"'; } ?>>reverb volume</p>
                <input type="range" id="reverb" class="footerContainer control-reverb" style="width:100px" min="0" max="0.5" value="0.36" list="reverb-vals" step="0.01" data-action="reverb" <?php if(!isset($array["reverbon"])) { echo 'style="display:none;"'; } ?>/>
                <datalist id="reverb-vals">
                <option value="0" label="min"></option>
                <option value="0.5" label="max"></option>
                </datalist>
                -->
                
                <p class="footerContainer" style="width:auto;padding:2px;color:#ddd;margin:0 8px;<?php if(!isset($array["rotatespeakers"])) { echo 'display:none;'; } ?>">rotate speakers</p>
                <input type="range" id="pan" class="footerContainer control-panning slider circular-slider" style="width:100px;margin:10px;<?php if(!isset($array["rotatespeakers"])) { echo 'display:none;'; } ?>" min="0" max="6.28" value="3.745" list="pan-vals" step="0.01" data-action="pan"/>
                <datalist id="pan-vals">
                    <option value="0" label="min"></option>
                    <option value="6.28" label="max"></option>
                </datalist>
                
                <div class="footerContainer help-button-container">
                    <button class="help-button" onclick="toggleHelp()">
                        <i class="fa fa-question-circle"></i>
                    </button>
                </div>
            </div>
            
            <div style="position:absolute;background-color:#777777; height:100%; width:100%; top:0px; x-index:-1; z-index:0; pointer-events:none;">
            </div>
        </footer>
        
        <div class="background" style="background-image: url('<?php
            parse_str(parse_url( "http://$_SERVER[HTTP_HOST]$_SERVER[REQUEST_URI]" )["query"], $array);
            if(isset($array["background_image"])) {
                echo $array["background_image"];
                } else {
                echo "resources/img/test3.gif";
            }
            echo "'); opacity:";
            if(isset($array["opacity"])) {
                echo $array["opacity"];
                } else {
                echo "0.8";
            }
            ?>;">
        </div> 
        <!--- background image -->
        
        <!--- background color -->
        <div class="background" style="position:absolute;z-index: -2;background-color: <?php
            if(isset($array["colortheme"])) {
                if($array["colortheme"] == "dark") {
                    echo "#000";
                    } else {
                    // light theme
                    echo "#fff";
                }
            }
            ?>;">
        </div> 
        <!--- background color -->
        
        <div id="debugelements" style="top:100%;position:absolute;"> 
            <?php
                # GENERATE DEBUG INTERFACE
                if(array_key_exists("debuglevel", $array) && isset($array["debuglevel"])) {
                    # developer faders
                    echo '<div style="overflow-y: auto; height:400px;background-color:rgb(255,255,255);display:block;width:100%;">';
                    echo '<div class="sliders"><input type="range" id="rollof" class="slider" min="0" max="1" step="0.01" /><label for="rollof">roloff</label></div>';
                    echo '<div class="sliders"><input type="range" id="refDistance" class="slider" min="0" max="50" step="0.01" /><label for="refDistance">refDistance</label></div>';
                    echo '<div class="sliders"><input type="range" id="maxDistance" class="slider" min="0" max="120" step="0.01" /><label for="maxDistance">maxDistance</label></div>';
                    echo '</div>';
                    
                    # print console
                    echo '<div style="overflow-y: auto; height:400px;background-color:rgb(255,255,255);"><p id="console"></p></div>';
                    
                    # script to register debug interface
                    echo '<script src="source/debug.js" type="text/javascript"></script>';
                }
            ?>
        </div> 
        <!-- /debugelements -->
        
        <!-- audio sources -->
        <?php
            #GENERATE AUDIO FILE JS ARRAY
            if(isset($array["filelist"]) && $array["filelist"] != "") 
            {
                echo '<script type="text/javascript">var urls=' . $array["filelist"] . ';</script>';
            }
            else 
            {
                $NUM_AUDIO_FILES = isset($array["channels"]) ? (int)$array["channels"] : 8;

                # file, num_channels, ext mode
                if(isset($array["file"]) && isset($array["ext"])) 
                {
                    echo '<script type="text/javascript">var urls=[';
                    
                    # IF EXTENSION AND FILE IS DEFINED
                    for($i = 1; $i < $NUM_AUDIO_FILES + 1; $i++) {
                        echo '"' . $array["file"] . $i . $array["ext"] . '"';
                        
                        if($i < $NUM_AUDIO_FILES) { echo ", "; }
                    }
                    echo '];</script>';
                } 
                else 
                {
                    echo '<h1>no valid audiofile selected! please enter a valid audiofile...</h1>';
                }
            }
        ?> 
        <!-- /audio sources-->
        
        <script src="http://reverbjs.org/reverb.js"></script> 
        
        <script src="source/preload.js" type="text/javascript"></script>
        <script src="source/coordinates/coordinates.js" type="text/javascript"></script>
        <script src="source/painting/color.js" type="text/javascript"></script>
        <script src="source/painting/rectangle.js" type="text/javascript"></script>
        <script src="source/painting/svg.js" type="text/javascript"></script>
        <script src="source/main.js" type="text/javascript"></script>

        <script src="source/circularslider/circularslider.js"></script>
    </body>
</html>
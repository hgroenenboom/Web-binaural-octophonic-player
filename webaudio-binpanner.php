<!--- MODIFIED MULTICHANNEL AUDIO TO BINAURAL AUDIO PLAYER --->
<!--- by Harold Groenenboom                       --->
<!--- Base code: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Web_audio_spatialization_basics --->

<!-- 
    audiofiles will be looked for like this:
    <file>{0-channels}<ext>
    
    --- ARGUMENTS ---
    manditory
    - file=<url>, url of file to load. Without the extension and without the numbering (for instance audiofile01.mp3 -> audiofile0)
        Files are supposed to be split into mono files and numbered from 1. 
        Example for the files needed for the input audiofile0:
            audiofile01<ext>, audiofile02<ext>, audiofile03<ext>, audiofile04<ext>, audiofile05<ext>, audiofile06<ext>, audiofile07<ext>, audiofile08<ext>
    - ext=<audioextension>, audio extension to be used. (i.e. .wav/.mp3/.m4a)
    - channels=<0-16>, the number of audiofiles to look for. (default = 8)
        or instead of <file><ext><numchannels>
    - filelist=<[<url>]>
    
    style
    - background_image=<url>, the background image to use. Default is art designed by me
    - opacity=<0-1>, opacity for the background image
    - colortheme=<dark/light>, default=light, the color theme for all visible html elements
    - colorgradient=< [ n*[amplitude, [r,g,b,a]] ] >
    
    powerusers / alpha features
    - debuglevel=<0-10>, the debuglevel to run on. Higher level creates more console output. only to use when debugging.
    - reverbon, enables reverb
    - rotatespeakers
    
    unused / disabled
    - height=<200-1000>, the height of the iFrame
-->


<!DOCTYPE html>
<html>
    <head>
        <meta charset="utf-8">
        <meta http-equiv="x-ua-compatible" content="ie=edge">
        <title>Web Audio Spacialisation</title>
        <meta name="description" content="Panner node demo for Web Audio API">
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
        
        <!-- https://www.warpdesign.fr/webaudio-from-scriptprocessornode-to-the-new-audioworklet-api/ -->
        <!-- https://github.com/GoogleChromeLabs/audioworklet-polyfill -->
        <!--<script src="https://unpkg.com/audioworklet-polyfill/dist/audioworklet-polyfill.js"></script> <!-- since ScriptProcessorNode is used in most browser, but deprectated! And the new AudioWorklet is favored by WebAudio, but only support by Chrome. -->
        
        <link href="https://fonts.googleapis.com/css?family=Montserrat:300,400,500,700" rel="stylesheet">
        <link href="css/bootstrap.min.css" rel="stylesheet">
        <link href="css/style.css" rel="stylesheet">
        <link href="css/customStyle.css" rel="stylesheet">
        <link href="circularslider/circularslider.css" rel="stylesheet">
        
        <script src="https://code.jquery.com/jquery-3.4.1.slim.min.js" integrity="sha256-pasqAKBDmFT4eHoN2ndd6lN370kFiGUFyTiUHWhU7k8=" crossorigin="anonymous"></script>
        
        <?php
            parse_str(parse_url( "http://$_SERVER[HTTP_HOST]$_SERVER[REQUEST_URI]" )["query"], $array);
            
            # SET DEFAULT PARAMETERS
            
            # set number of audiofiles 
            $NUM_AUDIO_FILES = 8;
            if(isset($array["channels"])) {
                $NUM_AUDIO_FILES = (int)$array["channels"];
            }
            
            # set logging level flag
            echo '<script type="text/javascript">';
            if(isset($array["debuglevel"])) {
                echo 'var SHOULD_LOG=parseFloat(' . $array["debuglevel"] . ');';
            } else {
                echo 'var SHOULD_LOG=-1;';
            }
            
            # set default or submitted colorgradient
            if(isset($array["colorgradient"])) {
                echo 'var colorPoints = ' . $array["colorgradient"] . ';';
            } else {
                echo 'var colorPoints = [[0, [198, 207, 199, 0.7]],[0.1, [32, 209, 33, 1.0]], [0.33, [36, 66, 36, 1.0]], [0.666, [242, 128, 13, 1.0]], [1, [255, 0, 0, 1.0]]];';
            }
            
            # set use reverb flag
            echo 'var USE_REVERB_NODES = ' . (isset( $array["reverbon"] ) ? "true" : "false") . ';';
            echo "</script>";

            # set style sheet by colortheme
            if(isset($array["colortheme"])) {
                if($array["colortheme"] == "dark") {
                    echo "<link href='css/darkTheme.css' rel='stylesheet'>";
                }
            }
        ?>
    </head>

    <body>
        <div id="loading screen" style="position:relative; z-index:1;">
            <p style="margin-top:10vw;font-size:4vw;text-align:center">loading resources</p>
            <p id="loading-text" style="margin-top: 7vw;font-size:2.2vw;text-align:center;padding:7wh;overflow:auto;height:50vh;">waiting for server...</p>
        </div>
        
        <?php
        # DISPLAY FILE LOADED (DEBUG)
        if($array["debuglevel"] != "-1" && isset($array["debuglevel"])) {
            echo '<div style="position:absolute;top:0px;margin:0px;"><p style="top:0px;font-size:8px;">' . $array["file"]."1".$array["ext"] . '</p></div>';
        }
        ?>
        
        <div id="octophonic player" class="customContainer" style="display:none;">
            <!-- canvas space -->
            <div class="frameSpace drawFrameSpace">
                <canvas class="canvas" id="canvas" width="1000" height="1000">canvas</canvas>
                <div style="height:100%;display:inline-block;width:3%;float:right;background-color:grey;opacity:0.4" id="drawCanvasButton"></div>
            </div> <!-- /canvas space -->
                
            
            <!-- control panel -->
            <div class="frameSpace" style="margin:auto;">
                <!-- track volume fader -->
                <div class="sliders">
                    <label for="trackVolume">track volume</label>
                    <input type="range" id="trackVolume" class="control-trackVolume slider" min="0" max="1.5" value="0.8" list="trackVolume-vals" step="0.01" data-action="trackVolume" />
                    <datalist id="trackVolume-vals">
                        <option value="0" label="min"></option>
                        <option value="1.5" label="max"></option>
                    </datalist>
                </div>
            
                <!-- reverb volume fader -->
                <div class="sliders" <?php if(!isset($array["debug_level"])) { echo 'style="display:none;"'; } ?> >
                    <label for="reverb">reverb volume</label>
                    <input type="range" id="reverb" class="control-reverb slider" min="0" max="0.5" value="0.36" list="reverb-vals" step="0.01" data-action="reverb" />
                    <datalist id="reverb-vals">
                        <option value="0" label="min"></option>
                        <option value="0.5" label="max"></option>
                    </datalist>
                </div>

                <!-- master volume fader -->
                <div class="sliders" <?php if($array["debug_level"] != "-1" || !isset($array["debug_level"])) { echo 'style="display:none;"'; } ?> >
                    <label for="volume">master</label>
                    <input type="range" id="volume" class="control-volume slider" min="0" max="1.5" value="0.9" list="gain-vals" step="0.01" data-action="volume" />
                    <datalist id="gain-vals">
                        <option value="0" label="min"></option>
                        <option value="1.5" label="max"></option>
                    </datalist>
                </div>
                
                <!-- speaker rotation fader -->
                <div class="sliders" <?php if(!isset($array["rotatespeakers"])) { echo " style='display:none;'"; } ?> >
                    <label for="pan">rotate speakers</label>
                    <input type="range" id="pan" class="control-panning slider circular-slider" min="0" max="6.28" value="3.745" list="pan-vals" step="0.01" data-action="pan" />
                    <datalist id="pan-vals">
                        <option value="0" label="min"></option>
                        <option value="6.28" label="max"></option>
                    </datalist>
                </div>
                
                <?php
                if (isset( $array["reverbon"] )) {
                    echo '<!-- reverb enabled button -->
                    <div class="sliders">
                        <button data-reverb="false" id="reverbbutton" role="switch" aria-checked="false">
                            <span>Reverb on</span>
                        </button>                    
                    </div>';
                }
                ?>
                
                <!-- playbutton -->
                <div class="sliders">
                    <button data-playing="false" id="playbutton" role="switch" aria-checked="false">
                        <span>Play/Pause</span>
                    </button>
                </div>
            </div> <!-- control panel -->            
        </div> <!-- octophonic player -->
        
        <!--- background image -->
        <div class="background" style="background-image: url('<?php
                        parse_str(parse_url( "http://$_SERVER[HTTP_HOST]$_SERVER[REQUEST_URI]" )["query"], $array);
            if(isset($array["background_image"])) {
                echo $array["background_image"];
            } else {
                echo "/img/test3.gif";
            }
            echo "'); opacity:";
            if(isset($array["opacity"])) {
                echo $array["opacity"];
            } else {
                echo "0.8";
            }
        ?>;">
        </div> <!--- background image -->
        
        <!--- background color -->
        <div class="background" style="position:absolute;z-index: -1;background-color: <?php
            parse_str(parse_url( "http://$_SERVER[HTTP_HOST]$_SERVER[REQUEST_URI]" )["query"], $array);
            if(isset($array["colortheme"])) {
                if($array["colortheme"] == "dark") {
                    echo "#000";
                } else {
                // light theme
                    echo "#fff";
                }
            }
        ?>;">
        </div> <!--- background color -->
        
        <div id="debugelements" style="top:100%;position:absolute;"> 
        <?php
            # GENERATE DEBUG INTERFACE
            if($array["debuglevel"] != "-1" && isset($array["debuglevel"])) {
                # developer faders
                echo '<div style="overflow-y: auto; height:400px;background-color:rgb(255,255,255);display:block;width:100%;">';
                    echo '<div class="sliders"><input type="range" id="rollof" class="slider" min="0" max="1" step="0.01" /><label for="rollof">roloff</label></div>';
                    echo '<div class="sliders"><input type="range" id="refDistance" class="slider" min="0" max="50" step="0.01" /><label for="refDistance">refDistance</label></div>';
                    echo '<div class="sliders"><input type="range" id="maxDistance" class="slider" min="0" max="120" step="0.01" /><label for="maxDistance">maxDistance</label></div>';
                echo '</div>';
                
                # print console
                echo '<div style="overflow-y: auto; height:400px;background-color:rgb(255,255,255);"><p id="console"></p></div>';
                
                # script to register debug interface
                echo '<script src="debug.js" type="text/javascript"></script>';
            }
        ?>
        </div> <!-- /debugelements -->
        
        <!-- audio sources -->
        <?php
        #GENERATE AUDIO FILE JS ARRAY
        
        if(isset($array["filelist"]) && $array["filelist"] != "") 
        {
            echo '<script type="text/javascript">var urls=' . $array["filelist"] . ';</script>';
        }
        else 
        {
            # file, num_channels, ext mode
            if(isset($array["file"]) && isset($array["ext"])) 
            {
                echo '<script type="text/javascript">var urls=[';
                # IF EXTENSION AND FILE IS DEFINED
                for($i = 1; $i < $NUM_AUDIO_FILES+1; $i++) {
                    echo '"' . $array["file"] . $i . $array["ext"] . '"';
                    if($i < $NUM_AUDIO_FILES) { echo ", "; }
                }
                echo '];</script>';
                
                # the old way: creating html audioelements. sadly creates synchronicity issues, since buffering is only design for a maximum of 6 mediafiles.
                // for($i = 1; $i < $NUM_AUDIO_FILES+1; $i++) {
                    // echo '<audio ';
                    // echo 'src="'.$array["file"].$i.$array["ext"].'" preload="none" crossorigin="anonymous">';
                    // echo '</audio>';
                // }
            } 
            # WIP
            # file, num_channels
            /*else if(isset($array["file"])) 
            {
                # IF ONLY FILE IS DEFINED (BUGGY!!!!)
                for($i = 1; $i < $NUM_AUDIO_FILES+1; $i++) {
                    echo '<audio>';
                    echo '<source="' . str_replace(array('/'), array('%2F'),$array["file"]) . $i . '.mp3" type="audio/mpeg">';
                    // echo '<source="'.$array["file"].$i.'.ogg" type="audio/ogg">';
                    // echo '<source="'.$array["file"].i.'.m4a">'
                    // echo '<source="'.$array["file"].i.'.wav">'
                    echo '</audio>';
                }
            }
            else if(isset($array["filelist"])) {
                
            }*/
            else 
            {
                echo '<h>no valid audiofile selected! please enter a valid audiofile like this: www.haroldgroenenboom.nl/other/webaudio-binpanner/webaudio-binpanner.php?file<enter your file url here!></h>';
            }
        }
        ?> <!-- /audio sources-->

        <!-- http://reverbjs.org/ -->
        <script src="http://reverbjs.org/reverb.js"></script> 
        
        <!-- main scripts -->
        <script src="main.js" type="text/javascript"></script>
        <script src="circularslider/circularslider.js"></script>
    </body>
</html>
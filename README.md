# Web binaural octophonic player.
A binaural (multichannel) audiofile player for the web. Working in all major browsers and devices.
The player locally transforms your surround sound input into surround binaural audio output and provide the user with a nice interface to walk around in the virtual soundstage.

The player is provided as an iFrame, with the possibility to change a lot of the looks/style using parameters in the URL 

![image](https://user-images.githubusercontent.com/22303124/129637201-6fa1ffd1-ad01-486d-b3b8-86672848ba06.png)

## Intended usage
Create a local webserver (for instance using XAMPP) with PHP and Apache/NGINX. \
Make sure this server points to the root of this repository. \
Open `generator.html` and have fun playing around. 

## iFrame arguments

### Audiofiles
The Audiofiles on your server are supposed to be split into mono files and numbered from 1. \
Valid fileslist: 'http://example.com/audiofile1.wav', 'http://example.com/audiofile2.wav', 'http://example.com/audiofile3.wav'

#### Specifying files: Option 1
URL to the location where the audiofiles are located. Without the file extension and without numbering \
```file=<baseurl>``` 

Audio extension for the audiofiles to load (i.e. `.wav`/`.mp3`/`.m4a`). Including the `.` \
```ext=<fileextension>``` 

The amount of audiofiles to load. (default = 8) \
```channels=<0-16>```

The player will automatically load all audiofiles using the following format: \
```<file><channel><ext>```

#### Specifying files: Option 2
A filelist in which the URLs to all mono audiofiles are specified \
```filelist=<[<fileurl>, <fileurl>...] >```

### Styling
The background image to use. Default background is designed by me. \
```background_image=<url>```

Opacity for the background image \
```opacity=<0-1>```

The color theme for all visible html elements. Default is `light` \
```colortheme=<dark/light>```

An array of amplitude-color pairs. This is used by the drawing code to change the color based on the current audio levels. \
```colorgradient=<[[ amplitude, [r,g,b,a] ], [ amplitude, [r,g,b,a] ], ... ]>```

### Powerusers / experimental features
The verbosity level. Higher level creates more console output. only to use when debugging. \
```verbosity=<0-10>```

Enables reverb \
```reverbon```

Undocumented: \
- ```rotatespeakers``` 

## Example iFrame
```html
<iframe src="webaudio-binpanner.php?file=audio/noise/temp/MonoWhiteNoise&ext=.wav&height=750&channels=1&background_image=https://images.fineartamerica.com/images/artworkimages/mediumlarge/2/pastel-lake-sean-duan.jpg&opacity=0.5&colortheme=dark" style="border:1px #32a852 solid;" name="myiFrame" scrolling="no" frameborder="1" marginheight="0px" marginwidth="0px" height="400px" width="600px" allowTransparency="true"></iframe>
``` 

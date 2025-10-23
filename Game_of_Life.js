/*
A "simple" java script implementation of Conway's Game of Life.
The idea provide the game in a compact, portable and offline (if needed) form. This  also means all calculations are performed client side.
In particular is the hope, that this code may have some educational value (worst case as a way not to set up code :p )
The amount of comments is much more than in any normal code, and beyond what is typically advised.
The reasoning is that aspiring programmers might have an easier time understanding the thought processes behind the code.

Because of licences (and yada, yada and a miminal degree of properness ;) ) this javascript code (and the related html and css files) are released under the MIT license:

Copyright (c) 2021 Unaffiliated Algorithms

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

/*
Global variables which can be modified by calls from the html file.
Values are set for convience of initiation.
*/
// This variable indicates if the start or the stop button to run the game has been pressed.
var _start = false;
// the default board contains a single glider
var _board = glider();
// The delay between subsequent game iterations in seconds
var _delay = 0.1;
// offset of the screen center in x-direction in cell units
var _xcenter = 0;
// above in y-direction
var _ycenter = 0;
// This gives the "zoom" factor (well not technically zoom...) of the screen in percent of the initial screen.
var _scale = 100;
/*
These variables are for random initial setups. In a box of width _rx and height _ry each pixel has a
_pc probability of starting out as an occupied cell
*/
//
var _rx = 10;
var _ry = 10;
var _pc = 0.5;

// variables which contain sizes of the initial screen. These change the sizes of the squares and the lines between them.
var _emscale = 100;
var _lineratio = 0.1;
// this is related to the time delay above (for sake of the variable existing before being used.
var gol;

// A general purpose function to create listeners for input fields which react to the enter button being pressed in said field.
function create_enter_listener(id, func) {
  // find the html element with id="..."
  // this allows us to look at or change properties of this element.
  temp = document.getElementById(id);
  // we add "something" (a "listener") which reacts when the Enter key is pressed
  // When Enter is pressed, the function func will be executed.
  temp.addEventListener("keydown", function onEvent(e) {
    if (e.key === "Enter") {
      func();
    }
  });
}

// This function is such the mobile website also can have similar functionality to the code above
function create_focus_listener(id, func) {
  temp = document.getElementById(id);
  document.getElementById(id).addEventListener("focusout", func);
}

// Similar to the above, except that we can more easier specify that an html button was clicked
// Interesting this would also work for any html element with click functionality
function create_button_listener(id, func) {
  document.getElementById(id).addEventListener("click", func);
}

// Once again, this time reacting to the change attributed (this is import for loading files)
function create_file_listener(id, func) {
  document.getElementById(id).addEventListener("change", func);
  //document.getElementById(id).onchange = func;
}

/*
At some point we need to initiate our board and all on screen elements.
This needs to happen AFTER all the corresponding elements have been created within the html document
This is currently the only javascript function which is called from the html document.
*/
function initiate() {
  /*
	The game of life iteration function will expect the cells to be stored in a sorted list.
	The iteration itself will return a sorted collection of cells, so we need to make sure
	the cells are sorted in all cases when an unsorted set of cells may have been produced.
	First time in this order of the code where we actually need to think about how to implement the GoL itself.
	*/
  _board = unique(mergesort(_board));
  /*
	These next lines make sure that the (html) website starts out with the same input values in the numeric fields
	as initiated in the variable setup above.
	*/
  var delay = document.getElementById("delay");
  delay.value = _delay;
  var xcenter = document.getElementById("xcenter");
  xcenter.value = _xcenter;
  var ycenter = document.getElementById("ycenter");
  ycenter.value = _ycenter;
  var scale = document.getElementById("scale");
  scale.value = _scale;
  var rx = document.getElementById("rx");
  rx.value = _rx;
  var ry = document.getElementById("ry");
  ry.value = _ry;
  var pc = document.getElementById("pc");
  pc.value = _pc;
  // draw the grid according to set parameters and then draw all cells.
  draw_scene();
  /*
	In the following lines all listeners which will be needed later are setup
	*/
  // We want the expanse of the board to change when the browser is resized. (However, grid elements stay the same size)
  window.addEventListener("resize", draw_scene);
  // setup all button push events
  create_button_listener("start", press_start);
  create_button_listener("stop", press_stop);
  create_button_listener("step", press_step);
  create_button_listener("save", press_save);
  create_button_listener("random", press_random);
  // do "stuff" when a file is selected to initiate a premade GoL cell population
  create_file_listener("load", press_load);
  // Update the variables from the input fields when the Enter button is pressed inside the field.
  create_enter_listener("scale", set_scale);
  create_enter_listener("xcenter", set_xcenter);
  create_enter_listener("ycenter", set_ycenter);
  create_enter_listener("delay", set_delay);
  // Or update when the field goes out of focus
  create_focus_listener("scale", set_scale);
  create_focus_listener("xcenter", set_xcenter);
  create_focus_listener("ycenter", set_ycenter);
  create_focus_listener("delay", set_delay);
  canvas_click_center();
}

// Finally, let the GoL simulation start running!
function press_start() {
  // check for the most recent delay value
  var delay = document.getElementById("delay");
  _delay = delay.value;
  // take note that the simulation is currently running
  // this is needed if the delay value is changed, while the simulation is running.
  _start = true;
  /*
	A bit of "fun" theory on javascript. Javascript is not multithreaded. This choice is the choice it is.
	However, Javascript can be run asynchronously. That's close enough to multithreading for our purposes. Thanks for handling that for us in the background, Javascript.
	*/
  // clear any GoL simulations that might be running in the background.
  clearInterval(gol);
  // repeatedly run a GoL iteration and wait for _delay seconds
  // The function iterate in setInterval will not block other processes while running.
  gol = setInterval(iterate, _delay * 1000);
}

// See above. Just stop things this time round.
function press_stop() {
  _start = false;
  clearInterval(gol);
}

// run a single simulation step when pressing the step button
function press_step() {
  iterate();
}

/*
The following three setters effect the drawing of the grid and require an immediate redraw of the screen
*/
function set_scale() {
  var scale = document.getElementById("scale");
  _scale = scale.value;
  draw_scene();
}

function set_xcenter() {
  var xcenter = document.getElementById("xcenter");
  _xcenter = xcenter.value;
  draw_scene();
}

function set_ycenter() {
  var ycenter = document.getElementById("ycenter");
  _ycenter = ycenter.value;
  draw_scene();
}

// We want to change the speed of the current simulation in the case it is already running.
function set_delay() {
  var delay = document.getElementById("delay");
  _delay = delay.value;
  if (_start) {
    clearInterval(gol);
    gol = setInterval(iterate, _delay * 1000);
  }
}

// Generate a rectangle of size _rx * _ry around the origin in which each cell has the probability of _pc of containing a cell.
function press_random() {
  // check for updated values in the configuration fields
  var rx = document.getElementById("rx");
  _rx = rx.value;
  var ry = document.getElementById("ry");
  _ry = ry.value;
  var pc = document.getElementById("pc");
  _pc = pc.value;
  // start out with an empty board
  _board = [];
  // go through all pixels in the rectangle (2D structure -> nested for loop)
  for (var i = -Math.ceil(_rx / 2); i < Math.floor(_rx / 2); i++) {
    for (var j = -Math.ceil(_ry / 2); j < Math.ceil(_ry / 2); j++) {
      // randomly determine if a grid cell is populated or not
      if (Math.random() < _pc) {
        _board.push([i, j]);
      }
    }
  }
  // Don't forget to make sure the cells are sorted! (Otherwise the iteration function will misbehave)
  _board = unique(mergesort(_board));
  // And, the usual redraw.
  draw_scene();
}

/*
This function is used when a file is selected to load a configuration of cells from a csv (column separated value) file.
Get an example configuration by pressing the save function.
The csv file is rudementary: Only provide x and y coordinates as two integers separated by a comma for each cell.
Cells are separated by line breaks (enters). Make sure there are NO ADDITIONAL lines or characters. No.
The code below was modified/inspired from snippets on this website:
https://seegatesite.com/tutorial-read-and-write-csv-file-with-javascript/
Admittably looking at the website code, it would seem this itself was a rehashed bit of code. At this point we'll argue fair use for our MIT license.
*/
function press_load() {
  // get the file input field from the html document
  var load = document.getElementById("load");
  /*
	This script is called when a file is selected. We need this if condition to check if a file was actually selected.
	Otherwise pressing cancel could result in crash. Javascript crashes are not fun.
 	*/
  if (load.files && load.files[0]) {
    // file reader stuff... There was to base off an outside snippet
    // https://developer.mozilla.org/en-US/docs/Web/API/FileReader/onload for reference of what going on here.
    let reader = new FileReader();
    reader.readAsBinaryString(load.files[0]);
    reader.onload = function (e) {
      // text content of the file
      var data = e.target.result;
      // store the data into a cell collection
      _board = parseData(data);
      // sort for futher use
      _board = unique(mergesort(_board));
      // and draw
      draw_scene();
    };
  }
}

// parse are text file containing cell coordinates
function parseData(data) {
  // target for cell storage
  let csvData = [];
  // line break split to array of the input data string
  let lbreak = data.split("\n");
  /*
	mmhm arrow notations in javascript
	For each line in the file, separate numbers based on the comma
	and store the values as integers into a list.
	*/
  lbreak.forEach((res) => {
    csvData.push(res.split(","));
    var l = csvData.length - 1;
    csvData[l][0] = parseInt(csvData[l][0]);
    csvData[l][1] = parseInt(csvData[l][1]);
  });
  // voila, the extracted board
  return csvData;
}

/*
Saving a cell configuration to a csv file.
*/
function press_save() {
  //start with an emptry csv file string
  var csv = "";
  //store the coordinates for each cell.
  // Why do we dislike normal for loops so?
  _board.forEach(function (row) {
    csv += row.join(",");
    csv += "\n";
  });
  // Remove the last line break, as this will create a broken entry when reading from the csv file.
  csv = csv.slice(0, csv.length - 1);
  // the string "a" specifies what type of html element will be created (element of tag <a> (hyperlink) in this case).
  // The element needs to be a hyperlink for the download to work.
  var hiddenElement = document.createElement("a");
  // store the data into this hidden element
  hiddenElement.href = "data:text/csv;charset=utf-8," + encodeURI(csv);
  hiddenElement.target = "_blank";

  //provide the name for the CSV file to be downloaded
  hiddenElement.download = "Game_of_life_cells.csv";
  // click to download :)
  hiddenElement.click();
}

/*
This function contains the drawing of the empty grid. The colors of the grid lines can currently be changed here.
This is one of the two drawing functions used when the whole scene is redrawn.
*/
function empty_canvas() {
  // get the canvas element in the html document
  var main = document.getElementById("main");
  // we do this because the canvas width was never explicitly defined in the css or html file
  // If we don't do this the drawing is blurred.
  // this comment will still need to be reviewed for a better explanation.
  main.width = main.clientWidth;
  main.height = main.clientHeight;
  var w = main.width;
  var h = main.height;
  // we plan on making a 2D image. The other context option would be using WebGL(3d)
  var context = main.getContext("2d");
  // This unit is the size in EM (relative text size) units of a single grid element
  var unit = (_emscale * _scale) / 100;
  // clear and previous drawing on the whole canvas
  context.clearRect(0, 0, w, h);
  //This is used to avoid blurring of grid lines and similar. Depending if the canvas proportions are even or odd numbers in pixels and might shift the canvas coordinates by 0.5 pixels.
  if (w % 2 == 0) {
    context.translate(0.5, 0);
  }
  if (h % 2 == 0) {
    context.translate(0, 0.5);
  }
  // draw grey grid lines
  // grid color is currently set here
  context.strokeStyle = "rgba(127, 127, 127, 1)";
  // grid line thickness, lineratio fraction of the grid unit
  context.lineWidth = unit * _lineratio;
  //draw vertical lines from the center out
  for (var i = w / 2; i >= 0; i -= unit) {
    context.beginPath();
    context.moveTo(i, 0);
    context.lineTo(i, h);
    context.stroke();
  }
  for (var i = w / 2; i <= w; i += unit) {
    context.beginPath();
    context.moveTo(i, 0);
    context.lineTo(i, h);
    context.stroke();
  }
  //draw horizontal lines from the center out
  for (var i = h / 2; i >= 0; i -= unit) {
    context.beginPath();
    context.moveTo(0, i);
    context.lineTo(w, i);
    context.stroke();
  }
  for (var i = h / 2; i <= h; i += unit) {
    context.beginPath();
    context.moveTo(0, i);
    context.lineTo(w, i);
    context.stroke();
  }
}

/*
Drawing of the actual populated grid
*/
function draw_board() {
  // get the canvas element
  var main = document.getElementById("main");
  // we don't need to set the canvas height and width anymore, because that is already done in the empty_canvas function
  // see empty_canvas() for explanations
  var w = main.width;
  var h = main.height;
  var context = main.getContext("2d");
  var unit = (_emscale * _scale) / 100;
  var l = unit * _lineratio * 0.5;
  // We need this so that we can draw populated pixels without drawing over the grid lines.
  var s = unit - 2 * l;
  // the cells will be drawn and filled in white
  context.strokeStyle = "rgba(255, 255, 255, 1)";
  context.fillStyle = "rgba(255, 255, 255, 1)";
  // go through all "living" cells in the simulation
  for (var b = 0; b < _board.length; b++) {
    // convert cell coordinates to canvas coordinates
    var x = (_board[b][0] - _xcenter) * unit + w / 2;
    var y = (_board[b][1] - _ycenter) * unit + h / 2;
    // only draw cells which will be visible on the canvas
    if (x >= -unit && x <= w + unit && y >= -unit && y <= h + unit) {
      context.beginPath();
      context.fillRect(x + l, y + l, s, s);
      context.stroke();
    }
  }
}

function canvas_click_center() {
  document
    .getElementById("main")
    .addEventListener("click", function onEvent(e) {
      var w = document.getElementById("main").width;
      var h = document.getElementById("main").height;
      var unit = (_emscale * _scale) / 100;
      var x = Math.floor((event.offsetX - w / 2) / unit + _xcenter);
      var y = Math.floor((event.offsetY - h / 2) / unit + _ycenter);
      document.getElementById("xcenter").value = x;
      document.getElementById("ycenter").value = y;
      _xcenter = x;
      _ycenter = y;
      draw_scene();
    });
}

// draw the grid as well as the cells. This function is used for graphical page updates.
function draw_scene() {
  empty_canvas();
  draw_board();
}

// A single iteration of the GoL. First calculate the new scene, and then draw it.
function iterate() {
  _board = gol_iter(_board);
  draw_scene();
}

/*
Finally we come to the actual implementation of the GoL.
*/

// a function which compare which of two 2D-coordinates is greater, lesser or equal (The comparison is arbitrary, it is only important that we can compare (and therefore sort all cells))
function compare(a, b) {
  if (a[0] > b[0]) {
    return 1;
  } else if (a[0] == b[0]) {
    if (a[1] > b[1]) {
      return 1;
    } else if (a[1] == b[1]) {
      return 0;
    } else {
      return -1;
    }
  } else {
    return -1;
  }
}

// A simple implementation of mergesort. This sorting function could be used on any type of array, for which elements a compare function is defined.
function mergesort(a) {
  // find the middle of the array.
  var l = Math.ceil(a.length / 2);
  // this is the final case, when there are two or less elements in an array.
  if (l < 2) {
    // if there is one (or no) elements, there is nothing to be sorted.
    if (a.length < 2) {
      return a;
    }
    // Two possible cases: the array is already sorted, or will be sorted when the order of both elements is flipped.
    else {
      var comp = compare(a[0], a[1]);
      if (comp == -1) {
        return [a[0], a[1]];
      } else {
        return [a[1], a[0]];
      }
    }
  }
  //Otherwise, if the array is still bigger we recursively apply the algorithm the subarrays given when splitting the array in the middle.
  var b = mergesort(a.slice(0, l));
  var c = mergesort(a.slice(l, a.length));
  // Afterwards we need to merge both sorted arrays.
  var checkb = 0;
  var checkc = 0;
  // target for the merged array
  var d = [];
  // while neither of the subarrays has been parsed
  while (checkb < b.length && checkc < c.length) {
    // We are running through both sorted arrays at the same time and compared the current positions to create the sorted list
    var comp = compare(b[checkb], c[checkc]);
    // move the the check of the list which has the smallest current element according
    if (comp == -1) {
      d.push(b[checkb]);
      checkb++;
    } else {
      d.push(c[checkc]);
      checkc++;
    }
  }
  // append the rest of the list which hasn't been finished to the sorted list
  if (checkb < b.length) {
    d = d.concat(b.slice(checkb, b.length));
  } else {
    d = d.concat(c.slice(checkc, c.length));
  }
  return d;
}

/*
Check for duplicates in an array and return an array copy where these are removed.
It is assumed that the array a is sorted.
*/
function unique(a) {
  var b = [];
  // we need to check if there are no elements, so the script doesn't crash if a cells have died.
  if (a.length > 0) {
    b = [a[0]];
    //since the list is sorted we only have to check if adjacent array elements are equal to one another
    for (var i = 1; i < a.length; i++) {
      if (compare(b[b.length - 1], a[i]) != 0) {
        b.push(a[i]);
      }
    }
  }
  return b;
}

/*
Binary search for a sorted array.
*/
function contains(a, x) {
  // lower and upper boundaries of the current search
  var l = 0;
  var u = a.length - 1;
  // as long as there is still a range between upper and lower boundary
  while (l <= u) {
    // check if the current mid point in the array is the value we're looking for
    var mid = Math.floor((l + u) / 2);
    var comp = compare(x, a[mid]);
    // based on the comparison choose the upper or lower sector, or the value is contained
    if (comp == -1) {
      u = mid - 1;
    } else if (comp == 0) {
      return true;
    } else {
      l = mid + 1;
    }
  }
  // This means the value was not found using the binary search
  return false;
}

/*
The crux of the Game of Life. A single iteration of the game using all the proper rules
*/
function gol_iter(board) {
  // target for the next iterations living cells
  var a = [];
  // potential candidates for next iteration cell
  var potential = [];
  // All neighbors of current cells and the current cells themselves are potential cells. Get their coordinates.
  for (var o = 0; o < board.length; o++) {
    for (var i = -1; i < 2; i++) {
      for (var j = -1; j < 2; j++) {
        potential.push([board[o][0] + i, board[o][1] + j]);
      }
    }
  }
  //Sort and get the unique potential values.
  potential = unique(mergesort(potential));
  // Go through all potentials and check if they will be populated
  for (var p = 0; p < potential.length; p++) {
    var counter = 0;
    // count the number of neighbors (including cell) of the potential cell
    for (var i = -1; i < 2; i++) {
      for (var j = -1; j < 2; j++) {
        if (contains(board, [potential[p][0] + i, potential[p][1] + j])) {
          counter += 1;
        }
      }
    }
    // cells which survive with the proper number of neighbors (due to proper social conditions)
    if (contains(board, potential[p])) {
      if (counter == 3 || counter == 4) {
        a.push(potential[p]);
      }
    }
    // unpopulated cells which become populated (due to reproduction)
    else {
      if (counter == 3) {
        a.push(potential[p]);
      }
    }
  }
  // return the next round of cells
  return a;
}

/*
These functions are used to manipulate GoL templates (moving (translation) and flipping)
They are not used in the current setup, but might be useful if the internal lexicon of shapes is expanded.
*/
function move(template, offset) {
  a = [];
  for (var i = 0; i < template.length; i++) {
    a.push([template[i][0] + offset[0], template[i][1] + offset[1]]);
  }
  return a;
}

function flipud(template) {
  a = [];
  for (var i = 0; i < template.length; i++) {
    a.push([template[i][0], -template[i][1]]);
  }
  return a;
}

function fliplr(template) {
  a = [];
  for (var i = 0; i < template.length; i++) {
    a.push([-template[i][0], template[i][1]]);
  }
  return a;
}

/*
A very small collection of basic GoL shapes.
*/
function block() {
  return [
    [1, 1],
    [1, 0],
    [0, 1],
    [0, 0],
  ];
}

function blinker() {
  return [
    [-1, 0],
    [0, 0],
    [1, 0],
  ];
}

function glider() {
  return [
    [-1, -1],
    [0, -1],
    [1, -1],
    [1, 0],
    [0, 1],
  ];
}

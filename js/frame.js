/**
 * Author: Lee Langley
 * Date Created: 18/09/2012 10:05
 * @version 1
 */

Frame = function(options){
	// disable right-click context menu for flashcanvas
	window.FlashCanvasOptions = {
		disableContextMenu:true
	};

	var Frame = this,
		canvas = null,
		ctx = null,
		pxPermm = 1,
		frame = {		// frame information
			file:null,		// frame image file
			thickness:0,	// frame width/thickness in mm
			thicknessPx:0,	// frame width/thickness in pixels
			width:0,		// the frame width in pixels
			height:0		// the frame height in pixels
		},
		slip = {		// slip information
			file:null,		// slip image file
			thickness:0,	// slip width/thickness in mm
			thicknessPx:0	// slip width/thickness in pixels
		},
		mount = {		// mount information
			colour:'#fff',	// background colour
			border:50,		// the space between the photo and the frame in mm
			borderPx:0,		// the space between the photo and the frame in pixels
			innerBorder:5,	// the space between the photo and the photo border in mm
			innerBorderPx:0,// the space between the photo and the photo border in pixels
			sections:[		// mount photo sections
				[
					{
						width:0,		// image width in mm
						height:0,		// image height in mm
						widthPx:0,		// image width in pixels
						heightPx:0		// image height in pixels
					}
				]
			]
		},
		photos = [],		// list of photos for the frame
		centerPoint = {
			x:0,
			y:0
		};

	// image handles
	var loaded = 0,
		imageCount;


	/**
	 * Initialises the frame
	 */
	this.init = function(options){
		// set the user defined options
		options = options || {};
		$.extend(frame, options.frame || {});
		$.extend(slip, options.slip || {});
		$.extend(mount, options.mount || {});
		$.extend(photos, options.photos || []);

		// check if the colour has been specified in American-English
		mount.colour = mount.color || mount.colour;


		// define the canvas object
		if(canvas == null){
			if(jQuery){
				// jQuery exists - use it
				canvas = ((options.canvas instanceof jQuery) ? options.canvas : $(options.canvas)).get(0);
			}else{
				// jQuery doesn't exist - assume canvas is an ID
				canvas = document.getElementById(options.canvas);
			}
			ctx = canvas.getContext('2d');
		}

		// set the canvas width/height correctly
		canvas.width = canvas.offsetWidth;
		canvas.height = canvas.offsetHeight;
		centerPoint = {
			x:canvas.width / 2,
			y:canvas.height / 2
		};

		// define the center of the canvas as coordinate 0,0
		ctx.translate(centerPoint.x, centerPoint.y);


		// store a collection of all images
		var imageName = '';	// temporary storage for image name

		// count images we need to load
		imageCount = ((typeof frame.file == 'string') ? 1 : 0) + ((typeof slip.file == 'string') ? 1 : 0) + photos.length;
		// count images that have been loaded
		loaded = 0;

		// check for a frame image
		if(typeof frame.file == 'string'){
			//images[images.length] = frame.file;
			imageName = frame.file;
			frame.file = new Image();
			frame.file.loadCount = 0;

			// error handler
			frame.file.onerror = function(){
				imageErrorCallback(frame.file);
			};

			if(typeof FlashCanvas != 'undefined'){
				frame.file.src = 'frames/' + imageName;
				ctx.loadImage(frame.file, imageLoadCallback());
			}else{
				frame.file.onload = imageLoadCallback;
				frame.file.src = 'frames/' + imageName;
			}
		}

		// check for a slip image
		if(typeof slip.file == 'string'){
			//images[images.length] = frame.file;
			imageName = slip.file;
			slip.file = new Image();
			slip.file.loadCount = 0;

			// error handler
			slip.file.onerror = function(){
				imageErrorCallback(slip.file);
			};

			if(typeof FlashCanvas != 'undefined'){
				slip.file.src = 'frames/' + imageName;
				ctx.loadImage(slip.file, imageLoadCallback());
			}else{
				slip.file.onload = imageLoadCallback;
				slip.file.src = 'frames/' + imageName;
			}
		}

		// check for photos
		for(var i in photos){
			if(typeof photos[i] == 'string'){
				imageName = photos[i];
				photos[i] = new Image();
				photos[i].loadCount = 0;

				// error handler
				photos[i].onerror = function(){
					imageErrorCallback(photos[i]);
				};

				if(typeof FlashCanvas != 'undefined'){
					photos[i].src = 'frames/' + imageName;
					ctx.loadImage(photos[i], imageLoadCallback());
				}else{
					photos[i].onload = imageLoadCallback;
					photos[i].src = 'frames/' + imageName;
				}
			}else{
				imageCount--;
			}
		}

		if(imageCount == 0){
			postLoadInit();
		}
	};

	/**
	 * Starts the actual drawing process
	 * and calculating te size of the frame
	 */
	var postLoadInit = function(){
		calculateSizes();
		Frame.draw();
	};

	/**
	 * Callback for successful image loads
	 */
	var imageLoadCallback = function(){
		loaded++;
		if(loaded == imageCount){
			// all images have been loaded
			postLoadInit();
		}
	};

	/**
	 * Callback for failed image loads
	 *
	 * @param file
	 * @return {Boolean}
	 */
	var imageErrorCallback = function(file){
		if(file.loadCount >= 3){
			return false;
		}

		file.src = file.src;
		file.loadCount++;
	};

	/**
	 * calculate the frame sizes
	 */
	var calculateSizes = function(){
		// we need to calculate the size of the frame, in pixels, from the size in mm
		// first, calculate the total width/height in mm
		frame.thicknessPx = frame.thickness*pxPermm;
		slip.thicknessPx = slip.thickness*pxPermm;
		mount.borderPx = mount.border*pxPermm;
		mount.innerBorderPx = mount.innerBorder*pxPermm;

		frame.width = (frame.thicknessPx*2) + (slip.thicknessPx*2) + (mount.borderPx*2);
		frame.height = (frame.thicknessPx*2) + (slip.thicknessPx*2) + (mount.borderPx*2);

		// store the row widths
		var rowWidths = [];

		// loop through each section row
		var i = 0, j = 0;
		for(i in mount.sections){
			// define the current row
			var row = mount.sections[i];
			// start the row widths count, for this row
			rowWidths[i] = 0;

			// defines the row height
			var rowHeight = 0;

			// loop through each section in the row
			for(j in row){
				// convert the image width/heights into pixels
				row[j].widthPx = row[j].width*pxPermm;
				row[j].heightPx = row[j].height*pxPermm;

				// add the photo width to the row width
				rowWidths[i] += row[j].widthPx + (mount.innerBorderPx*2);
				// if the photo height is larger than the previous photo (for this row) set it as the row height
				rowHeight = (row[j].heightPx+(mount.innerBorderPx*2) > rowHeight) ? row[j].heightPx+(mount.innerBorderPx*2) : rowHeight;

				// if we are not on the first section of the row add some right padding
				if(j > 0){
					rowWidths[i] += mount.borderPx;
				}
			}

			// add the row height
			frame.height += rowHeight + ((i > 0) ? mount.borderPx : 0);
		}

		// ad the width of the widest row to the frame width
		frame.width += Math.max.apply(Math, rowWidths);

		// now that we have the dimensions, we need to increase/decrease them to fit as closely as possible to the canvas size
		var widthDifference = canvas.width - Math.round(frame.width),
			heightDifference = canvas.height - Math.round(frame.height),
			allowableDifference = 5;
		if((widthDifference < -allowableDifference) || (heightDifference < -allowableDifference)){
			// the frame output size is larger than the canvas - calculate a resize ratio

			// calculate the highest percent decrease (width|height) for the frame to fit within the canvas
			var percent = Math.max((frame.width - canvas.width) / frame.width, (frame.height - canvas.height) / frame.height);

			// now resize every element by the percent
			frame.thickness -= frame.thickness*percent;
			slip.thickness -= slip.thickness*percent;
			mount.border -= mount.border*percent;
			mount.innerBorder -= mount.innerBorder*percent;

			// loop through each section row
			for(i in mount.sections){
				// define the current row
				row = mount.sections[i];

				// loop through each section in the row
				for(j in row){
					row[j].width -= row[j].width*percent;
					row[j].height -= row[j].height*percent;
				}
			}

			// force a re-calculation of the frame sizes
			calculateSizes();
		}else if((widthDifference > allowableDifference) && (heightDifference > allowableDifference)){
			// the frame output size is smaller than the canvas - calculate the resize ratio

			// calculate the lowest percent increase (width|height) for the frame to fit within the canvas
			var percent = Math.min((canvas.width - frame.width) / frame.width, (canvas.height - frame.height) / frame.height);

			// now resize every element by the percent
			frame.thickness += frame.thickness*percent;
			slip.thickness += slip.thickness*percent;
			mount.border += mount.border*percent;
			mount.innerBorder += mount.innerBorder*percent;

			// loop through each section row
			for(i in mount.sections){
				// define the current row
				row = mount.sections[i];

				// loop through each section in the row
				for(j in row){
					row[j].width += row[j].width*percent;
					row[j].height += row[j].height*percent;
				}
			}

			// force a re-calculation of the frame sizes
			calculateSizes();
		}
	};

	/**
	 * Handle funcion for drawing frames (rims & slips)
	 *
	 * @param x1
	 * @param y1
	 * @param x2
	 * @param y2
	 * @param thickness
	 * @param file
	 * @param fillColor
	 */
	var drawFrame = function(x1, y1, x2, y2, thickness, file, fillColor){
		if(file !== null){
			thickness = parseInt(thickness) || 0;
			var length = 0,	// tracks the current output length of a frame side
				count = 0,
				aspectRatio = file.width / file.height,
				frameHeight = Math.floor(thickness / aspectRatio);

			ctx.save();
			ctx.beginPath();
			ctx.moveTo(x1, y1);
			ctx.lineTo(x2, y1);
			ctx.lineTo(x2, y2);
			ctx.lineTo(x1, y2);
			ctx.closePath();
			ctx.clip();
			// repeat the frame down the left-hand side
			for(count = 0; length < frame.height; count++){
				ctx.drawImage(file, x1, Math.floor(y1 + ((frameHeight-1)*count)), thickness, frameHeight);
				length += frameHeight-1;
			}

			// right
			var degrees = (Math.PI/180) * 180;
			ctx.rotate(degrees);
			length = 0;
			for(count = 0; length < frame.height; count++){
				ctx.drawImage(file, x1, Math.floor(y1 + ((frameHeight-1)*count)), thickness, frameHeight);
				length += frameHeight-1;
			}
			ctx.rotate(-degrees);
			ctx.restore();


			ctx.save();
			ctx.beginPath();
			ctx.moveTo(x1, y1);
			ctx.lineTo(x2, y1);
			ctx.lineTo(x2-thickness, y1 + thickness);
			ctx.lineTo(x2-thickness, y2-thickness);
			ctx.lineTo(x2, y2);
			ctx.lineTo(x1, y2);
			ctx.lineTo(x1+thickness, y2-thickness);
			ctx.lineTo(x1+thickness, y1+thickness);
			ctx.closePath();
			ctx.clip();

			degrees = (Math.PI/180) * 90;
			ctx.rotate(degrees);
			// top
			length = 0;
			for(count = 0; length < frame.width; count++){
				ctx.drawImage(file, y1, Math.floor(x1 + ((frameHeight-1)*count)), thickness, frameHeight);
				length += frameHeight-1;
			}
			ctx.rotate(-degrees*2);
			// bottom
			length = 0;
			for(count = 0; length < frame.width; count++){
				ctx.drawImage(file, y1, Math.floor(x1 + ((frameHeight-1)*count)), thickness, frameHeight);
				length += frameHeight-1;
			}
			ctx.rotate(degrees);
			ctx.restore();
		}else{
			// frame image doesn't exist - use a colour fill
			ctx.fillStyle = fillColor || '#eaeaea';

			// top
			ctx.fillRect(x1, y1, x2-x1, thickness);
			// bottom
			ctx.fillRect(x1, y2-thickness, x2-x1, thickness);
			// left
			ctx.fillRect(x1, y1, thickness, y2-y1);
			// right
			ctx.fillRect(x2-thickness, y1, thickness, y2-y1);
		}
	};

	/**
	 * Draw the backing mount (not including
	 * any photo sections or photos)
	 */
	var drawMount = function(){
		ctx.fillStyle = mount.colour;
		ctx.fillRect(-(frame.width/2), -(frame.height/2), frame.width, frame.height);
	};

	/**
	 * Draw the actual frame rim
	 */
	var drawRim = function(){
		var frameCoords = {
			x1:-(frame.width/2),
			x2:-(frame.width/2) + frame.width,
			y1:-(frame.height/2),
			y2:-(frame.height/2)+frame.height
		};
		drawFrame(frameCoords.x1, frameCoords.y1, frameCoords.x2, frameCoords.y2, frame.thickness, frame.file);
	};

	/**
	 * Draw the frame slip
	 */
	var drawSlip = function(){
		var frameCoords = {
			x1:Math.floor(-(frame.width/2)+frame.thickness),
			x2:Math.ceil(-(frame.width/2) + frame.width - frame.thickness),
			y1:Math.floor(-(frame.height/2) + frame.thickness),
			y2:Math.ceil(-(frame.height/2) + frame.height - frame.thickness)
		};
		drawFrame(frameCoords.x1, frameCoords.y1, frameCoords.x2, frameCoords.y2, slip.thickness, slip.file, '#ddd');
	};

	/**
	 * draw a mount picture section with the specified
	 * width and height and originating from the given
	 * center location.
	 *
	 * If image is defined, then it will also draw that.
	 *
	 * centerPoint must be an object with the x,y coordinate
	 * for the center point (relative to the frame) that the
	 * section will be drawn
	 * around.
	 * ie;
	 * {
	 *     x:20,
	 *     y:57
	 * }
	 *
	 * @param width
	 * @param height
	 * @param image
	 */
	var drawImageBlock = function(width, height, x, y, image){
		// TODO - need to calculate offset, depending on row/column
		// calculate the starting x/y coordinates
		var x1 = (typeof x == 'number') ? x : -(width/2),
			y1 = (typeof y == 'number') ? y : -(height/2),
			x2 = x1 + width + (mount.innerBorderPx*2),
			y2 = y1 + height + (mount.innerBorderPx*2);

		// fill the image section
		ctx.fillStyle = '#efefef';
		ctx.fillRect(x1+mount.innerBorderPx, y1+mount.innerBorderPx, width, height);

		// draw the image (if one exists)
		if(typeof image == 'object'){
			ctx.drawImage(image, x1+mount.innerBorderPx, y1+mount.innerBorderPx, width, height);
		}

		ctx.lineWidth = 1;
		ctx.strokeStyle = '#efefef';
		ctx.beginPath();
		ctx.moveTo(x1, y1);
		ctx.lineTo(x1, y2);
		ctx.lineTo(x2, y2);
		ctx.lineTo(x2, y1);
		ctx.closePath();
		ctx.stroke();

		// only output the second line if the canvas is big enough
		if((frame.width > 300) && (frame.height > 300)){
			x1--;
			x2++;
			y1--;
			y2++;
			ctx.lineWidth = 1;
			ctx.strokeStyle = '#eee';
			ctx.beginPath();
			ctx.moveTo(x1, y1);
			ctx.lineTo(x1, y2);
			ctx.lineTo(x2, y2);
			ctx.lineTo(x2, y1);
			ctx.closePath();
			ctx.stroke();
		}
	};

	/**
	 * Draws all of the frame components;
	 * Frame, mount, slide, images etc
	 */
	this.draw = function(){
		// draw the mount
		drawMount();

		// draw the images to the mount
		var count = 0,		// the image count (for referencing photos)
			xOffset = 0,	// the x axis offset
			yOffset = 0,	// the y axis offset
			dimensions = [],
			width = 0,
			height = 0;

		// loop through and calculate the sizes for everything
		var i = 0, j = 0;
		for(i in mount.sections){
			dimensions[i] = {
				width:0,
				height:0
			};

			var rowHeight = 0;

			for(j in mount.sections[i]){
				dimensions[i].width += mount.sections[i][j].widthPx + (mount.innerBorderPx*2) + ((j > 0) ? mount.borderPx : 0);
				// if the photo height is larger than the previous photo (for this row) set it as the row height
				rowHeight = (mount.sections[i][j].heightPx > rowHeight) ? mount.sections[i][j].heightPx : rowHeight;
			}
			dimensions[i].height += rowHeight + (mount.innerBorderPx*2);

			width = (dimensions[i].width > width) ? dimensions[i].width : width;
			height += dimensions[i].height + ((i > 0) ? mount.borderPx : 0);
		}


		// now loop through (again) and output the photos
		yOffset = -height/2;
		for(i in mount.sections){
			var row = mount.sections[i];

			xOffset = -width/2;

			for(j in row){
				drawImageBlock(row[j].widthPx, row[j].heightPx, xOffset, yOffset, photos[count]);

				xOffset += row[j].widthPx + mount.borderPx + (mount.innerBorderPx*2);
				count++;
			}

			yOffset += dimensions[i].height + mount.borderPx;
		}


		// draw the frame rim
		drawRim();
		// draw the frame slip
		drawSlip();
	};

	/**
	 * Saves the frame as an image
	 */
	this.save = function(){
		if(typeof canvas2png != 'undefined'){
			try{
				canvas2png(canvas);
			}catch(e){
				alert('Error saving image, please try again');
			}
		}else{
			// no image save functionality exists
			alert('No method for saving the image exists');
		}
	};


	// run some JQuery only functionality
	if(jQuery){
		// if jquery.contextMenu and canvas2png is included, add our context menu
		if($.fn.contextMenu && (typeof canvas2png != 'undefined')){
			// add the context menu
			$('body').append('<ul id="canvasMenu" class="contextMenu">' +
								'<li class="save"><a href="#save">Save</a></li>' +
							'</ul>');
			// set up the funcionality
			$(canvas).contextMenu(
				{
					menu:'canvasMenu'
				},
				function(action, el, pos){
					if(action == 'save'){
						Frame.save();
					}
				}
			);
		}

		// if we're not using the flash replacement, run the re-size functionality
		// flashcanvas can't handle this as it makes the browser un-responsive and doesn't resize anyway.
		if(typeof FlashCanvas == 'undefined'){
			$(window).resize(function(){
				Frame.init();
			});
		}
	}


	// initialise the plugin
	this.init(options);
};
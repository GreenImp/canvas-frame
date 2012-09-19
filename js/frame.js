/**
 * Author: Lee Langley
 * Date Created: 18/09/2012 10:05
 * @version 1
 */

Frame = function(userOptions){
	// disable right-click context menu for flashcanvas
	window.FlashCanvasOptions = {
		disableContextMenu:true
	};

	var Frame = this,
		canvas = null,
		ctx = null,
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
			layers:[
				/*{
					file:null,
					colour:'#fff',

					padding:45
				}*/
			],

			/*file:null,			// background file, if applicable
			colour:'#fff',		// background colour

			border:50,			// the space between the photo and the frame in mm (can be a numerical value or object)
			borderPx:{			// the space between the photo and the frame in pixels (is an object)
				top:0,
				bottom:0,
				left:0,
				right:0
			},
			innerBorder:5,		// the space between the photo and the photo border in mm
			innerBorderPx:0,	// the space between the photo and the photo border in pixels*/

			imagePadding:50,	// padding between photos in mm (only used if frame contains multiple photos - can be a numerical value or object)
			imagePaddingPx:{	// padding between photos in pixels (is an object)
				row:0,
				column:0
			},

			sections:[			// mount photo sections
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
		},
		defaultOptions = {
			pxPerMM:1,
			allowZoom:true,
			allowSave:true,
			autoResize:true
		},
		options = {};

	// image handles
	var loaded = 0,
		imageCount;


	/**
	 * Initialises the frame
	 */
	this.init = function(userOptions){
		var i = 0;

		// set the user defined options
		userOptions = userOptions || {};
		$.extend(frame, userOptions.frame || {});
		$.extend(slip, userOptions.slip || {});
		$.extend(mount, userOptions.mount || {});
		$.extend(photos, userOptions.photos || []);

		// check if the colour has been specified in American-English
		if(mount.layers.length > 0){
			for(i in mount.layers){
				mount.layers[i].colour = mount.layers[i].color || mount.layers[i].colour;
			}
		}


		// define the canvas object
		if(canvas == null){
			if(jQuery){
				// jQuery exists - use it
				canvas = ((userOptions.canvas instanceof jQuery) ? userOptions.canvas : $(userOptions.canvas)).get(0);
			}else{
				// jQuery doesn't exist - assume canvas is an ID
				canvas = document.getElementById(userOptions.canvas);
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

		// remove any unwanted option variables
		delete userOptions.frame;
		delete userOptions.slip;
		delete userOptions.mount;
		delete userOptions.photos;
		delete userOptions.canvas;
		// set the options
		options = $.extend(defaultOptions, userOptions || {});


		// if allowSave and jquery.contextMenu and canvas2png is included, add our context menu
		if(options.allowSave && jQuery && $.fn.contextMenu && (typeof canvas2png != 'undefined')){
			// add the context menu
			$('body').append('<ul id="canvasMenu" class="contextMenu">' +
								'<li class="save"><a href="#save">Save Image</a></li>' +
							'</ul>');
			// set up the functionality
			$(canvas)
					// ensure that canvas doesn't already have contextMenu
					.destroyContextMenu()
					// add contextMenu
					.contextMenu(
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

		// if allowZoom we need to add zoom functionality
		if(options.allowZoom){
			// TODO - add click handler to the canvas to show larger/zoomed version of the canvas
		}


		// store a collection of all images
		var imageName = '';	// temporary storage for image name

		// count images we need to load
		imageCount = ((typeof frame.file == 'string') ? 1 : 0) + ((typeof slip.file == 'string') ? 1 : 0) + mount.layers.length + photos.length;
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
				imageErrorCallback(frame);
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
				imageErrorCallback(slip);
			};

			if(typeof FlashCanvas != 'undefined'){
				slip.file.src = 'frames/' + imageName;
				ctx.loadImage(slip.file, imageLoadCallback());
			}else{
				slip.file.onload = imageLoadCallback;
				slip.file.src = 'frames/' + imageName;
			}
		}

		// check for a mount image
		if(mount.layers.length > 0){
			for(i in mount.layers){
				var layer = mount.layers[i];

				if(typeof layer.file == 'string'){
					imageName = layer.file;
					layer.file = new Image();
					layer.file.loadCount = 0;

					// error handler
					layer.file.onerror = function(){
						imageErrorCallback(layer);
					};

					if(typeof FlashCanvas != 'undefined'){
						layer.file.src = 'frames/' + imageName;
						ctx.loadImage(layer.file, imageLoadCallback());
					}else{
						layer.file.onload = imageLoadCallback;
						layer.file.src = 'frames/' + imageName;
					}
				}else{
					imageCount--;
				}
			}
		}

		// TODO - remove this
		/*if(typeof mount.file == 'string'){
			//images[images.length] = frame.file;
			imageName = mount.file;
			mount.file = new Image();
			mount.file.loadCount = 0;

			// error handler
			mount.file.onerror = function(){
				imageErrorCallback(mount);
			};

			if(typeof FlashCanvas != 'undefined'){
				mount.file.src = 'frames/' + imageName;
				ctx.loadImage(mount.file, imageLoadCallback());
			}else{
				mount.file.onload = imageLoadCallback;
				mount.file.src = 'frames/' + imageName;
			}
		}*/

		// check for photos
		for(i in photos){
			if(typeof photos[i] == 'string'){
				imageName = photos[i];
				photos[i] = new Image();
				photos[i].loadCount = 0;

				// error handler
				photos[i].onerror = function(){
					imageErrorCallback({file:photos[i]});
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
		if(file.file.loadCount >= 3){
			// we have reached the max failed attempts
			// not sure whether we should throw up an error here or just carry on loading
			// for now, mark it as loaded and set the image to null
			file.file = null;
			imageLoadCallback();
			return false;
		}

		// re-define the image src, to force it to-reload
		file.file.src = file.file.src;
		// increment the load count
		file.file.loadCount++;
	};

	/**
	 * calculate the frame sizes
	 */
	var calculateSizes = function(){
		var i = 0, j = 0;

		// this defines how much padding is around each image - it is made up of the mount layer padding
		var imagePadding = {
			x:0,
			y:0
		};

		// set frame with and height to 0
		frame.width = 0;
		frame.height = 0;

		// we need to calculate the size of the frame, in pixels, from the size in mm
		frame.thicknessPx = frame.thickness*options.pxPerMM;
		slip.thicknessPx = slip.thickness*options.pxPerMM;

		// add the frame/slip thickness to the overall frame size
		frame.width += (frame.thicknessPx*2) + (slip.thicknessPx*2);
		frame.height += (frame.thicknessPx*2) + (slip.thicknessPx*2);

		// check the mount layers
		if(mount.layers.length > 0){
			// the frame has mounts ;- loop through them
			for(i in mount.layers){
				// get the layer
				var layer = mount.layers[i];

				// ensure that its padding is defined as an object
				layer.padding = (typeof layer.padding == 'object') ? layer.padding : {top:layer.padding, bottom:layer.padding, left:layer.padding, right:layer.padding};

				layer.paddingPx = {
					top:layer.padding.top * options.pxPerMM,
					bottom:layer.padding.bottom * options.pxPerMM,
					left:layer.padding.left * options.pxPerMM,
					right:layer.padding.right * options.pxPerMM
				};

				if(i == 0){
					// this is the first layer - add the padding to the overall frame dimensions
					frame.width += layer.paddingPx.left + layer.paddingPx.right;
					frame.height += layer.paddingPx.top + layer.paddingPx.bottom;
				}else{
					// inner layer - add the padding to the image padding
					imagePadding.x += layer.paddingPx.left + layer.paddingPx.right;
					imagePadding.y += layer.paddingPx.top + layer.paddingPx.bottom;
				}
			}
		}

				// TODO - remove this
		// check the mount border
		/*mount.border = (typeof mount.border == 'object') ? mount.border : {top:mount.border, bottom:mount.border, left:mount.border, right:mount.border};
		mount.borderPx = {
			top:mount.border.top * options.pxPerMM,
			bottom:mount.border.bottom * options.pxPerMM,
			left:mount.border.left * options.pxPerMM,
			right:mount.border.right * options.pxPerMM
		};*/

		// check the image padding (this is the gap between images)
		mount.imagePadding = (typeof mount.imagePadding == 'object') ? mount.imagePadding : {row:mount.imagePadding, column:mount.imagePadding};
		mount.imagePaddingPx = {
			row:mount.imagePadding.row*options.pxPerMM,
			column:mount.imagePadding.column*options.pxPerMM
		};

				// TODO - remove this
		//mount.innerBorderPx = mount.innerBorder*options.pxPerMM;

				// TODO - remove this
		//frame.width = (frame.thicknessPx*2) + (slip.thicknessPx*2) + mount.borderPx.left + mount.borderPx.right;
		//frame.height = (frame.thicknessPx*2) + (slip.thicknessPx*2) + mount.borderPx.top + mount.borderPx.bottom;

		// store the row widths
		var rowWidths = [];

		// loop through each section row
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
				row[j].widthPx = row[j].width*options.pxPerMM;
				row[j].heightPx = row[j].height*options.pxPerMM;

				// add the photo width to the row width
				// TODO - remove this
				//rowWidths[i] += row[j].widthPx + (mount.innerBorderPx*2);
				rowWidths[i] += row[j].widthPx + imagePadding.x;
				// if the photo height is larger than the previous photo (for this row) set it as the row height
				// TODO - remove this
				//rowHeight = (row[j].heightPx+(mount.innerBorderPx*2) > rowHeight) ? row[j].heightPx+(mount.innerBorderPx*2) : rowHeight;
				rowHeight = (row[j].heightPx+imagePadding.y > rowHeight) ? row[j].heightPx+imagePadding.y : rowHeight;

				// if we are not on the first section of the row add some right padding
				if(j > 0){
					rowWidths[i] += mount.imagePaddingPx.column;
				}
			}

			// add the row height
			frame.height += rowHeight + ((i > 0) ? mount.imagePaddingPx.row : 0);
		}

		// add the width of the widest row to the frame width
		frame.width += Math.max.apply(Math, rowWidths);

		// now that we have the dimensions, we need to increase/decrease them to fit as closely as possible to the canvas size
		if(options.autoResize){
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

				if(mount.layers.length > 0){
					// the frame has mounts - loop through them
					for(i in mount.layers){
						mount.layers[i].padding.top -= mount.layers[i].padding.top*percent;
						mount.layers[i].padding.bottom -= mount.layers[i].padding.bottom*percent;
						mount.layers[i].padding.left -= mount.layers[i].padding.left*percent;
						mount.layers[i].padding.right -= mount.layers[i].padding.right*percent;
					}
				}
				// TODO - remove this
				/*mount.border.top -= mount.border.top*percent;
				mount.border.bottom -= mount.border.bottom*percent;
				mount.border.left -= mount.border.left*percent;
				mount.border.right -= mount.border.right*percent;*/

				mount.imagePadding.row -= mount.imagePadding.row*percent;
				mount.imagePadding.column -= mount.imagePadding.column*percent;
				mount.innerBorder -= mount.innerBorder*percent;

				// check for a mount image
				if(mount.file != null){
					// mount file exists
					mount.file.width -= Math.round(mount.file.width*percent);
					mount.file.height -= Math.round(mount.file.height*percent);
				}

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

				if(mount.layers.length > 0){
					// the frame has mounts - loop through them
					for(i in mount.layers){
						mount.layers[i].padding.top += mount.layers[i].padding.top*percent;
						mount.layers[i].padding.bottom += mount.layers[i].padding.bottom*percent;
						mount.layers[i].padding.left += mount.layers[i].padding.left*percent;
						mount.layers[i].padding.right += mount.layers[i].padding.right*percent;
					}
				}
				// TODO - remove this
				/*mount.border.top += mount.border.top*percent;
				mount.border.bottom += mount.border.bottom*percent;
				mount.border.left += mount.border.left*percent;
				mount.border.right += mount.border.right*percent;*/

				mount.imagePadding.row += mount.imagePadding.row*percent;
				mount.imagePadding.column += mount.imagePadding.column*percent;
				mount.innerBorder += mount.innerBorder*percent;

				// check for a mount image
				if(mount.file != null){
					// mount file exists
					mount.file.width += Math.round(mount.file.width*percent);
					mount.file.height += Math.round(mount.file.height*percent);
				}

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
	var drawMount = function(mountLayer, coords, border){
		if(mountLayer){
			if(border){
				ctx.lineWidth = 1;
				ctx.strokeStyle = '#efefef';
				ctx.moveTo(coords.x1-1, coords.y1-1);
				ctx.lineTo(coords.x1-1, coords.y2-1);
				ctx.lineTo(coords.x2-1, coords.y2-1);
				ctx.lineTo(coords.x2-1, coords.y1-1);
				ctx.stroke();
			}

			ctx.fillStyle = mountLayer.colour;
			ctx.fillRect(coords.x1, coords.y1, coords.x2-coords.x1, coords.y2-coords.y1);

			if(mountLayer.file != null){
				ctx.save();
				ctx.moveTo(coords.x1, coords.y1);
				ctx.lineTo(coords.x1, coords.y2);
				ctx.lineTo(coords.x2, coords.y2);
				ctx.lineTo(coords.x2, coords.y1);
				ctx.lineTo(coords.x1, coords.y1);
				ctx.clip();

				var height = 0;
				for(var i = 0; height < frame.height; i++){
					var width = 0;
					for(var j = 0; width < frame.width; j++){
						ctx.drawImage(mountLayer.file, Math.floor(coords.x1 + ((mountLayer.file.width-1)*j)), Math.floor(coords.y1 + ((mountLayer.file.height-1)*i)), mountLayer.file.width, mountLayer.file.height);
						width += mountLayer.file.width-1;
					}
					height += mountLayer.file.height-1;
				}

				ctx.restore();
			}
		}
	};

	/**
	 * Draw the actual frame rim
	 */
	var drawRim = function(){
		var frameCoords = {
			x1:Math.floor(-(frame.width/2)),
			x2:Math.ceil(-(frame.width/2) + frame.width),
			y1:Math.floor(-(frame.height/2)),
			y2:Math.ceil(-(frame.height/2)+frame.height)
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
	 * width and height and originating from the center
	 * of the frame.
	 *
	 * If image is defined, then it will also draw that.
	 *
	 * @param width
	 * @param height
	 * @param image
	 */
	var drawImageBlock = function(width, height, x, y, image){
		// calculate the starting x/y coordinates
		var x1 = (typeof x == 'number') ? x : -(width/2),
			y1 = (typeof y == 'number') ? y : -(height/2),
			//x2 = x1 + width + (mount.innerBorderPx*2),
			//y2 = y1 + height + (mount.innerBorderPx*2)
			x2 = x1 + width,
			y2 = y1 + height;

		// output the frame layers, around the image
		if(mount.layers.length > 1){
			for(var i in mount.layers){
				if(i > 0){
					x2 += mount.layers[i].paddingPx.left + mount.layers[i].paddingPx.right;
					y2 += mount.layers[i].paddingPx.top + mount.layers[i].paddingPx.bottom;

					drawMount(mount.layers[i], {x1:x1,x2:x2,y1:y1,y2:y2}, true);

					x1 += mount.layers[i].paddingPx.left;
					x2 += mount.layers[i].paddingPx.right;
					y1 += mount.layers[i].paddingPx.top;
					y2 += mount.layers[i].paddingPx.bottom;
				}
			}
		}

		// fill the image section
		ctx.fillStyle = '#efefef';
		// TODO - remove this
		//ctx.fillRect(x1+mount.innerBorderPx, y1+mount.innerBorderPx, width, height);
		ctx.fillRect(x1, y1, width, height);

		// draw the image (if one exists)
		if(typeof image == 'object'){
			// TODO - remove this
			//ctx.drawImage(image, x1+mount.innerBorderPx, y1+mount.innerBorderPx, width, height);
			ctx.drawImage(image, x1, y1, width, height);
		}

		/*ctx.lineWidth = 1;
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
		}*/
	};

	/**
	 * Draws all of the frame components;
	 * Frame, mount, slide, images etc
	 */
	this.draw = function(){
		// draw the mount
		var x1 = -(frame.width/2),
			x2 = x1 + frame.width,
			y1 = -(frame.height/2),
			y2 = y1 + frame.height;
		drawMount(mount.layers[0], {x1:x1,x2:x2,y1:y1,y2:y2});


		// draw the images to the mount
		var mountLayer = mount.layers[0] || {paddingPx:{top:0,bottom:0,left:0,right:0}};

		// calculate the inner frame dimensions
		var width = frame.width - (frame.thicknessPx*2) - (slip.thickness*2),
			height = frame.height - (frame.thicknessPx*2) - (slip.thickness*2);

		// loop through and output the photos
		var count = 0,	// the image count (for referencing photos)
			yOffset = -(height/2) + mountLayer.paddingPx.top;
		for(var i in mount.sections){
			var row = mount.sections[i],
				rowHeight = 0;

			var xOffset = 0;
			if(row.length == 1){
				// only one picture in this row - horizontally center it

				// get the width of the row
				var rowWidth = width - mountLayer.paddingPx.left - mountLayer.paddingPx.right;
				xOffset = -(width/2) + mountLayer.paddingPx.left + ((rowWidth/2) - (row[0].widthPx/2));
			}else{
				// more than one image on the row
				xOffset = -(width/2) + mountLayer.paddingPx.left;
			}

			for(var j in row){
				drawImageBlock(row[j].widthPx, row[j].heightPx, xOffset, yOffset, photos[count]);

				// TODO - innerBorder needs to calculate correctly from mount layers
				//xOffset += row[j].widthPx + mount.imagePaddingPx.column + (mount.innerBorderPx*2);
				xOffset += row[j].widthPx + mount.imagePaddingPx.column;
				count++;

				rowHeight = (row[j].heightPx > rowHeight) ? row[j].heightPx : rowHeight;
			}

			// TODO - innerBorder needs to calculate correctly from mount layers
			//yOffset += rowHeight + (mount.innerBorderPx*2) + mount.imagePaddingPx.row;
			yOffset += rowHeight + mount.imagePaddingPx.row;
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
				canvas2png(canvas, {name:'frame'});
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
		// if we're not using the flash replacement, run the re-size functionality
		// flashcanvas can't handle this as it makes the browser un-responsive and doesn't resize anyway.
		if(typeof FlashCanvas == 'undefined'){
			$(window).resize(function(){
				Frame.init();
			});
		}
	}


	// initialise the plugin
	this.init(userOptions);
};
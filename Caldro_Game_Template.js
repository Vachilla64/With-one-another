"use strict";

var blocks = [];
var triggers = [];
var players = [];
var buttons = [];

adjustCanvas();

var Game = {
	devMode: false, // Turn to true to see how the game really does what it does behind the scenes;
	bgcol : '#090B19',
	state: 'running',
	screen: 1,
	fails: 0,
	
	world : {
		
	},
	
	buttons: {
		innerColor: 'rgba(150,150,150,0.9)',
	},

	time : {
		
	},

	device: {
		controls: {
			active: true,
			keyboard: true,
			toush: true,
			stableJoystick: true,
			view: {
				dpad: true,
				joystick: true,
			},
		},

		capability: 5,
	},
	
	
	Screen: {
		dimensionScaleX : 445,
		dimensionScaleY : 445,
		transitioning: false,
		playingScene: false,
		text: {
			text: "",
			font: "50px cursive",
			color: "white",
			angle: 0,
			a: 0,
			alphaTarget: 0,
			fadeSpeed: 1,
			glow: 20,
		},
		color: {
			r: 0,
			g: 0,
			b: 0,
			a: 0,
			alphaTarget : 0,
			fadeSpeed : 1,
			setAplhaTarget: function(alphaTarget = 1, speed = 3) {
				this.alphaTarget = alphaTarget;
				this.fadeSpeed = speed;
			}
		},

		tintColor: function() {
			this.color.a = approach(this.color.a, this.color.alphaTarget, this.color.fadeSpeed).value;
			this.text.a = approach(this.text.a, this.text.alphaTarget, this.text.fadeSpeed).value;
			return colorObjectToString(this.color);
		},

		setTintColor: function(r, g, b, a) {
			this.r = r;
			this.g = g;
			this.b = b;
			this.a = a;
		},
		
		setText: function(text, font = "50px cursive", color = "white", angle = 0){
			let tObj = this.text;
			tObj.text = text;
			tObj.font = font;
			tObj.color = color;
			tObj.angle = angle;
		},
		
		showText: function(){
			cc.textAlign = "center";
			cc.save()
			cc.translate(c.xc, c.yc)
			cc.rotate(degToRad(this.text.angle))
			cc.fillStyle = this.text.color;
			cc.font = this.text.font
			glow(this.text.glow, this.text.color)
			cc.fillText(this.text.text, 0, 0)
			glow(0);
			cc.restore();
		},
		
		setAplhaTarget : function(alphaTarget = 0,  speed = 3){
			this.color.alphaTarget = alphaTarget;
			this.color.fadeSpeed = speed;
		}
	},

	background: {
		midColor: "rgba(255,112, 31,1)",
		render: function(){
			let dmX = Game.Screen.dimensionScaleX;
			let dmY = Game.Screen.dimensionScaleY;
			// Game.screen = 1
			rect(dmX*-20, dmY*-15, dmX*36, dmY*26, "black");
			rect(dmX*20, dmY*-15, dmX*40, dmY*26, "white");
			let midFade = cc.createLinearGradient(dmX*11, dmY*-15,dmX*25, dmY*-15)
			midFade.addColorStop(0, "black")
			midFade.addColorStop(0.5, this.midColor)
			midFade.addColorStop(1, "white")
			rect(dmX*11, dmY*-15, dmX*14, dmY*26, midFade);
		},
	},
	
	camShaking: false,
	camShakeMagnitudeX: 10,
	camShakeMagnitudeY: 10,
	camShake: function(magX = 10, magY = 10) {
		this.camShaking = true;
		this.camShakeMagnitudeX = magX;
		this.camShakeMagnitudeY = magY;
	},

	end: function() {
		this.Screen.transitioning = true;
	},
	
	refresh : function(){
		blocks.length = 0;
		triggers.length = 0;
		Caldro.info.currentPlayer.refresh();
		clearAllTasks();
		positionButtons();
	},             
}



var buttonSelector = {
	x: c.xc,
	y: c.yc,

	backupButton: new button(c.xc, c.yc, 10, 10, '', 'transparent', 'transparent'),

	index: 0,
	inside: false,
	selectedButton: { effect: function() {}, show: function(){} },
	activeButtons: buttons.filter(function(button) {
		return button.active
	}),

	update: function() {
		this.activeButtons = buttons.filter(function(button) {
			return button.active
		})
		if (this.activeButtons.length == 0) {
			this.activeButtons = [this.backupButton];
		}
		this.index = limit(this.index, 0, this.activeButtons.length - 1, this.activeButtons.length - 1, 0)
		this.x = this.activeButtons[this.index].x;
		this.y = this.activeButtons[this.index].y;
	},

	check: function(button) {
		this.inside = this.x >= button.x - (button.width / 2) && this.x <= button.x + (button.width / 2) && this.y >= button.y - (button.height / 2) && this.y <= button.y + (button.height / 2);
		if (this.inside == true && button.active == true) {
			this.selectedButton = button;
		} else {
			this.selectedButton = { effect: function() {} };
		}

		return this.inside;
	},

	selectButton: function(directionOfSelection = 'forward') {
		let dir = 0
		this.update()
		if (directionOfSelection.includes('forward')) {
			dir = 1

		} else if (directionOfSelection.includes('backward')) {
			dir = -1
		}
		this.index += dir;
	}

}


function block(x, y, xv, yv, w, h, color = 'grey', timer = 0, type = 'block') {
	this.x = x;
	this.y = y;
	this.xv = xv;
	this.yv = yv;
	this.gravity = 0;
	this.falling = false;
	this.color = color;
	this.width = w;
	this.height = h;
	this.size = w;
	this.type = type;
  this.glow = 0;
	this.callback = function() {};

	//Updates the cubes posituon
	this.update = function(deltatime = Game.time.deltaTime) {
		if (Game.state == 'running') {
			--this.timer;
			if (this.falling) {
				this.yv += this.gravity
			}
			this.x += this.xv * deltatime;
			this.y += this.yv * deltatime;;
			this.callback();
		}
	}

	//draws the block
	this.render = function() {
		glow(this.glow, this.color);
		Rect(this.x, this.y, this.width, this.height, this.color)
		glow(0);
		//Rect(this.x, this.y, this.width / 2, this.height / 2, 'white')
	}
}

function placeBlock(x, y, width, height, color, timer = null, type = "env_block"){
	let envBlock = new block(x, y, 0, 0, width, height, color, timer, type);
	blocks.push(envBlock)
}

function envBlock(x, y, width, height, color, timer = null, type = "env_block") {
	let dmX = Game.Screen.dimensionScaleX;
	let dmY = Game.Screen.dimensionScaleY;
	let envblock = new block(dmX * x + (width*dmX)*0.5, dmY * y + (height*dmY) * 0.5, 0, 0, width*dmX, height*dmY, color, timer, type);
	blocks.push(envblock)
	dmX = dmY = null;
	return envblock;
}

function envTrig(x, y, width, height, target, effect = function(){}) {
	let dmX = Game.Screen.dimensionScaleX;
	let dmY = Game.Screen.dimensionScaleY;
	let envtrig = new trigger(dmX * x + (width*dmX)*0.5, dmY * y + (height*dmY) * 0.5, width*dmX, height*dmY, target);
	envtrig.effect = effect;
	triggers.push(envtrig)
	dmX = dmY = null;
	return envtrig;
}


//2D Points


function Character(x, y, color){
	  this.x = x;
		this.y = y;
		this.xv = 0;
		this.yv = 0;
		this.minSpeed = [800, 800];
		this.maxSpeed = [3000, 3000];
		this.jumps = 0;
		this.jumpLimit = 2;
		this.clamp = 100;
		this.gravity = 1700;
		this.color = color;
		this.glow = 0;
		this.width = 70;
		this.height = 100;
		//insert bounding info here
		
		this.falling = true;
		this.speed = 0.2;
		this.friction = [2.5, 0.2];
		this.data = [];
		this.toContain = true;
		this.selfNavigate = true;
		this.state = 'happy';
		this.angle = 0;
		this.eyes = {
			x : this.x,
			y :this.y - this.height/4,
			width : this.width,
			height: this.height,
			update: function(){
				
			},
			render: function(){
				Rect(this.x, this.y, this.width, this.height, "skyblue")
			}
		}
		this.happyCircle = {
			x: this.x,
			y: this.y,
			radius: 1,
			targetRadius: 1,
			growthSpeed: 0.3,
			movementSpeed: 0.3
		}
}
Character.prototype = {
	update: function(deltaTime = Game.time.deltaTime) {
		if (Game.state == 'running') {
			if(this.selfNavigate){
				
			}
			this.y += this.yv * (deltaTime)
			if (this.falling) {
				this.yv += this.gravity * deltaTime;
			} else {
				addFriction(this, [3, 0], deltaTime)
			}
			if(Math.abs(this.xv) < this.clamp){
				this.xv = 0;
			}
			this.x += this.xv * (deltaTime)
			this.angle = this.xv*0.005;
			addFriction(this, this.friction, deltaTime)
			if (this.toContain) {
				
			}
			this.happyCircle.x = approach(this.happyCircle.x, this.x, this.happyCircle.movementSpeed).value;
			this.happyCircle.y = approach(this.happyCircle.y, this.y, this.happyCircle.movementSpeed).value;
			this.happyCircle.radius = approach(this.happyCircle.radius, this.happyCircle.targetRadius, this.happyCircle.growthSpeed).value;
			this.eyes.update();
			this.particleStream();
			this.callback();
		}
	},
	
	findLastCheckpoint: function(){
		
	},
	
	takeDamage: function(amount = 20){
		sb.play("damage")
		this.jumps = 1;
		this.energy -= Math.abs(amount*Game.time.deltaTime );
		let velx = 1000;
		let vely = 1000;
		amount = limit(amount, 10, 30);
		Ps.InParticleSource(this.x, this.y, this.width, this.height, [-velx, velx], [-vely, vely], [0, 0], gen(0.3, 0.4), ["red"], amount, 6, "line", 20)
		Ps.InParticleSource(this.x, this.y, this.width, this.height, [-velx, velx], [-vely, vely], [0, 0], gen(30, 50), ["red"], amount, 5, "box", 20)
		Ps.InParticleSource(this.x, this.y, this.width, this.height, [-velx, velx], [-vely, vely], [0, 0], gen(30, 60), [this.color], amount, 5, "box", 20)
		if(this.energy<=0){
			this.energy = 0;
			this.findLastCheckpoint();
		}
	},
	
	render: function() {
		alpha(0.4)
		circle(this.happyCircle.x, this.happyCircle.y, this.happyCircle.radius, this.color)
		alpha(1)
		glow(this.glow, this.color);
    Rect(this.x, this.y, this.width, this.height, this.color, this.angle);
    glow(0);
    this.eyes.render();
	},
 
  particleStream : function(){
  	let velx = 1000;
  	let vely = 1000;
  	// Ps.InParticleSource(this.x, this.y, this.width, this.height, [-velx, velx], [-vely, vely], [0,0], gen(20,30), [this.color], 1, 30, "cirrrrr", 20)
  	// Ps.InParticleSource(this.x, this.y, this.width, this.height, [-velx, velx], [-vely, vely], [0,0], gen(0.2,0.3), [this.color], 2, 30, "line", 20)
  	Ps.InParticleSource(this.x, this.y, this.width, this.height, [-velx*0.1, velx*0.1], [-vely*0.1, vely*0.1], [0,0], gen(20,30), [this.color], 2, 30, "box", 20)
  	velx = vely = null;
  },
   
   handleJump: function(){
  	let velx = 100;
  	let vely = 100;
  	if(this.jumps < this.jumpLimit){
	   	sb.play(choose(["jump", "d_jump"]), true)
  		++this.jumps;
  		this.yv = limit(this.yv - this.minSpeed[1], -this.maxSpeed[1], -this.minSpeed[1])
	  	Ps.InParticleSource(this.x, this.y, this.width, this.height, [-velx, velx], [-vely, vely], [0,0], gen(20,30), [this.color], 10, 30, "box", 20)
  	} else {
  		//play failed jump sound here
  		sb.play("side2")
  	}
  	velx = vely = null;
   },
   
  callback : function(){},
   
	refresh: function() {
		this.xv = this.yv = 0;
		this.toContain = true;
		// this.minSpeed = [300, 300];
		// this.maxSpeed = [1000, 1000];
		// this.particleStream = function(){}
	},
}


function setupGame(){
	Game.refresh();
	let dmX = Game.Screen.dimensionScaleX;
	let dmY = Game.Screen.dimensionScaleY;
	place(player, {
		x: dmX*-14,
		y: dmY*-0.5
	})
	place(player2, {
		x: dmX*55,
		y: dmY*-1.5
	})
	let h = 3;
	let Gcolor = "white";
	let Scolor = "grey";
	let Gcolor2 = "black";
	let Pcolor = "white";
	let Lcolor = "orange";
	let pw = 0.45
	let W1 = envBlock(-18, -10, 3, 12, Gcolor)
	let G1 = envBlock(-15, 0, 3, h, Gcolor)
	let L1 = envTrig(-12, 0.25, 2.5, h, Caldro.info.currentPlayer)
	L1.effect = function(){
		L1.triggerer.yv =-400;
		L1.triggerer.takeDamage(30);
	}
	L1.drawing = function(){
		glow(20, Lcolor)
		Rect(L1.x,L1.y, L1.width, L1.height, Lcolor)
		glow(0);
		Ps.InParticleSource(L1.x,L1.y-L1.height/2+40,L1.width, 10, [-50, 50], [-100, -20],[0,0], gen(100, 160), [Lcolor], 2, 20, "cir", 10)
	}
	let P1 = envBlock(-11.625, -0.375, pw, 0.15, Pcolor)
	let P2 = envBlock(-10.5, -0.625, pw, 0.15, Pcolor)
	let G2 = envBlock(-9.5, -0.15, 4, h, Gcolor)
	let G2min = envBlock(-5.5, 0.625, 0.25, 0.375, Gcolor)
	let R1 = envBlock(-5, -0.375, 0.75, 0.15, Gcolor)
	makeRevolverBlock(R1, {x : -5, y : -0.375}, 0.5, 20, 1, 1)
	let R2 = envBlock(-3, -0.375, 0.75, 0.15, Gcolor)
	makeRevolverBlock(R2, {x : -3, y : -0.375}, 0.6, 30, 1, 1)
	let G3 = envBlock(-1.25, -1, 3, h, Gcolor)
	let OB1 = envTrig(0, -1.125, 0.25, 0.25, Caldro.info.currentPlayer)
	makeHarmful(OB1, 10, true, "red")
	let G4 = envBlock(1.75, 0.5, 7, h, Gcolor)
	
	// let LZ1 = envTrig(3, -2, 0.375, 2.25, Caldro.info.currentPlayer)
	makeLaserRod(2, -3, 1.365, 3.5, "white")
	
	let G5 = envBlock(5, 0.125, 0.75, 0.375, Gcolor)
	let G6 = envBlock(6.375, -0.125, 0.75, 0.75, Gcolor)
	let G7 = envBlock(7.625, -0.5, 0.75, 1, Gcolor)
	
	let R3 = envBlock(10, -1, 0.825, 0.375, Gcolor)
	makeRevolverBlock(R3, {x : 10, y : -1}, 1, 20, 1, 1, 140);
	
	let S1 = envBlock(12.5, -2, 1, 0.25, Gcolor)
	makeSliderBlock(S1, {x : 12.5, y : -2}, 1.5, 10, "y")
	
	let G8a = envBlock(14, -4, 2, 8, "white");
	let G8b = envBlock(16, -4, 4, 8, "white");
	let G8c = envBlock(20, -4, 4, 8, "black");
	
	let G9 = envBlock(16, -4.375, 0.75, 0.375, Scolor);
	let G10 = envBlock(16.75, -4.75, 0.75, 0.75, Scolor);
	let G11 = envBlock(17.5, -5.125, 1, 1.125, Scolor);
	let scene = envTrig(17.5, -7, 1, 2,Caldro.info.currentPlayer);
	scene.effect = function(){
		if(scene.triggerer == player){
			doTask("HandlePlayer!", function(){
				GameCam.callback = function() {
					this.x = Caldro.info.currentPlayer.x
					this.y = Caldro.info.currentPlayer.y * 1
					this.actualOffsetY = -c.vh * 10 * (1 / this.zoom);
					this.actualOffsetX = approach(this.actualOffsetX, (c.vh * 25 * (1 / this.zoom)) * (Caldro.info.currentPlayer.xv > 0 ? 1 : -1), 0.3).value;
				}
				sceneCam.mimic(GameCam);
				sceneCam.resetOffset(true, true);
				Caldro.setCamera(sceneCam);
				let speed = 0.2;
				player.callback = function(){
					player.x = approach(player.x, G11.x+G11.width/4, 0.1).value;
					player.y = approach(player.x, G11.y-G11.height/2-player.height/2, 0.1).value;
				}
				setTimeout(function(){
					sceneCam.callback = function(){
						sceneCam.x = approach(sceneCam.x, Caldro.info.currentPlayer.x, speed).value;
						sceneCam.y = approach(sceneCam.y, Caldro.info.currentPlayer.y, speed).value;
					}
				}, 1000)
				setTimeout(function(){
					player.callback = function(){};
					Caldro.setPlayer(player2)
					setTimeout(function(){
						GameCam.mimic(sceneCam);						
						Caldro.setCamera(GameCam);
					}, 2000)
				}, 3000)
			})
		} else if(scene.triggerer == player2){
		 doTask("handlePlayer2", function(){
		 	sceneCam.mimic(GameCam);
		 	sceneCam.resetOffset(true, true);
		 	Caldro.setCamera(sceneCam);
		 	let rad = dmX*0.375;
		 	player.happyCircle.targetRadius =  rad;
		 	player2.happyCircle.targetRadius =  rad;
		 })
		}
	}
	let G12 = envBlock(18.5, -4.75, 0.75, 0.75, Scolor);
	let G13 = envBlock(19.25, -4.375, 0.75, 0.375, Scolor);
	
	let goal = new trigger(dmX*18, dmY*-7.25, dmX*0.5, dmY*0.5, Caldro.info.currentPlayer)
	goal.drawing = function(){
	  let color1 = "white";
	  let color2 = "lime";
		glow(20, color1);
	  triangle(goal.x, goal.y, goal.width, color1)
	  glow(0);
	  let velx = 1000;
	  let vely = 1000;
	  let glw = 20;
	  let timer = 20;
	  Ps.InParticleSource(goal.x, goal.y, goal.width, goal.height, [-velx, velx], [-vely, vely], [0,0], gen(0.2, 0.3), [color1], 1, timer, "line", glw)
	  Ps.InParticleSource(goal.x, goal.y, goal.width, goal.height, [-velx, velx], [-vely, vely], [0,0], gen(0.2, 0.3), [color2], 1, timer, "line", glw)
	  Ps.InParticleSource(goal.x, goal.y, goal.width, goal.height, [-velx, velx], [-vely, vely], [0,0], gen(20, 30), [color1], 1, timer, "box", glw)
	  Ps.InParticleSource(goal.x, goal.y, goal.width, goal.height, [-velx, velx], [-vely, vely], [0,0], gen(20, 30), [color2], 1, timer, "box", glw)
	}
	goal.effect = function(){
		sb.pauseAll();
		sb.pause("music1");
		sb.pause("fill");
		sb.play("climax")
		// sb.play("boom");
		
	 	setTimeout(function() {
	 		let zoom = sceneCam.zoom*0.7;
	 		sceneCam.callback = function(){
	 			this.zoom = approach(this.zoom, zoom, 0.2).value;
	 			this.x = approach(this.x, G11.x, 0.1).value;
	 			this.y = approach(this.y, G11.y-dmY*1.5, 0.3).value;
	 		}
	 		player.callback =  player2.callback = function(){
	 			if(gen(0, 20) <= 6){
	 				this.handleJump();
	 			}
	 		}
	 	}, 7000)
	 	setTimeout(function() {
	 		Game.Screen.setAplhaTarget(1, 0.3)
	 		
	 		Game.Screen.setText("Buddy", "150px cursive", "white", 5)
	 		setTimeout(function(){
	 			player.callback =  player2.callback = function(){}
	 			setTimeout(function(){
	 				mainmenuButton.effect();
	 			}, 2000)
	 		}, 3000)
	 	}, 15000)

		let color1 = "white";
		let color2 = "lime";
		let color3 = "black";
	  let velx = 3000;
	  let vely = 3000;
	  let glw = 20;
	  let timer = 30;
	  Ps.InParticleSource(goal.x, goal.y, goal.width, goal.height, [-velx, velx], [-vely, vely], [0,0], gen(0.6, 0.8), [color1], 20, timer, "line", glw)
	  Ps.InParticleSource(goal.x, goal.y, goal.width, goal.height, [-velx, velx], [-vely, vely], [0,0], gen(0.6, 0.8), [color2], 30, timer, "line", glw)
	  Ps.InParticleSource(goal.x, goal.y, goal.width, goal.height, [-velx, velx], [-vely, vely], [0,0], gen(100, 150), [color1], 40, timer, "box", glw)
	  Ps.InParticleSource(goal.x, goal.y, goal.width, goal.height, [-velx, velx], [-vely, vely], [0,0], gen(50, 80), [color2], 50, timer, "box", glw)
	  Ps.InParticleSource(goal.x, goal.y, goal.width, goal.height, [-100, 100], [-100, 100], [0,0], gen(20, 80), [color1], 50, 200, "box", glw)
	  Ps.InParticleSource(goal.x, goal.y, goal.width, goal.height, [-100, 100], [-100, 100], [0,0], gen(20, 80), [color3], 50, 200, "box", glw)
	  Game.camShake(700,700)
		goal.data["toDestroy"] = true
		Game.background.midColor = "#22FF22";
		let zoomTarget = sceneCam.zoom *0.4
		let speed = 0.25;
		let speedZ = 0.7;
		sceneCam.callback = function(){
			sceneCam.zoom = approach(sceneCam.zoom, zoomTarget, speedZ).value;
			sceneCam.x = approach(sceneCam.x, Caldro.info.currentPlayer.x, speed).value;
			sceneCam.y = approach(sceneCam.y, Caldro.info.currentPlayer.y, speed).value;
		}
		setTimeout(function(){
			sceneCam.callback = function(){
				sceneCam.zoom = approach(sceneCam.zoom, GameCam.zoom, speedZ).value;
				sceneCam.x = approach(sceneCam.x, Caldro.info.currentPlayer.x, speed).value;
				sceneCam.y = approach(sceneCam.y, Caldro.info.currentPlayer.y, speed).value;
			}
		}, 2800)
	}
	
	let G14 = envBlock(24, -2, 1.5, 5, Gcolor2)
	let G15 = envBlock(25.5, 0, 1.5, 3, Gcolor2)
	let G16 = envBlock(27, -1, 2, 5, Gcolor2)
	let G17 = envBlock(29, 1, 7, 3, Gcolor2)
	
	makeBoostBlock(24.125, -2.125, 0.75, 0.125)
	makeBoostBlock(25.625, -0.125, 0.75, 0.125)
	
	let PO1 = envBlock(32, -2, 2.5, 0.375, Gcolor2);
	makeSliderBlock(PO1, {x : 32, y : -0.5}, 1.375, 30, "y")
	
	let G18 = envBlock(36, 1.75, 1.75, 2.25, Gcolor2)
	
	let S2 = envBlock(40, 4, 2, 0.325, Gcolor2)
	makeSliderBlock(S2, {x : 42, y : 2}, 2.5, 10, "x")
	
	makeLaserRod(36, -0.25, 1,2, "black")
	makeLaserRod(34, -1, 1, 2, "black")
	
	let G19 = envBlock(46.5, 1.75, 4, 2, Gcolor2)
	
	let BT1 = envTrig(48, 0.75, 0.5, 0.5, Caldro.info.currentPlayer)
	makeRevolverBlock(BT1, {x : 48, y : 0.75}, 0.75, 140)
	makeHarmful(BT1, 20, true, "red");
	
	let S3 = envBlock(51, -1, 2, 0.5, Gcolor2);
	makeSliderBlock(S3, {x : 51, y : 0}, 2, 20, "y")
	
	let G20 = envBlock(52, -2, 4, 3, Gcolor2)
	let G21 = envBlock(53, 1.75, 3, 0.25, Gcolor2)
	let W2 = envBlock(56, -10, 3, 12, Gcolor2)
	
	let worldLimitDamage = 99999999999;
	let L2 = envTrig(-5.5, 1, 4.25, 3, Caldro.info.currentPlayer)
	makeHarmful(L2, worldLimitDamage);
	
	let L3 = envTrig(8.75, 1, 5.25, 3, Caldro.info.currentPlayer)
	makeHarmful(L3, worldLimitDamage);
	
	let L4 = envTrig(37.75, 2.5, 8.75, 3, Caldro.info.currentPlayer)
	makeHarmful(L4, worldLimitDamage, true, "red");
	
	let L5 = envTrig(50.5, 2, 7, 3, Caldro.info.currentPlayer)
	makeHarmful(L5, worldLimitDamage, true, "red");
	
	let fallLimiter1 = envTrig(-20,5, 40, 10, Caldro.info.currnetPlayerr)
	let fallLimiter2 = envTrig(20,5, 40, 10, Caldro.info.currnetPlayerr)
	fallLimiter1.drawing = function(){
		Rect(this.x, this.y, this.width, this.height, "orange")
	}
	fallLimiter2.drawing = function(){
		Rect(this.x, this.y, this.width, this.height, "red")
	}
	fallLimiter1.effect = fallLimiter2.effect = function(){
		this.triggerer.yv = -200;
		this.triggerer.y = dmY*-2;
	}
	
// Game.screen = 7;
// Caldro.setPlayer(player2);
triggers.push(goal);
setTimeout(function(){
		// player.jumpLimit = 10000;
		// player.gravity = 0;
		// player.yv = 0;
		// player.friction = [6,6]
		// player.friction = [3,0]
	}, 5)
}

function makeHarmful(trig, damage = 20, visible = true, color = "orange", glw = 20){
	if(visible){
		trig.drawing = function() {
			glow(20, color);
			Rect(trig.x, trig.y, trig.width, trig.height, color);
			let size = limit(trig.width, 10, 200);
			Ps.InParticleSource(trig.x, trig.y-trig.height/2, trig.width, trig.height/2, [-500, 500], [-800, -200], [0, 0], gen(size - (size / 6), size), [color], 3, 20, "box", 20)
		}
	}
	trig.effect = function() {
		Game.camShake(50, 100);
		trig.triggerer.yv = -400;
		trig.triggerer.takeDamage(damage);
	}
}

function makeBoostBlock(x, y, width, height){
	let tramp = envTrig(x, y, width, height, Caldro.info.currentPlayer)
	tramp.effect = function(){
		sb.play("jump_pad")
		tramp.triggerer.yv = -2000;
	}
	tramp.drawing = function(){
		if(!tramp.activated){
			glow(20, "magenta")
			Rect(tramp.x, tramp.y, tramp.width, tramp.height, "magenta")
			glow(0)
			Ps.InParticleSource(tramp.x, tramp.y, tramp.width, tramp.height, [-150, 150], [-400, -100], [0, 0], gen(0.2, 0.4), ["magenta"], 2, 30, "line", 20)
		} else {
			glow(20, "#22FF12")
			Rect(tramp.x, tramp.y, tramp.width, tramp.height, "#22FF12")
			glow(0)
			Ps.InParticleSource(tramp.x, tramp.y, tramp.width, tramp.height, [-350, 350], [-1500, -700], [0, 0], gen(0.2, 0.4), ["#22FF12"], 20, 30, "line", 20)
			Ps.InParticleSource(tramp.x, tramp.y, tramp.width, tramp.height, [-500, 500], [-1500, -700], [0, 0], gen(50, 90), ["#22FF12"], 20, 30, "box", 20)
		}
	}
}

function makeLaserRod(x, y, width = 1, height = 2, color = "grey"){
	let dmX = Game.Screen.dimensionScaleX;
	let dmY = Game.Screen.dimensionScaleY;
	let top = envBlock(x, y, width, 0.375, color)
	let laser = envTrig(x+(width/4), y+0.375, width/2, height-0.75, Caldro.info.currentPlayer)
	let bottom = envBlock(x, y+(height-0.3755), width, 0.3755, color)
	let osc = new oscilator(40, 50)
	laser.callback = function(){
		osc.update(Game.time.deltaTime)
		if(Math.abs(osc.value)>25){
			laser.active = false;
		} else {
			laser.active = true;
		}
	}
	laser.drawing = function(){
		if(laser.active){
			glow(30, "red");
			Rect(laser.x, laser.y, laser.width, laser.height, "red");
			glow(30, "white");
			Rect(laser.x, laser.y, laser.width / 2.5, laser.height, "white")
			glow(0)
			let velx = 700
			let vely = 400
			Ps.InParticleSource(laser.x, laser.y, laser.width, laser.height, [-velx, velx], [-vely, vely], [0,0], gen(50, 100), ["red"], 2, 50, 'box', 20)
		} else {
			glow(20, "#22FF12")
			alpha(0.3)
			Rect(laser.x, laser.y, laser.width, laser.height, "#22FF12");
			alpha(1)
			glow(0)
			let velx = 700
			let vely = 200
			Ps.InParticleSource(laser.x, laser.y, laser.width, laser.height, [-velx, velx], [-vely, vely], [0,0], gen(50, 100), ["#22FF12"], 1, 50, 'box', 20)
		}
	}
	laser.effect = function(){
		Game.camShake(50, 80);
		laser.triggerer.takeDamage(10*height)
	}
}

function makeRevolverBlock(block, sliderPoint,radius = 50, speed = 10, xFactor = 1, yFactor= 1, lineWidth = 100, color = 'yellow'){
	let dmX = Game.Screen.dimensionScaleX;
	let dmY = Game.Screen.dimensionScaleY;
	sliderPoint.x *= dmX;
	sliderPoint.y *= dmY;
	block.rev = new revolver(sliderPoint, radius*dmX, speed)
	block.callback = function(){
		block.rev.update(Game.time.deltaTime);
	  block.x = (block.rev.x * xFactor);
	  block.y = (block.rev.y * yFactor);
	  block.rev.show(color, lineWidth)
	}
}

function makeSliderBlock(block, sliderPoint, radius = 50, speed = 10, axis = "y", lineWidth = 100, color = 'yellow') {
	let dmX = Game.Screen.dimensionScaleX;
	let dmY = Game.Screen.dimensionScaleY;
	sliderPoint.x *= dmX;
	sliderPoint.y *= dmY;
	block.rev = new revolver(sliderPoint, radius*dmX, speed)
	block.callback = function() {
		block.rev.update(Game.time.deltaTime);
		if(axis.includes("x")){
			block.x = (block.rev.x);
			block.y = sliderPoint.y;
			CurvedRect(sliderPoint.x, sliderPoint.y, block.rev.radius*2, lineWidth, color, 30)
			// CurvedRect(block.x, sliderPoint.y, lineWidth, block.rev.radius*2, color, 30)
		}
		if(axis.includes("y")){
			block.x = sliderPoint.x;
			block.y = (block.rev.y);
			CurvedRect(sliderPoint.x, sliderPoint.y, lineWidth, block.rev.radius*2, color, 30)
		}
		// block.rev.show(color, lineWidth)
	}
}


// INITIALIZING CONTROLS
var GameDpad = new dPad(c.min * 0.30, c.h - c.min * 0.30, c.min * 0.45)
var joystickPosition = new Point2D(c.min * 0.30, c.h - c.min * 0.30)
GameDpad.up.effect = function() {
	Caldro.info.currentPlayer.handleJump();
}
GameDpad.down.effect = function() {
	sb.play(choose(["side1", "side2"]))
	Caldro.info.currentPlayer.yv = limit(Caldro.info.currentPlayer.yv + Caldro.info.currentPlayer.minSpeed[1], Caldro.info.currentPlayer.minSpeed[1], Caldro.info.currentPlayer.maxSpeed[1])
}
GameDpad.left.effect = function() {
	sb.play(choose(["side1", "side2"]))
	Caldro.info.currentPlayer.xv = limit(Caldro.info.currentPlayer.xv - Caldro.info.currentPlayer.minSpeed[0], -Caldro.info.currentPlayer.maxSpeed[0], 0)
}
GameDpad.right.effect = function() {
	sb.play(choose(["side1", "side2"]))
	Caldro.info.currentPlayer.xv = limit(Caldro.info.currentPlayer.xv + Caldro.info.currentPlayer.minSpeed[0], 0, Caldro.info.currentPlayer.maxSpeed[0])
}

var joy_stick = new joystick(GameDpad.x, GameDpad.y, c.min * 0.27, 3, 'rgba(255,10,10,0.5)')
joy_stick.extension = 1.5
joy_stick.callback = function() {
	if (this.mode == 'active') {
		Caldro.info.currentPlayer.xv = (this.value[0] * Caldro.info.currentPlayer.maxSpeed[0])
		Caldro.info.currentPlayer.yv = (this.value[1] * Caldro.info.currentPlayer.maxSpeed[1])
	}
}

function touchstartEvent() {
	if (Game.device.controls.active) {
		let DpadOut = GameDpad.update(pointer);
		let clickedButton = false
		for (let cl = 0; cl < buttonSelector.activeButtons.length; ++cl) {
			let clicked = buttonSelector.activeButtons[cl].listen(pointer);
			if (clicked == true) {
				//PLAY SOUND FOR TOCUCH HERE
				let but = buttonSelector.activeButtons[cl]
				clicked == true ? clickedButton = true : false;
		}
		if(!clickedButton){
			if (!Game.device.controls.stableJoystick && Game.screen == 1) {
				place(GameDpad, pointer)
			}
			joy_stick.update(pointer, 'start');
		}
	}
}
}

function touchmoveEvent() {
	if (Game.device.controls.active) {
		joy_stick.update(pointer, 'move');
	}
}

function touchendEvent() {
	if (Game.device.controls.active) {
		// place(GameDpad, joystickPosition);
		joy_stick.update(pointer, 'end');
	}
}

window.onerror = function() {
	// cancelAnimationFrame(run);
};

function positionButtons() {
	place(joy_stick, {
		x : c.min * 0.30, 
		y : c.h - c.min * 0.30,
	})
	if (Game.device.orientation == 'potrait') {
		// GameDpad.size = c.vmin * 35
		// place(GameDpad, { x: c.w - GameDpad.size / 1.3, y: c.h - GameDpad.size / 1.3 })
		// pauseButton.position(c.vw * 90, c.vh * 10)
	} else if (Game.device.orientation == 'landscape') {
		GameDpad.size = c.vmin * 40;
		pauseButton.position(c.vw * 90, c.vh * 20);
		resumeButton.position(c.xc, c.vh*35);
		mainmenuButton.position(c.xc, c.vh*65);
		loadAudio.position(c.xc - c.vw*20, c.vh*70)
		proceedWithoutAudio.position(c.xc + c.vw*20, c.vh*70)
		startGame.position(c.vw*75, c.yc-c.vh*25)
		settings.position(c.vw*75, c.yc)
		credits.position(c.vw*75, c.yc+c.vh*25)
	}
}

function setuupButtons() {
	for (let b = buttons.length - 1; b > -1; --b) {
		buttons[b].set(false)
	}
	switch (Game.screen) {
		case 1:
			if(Game.state == "paused"){
				resumeButton.set(true);
				mainmenuButton.set(true);
			} else {
				pauseButton.set(true);
			}
			break;
		case 2:
		  startGame.set(true);
		  settings.set(true)
		  credits.set(true)
		break;
		case 3:
			loadAudio.set(true);
			proceedWithoutAudio.set(true);
			break;
		case 4:
			 backButton.set(true)
			break;
		case 5:

			break;

	}
	positionButtons();
	buttonSelector.update()
}

//AUDIO, HERE WE GO!!!
let sb = new DOMaudioHandler();
sb.add("button", "audio.button.wav")
sb.add("fill", "audio/On one another filler.mp3");
sb.add("music1", "audio/On one another cut.mp3");
sb.add("climax", "audio/On one another Climax.mp3")
sb.add("side1", "audio/sideways.wav", 0.2)
sb.add("side2", "audio/sideways2.wav", 0.2)
sb.add("jump", "audio/double_jump.wav", 0.8)
sb.add("d_jump", "audio/jump.wav", 0.8)
sb.add("jump_pad", "audio/jump_pad.wav", 0.7)
sb.add("damage", "audio/harshdamage.wav", 0.8)
sb.add("h_damage", "audio/Damage.wav`")
sb.add("menu", "audio/Main_Menu.mp3")
sb.add("revert", "audio/revert.wav")
sb.add("boom", "audio/Boom 012.wav")
window.onclick = function(){
	
}

sb.onInit = function(){
	// sb.play("music1");
}

let Bcolor = "rgba(0,0,0,0.4("
let STcolor = "white"
//DEFINE BUTTONS HERE
var pauseButton = new button(0, 0, 50, 50, "", Bcolor, STcolor)
pauseButton.drawing = function() {
	let lw = pauseButton.width / 6
	let lh = pauseButton.height / 3.5
	line(pauseButton.x - lw, pauseButton.y - lh, pauseButton.x - lw, pauseButton.y + lh, 'white')
	line(pauseButton.x + lw, pauseButton.y - lh, pauseButton.x + lw, pauseButton.y + lh, 'white')
}
pauseButton.effect = function() {
	sb.pause("music1");
	Game.state = 'paused'
	Game.Screen.setTintColor(150, 150, 150, 0.51)
}

var resumeButton = new button(0, 0, 130, 50, 'Resume', "black", STcolor)
resumeButton.drawingStyle = 2;
resumeButton.fontSize = 20;
resumeButton.effect = function() {
	sb.play("button")
	sb.play("music1");
	Game.state = 'running'
	Game.Screen.setTintColor(0,0,0,0)
}

var mainmenuButton = new button(0, 0, 130, 50, 'Main Menu', "black", STcolor)
mainmenuButton.drawingStyle = 2
mainmenuButton.fontSize = 20
mainmenuButton.effect = function() {
	sb.pause("music1");
	sb.play("menu");
	sb.get("menu").loop = true;
	Game.screen = 2
}

var loadAudio = new button(0,0, 120, 40, "Load Audio", "rgba(44,255, 44, 0.4)", STcolor)
loadAudio.drawingStyle = 2;
loadAudio.fontSize = 20;
loadAudio.lineWidth = 5
loadAudio.effect = function(){
	try {
		sb.initialize();
		sb.play("button")
		setTimeout(function() {
		sb.play("menu");
		sb.get("menu").loop = true;
		}, 2000)
	} catch (e) {};
	let change = 10
	let delay = 100;
let width = this.width;
let height = this.height;
this.width -= change
this.height -= change
setTimeout(function(){
	this.width = width;
	this.height = height;
}, delay)

	Game.screen = 6;
	setTimeout(function(){
		Game.screen = 2;
	})
}

var proceedWithoutAudio = new button(9, 0, 120, 40, "No Audio", "rgba(255, 44, 44, 0.4)", STcolor);
proceedWithoutAudio.drawingStyle = 2;
proceedWithoutAudio.fontSize = 20;
proceedWithoutAudio.lineWidth = 5
proceedWithoutAudio.effect = function(){
	Game.screen = 2;
	sb.play("menu");
}

var startGame = new button(0,0, 150, 50, "Play", "white", "black")
startGame.drawingStyle = 2
startGame.textColor = "black"
startGame.effect = function(){
	setupGame();
	Game.Screen.setAplhaTarget(1, 1)
	startGame.callback = function(){
		let mm = sb.get("menuu");
		mm.volume = approach(mm.volune, 0.1, 0.5).value
	}
	setTimeout(function(){
		Game.screen = 1;
		startGame.callback = function(){};
		sb.pause("menu")
		sb.play("music1")
		Game.Screen.setAplhaTarget(0, 1)
		sb.get("music1").onended = function() {
			sb.play("fill");
		}
	}, 1000)
}

	// sb.play("button")
var settings = new button(0,0,150, 50, "Settings", "white", "black");
settings.drawingStyle = 2;
settings.textColor = "black"


var credits = new button(0,0,150, 50, "Credits", "white", "black");
credits.drawingStyle = 2;
credits.textColor = "black"
credits.effect = function(){
	Game.screen = 5
	setTimeout(function(){
		Game.screen = 2
	}, 3000)
}
// var startGame = gameButton(c.xc, c.vh * 70, 70, 90, 'Play', 40)
// startGame.drawingStyle = 0;
// startGame.fontSize = 30;
// startGame.color = "rgba(155,255,155,0.4)";
// startGame.effect = function() {
// 	Game.state = 'running'
// 	placeTabTarget({ x: c.xc, y: c.yc });
// 	setTimeout(function() {
// 		positionButtons();
// 		Game.screen = 1;
// 		placeTabTarget();
// 		Caldro.setCamera(GameCam)
// 	}, 1000);

// 	setupGame();
// }
buttons.push((startGame))
buttons.push(settings)
buttons.push(credits)
buttons.push(loadAudio)
buttons.push(proceedWithoutAudio)
buttons.push(pauseButton);
buttons.push(mainmenuButton);
buttons.push(resumeButton);

Game.screen = 3;

var then = 0
var infoB = new infoBox('info', 20, 20, 'black', 15);
infoB.alpha = 0.6;


window.onresize = function(){
	adjustCanvas();
	painter.updateDrawings();
	positionButtons();
};

var player = new Character(0, 0, "white");
var player2 = new Character(0, 0, "black");
players.push(player);
players.push(player2);
Caldro.setPlayer(player);


// SETTING UP CAMERAS
var GameCam = new camera();
GameCam.zoom = Game.Screen.dimensionScaleY*0.0004;

GameCam.callback = function(){
	this.x = Caldro.info.currentPlayer.x
	// this.y = Caldro.info.currentPlayer.y*0.4
	this.y = Caldro.info.currentPlayer.y*1
	this.actualOffsetY = -c.vh*10 * (1/this.zoom);
	this.actualOffsetX = approach(this.actualOffsetX, (c.vh*25 * (1/this.zoom))*(Caldro.info.currentPlayer.xv>=0?1:-1), 0.3).value;
}
// GameCam.attach(player);
Caldro.setCamera(GameCam)

var devCam = new camera();
devCam.zoom = 0.2
var sceneCam = new camera();
place(sceneCam, { x: c.xc, y: c.yc })


adjustCanvas();
positionButtons();
setupGame();

//Createing all drawings
var resourceImage = document.createElement("canvas");
var drawingContext = resourceImage.getContext("2d");
// document.body.appendChild(resourceImage)
var painter = new canvasImageManager(resourceImage);



function run() {
	let now = performance.now() / 1000;
	Game.time.deltaTime = now - then;
	then = now;
	
	adjustCanvas();
	Game.device.orientation = c.orientation
	++Game.Screen.frame;
  
  
	setuupButtons();
	if(Caldro.info.currentCamera == sceneCam){
		Game.Screen.playingScene = true;
	} else {
		Game.Screen.playingScene = false;
	}
	if (Game.screen == 1) {
		/*Main game screen*/
		
		// Rect(c.xc, c.yc, c.w, c.h, "black")
		
		Caldro.info.currentCamera.update();
		Game.background.render();
		
		if (Game.camShaking) {
			let magX = Game.camShakeMagnitudeX
			let magY = Game.camShakeMagnitudeY
			GameCam.shakeOffsetX = gen(-magX, magX, '')
			GameCam.shakeOffsetY = gen(-magY, magY, '')
			Game.camShaking = false;
		} else {
			GameCam.resetOffset()
		}

		if (Game.device.controls.active) {
			GameDpad.update(pointer)
			joy_stick.update(null, 'positioning')
			joy_stick.radius = GameDpad.size / 1.645
			place(joy_stick, GameDpad)
		}

		// Caldro.info.currentPlayer.update();
		for(let p in players){
			players[p].update();
		}
		
		
	  
		for (let b = blocks.length - 1; b > -1; --b) {
			if (blocks[b].toDestroy) {
				blocks.splice(b, 1)
				continue;
			}
			blocks[b].update();
			blocks[b].render();
			if (!(blocks[b].type.includes('ghost'))) {
				for(let p in players){
					platformize(players[p], blocks[b]);
				}
				/*let onAPlatform = platformize(Caldro.info.currentPlayer, blocks[b])
				if(on_){
					let player = Caldro.info.currentPlayer;
					addFriction(player, player.landFrition, Game.time.deltaTime);
				}*/
			}
		}


		for (let t = triggers.length - 1; t > -1; --t) {
			if (Game.state == 'running') {
				triggers[t].update()
				for(let p in players){
					triggers[t].check(players[p]);
				}
			}
			triggers[t].drawing();
			if (Game.devMode == true) {
				triggers[t].show();
			}
			if (triggers[t].data['toDestroy'] == true) {
				triggers.splice(t, 1)
			}
		}

		Ps.InUpdateAndRenderAll(Game.time.deltaTime, Game.state == 'running');
  
		for(let p in players){
			players[p].render();
		}
		
	Caldro.info.currentCamera.resolve()
	// GameDpad.render();
	// Game.screen = 7
	} else if (Game.screen == 2) {
		let color1 = "black";
		let color2 = 'white'
		let name = "WIth one another"
		Rect(c.xc, c.yc, c.w, c.h, color1)
		// edges(c.w / 2, c.h / 2, 200, 'black')
		// txt(name, c.xc, c.vh*35, "600 50px Arial", color2)
		glow(20)
		wrapText(name, c.vw*25, c.vh*30, 200, 50, color2, "700 50px Arial")
		glow(0)
		let margin = c.vw * 10
		let space = c.vw * 10
		cc.beginPath()
		cc.moveTo(c.xc + margin, -space)
		cc.lineTo(c.w + space, -space)
		cc.lineTo(c.w + space, c.h + space)
		cc.lineTo(c.xc - margin, c.h + space)
		cc.closePath()
		cc.fillStyle = color2;
		cc.fill();
		glow(20);
		// line(c.xc - margin, c.h + space, c.xc + margin, -space, 'white', 20)
		glow(0);
		// Rect(c.xc, c.yc, c.w, c.h, color1)
		glow(20, color2)
		glow(0);
	} else if (Game.screen == 3) {
		Rect(c.xc, c.yc, c.w, c.h, "black")
		let text1 = "Audio files are approximately 10MB";
		let text2 = "Do you want to load the audio? (recommended for best expperience)"
		let x = c.xc;
		let y = c.vh*35
		let size = 20
		glow(20);
		wrapText(text1, x, y - size , c.w*0.8, size, "white","600 "+size+"px Arial")
		wrapText(text2, x, y + size *1.2, c.w*0.8, size, "white", "400 "+size+"px Arial")
		glow(0)
	} else if (Game.screen == 4) {

	} else if(Game.screen == 5){
		Rect(c.xc, c.yc, c.w, c.h, "black")
		glow(20)
		wrapText("Made for the brackey game jam 2021.1   all assets and music are by Vachila64,    Made with love!", c.xc, c.vh*10, c.w*0.8, 20, "20p Arial");
		glow(0)
	} else if(Game.screen == 6){
		Rect(c.xc, c.yc, c.w, c.h, "black")
		glow(20)
		wrapText("Goal: Get the white triangle", c.xc, c.vh*50, c.w*0.8, 20, "20p Arial");
		glow(0)
	} else if(Game.screen == 7){
    doTask("remember", function(){
    Caldro.setCamera(devCam);
		let px = load('pX');
		let py = load('pY');
		let zum = load('Gzoom');
		if (zum != undefined) {
			Caldro.info.currentPlayer.x = parseInt(px)
			Caldro.info.currentPlayer.y = parseInt(py)
			Caldro.info.currentCamera.zoom = parseFloat(zum)
		  place(devCam, player)
		}
    });
	  save("pX", Caldro.info.currentPlayer.x);
	  save("pY", Caldro.info.currentPlayer.y);
	  save("Gzoom", Caldro.info.currentCamera.zoom)

	  Ps.clearParticles("in");
	  Rect(c.xc, c.yc, c.w, c.h, "purple");
	  Caldro.info.currentCamera.update();
	  Game.background.render();
	   Caldro.info.currentPlayer.particleStream = function(){};
		 Caldro.info.currentPlayer.update();
		 //GameDpad.update(poin?ter)
		// let checking = true;
		// let falling = 
		
		for (let b = blocks.length - 1; b > -1; --b) {
			if (blocks[b].toDestroy) {
				blocks.splice(b, 1)
				continue;
			}
			blocks[b].update();
			blocks[b].render();
			if (!(blocks[b].type.includes('ghost'))) {
				for(let p in players){
					platformize(players[p], blocks[b]);
				}
				/*let onAPlatform = platformize(Caldro.info.currentPlayer, blocks[b])
				if(on_){
					let player = Caldro.info.currentPlayer;
					addFriction(player, player.landFrition, Game.time.deltaTime);
				}*/
			}
		}


		for (let t = triggers.length - 1; t > -1; --t) {
			if (Game.state == 'running') {
				triggers[t].update()
				for(let p in players){
					triggers[t].check(players[p]);
				}
			}
			triggers[t].drawing();
			triggers[t].show();
			if (Game.devMode == true) {}
			if (triggers[t].data['toDestroy'] == true) {
				triggers.splice(t, 1)
			}
		}


  
	  Caldro.info.currentPlayer.render();
		 //Caldro.info.currentPlayer.gravity = 0;
	  // GameDpad.render();
	  let view = {};
	  // place(view, Caldro.info.currentPlayer)
	  place(view, Caldro.info.currentCamera)
	  let dmX = Game.Screen.dimensionScaleX
	  let dmY = Game.Screen.dimensionScaleY
	  
	  
	  let zoom = Caldro.info.currentCamera.zoom;
		let x = 0;
		let y = 0;
		let span = 20
		let color = 'rgba(255,255,25,0.7)';
		let markColor = 'rgba(120,255, 50, 0.6)';
		let drawingColor = color;
		let startX = -dmX * span
		let startY = -dmY * span
		let endX = ((dmX) * span)*3
		let endY = dmY * span
		let linesX = 640
		let linesY = 320
		let stepsX = (Math.abs(startX) + Math.abs(endX)) / linesX
		let stepsY = (Math.abs(startY) + Math.abs(endY)) / linesY
		// Math.floor(stepsX)
		// Math.floor(stepsY)
		let markDistX = dmX
		let markDistY = dmY
		
		for (let i = linesX; i >= -1; --i) {
			if (i == linesX) {
				x = startX
			}
			if (x % markDistX == 0) {
				cc.lineWidth = 8
				drawingColor = markColor
			} else {
				cc.lineWidth = 3
				drawingColor = color
			}
			glow(0)
			line(x, startY, x, endY, drawingColor)
			txt(x / dmX, x, view.y + c.h * 0.32 * (1 / zoom), '800 ' + (20 * (1 / zoom)) + 'px Arail', 'skyblue')
			x += stepsX
		}

		for (let i = linesY; i >= -1; --i) {
			if (i == linesY) {
				y = startY
			}
			if (y % markDistY == 0) {
				cc.lineWidth = 8
				drawingColor = markColor
			} else {
				cc.lineWidth = 3
				drawingColor = color
			}
			glow(0);
			line(startX, y, endX, y, drawingColor)
			txt(y / dmY, view.x + ((c.w * 0.48) * (1 / zoom)), y + 10, '800 ' + (20 * (1 / zoom)) + 'px Arail', 'skyblue')
			y += stepsY
		}

	  Caldro.info.currentCamera.resolve();
	  
	}
//END OF SCREEN HANDLING

	let checkButtons = true;
	// for (b = 0; b < buttonSelector.activeButtons.length; ++b) {
	for (let b = 0; b < buttons.length; ++b) {
		// let but = buttonSelector.activeButtons[b];
		let but = buttons[b];
		but.glow = 0;
		// buttonSelector.activeButtons[b].color = 'transparent'	
		if (Game.device.controls.keyboard) {
			if (checkButtons == true) {
				if (buttonSelector.check(but)) {
					// buttonSelector.activeButtons[b].color = 'rgba(255, 255, 255, 0.3)';
					// buttonSelector.activeButtons[b].glow = 20;
					// Ps.OutParticleSource(but.x, but.y, but.width, but.height, [-10, 10], [-10, 10], [0, 0], gen(2, 5, ''), [but.strokeColor], 1, 20, 'box')
					checkButtons = false;
				} else {}
			}
		}
		but.show();
		glow(0)
	}

	if (Game.screen == 1 && Game.state == 'running' && Game.device.controls.active) {
		if (Game.device.controls.view.dpad) {
				// GameDpad.render();
		}
		if (Game.device.controls.view.joystick) {
			// joy_stick.render();
		}
	}

	glow(0)
	Rect(c.xc, c.yc, c.w + 10, c.h + 10, Game.Screen.tintColor())
	Game.Screen.showText();
	renderScreenTabs(Game.time.deltaTime)
	Ps.OutUpdateAndRenderAll(Game.time.deltaTime, Game.state == 'running', );
	
	// if(Game.devMode){
	infoB.add('__General Info__','')
  infoB.add("Game_screen : ", Game.screen)
	infoB.add("FPS : ", 1/(Game.time.deltaTime))
	infoB.add("Cam_zoom : ", Caldro.info.currentCamera.zoom);
	infoB.add('','')
	infoB.add("__Array sizes__", '')
	infoB.add("In_particlesArray : ", Ps.getArrayLength('in'));
	infoB.add("Out_particlesArray : ", Ps.getArrayLength('out'));
	infoB.add('triggers array : ', triggers.length);
	infoB.add("blocks : ", blocks.length);
	infoB.add("buttons : ", buttons.length);
	// }
 if(Game.devMode){
   infoB.x = approach(infoB.x, 20, 10).value;
   infoB.update();
   infoB.render()
} else {
   let x = approach(infoB.x, -c.width, 10);
   if(!x.arrived){
     infoB.update();
     infoB.render();
     infoB.x = x.value
   }
 }
  
	requestAnimationFrame(run)
}







// setInterval(run, 1000/2)
var transTabs = new Array(3)
var movieTabs = new Array();
var tabTarget = { x: c.xc, y: -c.height / 1.5 };
//Setting up transition tabs
createTab(c.xc, c.height * 1.6, 'green', 500)
createTab(c.xc, c.height * 1.6, 'red', 670)
createTab(c.xc, c.height * 1.6, 'white', 800)


createTab(c.xc, 0-500, c.width, 500, 'movie');
createTab(c.xc, c.height-500, c.width, 500, 'movie');

run();
placeTabs(tabTarget)

function renderScreenTabs(dt) {
	for (let i in transTabs) {
		let tab = transTabs[i];
		tab.x = pull(tab.x, tabTarget.x, tab.speed * dt)
		tab.y = pull(tab.y, tabTarget.y, tab.speed * dt)
		// Rect(tab.x, tab.y, c.width + 50, c.height + 50, tab.color)
	}
	let speed = 7.5;
	let h = c.min * 0.2;
	let w = c.width;
 let hh = h / 2;
	if (Game.Screen.playingScene /* && movieTabs.length == 2*/ ) {
		movieTabs[0].y = approach(movieTabs[0].y, 0, speed, Game.time.deltatime).value;
		movieTabs[1].y = approach(movieTabs[1].y, c.height, speed, Game.time.deltatime).value;
	} else {
		movieTabs[0].y = approach(movieTabs[0].y, -hh, speed).value;
		movieTabs[1].y = approach(movieTabs[1].y, c.height+hh , speed).value;
	}
	for (let i in movieTabs) {
		let tab = movieTabs[i];
		Rect(tab.x, tab.y, w, h, 'black');
	}
}

function createTab(x, y, color, speed = 0.8, type = 'transition') {
	let tab = {
		x: x,
		y: y,
		color: color,
		speed: speed,
	}
	if (type == 'transition') {
		transTabs.push(tab);
	} else if (type == 'movie') {
		movieTabs.push(tab);
	}
}

function placeTabs(point) {
	for (let i in transTabs) {
		let tab = transTabs[i];
		tab.x = point.x;
		tab.y = point.y;
	}
}

function placeTabTarget(point = 'random'){
	if(point == 'random'){
		place(tabTarget, choose([
			//RIGHT
			{
				x : c.width*2+100,
				y : c.yc
			},
			//LEFT
			{
				x : -c.width*2-100,
				y : c.yc
			},
			//UP
			{
				x : c.xc,
				y : -c.height*2-100
			},
			//BOTTOM
			{
				x : c.xc,
				y : c.height*2+100
			},
			]));
	} else {
		place(tabTarget, point)
	}
}

function pull(number, target, speed, minDist = 10) {
	let margin = Math.abs(target - number)
	if (margin < minDist) {
		number = target
	} else if (number < target) {
		number += speed
	} else {
		number -= speed
	}
	return number;
}




function keyPressHandler(keyNumber) {

	if (Game.device.controls.keyboard /*&& (Game.device.controls.active)*/ ) {
		let factor = 1 / devCam.zoom
		//PLAY MOVEMENT SOUND HERE
		switch (keyNumber) {
			case 32:
				/*SPACEBAR*/
			break;
			
			
			//ARROW KEYS
			case 37:
				/*UP*/ 
				devCam.x -= 20 * factor
				break;
			case 38:
				/*LEFT*/
				devCam.y -= 20 * factor
				break;
			case 39:
				/*RIGHT*/
				devCam.x += 20 * factor
			Caldro.info.currentPlayer.y = -100
				break;
			case 40:
				/*DOWN*/
				devCam.y += 20 * factor
				place(devCam, Caldro.info.currentPlayer)
				break;
				
			case 74:
				/*UP*/
				devCam.x -= 20 * factor
				break;
			case 73:
				/*LEFT*/
				devCam.y -= 20 * factor
				break;
			case 76:
				/*RIGHT*/
				devCam.x += 20 * factor
				break;
			case 75:
				/*DOWN*/
				devCam.y += 20 * factor
				break;

				//Q AND E FOR ZOOMING IN/OUT (ADVANTEAGE OF LAPTOPS OWNAERS OR PEOLPE WITH BLUETOOTH KEYBOARDS, YA'LL OTHERS, SORRY, LOL)
			case 81:
				/*Q*/
				Caldro.info.currentCamera.zoom += 0.054 * Caldro.info.currentCamera.zoom
				break;

			case 69:
				/*E*/
				Caldro.info.currentCamera.zoom -= 0.05 * Caldro.info.currentCamera.zoom
				break;

				//WASD 87, 65, 83, 69
			case 65:
				/*A*/
				GameDpad.left.effect()
				break;
			case 87:
				/*W*/
				GameDpad.up.effect()
				break;
			case 68:
				/*D*/
				GameDpad.right.effect()
				break;
			case 82:
				window.location.reload();
		  break;
			case 83:
				/*S*/
				GameDpad.down.effect()
				break;

			case 80: //P
				if (Game.state == 'running') {
					Game.state = 'paused'
				} else {
					Game.state = 'running'
				}
				break;
				case 13: /*ENTER*/
				if (Caldro.info.currentCamera == devCam) {
					Caldro.info.currentCamera = GameCam
				} else {
					Caldro.info.currentCamera = devCam
				}
				break;

			case 71:
				if (Game.device.controls.active) {
					Game.device.controls.active = false
				} else {
					Game.device.controls.active = true
				}
				break;
			case 72:
				Game.devMode = !Game.devMode
				break;
			case 70: //F
				fullscreen('gc')
				break;
			default:
				
				break;
		}
	}
	// console.log(keyNumber)
}


let cells = [];
let cols, rows;
let cellSize;
let margin = 20;
let startTime;

let video;
let prevFrame;
let camReady = false;

const CAM_STRENGTH = 0.2;
const ENERGY_DECAY = 0.9;
const MOTION_THRESHOLD = 50;

let letters = [];
const LETTER_COUNT = 60;
const LETTER_TEXT =
  "《东北与时间》时间在东北 不是走的 是结冰以后 慢慢裂开的 早晨六点 天还没完全醒 铁轨已经记住了 昨夜的温度 风从旷野来 带着旧厂房的编号 和被反复使用过的口音 它吹过人 不问名字 雪不是白的 雪是被时间 反复覆盖的灰 像一段被延迟执行的指令 手套里 指尖先老去 再轮到记忆 最后才是身体 我们坐在时间里 像坐在一趟 永远晚点的列车 广播反复说 即将到达 却从不说终点 夜晚降临得很快 黑色从边缘推进 一格一格 吞掉街灯 脚印 和没有说完的话 在东北 时间不是向前 它只是 一直在场";


const LETTER_LINK_DIST = 160;
const LETTER_LINK_ALPHA = 180;


function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(RGB, 255);
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(18);

  startTime = millis();
  initGrid();
  initLetters();

  video = createCapture(VIDEO, () => {
    camReady = true;
  });
  video.size(240, 180);
  video.hide();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  initGrid();
}

function initGrid() {
  cells = [];
  let minDim = min(width, height);
  let count = floor(minDim / 40);
  count = constrain(count, 10, 30);

  cols = rows = count;
  cellSize = min(
    (width - margin * 2) / cols,
    (height - margin * 2) / rows
  );

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      let cx = margin + x * cellSize + cellSize / 2;
      let cy = margin + y * cellSize + cellSize / 2;
      cells.push(new Cell(cx, cy, cellSize));
    }
  }
}

function initLetters() {
  letters = [];
  for (let i = 0; i < LETTER_COUNT; i++) {
    letters.push(new FluidLetter());
  }
}


function draw() {
  background(0);

  drawGridLines();

  
  if (camReady) {
    video.loadPixels();
    if (!prevFrame) {
      prevFrame = createImage(video.width, video.height);
      prevFrame.copy(
        video,
        0, 0, video.width, video.height,
        0, 0, video.width, video.height
      );
      prevFrame.loadPixels();
    }
  }

  // Grid cells
  for (let c of cells) {
    c.update();
    c.display();
  }

  drawLetterLinks();

  for (let l of letters) {
    l.update();
    l.display();
  }

  if (camReady && prevFrame) {
    prevFrame.copy(
      video,
      0, 0, video.width, video.height,
      0, 0, video.width, video.height
    );
    prevFrame.updatePixels();
  }
}

function drawGridLines() {
  stroke(255, 20);
  strokeWeight(1);

  for (let i = 0; i <= cols; i++) {
    let x = margin + i * cellSize;
    line(x, margin, x, margin + rows * cellSize);
  }
  for (let i = 0; i <= rows; i++) {
    let y = margin + i * cellSize;
    line(margin, y, margin + cols * cellSize, y);
  }
  noStroke();
}


function drawLetterLinks() {
  let camBoost = camReady ? 1.4 : 1.0;
  strokeWeight(1.6 * camBoost);

  for (let i = 0; i < letters.length; i++) {
    for (let j = i + 1; j < letters.length; j++) {
      let a = letters[i];
      let b = letters[j];

      let d = dist(a.pos.x, a.pos.y, b.pos.x, b.pos.y);
      if (d < LETTER_LINK_DIST) {
        let alpha = map(d, 0, LETTER_LINK_DIST, LETTER_LINK_ALPHA, 0);
        let pulse = sin(frameCount * 0.03 + d * 0.05) * 0.5 + 0.5;

        stroke(220, 30, 30, alpha * pulse);

     
        for (let k = 0; k < 2; k++) {
          let offset = random(-0.4, 0.4);
          line(
            a.pos.x + offset,
            a.pos.y + offset,
            b.pos.x + offset,
            b.pos.y + offset
          );
        }
      }
    }
  }
  noStroke();
}


class Cell {
  constructor(x, y, size) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.slow = random(TWO_PI);
    this.micro = random(TWO_PI);
    this.energy = 0;
    this.displayEnergy = 0;
  }

  update() {
    this.slow += 0.015;
    this.micro += 0.05;

    let baseEnergy =
      abs(sin(this.slow)) * 0.25 +
      abs(sin(this.micro)) * 0.15;

    let camEnergy = 0;
    if (camReady && prevFrame) {
      let vx = floor(map(this.x, margin, width - margin, 0, video.width));
      let vy = floor(map(this.y, margin, height - margin, 0, video.height));
      let i = 4 * (vy * video.width + vx);

      let diff =
        abs(video.pixels[i] - prevFrame.pixels[i]) +
        abs(video.pixels[i + 1] - prevFrame.pixels[i + 1]) +
        abs(video.pixels[i + 2] - prevFrame.pixels[i + 2]);

      camEnergy = map(diff, MOTION_THRESHOLD, 255, 0, CAM_STRENGTH);
      camEnergy = constrain(camEnergy, 0, CAM_STRENGTH);
    }

    this.energy *= ENERGY_DECAY;
    this.energy = max(this.energy, baseEnergy);
    this.energy = constrain(this.energy + camEnergy, 0, 1);
    this.displayEnergy = lerp(this.displayEnergy, this.energy, 0.1);
  }

  display() {
    if (this.displayEnergy < 0.03) return;

    push();
    translate(this.x, this.y);
    rotate(this.slow * 0.08);

    let s = this.size * 0.45;
    let w = map(this.displayEnergy, 0, 1, s * 0.05, s);
    let h = map(this.displayEnergy, 0, 1, s * 0.03, s * 0.35);
    let a = map(this.displayEnergy, 0, 1, 0, 200);

    fill(255, a);
    rectMode(CENTER);
    rect(0, 0, w, h, 2);
    pop();
  }
}


class FluidLetter {
  constructor() {
    this.pos = createVector(random(width), random(height));
    this.vel = p5.Vector.random2D().mult(random(0.2, 0.6));
    this.letter = LETTER_TEXT.charAt(floor(random(LETTER_TEXT.length)));
  }

  update() {
    let n = noise(
      this.pos.x * 0.002,
      this.pos.y * 0.002,
      frameCount * 0.002
    );
    let angle = n * TWO_PI * 2;
    let flow = p5.Vector.fromAngle(angle).mult(0.15);

    if (camReady && prevFrame) {
      let vx = floor(map(this.pos.x, 0, width, 0, video.width));
      let vy = floor(map(this.pos.y, 0, height, 0, video.height));
      let i = 4 * (vy * video.width + vx);

      let diff =
        abs(video.pixels[i] - prevFrame.pixels[i]) +
        abs(video.pixels[i + 1] - prevFrame.pixels[i + 1]) +
        abs(video.pixels[i + 2] - prevFrame.pixels[i + 2]);

      let pushForce = map(diff, 0, 200, 0, 0.6);
      this.vel.add(p5.Vector.random2D().mult(pushForce));
    }

    this.vel.add(flow);
    this.vel.limit(1.5);
    this.pos.add(this.vel);
    this.vel.mult(0.98);

    if (this.pos.x < 0) this.pos.x = width;
    if (this.pos.x > width) this.pos.x = 0;
    if (this.pos.y < 0) this.pos.y = height;
    if (this.pos.y > height) this.pos.y = 0;
  }

  display() {
    fill(255, 160);
    text(this.letter, this.pos.x, this.pos.y);
  }
}
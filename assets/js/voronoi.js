const canvas = document.querySelector("#genetic-canvas");
const image = document.getElementById("genetic-image");

const ctx = canvas.getContext("2d");
const helpCanvas = document.createElement("canvas");
const helpContext = helpCanvas.getContext("2d");

// settings
let pointsToUse = 500;

resizeCanvas(image.width, image.height);
let mainImageData = getImageData(image);

const dropArea = document.getElementById("dropzone");
const showDotsCheckbox = document.getElementById("showDotsCheckbox");
const numPointsSlider = document.getElementById("numPointsSlider");
const rerunBtn = document.getElementById("rerunBtn");

voronoi();
updatePoints();


["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
  dropArea.addEventListener(eventName, preventDefaults, false);
  document.body.addEventListener(eventName, preventDefaults, false);
});
["dragenter", "dragover"].forEach((eventName) => {
  dropArea.addEventListener(eventName, highlight, false);
});
["dragleave", "drop"].forEach((eventName) => {
  dropArea.addEventListener(eventName, unhighlight, false);
});

dropArea.addEventListener("drop", handleDrop, false);
dropArea.addEventListener("input", handleChange, false);

numPointsSlider.addEventListener("input", (e) => {
  pointsToUse = 10000 - e.target.value || 1;
  
  updatePoints();
});
rerunBtn.addEventListener("click", voronoi);

function updatePoints(){
  document.getElementById("pointsChosen").innerHTML = pointsToUse;
}
function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
}

function highlight() {
  dropArea.classList.add("highlight");
}

function unhighlight() {
  dropArea.classList.remove("highlight");
}

function handleChange(e) {
  handleFiles(e.target.files);
}

function handleDrop({ dataTransfer }) {
  handleFiles(dataTransfer.files);
}

function handleFiles(file) {
  if (file.length === 0) {
    console.error("No file provided");
    return;
  }
  const reader = new FileReader();
  reader.addEventListener("loadend", () => {
    const tempImage = new Image();
    tempImage.addEventListener("load", () => {
      const { width, height } = tempImage;
      image.addEventListener("load", () => {
        resizeCanvas(width, height);
        mainImageData = getImageData(tempImage);
        setTimeout(voronoi(), 0);
      });
      image.src = reader.result;
    });
    tempImage.src = reader.result;
  });
  reader.readAsDataURL(file[0]);
}

function voronoi() {
  const { width, height } = mainImageData;
  const points = Array((pointsToUse) | 0)
    .fill(0)
    .map((_, i) => ({
      index: i,
      x: getRandomFloat(0, width),
      y: getRandomFloat(0, height),
      color: getRandomColor(),
      pixels: [],
    }));

  const imageData = new ImageData(width, height);

  for (let i = 0; i < mainImageData.data.length; i += 4) {
    const x = (i / 4) % width;
    const y = (i / 4 / width) | 0;

    const min = minDistance(x, y, points);

    min.pixels.push({
      x,
      y,
      color: [
        mainImageData.data[i],
        mainImageData.data[i + 1],
        mainImageData.data[i + 2],
      ],
    });
  }

  points.forEach((point) => {
    point.avg = average(point.pixels);
    point.pixels.forEach((pixel) => {
      const index = (pixel.y * width + pixel.x) * 4;
      imageData.data[index] = point.avg[0];
      imageData.data[index + 1] = point.avg[1];
      imageData.data[index + 2] = point.avg[2];
      imageData.data[index + 3] = 255;
    });
  });

  ctx.putImageData(imageData, 0, 0);
  if (showDotsCheckbox?.checked) {
    points.forEach((point) => {
      ctx.fillStyle = "black";
      ctx.fillRect(point.x, point.y, 2, 2);
    });
  }

  function average(pixels) {
    let sum = [0, 0, 0];
    pixels.forEach(({ color }) => {
      sum[0] += color[0];
      sum[1] += color[1];
      sum[2] += color[2];
    });
    return sum.map((s) => s / pixels.length);
  }

  function minDistance(x, y, points) {
    let minPoint = null;
    let min = Number.MAX_SAFE_INTEGER;
    points.forEach((point) => {
      const dist = distance(x, y, point.x, point.y);
      if (dist < min) {
        min = dist;
        minPoint = point;
      }
    });

    return minPoint;
  }

  function distance(x1, y1, x2, y2) {
    return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
  }
}

function resizeCanvas(width, height) {
  canvas.width = helpCanvas.width = width;
  canvas.height = helpCanvas.height = height;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function getImageData(image) {
  helpCanvas.width = image.width;
  helpCanvas.height = image.height;
  helpContext.drawImage(image, 0, 0);
  const data = helpContext.getImageData(0, 0, image.width, image.height);
  helpContext.clearRect(0, 0, helpCanvas.width, helpCanvas.height);
  return data;
}

function getRandomColor() {
  return [getRandomInt(0, 255), getRandomInt(0, 255), getRandomInt(0, 255)];
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

function getRandomFloat(min, max) {
  return Math.random() * (max - min) + min;
}

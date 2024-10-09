const canvas = document.querySelector("#genetic-canvas");
const image = document.getElementById("genetic-image");
const progressBar = document.querySelector('.progress-bar');

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
const pointsChosen = document.getElementById("pointsChosen");
const rerunBtn = document.getElementById("rerunBtn");
const downloadButton = document.getElementById('btn-download');

// Initial Voronoi diagram generation
voronoi();
updatePoints();

downloadButton.addEventListener('click', (e) => {
  const url = canvas.toDataURL();
  const $link = document.createElement('a');
  $link.download = "voronoi.png";
  $link.href = url;
  $link.click();
  $link.remove();
});

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

pointsChosen.addEventListener("input", (e) => {
  updatePoints(e.target.value);
});

numPointsSlider.addEventListener("input", (e) => {
  updatePoints(e.target.value);
});

rerunBtn.addEventListener("click", voronoi);

function updatePoints(value = 500) {
  pointsChosen.value = value;
  numPointsSlider.value = value;
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
        setTimeout(voronoi, 0);
      });
      image.src = reader.result;
    });
    tempImage.src = reader.result;
  });
  reader.readAsDataURL(file[0]);
}

function voronoi() {
  progressBar.hidden = false;
  downloadButton.hidden = true;

  // Generate random points
  const points = Array.from({ length: pointsToUse }, () => [
    Math.random() * canvas.width,
    Math.random() * canvas.height,
  ]);

  // Create Voronoi diagram using D3
  const voronoi = d3.voronoi().extent([[0, 0], [canvas.width, canvas.height]]);
  const diagram = voronoi(points);

  // Draw the Voronoi diagram
  drawVoronoi(diagram, points);
}

function drawVoronoi(diagram, points) {
  const { width, height } = mainImageData;
  const imageData = new ImageData(width, height);
  
  diagram.polygons().forEach((polygon, index) => {
    if (!polygon) return;
    
    ctx.beginPath();
    polygon.forEach(([x, y], i) => {
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    
    // Get average color for the polygon
    const avgColor = getAverageColor(polygon, points[index]);
    
    ctx.fillStyle = `rgba(${avgColor[0]}, ${avgColor[1]}, ${avgColor[2]}, 1)`;
    ctx.fill();
  });

  if (showDotsCheckbox?.checked) {
    points.forEach(([x, y]) => {
      ctx.fillStyle = "black";
      ctx.fillRect(x, y, 2, 2);
    });
  }

  progressBar.hidden = true;
  downloadButton.hidden = false;
}

function getAverageColor(polygon, point) {
  const colors = [];

  polygon.forEach(([x, y]) => {
    const index = (Math.floor(y) * mainImageData.width + Math.floor(x)) * 4;
    colors.push([
      mainImageData.data[index],
      mainImageData.data[index + 1],
      mainImageData.data[index + 2],
    ]);
  });

  const avgColor = colors.reduce((acc, color) => {
    return [
      acc[0] + color[0],
      acc[1] + color[1],
      acc[2] + color[2],
    ];
  }, [0, 0, 0]).map(c => c / colors.length);

  return avgColor;
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

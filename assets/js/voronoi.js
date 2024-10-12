const canvas = document.querySelector("#genetic-canvas");
const image = document.getElementById("genetic-image");
const progressBar = document.querySelector('.progress-bar')

const ctx = canvas.getContext("2d");
const helpCanvas = document.createElement("canvas");
const helpContext = helpCanvas.getContext("2d");

const worker = new Worker('assets/js/worker.js')

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

voronoi();
updatePoints();

downloadButton.addEventListener('click', (e) => {
  const url = canvas.toDataURL();
  const $link = document.createElement('a')
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
  pointsToUse = value;
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

  worker.postMessage({
    imageData: mainImageData,
    settings: { pointsToUse }
  }, [mainImageData.data.buffer]); // Transfer the buffer
}

worker.addEventListener('message', ({ data }) => {
  const eventHandlers = {
    step: percentage => progressBar.value = percentage,
    done: draw
  };
  eventHandlers[data.event](data.data);
});

function draw(points) {
  const { width, height } = mainImageData;
  const imageData = new ImageData(width, height);
  
  points.forEach((point) => {
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

  progressBar.hidden = true;
  downloadButton.hidden = false;
}

function resizeCanvas(width, height) {
  canvas.width = width;
  canvas.height = height;
}

function getImageData(image) {
  helpCanvas.width = image.width;
  helpCanvas.height = image.height;
  helpContext.drawImage(image, 0, 0);
  return helpContext.getImageData(0, 0, image.width, image.height);
}

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
const rerunBtn = document.getElementById("rerunBtn");

voronoi();
updatePoints();

const button = document.getElementById('btn-download');

button.addEventListener('click', (e) => {
  const url = canvas.toDataURL();
  const $link = document.createElement('a')
  $link.download = "voronoi.png";
  $link.href = url
  $link.click()
  $link.remove()
  $img.onerror = console.error
  $img.src = imageSrc
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
        setTimeout(voronoi, 0);
      });
      image.src = reader.result;
    });
    tempImage.src = reader.result;
  });
  reader.readAsDataURL(file[0]);
}

worker.addEventListener('message', ({ data }) => {
  const eventHandlers = {
    step: percentage => progressBar.value = percentage,
    done: draw
  }
  
  eventHandlers[data.event](data.data)
})

function voronoi() {
  progressBar.hidden = false;
  worker.postMessage({
    imageData: mainImageData,
    settings: {
      pointsToUse
    }
  })
}

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

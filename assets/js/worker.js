addEventListener('message', ({ data }) => calculate(data.imageData, data.settings))

function calculate({ width, height, data }, { pointsToUse }) {
  const points = Array((pointsToUse) | 0)
    .fill(0)
    .map((_, i) => ({
      index: i,
      x: getRandomFloat(0, width),
      y: getRandomFloat(0, height),
      color: getRandomColor(),
      pixels: [],
    }));
  
  for (let i = 0; i < data.length; i += 4) {
    const x = (i / 4) % width;
    const y = (i / 4 / width) | 0;

    const min = minDistance(x, y, points);

    min.pixels.push({
      x,
      y,
      color: [
        data[i],
        data[i + 1],
        data[i + 2],
      ],
    });

    postMessage({
      event: 'step',
      data: i / data.length
    })
  }

  const imageData = new ImageData(width, height);
  points.forEach((point) => {
    point.avg = average(point.pixels)
    point.pixels.forEach((pixel) => {
      const index = (pixel.y * width + pixel.x) * 4;
      imageData.data[index] = point.avg[0];
      imageData.data[index + 1] = point.avg[1];
      imageData.data[index + 2] = point.avg[2];
      imageData.data[index + 3] = 255;
    });
  });

  postMessage({
    event: 'done',
    data: {
      imageData,
      points
    }
  })
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

function average(pixels) {
  let sum = [0, 0, 0];
  pixels.forEach(({ color }) => {
    sum[0] += color[0];
    sum[1] += color[1];
    sum[2] += color[2];
  });
  return sum.map((s) => s / pixels.length);
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

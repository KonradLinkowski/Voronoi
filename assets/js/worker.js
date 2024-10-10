addEventListener('message', ({ data }) => calculate(data.imageData, data.settings));

// A simple Quadtree implementation for spatial indexing
class QuadTree {
  constructor(boundary, capacity) {
    this.boundary = boundary; // { x, y, width, height }
    this.capacity = capacity; // Max number of points in each node
    this.points = [];
    this.divided = false;
  }

  subdivide() {
    const { x, y, width, height } = this.boundary;
    const newWidth = width / 2;
    const newHeight = height / 2;

    this.northeast = new QuadTree({ x: x + newWidth, y, width: newWidth, height: newHeight }, this.capacity);
    this.northwest = new QuadTree({ x, y, width: newWidth, height: newHeight }, this.capacity);
    this.southeast = new QuadTree({ x: x + newWidth, y: y + newHeight, width: newWidth, height: newHeight }, this.capacity);
    this.southwest = new QuadTree({ x, y: y + newHeight, width: newWidth, height: newHeight }, this.capacity);
    this.divided = true;
  }

  insert(point) {
    if (!this.contains(point)) return false; // Point is out of bounds

    if (this.points.length < this.capacity) {
      this.points.push(point);
      return true;
    } else {
      if (!this.divided) this.subdivide();
      return this.northeast.insert(point) || this.northwest.insert(point) ||
             this.southeast.insert(point) || this.southwest.insert(point);
    }
  }

  contains(point) {
    return (
      point.x >= this.boundary.x &&
      point.x <= this.boundary.x + this.boundary.width &&
      point.y >= this.boundary.y &&
      point.y <= this.boundary.y + this.boundary.height
    );
  }

  query(range, found) {
    if (!this.intersects(range)) return;

    for (let point of this.points) {
      found.push(point);
    }

    if (this.divided) {
      this.northeast.query(range, found);
      this.northwest.query(range, found);
      this.southeast.query(range, found);
      this.southwest.query(range, found);
    }
  }

  intersects(range) {
    return !(range.x > this.boundary.x + this.boundary.width ||
             range.x + range.width < this.boundary.x ||
             range.y > this.boundary.y + this.boundary.height ||
             range.y + range.height < this.boundary.y);
  }
}

function calculate({ width, height, data }, { pointsToUse }) {
  // Pre-generate points array with random positions and colors
  const points = new Array(pointsToUse | 0).fill(0).map((_, i) => ({
    index: i,
    x: getRandomFloat(0, width),
    y: getRandomFloat(0, height),
    color: getRandomColor(),
    pixels: [],
  }));

  // Create a quadtree to store points for spatial queries
  const quadTree = new QuadTree({ x: 0, y: 0, width, height }, 4); // Capacity of 4 points per node
  points.forEach(point => quadTree.insert(point)); // Insert points into the quadtree

  // Loop through image data once and assign each pixel to its closest point
  const totalPixels = data.length / 4;
  for (let i = 0; i < totalPixels; i++) {
    const x = i % width;
    const y = Math.floor(i / width);

    // Find the nearest point (Voronoi region) for this pixel using the quadtree
    const nearestPoint = findNearestPoint(x, y, quadTree);

    // Assign this pixel's color to the nearest point's pixel group
    nearestPoint.pixels.push({
      x,
      y,
      color: [
        data[i * 4],       // Red
        data[i * 4 + 1],   // Green
        data[i * 4 + 2],   // Blue
      ],
    });

    // Update progress every 10,000 pixels (arbitrary)
    if (i % 10000 === 0) {
      postMessage({
        event: 'step',
        data: i / totalPixels
      });
    }
  }

  // Compute the average color for each point based on its assigned pixels
  points.forEach(point => point.avg = average(point.pixels));

  postMessage({
    event: 'done',
    data: points
  });
}

// Find the nearest point using a spatial query
function findNearestPoint(x, y, quadTree) {
  const range = { x, y, width: 1, height: 1 }; // Define a range for querying
  const foundPoints = [];
  quadTree.query(range, foundPoints); // Query the quadtree

  let nearestPoint = null;
  let minDistance = Infinity;

  for (let point of foundPoints) {
    const dist = distance(x, y, point.x, point.y);
    if (dist < minDistance) {
      minDistance = dist;
      nearestPoint = point;
    }
  }

  return nearestPoint;
}

// Calculate the average color of the pixels assigned to a point
function average(pixels) {
  const sum = [0, 0, 0]; // RGB sum

  for (let i = 0; i < pixels.length; i++) {
    const pixelColor = pixels[i].color;
    sum[0] += pixelColor[0];
    sum[1] += pixelColor[1];
    sum[2] += pixelColor[2];
  }

  const pixelCount = pixels.length;
  return pixelCount === 0
    ? [0, 0, 0]
    : sum.map(s => Math.floor(s / pixelCount)); // Return average color
}

// Utility Functions
function distance(x1, y1, x2, y2) {
  // Simple Euclidean distance
  return Math.hypot(x1 - x2, y1 - y2);
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

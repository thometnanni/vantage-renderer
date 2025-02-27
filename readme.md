# Vantage-renderer

Vantage-renderer is an open-source 3D projection renderer built with Three.js.  It provides a modular framework for projecting media (images and videos) onto 3D environments using custom web components. Designed for fact-checkers, investigative journalists, and OSINT practitioners.


## Features

- `<vantage-renderer>`: Main container that sets up the Three.js scene, renderer, and camera controls.
- `<vantage-projection>`: Manages projections, texture/video loading, and keyframe updates.
- `<vantage-keyframe>`: Defines camera states (position, rotation, fov, etc.) at specific times.

## Installation

Install via npm:

`npm install vantage-renderer`

## Usage

Include the custom elements in your HTML:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>vantage-renderer Example</title>
  <script type="module" src="src/main.js"></script>
</head>
<body>
  <vantage-renderer scene="path/to/scene.gltf" time="0" first-person="false" controls="edit">
    <vantage-projection src="path/to/texture.mp4" focus="true">
      <vantage-keyframe time="0" position="0 1.8 0" rotation="0 0 0" fov="60" far="150"></vantage-keyframe>
      <vantage-keyframe time="10" position="10 1.8 0" rotation="0 0 0" fov="60" far="150"></vantage-keyframe>
    </vantage-projection>
  </vantage-renderer>
</body>
</html>
```

## Development

```
git clone https://github.com/thometnanni/vantage-renderer.git
cd vantage-renderer
npm install
npm run dev
```

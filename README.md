# 3D Geological Showcase Framework A universal, open-source web application framework for rendering interactive 3D geological data, stratigraphic boreholes, maps, and presentation figures directly in the browser. Designed for geoscientists, researchers, and educators to publish and share high-accuracy spatial data without requiring users to install specialized GIS software. ## Features
- **3D Terrain Rendering**: Procedural rendering of SRTM digital elevation models using Three.js.
- **Stratigraphic Boreholes**: 3D visualization of measured stratigraphic sections and drill cores.
- **Geological Maps**: Interactive Leaflet.js maps supporting varied geological polygons, fault lines, and POIs.
- **Data Dashboards**: Publication-quality analytical charts (Chart.js) dynamically generated from geological metadata.
- **Universal Data Ingestion**: 100% of the geological data is decoupled into a single `data.json` schema. ## Usage
To use this framework with your own geological data, simply modify the `data.json` file. No Javascript knowledge is required. ### 1. The `data.json` Schema
The application requires a valid `data.json` file in the root directory containing the following objects: #### `metadata`
Basic string dictionary containing `title`, `subtitle`, `region`, and `source`. #### `terrain`
Defines the parameters for the SRTM tile fetch and 3D grid:
```json
"terrain": { "provider": "aws-terrarium", "lat": 36.08, "lon": -112.12, "zoom": 12, "gridSize": 128
}
``` #### `stratigraphy`
A dictionary defining the lithological units where the key is a unique ID:
```json
"stratigraphy": { "UNIT_ID": { "name": "Formation Name", "color": "0xHexColor", "age": "Age Data" }
}
``` #### `boreholes`
An array of objects dictating the 3D position and intervals of the drill cores:
```json
"boreholes": [ { "id": "BH-01", "name": "Location Name", "x": -90, "z": -120, "depth": 250, "intervals": [ { "depthTo": 20, "lithoId": "UNIT_ID" } ] }
]
``` #### `map`
Controls the Leaflet.js rendering, including `center`, `zoom`, `units` (polygons), `structures` (polylines), and `pois` (markers). #### `figures`
Contains the data arrays for the `[distance, elevation, unit]` cross-section profiles, and X/Y datasets for the bar and log-scale charts. ## Deployment
This is a static Single Page Application (SPA). To view it locally, serve the directory using any local web server:
```bash
npx http-server . -p 8085
```
It can be deployed seamlessly to GitHub Pages, Vercel, or standard academic hosting environments. ## License
Provided under the MIT License.

## Overview
This project is organized for professional use with clear structure and documentation.

## Features
- Clean and maintainable codebase.
- Structured for readability and reuse.

## Getting Started
1. Clone the repository.
2. Install dependencies if needed.
3. Run the project using the repository instructions.

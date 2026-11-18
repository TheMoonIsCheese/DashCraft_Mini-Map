# DashCraft_Mini-Map
A custom real-time minimap Chrome extension for [DashCraft.io](dashcraft.io), built by [@TheMoonIsCheese](https://github.com/TheMoonIsCheese/).

### Features

Real-Time Track Rendering: Automatically reads track data on load and renders an accurate top-down minimap of the course.

Live Player Tracker: Tracks your vehicle's live position and rotation in real time.

Ghost Trail Display: Currently not working as there is no endpoint for storing ghosts in the remake yet.

High-Contrast Visuals: Color-coded track surfaces, platform trims, and high-visibility player markers so you can read upcoming turns at a glance.

### Installation (Chrome / Edge / Brave)

Download or clone this repository:

```git clone https://github.com/TheMoonIsCheese/DashMap-Final.git```

Open your browser and navigate to ```chrome://extensions``` (or ```edge://extensions``` / ```brave://extensions```).

Enable Developer mode using the toggle in the top-right corner.

Click Load unpacked and select the folder containing manifest.json.

Open DashCraft.io, load up any track, and the minimap will appear automatically!

### Project Structure

```manifest.json``` — Chrome Extension Manifest V3 configuration.

```injector.js``` — Runs in the MAIN world to hook into game state, track data, and player transforms.

```content.js``` — Handles the HTML5 Canvas minimap overlay, coordinate scaling, and piece-by-piece rendering logic.

```icons``` — Extension icons (folder).

### Credits & Acknowledgments

Author: [@TheMoonIsCheese](https://github.com/TheMoonIsCheese/)

Special Thanks: [@Phantomlnfinity](https://github.com/Phantomlnfinity/) — Huge thanks for the foundational drawing logic and inspiration from [DashMap_Ripoff](https://github.com/Phantomlnfinity/DashMap_Ripoff).


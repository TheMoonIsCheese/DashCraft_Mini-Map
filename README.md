# DashCraft_Mini-Map
A custom real-time minimap Chrome extension for [DashCraft.io](dashcraft.io), built by [@TheMoonIsCheese](https://github.com/TheMoonIsCheese/).

### Features

Real-Time Track Rendering: Automatically reads track data on load and renders an accurate top-down minimap of the course.

Live Player Tracker: Tracks your vehicle's live position and rotation in real time.

Ghost Trail Display: Tracks the top 3 ghosts on any map and leaves behind a trail for you to follow.

High-Contrast Visuals: Color-coded track surfaces, platform trims, and high-visibility player markers so you can read upcoming turns at a glance.

### Installation (Chrome / Edge / Brave)

Download this repository:

Press "Code" while on the main tab and click "Download ZIP".
(Alternatively, run this command: ```git clone https://github.com/TheMoonIsCheese/DashCraft_Mini-Map.git```)

If you downloaded the ZIP file, make sure to navigate to the file in your Files app and right click on it, then select "Extract All".

Open your browser and navigate to ```chrome://extensions``` (or ```edge://extensions``` / ```brave://extensions```).

Enable Developer mode using the toggle in the top-right corner.

Click Load unpacked and select the folder containing ```manifest.json```. This folder will likely be two folders deep due to GitHub's download structuring.

Open DashCraft.io, load up any track, and the minimap will appear automatically!

### Project Structure

```manifest.json``` — Chrome Extension Manifest V3 configuration.

```injector.js``` — Runs in the MAIN world to hook into game state, track data, and player transforms.

```content.js``` — Handles the HTML5 Canvas minimap overlay, coordinate scaling, and piece-by-piece rendering logic.

```icons``` — Extension icons (folder).

### Credits & Acknowledgments

Author: [@TheMoonIsCheese](https://github.com/TheMoonIsCheese/)

Special Thanks: [@Phantomlnfinity](https://github.com/Phantomlnfinity/) — Big thanks for the foundational drawing logic and inspiration from [DashMap_Ripoff](https://github.com/Phantomlnfinity/DashMap_Ripoff).


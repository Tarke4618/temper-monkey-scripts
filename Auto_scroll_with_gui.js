// ==UserScript==
// @name         Auto Scroll with Dropdown GUI
// @namespace    http://tampermonkey.net/
// @version      2.4
// @description  Auto-scroll with a sleek, draggable, smoothly animated gradient GUI.
// @author       sanju
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    let scrollInterval;
    let scrollSpeed = 10;
    let isScrolling = false;
    let isCollapsed = false;

    // Inject keyframes for smooth gradient animation
    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
        @keyframes gradientFlow {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
        }

        .animated-gradient {
            background-size: 400% 400%;
            animation: gradientFlow 6s ease-in-out infinite;
            color: white;
            border: none;
        }

        #gui-container {
            background: linear-gradient(135deg, #8e2de2, #4a00e0, #00c4cc, #ff6f61);
            animation: gradientFlow 10s ease-in-out infinite;
        }

        #drag-handle {
            background: inherit;
            height: 15px;
            border-radius: 10px 10px 0 0;
            cursor: move;
        }

        #toggle-scroll {
            background: linear-gradient(135deg, #ff007f, #ff69b4, #ff1493);
            animation: gradientFlow 7s ease-in-out infinite;
        }

        #speed-control {
            background: linear-gradient(135deg, #00c4cc, #007bff, #8e2de2);
            animation: gradientFlow 5s ease-in-out infinite;
        }
    `;
    document.head.appendChild(styleSheet);

    // Create GUI with outer layer
    const gui = document.createElement('div');
    gui.id = 'gui-container';
    gui.classList.add('animated-gradient');
    gui.innerHTML = `
        <div id="drag-handle"></div>
        <div id="menu" style="padding: 10px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.5); display: flex; flex-direction: column; align-items: center;">
            <button id="toggle-scroll" class="animated-gradient" style="flex-grow: 1; padding: 8px 12px; border-radius: 10px; cursor: pointer; font-size: 14px; width: 100%;">Start ▶</button>
            <input id="speed-control" type="range" min="5" max="50" value="10" class="animated-gradient" style="width: 100%; margin-top: 8px;">
        </div>
    `;
    gui.style.position = 'fixed';
    gui.style.top = '10px';
    gui.style.left = '10px';
    gui.style.borderRadius = '10px';
    gui.style.color = 'white';
    gui.style.zIndex = '9999';
    gui.style.fontFamily = 'Arial, sans-serif';
    gui.style.overflow = 'hidden';

    document.body.appendChild(gui);

    let dragHandle = gui.querySelector('#drag-handle');
    let button = gui.querySelector('#toggle-scroll');
    let speedControl = gui.querySelector('#speed-control');

    // Start/Stop Scrolling & Toggle Menu
    button.addEventListener('click', () => {
        isScrolling = !isScrolling;
        isCollapsed = !isCollapsed;
        if (isScrolling) {
            scrollInterval = setInterval(() => {
                window.scrollBy(0, scrollSpeed);
            }, 50);
            button.textContent = 'Stop ▼';
        } else {
            clearInterval(scrollInterval);
            button.textContent = 'Start ▶';
        }
        speedControl.style.display = isCollapsed ? 'none' : 'block';
    });

    // Speed Control
    speedControl.addEventListener('input', () => {
        scrollSpeed = parseInt(speedControl.value);
    });

    // Draggable only from drag-handle (top area)
    let isDragging = false, offsetX, offsetY;
    dragHandle.addEventListener('mousedown', (e) => {
        isDragging = true;
        offsetX = e.clientX - gui.getBoundingClientRect().left;
        offsetY = e.clientY - gui.getBoundingClientRect().top;
    });
    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            gui.style.left = `${e.clientX - offsetX}px`;
            gui.style.top = `${e.clientY - offsetY}px`;
        }
    });
    document.addEventListener('mouseup', () => {
        isDragging = false;
    });
})();

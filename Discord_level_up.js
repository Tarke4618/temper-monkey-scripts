// ==UserScript==
// @name         Discord Auto Typer with Collapsible UI
// @namespace    http://tampermonkey.net/
// @version      8.4
// @description  Types messages in Discord with a vibrant, animated GUI and an enhanced context menu
// @author       You
// @match        *://discord.com/channels/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    let running = false;
    let intervalId;
    let isDragging = false;
    let isCollapsed = false;
    let controls;
    let lastMessage = "None yet";
    let nextMessage = "None yet";
    let nextMessageTime = 0;
    let timerInterval;

    const messages = [
        "Loving the energy in this community—can’t wait to see what’s next!",
        "This project’s got such an inspiring vibe!",
        "Just diving into the details—so much cool stuff to explore!",
    ];

    let config = {
        minInterval: 60,
        maxInterval: 120,
    };

    // Inject keyframes for smooth gradient animation
    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
        @keyframes gradientFlow {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
        }
    `;
    document.head.appendChild(styleSheet);

    function getTextbox() {
        const textbox = document.querySelector('[role="textbox"][aria-label^="Message"]');
        if (!textbox) {
            console.error("❌ Couldn't find Discord textbox");
            return null;
        }
        return textbox;
    }

    function insertText(text) {
        const textbox = getTextbox();
        if (!textbox) return false;

        textbox.focus();
        const inputEvent = new InputEvent('beforeinput', {
            bubbles: true,
            cancelable: true,
            inputType: 'insertText',
            data: text
        });
        textbox.dispatchEvent(inputEvent);
        textbox.textContent = text;

        const afterInputEvent = new InputEvent('input', {
            bubbles: true,
            cancelable: true,
            inputType: 'insertText',
            data: text
        });
        textbox.dispatchEvent(afterInputEvent);
        return true;
    }

    function pressEnter() {
        const textbox = getTextbox();
        if (!textbox) return false;

        const enterEvent = new KeyboardEvent('keydown', {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13,
            bubbles: true,
            cancelable: true
        });
        textbox.dispatchEvent(enterEvent);
        return true;
    }

    async function sendMessage() {
        if (!running) return;

        try {
            const message = messages[Math.floor(Math.random() * messages.length)];
            if (insertText(message)) {
                await new Promise(resolve => setTimeout(resolve, 500));
                pressEnter();
                lastMessage = message;
                nextMessage = messages[Math.floor(Math.random() * messages.length)];
                updateContextMenu();
                console.log(`✅ Sent message: "${message}"`);
            }

            if (running) {
                const nextInterval = Math.floor(Math.random() *
                    (config.maxInterval - config.minInterval + 1)) + config.minInterval;
                nextMessageTime = Date.now() + nextInterval * 1000;
                updateTimer();
                console.log(`⏰ Next message in ${nextInterval} seconds`);
                intervalId = setTimeout(sendMessage, nextInterval * 1000);
            }
        } catch (error) {
            console.error('❌ Error sending message:', error);
            stopMessaging();
        }
    }

    function startMessaging() {
        if (running) return;
        running = true;
        nextMessage = messages[Math.floor(Math.random() * messages.length)];
        updateContextMenu();
        console.log("🚀 Auto messaging started");
        sendMessage();
        startTimer();
    }

    function stopMessaging() {
        running = false;
        if (intervalId) {
            clearTimeout(intervalId);
        }
        if (timerInterval) {
            clearInterval(timerInterval);
        }
        nextMessageTime = 0;
        nextMessage = "None yet";
        updateContextMenu();
        console.log("🛑 Auto messaging stopped");
    }

    function startTimer() {
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = setInterval(updateTimer, 1000);
    }

    function updateTimer() {
        const contextTimer = controls.querySelector('#next-message-timer');
        if (nextMessageTime > 0 && running) {
            const secondsLeft = Math.max(0, Math.floor((nextMessageTime - Date.now()) / 1000));
            contextTimer.textContent = `${secondsLeft}s`;
        } else {
            contextTimer.textContent = 'N/A';
        }
    }

    function updateContextMenu() {
        const contextLast = controls.querySelector('#last-message');
        const contextNext = controls.querySelector('#next-message-text');
        const contextTimer = controls.querySelector('#next-message-timer');
        contextLast.textContent = lastMessage;
        contextNext.textContent = nextMessage;
        updateTimer();
    }

    function toggleCollapse() {
        const intervalControls = controls.querySelector('.interval-controls');
        const collapseIcon = controls.querySelector('.collapse-icon');

        isCollapsed = !isCollapsed;

        if (isCollapsed) {
            intervalControls.style.display = 'none';
            collapseIcon.textContent = '▼';
        } else {
            intervalControls.style.display = 'flex';
            collapseIcon.textContent = '▶';
        }
    }

    function createControls() {
        controls = document.createElement('div');
        controls.style.cssText = `
            position: fixed;
            top: 10px;
            left: 10px;
            background: rgba(0, 0, 0, 0.9);
            padding: 0;
            border-radius: 10px;
            color: white;
            z-index: 9999;
            font-family: Arial, sans-serif;
            overflow: hidden;
            width: 250px; /* Fixed width */
            max-width: 250px; /* Prevent any expansion */
        `;

        controls.innerHTML = `
            <div id="drag-handle" style="height: 15px; background: linear-gradient(135deg, #8e2de2, #4a00e0, #00c4cc, #ff6f61); border-radius: 10px 10px 0 0; cursor: move; background-size: 400% 400%; animation: gradientFlow 8s ease-in-out infinite;"></div>
            <div id="menu" style="background: linear-gradient(135deg, #8e2de2, #4a00e0, #00c4cc, #ff6f61); padding: 10px 0; display: flex; flex-direction: column; align-items: center; background-size: 400% 400%; animation: gradientFlow 8s ease-in-out infinite;">
                <div style="display: flex; justify-content: center; width: 100%;">
                    <button id="toggle-btn" style="flex-grow: 1; background: linear-gradient(135deg, #00c4cc, #007bff, #8e2de2); color: white; border: none; padding: 8px 12px; border-radius: 10px 0 0 10px; cursor: pointer; font-size: 14px; background-size: 400% 400%; animation: gradientFlow 6s ease-in-out infinite; width: 75%; max-width: 187.5px;"></button>
                    <button class="collapse-icon" style="background: linear-gradient(135deg, #ff007f, #ff69b4, #ff1493); color: white; border: none; padding: 8px 12px; border-radius: 0 10px 10px 0; cursor: pointer; font-size: 14px; width: 30px; background-size: 400% 400%; animation: gradientFlow 7s ease-in-out infinite;"></button>
                </div>
                <div class="interval-controls" style="display: flex; flex-direction: column; align-items: center; width: 100%; margin-top: 8px; gap: 8px;">
                    <label style="color: white; text-align: center;">Min Interval (s):</label>
                    <input id="min-interval" type="number" min="1" value="${config.minInterval}" style="background: linear-gradient(135deg, #8e2de2, #ff3d71, #00c4cc); border: none; color: white; padding: 5px; border-radius: 4px; width: 75%; max-width: 187.5px; background-size: 400% 400%; animation: gradientFlow 5s ease-in-out infinite;">
                    <label style="color: white; text-align: center;">Max Interval (s):</label>
                    <input id="max-interval" type="number" min="1" value="${config.maxInterval}" style="background: linear-gradient(135deg, #8e2de2, #ff3d71, #00c4cc); border: none; color: white; padding: 5px; border-radius: 4px; width: 75%; max-width: 187.5px; background-size: 400% 400%; animation: gradientFlow 5s ease-in-out infinite;">
                </div>
            </div>
            <div id="context-menu" style="background: linear-gradient(135deg, #8e2de2, #4a00e0, #00c4cc); padding: 8px; border-radius: 0 0 10px 10px; width: 100%; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.5); background-size: 400% 400%; animation: gradientFlow 8s ease-in-out infinite;">
                <div style="font-size: 12px; color: white; margin-bottom: 4px;">Last Message:</div>
                <div id="last-message" style="font-size: 12px; color: white; word-wrap: break-word; max-height: 3em; overflow: hidden;">${lastMessage}</div>
                <div style="font-size: 12px; color: white; margin: 4px 0;">Next Message In: <span id="next-message-timer">N/A</span></div>
                <div style="font-size: 12px; color: white; margin-bottom: 4px;">Next Message:</div>
                <div id="next-message-text" style="font-size: 12px; color: white; word-wrap: break-word; max-height: 3em; overflow: hidden;">${nextMessage}</div>
            </div>
        `;

        document.body.appendChild(controls);

        // Elements
        const dragHandle = controls.querySelector('#drag-handle');
        const toggleBtn = controls.querySelector('#toggle-btn');
        const collapseBtn = controls.querySelector('.collapse-icon');
        const minIntervalInput = controls.querySelector('#min-interval');
        const maxIntervalInput = controls.querySelector('#max-interval');

        // Toggle button logic
        toggleBtn.addEventListener('click', () => {
            if (!running) {
                startMessaging();
                toggleBtn.textContent = 'Stop Auto Messages';
                toggleBtn.style.background = 'linear-gradient(135deg, #ff3d71, #d81b60, #e91e63)';
                toggleBtn.style.backgroundSize = '400% 400%';
                toggleBtn.style.animation = 'gradientFlow 6s ease-in-out infinite';
            } else {
                stopMessaging();
                toggleBtn.textContent = 'Start Auto Messages';
                toggleBtn.style.background = 'linear-gradient(135deg, #00c4cc, #007bff, #8e2de2)';
                toggleBtn.style.backgroundSize = '400% 400%';
                toggleBtn.style.animation = 'gradientFlow 6s ease-in-out infinite';
            }
        });

        // Collapse logic
        collapseBtn.addEventListener('click', toggleCollapse);

        // Interval input logic
        minIntervalInput.addEventListener('change', () => {
            config.minInterval = Math.min(parseInt(minIntervalInput.value), parseInt(maxIntervalInput.value));
            minIntervalInput.value = config.minInterval;
        });

        maxIntervalInput.addEventListener('change', () => {
            config.maxInterval = Math.max(parseInt(maxIntervalInput.value), parseInt(minIntervalInput.value));
            maxIntervalInput.value = config.maxInterval;
        });

        // Draggable only from top drag-handle
        let offsetX, offsetY;
        dragHandle.addEventListener('mousedown', (e) => {
            isDragging = true;
            offsetX = e.clientX - controls.getBoundingClientRect().left;
            offsetY = e.clientY - controls.getBoundingClientRect().top;
        });

        document.addEventListener('mousemove', (e) => {
            if (isDragging) {
                controls.style.left = `${e.clientX - offsetX}px`;
                controls.style.top = `${e.clientY - offsetY}px`;
            }
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
        });
    }

    // Initialize when Discord is loaded
    function initialize() {
        if (getTextbox()) {
            createControls();
            console.log("✨ Discord Auto Typer initialized");
        } else {
            setTimeout(initialize, 1000);
        }
    }

    initialize();
})();

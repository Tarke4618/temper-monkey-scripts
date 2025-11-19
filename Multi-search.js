// ==UserScript==
// @name         Multi-search
// @namespace    http://tampermonkey.net/
// @version      18.0
// @description  v18.0 "Opus-X": Obsidian & Gold UI. Optimized engine with a single master event handler. Quick-Add is now on Ctrl+0 for 100% reliability.
// @author       sanju
// @match        *://*/*
// @grant        GM_openInTab
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    // --- 1. DATA & STORAGE ---
    const defaultGroups = {
        "1": [ { "name": "Google", "url": "https://www.google.com/search?q={searchterm}" } ],
        "2": [], "3": [], "4": [], "5": [], "6": [], "7": [], "8": [], "9": []
    };
    const defaultGroupNames = {
        "1": "Group 1", "2": "Group 2", "3": "Group 3", "4": "Group 4", "5": "Group 5",
        "6": "Group 6", "7": "Group 7", "8": "Group 8", "9": "Group 9"
    };
    const allViews = ['#mws-search-view', '#mws-settings-main-view', '#mws-settings-list-view', '#mws-settings-edit-view', '#mws-settings-group-names-view', '#mws-settings-help-view'];
    const allPlaceholders = [/{searchterm}/g, /{searchtermPlus}/g, /{searchtermMinus}/g, /{searchtermUnderscore}/g, /{searchtermRaw}/g];
    const placeholderNames = ['{searchterm}', '{searchtermPlus}', '{searchtermMinus}', '{searchtermUnderscore}', '{searchtermRaw}'];

    let siteGroups = {};
    let groupNames = {};
    let currentEditingGroup = "1";
    let currentlyEditingIndex = -1;

    function loadData() {
        let storedGroups = GM_getValue('mws-sites-v6-groups', null);
        siteGroups = storedGroups ? JSON.parse(storedGroups) : defaultGroups;

        let storedNames = GM_getValue('mws-sites-v7-group-names', null);
        groupNames = storedNames ? JSON.parse(storedNames) : defaultGroupNames;

        for (let i = 1; i <= 9; i++) {
            const key = String(i);
            if (!siteGroups[key]) siteGroups[key] = [];
            if (!groupNames[key]) groupNames[key] = defaultGroupNames[key];
        }

        if (!storedGroups) saveSiteGroups();
        if (!storedNames) saveGroupNames();
    }

    function saveSiteGroups() { GM_setValue('mws-sites-v6-groups', JSON.stringify(siteGroups)); }
    function saveGroupNames() { GM_setValue('mws-sites-v7-group-names', JSON.stringify(groupNames)); }

    // --- 2. CORE LOGIC ---

    function showNotification(message) {
        let notifyEl = document.getElementById('mws-notify');
        if (!notifyEl) {
            notifyEl = document.createElement('div');
            notifyEl.id = 'mws-notify';
            document.body.appendChild(notifyEl);
        }
        notifyEl.textContent = message;
        notifyEl.classList.add('mws-notify-show');
        setTimeout(() => {
            notifyEl.classList.remove('mws-notify-show');
        }, 2000);
    }

    function performSearch(searchTerm, groupKey) {
        if (!searchTerm || searchTerm.trim().length === 0) return;

        const sitesToSearch = siteGroups[groupKey];
        if (!sitesToSearch || sitesToSearch.length === 0) {
            alert(`J-search Error: Group ${groupKey} (${groupNames[groupKey]}) has no websites configured.`);
            return;
        }

        const rawTerm = searchTerm.trim();
        const termEncoded = encodeURIComponent(rawTerm);
        const termPlus = rawTerm.replace(/ /g, '+');
        const termMinus = rawTerm.replace(/ /g, '-');
        const termUnderscore = rawTerm.replace(/ /g, '_');

        for (const site of sitesToSearch) {
            let finalUrl = site.url;
            finalUrl = finalUrl.replace(/{search}/g, termEncoded); // Legacy
            finalUrl = finalUrl.replace(/{searchterm}/g, termEncoded);
            finalUrl = finalUrl.replace(/{searchtermPlus}/g, termPlus);
            finalUrl = finalUrl.replace(/{searchtermMinus}/g, termMinus);
            finalUrl = finalUrl.replace(/{searchtermUnderscore}/g, termUnderscore);
            finalUrl = finalUrl.replace(/{searchtermRaw}/g, rawTerm);
            GM_openInTab(finalUrl, { active: false });
        }

        showNotification(`Searching Group ${groupKey} in ${sitesToSearch.length} tab(s)...`);
    }

    function searchFromModal() {
        const input = document.getElementById('mws-search-input');
        const searchTerm = input.value;
        const groupKey = document.getElementById('mws-group-select').value;

        performSearch(searchTerm, groupKey);
        input.value = '';
        closeModal();
    }

    // --- 3. UI STATE MANAGEMENT ---

    function showView(viewIdToShow) {
        if (!document.getElementById('mws-modal-overlay')) return;
        allViews.forEach(id => {
            document.querySelector(id).style.display = 'none';
        });
        document.querySelector(viewIdToShow).style.display = 'block';
    }

    function populateGroupDropdown() {
        const select = document.getElementById('mws-group-select');
        select.innerHTML = '';
        for (let i = 1; i <= 9; i++) {
            const key = String(i);
            const option = document.createElement('option');
            option.value = key;
            option.textContent = `${key}: ${groupNames[key]}`;
            select.appendChild(option);
        }
    }

    function showModal(defaultGroup = "1") {
        if (!document.getElementById('mws-modal-overlay')) createModalUI();

        populateGroupDropdown();

        const selectedText = window.getSelection().toString().trim();
        document.getElementById('mws-search-input').value = selectedText;
        document.getElementById('mws-group-select').value = defaultGroup;

        const modalContent = document.getElementById('mws-modal-content');
        const modalOverlay = document.getElementById('mws-modal-overlay');
        modalOverlay.style.display = 'flex';
        modalOverlay.style.opacity = '1';

        // Center modal only if it hasn't been moved
        if (!modalContent.style.top) {
            modalContent.style.top = '50%';
            modalContent.style.left = '50%';
            modalContent.style.transform = 'translate(-50%, -50%) scale(1)';
        }
        modalContent.style.transform = 'translate(-50%, -50%) scale(1)';
        modalContent.style.opacity = '1';


        showView('#mws-search-view');
        document.getElementById('mws-search-input').focus();
        document.getElementById('mws-search-input').select();
    }

    function closeModal() {
        const modalOverlay = document.getElementById('mws-modal-overlay');
        const modalContent = document.getElementById('mws-modal-content');
        if (modalOverlay) {
            modalOverlay.style.opacity = '0';
            modalContent.style.transform = 'translate(-50%, -50%) scale(0.95)';
            modalContent.style.opacity = '0';

            setTimeout(() => {
                modalOverlay.style.display = 'none';
                document.getElementById('mws-search-input').value = '';
            }, 200); // Match transition duration
        }
    }

    // --- 4. SETTINGS LOGIC ---

    function showSettingsMainView() {
        for (let i = 1; i <= 9; i++) {
            const key = String(i);
            const btn = document.querySelector(`.mws-group-button[data-group="${key}"]`);
            if (btn) btn.textContent = `${key}: ${groupNames[key]}`;
        }
        showView('#mws-settings-main-view');
    }

    function getDomain(url) {
        try {
            return new URL(url).hostname;
        } catch (e) {
            return 'example.com'; // Fallback
        }
    }

    function renderSiteList(groupKey) {
        const listElement = document.getElementById('mws-sites-list');
        const sites = siteGroups[groupKey];
        listElement.innerHTML = '';

        if (sites.length === 0) {
            listElement.innerHTML = '<li class="mws-list-item-empty">No sites configured for this group.</li>';
            return;
        }

        sites.forEach((site, index) => {
            const li = document.createElement('li');
            li.className = 'mws-list-item';

            const isFirst = index === 0;
            const isLast = index === sites.length - 1;
            const domain = getDomain(site.url);
            const faviconUrl = `https://icons.duckduckgo.com/ip3/${domain}.ico`;

            li.innerHTML = `
                <div class="mws-site-info">
                    <div class="mws-site-name">
                        <img src="${faviconUrl}" class="mws-site-favicon">
                        <strong>${site.name}</strong>
                    </div>
                    <span class="mws-site-url">${site.url}</span>
                </div>
                <div class="mws-list-buttons">
                    <button class="mws-button mws-icon-btn mws-move-up-button" data-index="${index}" style="visibility: ${isFirst ? 'hidden' : 'visible'};" title="Move Up"></button>
                    <button class="mws-button mws-icon-btn mws-move-down-button" data-index="${index}" style="visibility: ${isLast ? 'hidden' : 'visible'};" title="Move Down"></button>
                    <button class="mws-button mws-icon-btn mws-edit-button" data-index="${index}" title="Edit"></button>
                    <button class="mws-button mws-icon-btn mws-delete-button" data-index="${index}" title="Delete"></button>
                </div>
            `;
            listElement.appendChild(li);
        });
    }

    function showEditView(indexStr) {
        currentlyEditingIndex = parseInt(indexStr);
        const site = siteGroups[currentEditingGroup][currentlyEditingIndex];

        document.getElementById('mws-edit-title').textContent = 'Edit Site';
        document.getElementById('mws-edit-name-input').value = site.name;
        document.getElementById('mws-edit-url-input').value = site.url;
        document.getElementById('mws-edit-error').style.display = 'none'; // Hide error

        showView('#mws-settings-edit-view');
        document.getElementById('mws-edit-name-input').focus();
    }

    function showAddView() {
        currentlyEditingIndex = -1;

        document.getElementById('mws-edit-title').textContent = 'Add New Site';
        document.getElementById('mws-edit-name-input').value = '';
        document.getElementById('mws-edit-url-input').value = 'https://...';
        document.getElementById('mws-edit-error').style.display = 'none'; // Hide error

        showView('#mws-settings-edit-view');
        document.getElementById('mws-edit-name-input').focus();
    }

    function deleteSite(indexStr) {
        const index = parseInt(indexStr);
        const siteName = siteGroups[currentEditingGroup][index].name;
        if (confirm(`Are you sure you want to delete "${siteName}" from ${groupNames[currentEditingGroup]}?`)) {
            siteGroups[currentEditingGroup].splice(index, 1);
            saveSiteGroups();
            renderSiteList(currentEditingGroup);
        }
    }

    function saveSite() {
        const name = document.getElementById('mws-edit-name-input').value.trim();
        const url = document.getElementById('mws-edit-url-input').value.trim();
        const errorEl = document.getElementById('mws-edit-error');

        // Inline Validation
        if (!name || !url) {
            errorEl.textContent = 'Name and URL cannot be empty.';
            errorEl.style.display = 'block';
            return;
        }
        if (!url.includes('{search')) {
            errorEl.textContent = 'URL must include a placeholder like {searchterm}, {searchtermMinus}, etc.';
            errorEl.style.display = 'block';
            return;
        }

        errorEl.style.display = 'none';
        const newSite = { name, url };

        if (currentlyEditingIndex === -1) {
            siteGroups[currentEditingGroup].push(newSite);
        } else {
            siteGroups[currentEditingGroup][currentlyEditingIndex] = newSite;
        }

        saveSiteGroups();
        document.getElementById('mws-list-title').textContent = `Manage: ${groupNames[currentEditingGroup]}`;
        renderSiteList(currentEditingGroup);
        showView('#mws-settings-list-view');
    }

    function moveSiteUp(indexStr) {
        const index = parseInt(indexStr);
        if (index === 0) return;
        const sites = siteGroups[currentEditingGroup];
        [sites[index - 1], sites[index]] = [sites[index], sites[index - 1]]; // Swap
        saveSiteGroups();
        renderSiteList(currentEditingGroup);
    }

    function moveSiteDown(indexStr) {
        const index = parseInt(indexStr);
        const sites = siteGroups[currentEditingGroup];
        if (index === sites.length - 1) return;
        [sites[index + 1], sites[index]] = [sites[index], sites[index + 1]]; // Swap
        saveSiteGroups();
        renderSiteList(currentEditingGroup);
    }

    function showGroupNamesView() {
        for (let i = 1; i <= 9; i++) {
            const key = String(i);
            document.getElementById(`mws-name-input-${key}`).value = groupNames[key];
        }
        showView('#mws-settings-group-names-view');
    }

    function saveAndCloseGroupNames() {
        for (let i = 1; i <= 9; i++) {
            const key = String(i);
            const input = document.getElementById(`mws-name-input-${key}`);
            groupNames[key] = input.value.trim() || `Group ${key}`;
        }
        saveGroupNames();
        alert('Group names saved!');
        showSettingsMainView();
    }

    // --- 4b. IMPORT / EXPORT LOGIC ---

    function handleExportClick() {
        const backupData = {
            version: 18.0,
            siteGroups: siteGroups,
            groupNames: groupNames
        };
        const jsonString = JSON.stringify(backupData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'j-search-backup.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function handleImportClick() {
        document.getElementById('mws-import-file-input').click();
    }

    function handleImportFileChange(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (!confirm('This will overwrite all your current J-search settings. Are you sure you want to proceed?')) {
            event.target.value = null; // Reset file input
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                if (importedData.siteGroups && importedData.groupNames) {
                    siteGroups = importedData.siteGroups;
                    groupNames = importedData.groupNames;

                    // Re-validate and fill gaps
                    loadData();
                    saveSiteGroups();
                    saveGroupNames();

                    alert('Settings imported successfully!');
                    showSettingsMainView(); // Refresh view
                } else {
                    alert('Import failed: Invalid file format.');
                }
            } catch (err) {
                alert('Import failed: Could not parse file. ' + err.message);
            }
            event.target.value = null; // Reset file input
        };
        reader.readAsText(file);
    }

    // --- 4c. QUICK-ADD LOGIC ---

    function quickAddHandler() {
        const url = window.location.href;
        const name = document.title.replace(/ - Search Results.*$/i, '').trim();

        const term = prompt(`Quick-Add Site (Ctrl+0)\n\nName: ${name}\nURL: ${url}\n\nPlease enter the exact search term you used:`);
        if (!term || term.trim() === '') return;

        const trimmedTerm = term.trim();
        const variations = [
            { key: '{searchterm}', value: encodeURIComponent(trimmedTerm) },
            { key: '{searchtermPlus}', value: trimmedTerm.replace(/ /g, '+') },
            { key: '{searchtermMinus}', value: trimmedTerm.replace(/ /g, '-') },
            { key: '{searchtermUnderscore}', value: trimmedTerm.replace(/ /g, '_') },
            { key: '{searchtermRaw}', value: trimmedTerm }
        ];

        let finalUrl = url;
        let placeholderFound = false;

        for (const v of variations) {
            if (url.includes(v.value)) {
                finalUrl = url.replace(v.value, v.key);
                placeholderFound = true;
                break;
            }
        }

        if (!placeholderFound) {
            alert(`Could not find the term "${term}" in the URL. Maybe try again with just one word?`);
            return;
        }

        const group = prompt(`Success! URL will be:\n${finalUrl}\n\nWhich group (1-9) do you want to add "${name}" to?`);
        if (!group || !/^[1-9]$/.test(group)) {
            alert('Invalid group. Operation cancelled.');
            return;
        }

        const newSite = { name, url: finalUrl };
        siteGroups[group].push(newSite);
        saveSiteGroups();
        alert(`Successfully added "${name}" to ${groupNames[group]}!`);
    }

    // --- 4d. PLACEHOLDER CLICK LOGIC ---

    function handlePlaceholderClick(e) {
        const pill = e.target.closest('.mws-placeholder-pill');
        if (!pill) return;

        const placeholderToInsert = pill.dataset.placeholder;
        const urlInput = document.getElementById('mws-edit-url-input');
        let currentUrl = urlInput.value;
        let replaced = false;

        for (const p of placeholderNames) {
            if (currentUrl.includes(p)) {
                currentUrl = currentUrl.replace(p, placeholderToInsert);
                replaced = true;
                break;
            }
        }

        if (!replaced) {
            currentUrl += placeholderToInsert;
        }

        urlInput.value = currentUrl;
        urlInput.focus();
    }

    // --- 5. MASTER EVENT HANDLER (OPTIMIZED) ---

    function handleNavClick(e) {
        // We only care about buttons with IDs
        if (!e.target.id || e.target.tagName !== 'BUTTON') return;

        switch (e.target.id) {
            // Search View
            case 'mws-search-button': searchFromModal(); break;
            case 'mws-close-button': closeModal(); break;
            case 'mws-settings-button': showSettingsMainView(); break;

            // Settings Main View
            case 'mws-import-button': handleImportClick(); break;
            case 'mws-export-button': handleExportClick(); break;
            case 'mws-help-button': showView('#mws-settings-help-view'); break;
            case 'mws-back-button-main': showView('#mws-search-view'); break;
            case 'mws-edit-group-names-button': showGroupNamesView(); break;

            // Settings List View
            case 'mws-add-new-button': showAddView(); break;
            case 'mws-back-button-list': showSettingsMainView(); break;

            // Settings Edit View
            case 'mws-save-button': saveSite(); break;
            case 'mws-cancel-edit-button':
                renderSiteList(currentEditingGroup);
                showView('#mws-settings-list-view');
                break;

            // Settings Group Names View
            case 'mws-save-names-button': saveAndCloseGroupNames(); break;
            case 'mws-cancel-names-button': showSettingsMainView(); break;

            // Settings Help View
            case 'mws-back-button-help': showSettingsMainView(); break;
        }
    }


    // --- 6. DOM & UI CREATION ---

    function createModalUI() {
        if (document.getElementById('mws-modal-overlay')) return;

        const modalOverlay = document.createElement('div');
        modalOverlay.id = 'mws-modal-overlay';
        modalOverlay.style.display = 'none';

        const modalContent = document.createElement('div');
        modalContent.id = 'mws-modal-content';

        // -- Search View --
        const searchView = document.createElement('div');
        searchView.id = 'mws-search-view';
        searchView.innerHTML = `
            <h3 class="mws-title" id="mws-modal-title">J-search Opus-X</h3>
            <div class="mws-input-row">
                <input type="text" id="mws-search-input" class="mws-input" placeholder="Enter search term...">
                <select id="mws-group-select" class="mws-select"></select>
            </div>
            <div class="mws-button-row">
                <button id="mws-close-button" class="mws-button mws-button-secondary">Close</button>
                <button id="mws-settings-button" class="mws-button mws-button-secondary">Settings</button>
                <button id="mws-search-button" class="mws-button mws-button-primary">Search</button>
            </div>
        `;
        modalContent.appendChild(searchView);

        // -- Settings View (Main Container) --
        const settingsView = document.createElement('div');
        settingsView.id = 'mws-settings-view';

        // -- Settings View 1: Main Grid --
        const settingsMainView = document.createElement('div');
        settingsMainView.id = 'mws-settings-main-view';
        settingsMainView.style.display = 'none';
        settingsMainView.innerHTML = `
            <h3 class="mws-title">Settings - Select Group</h3>
            <div id="mws-group-grid">
                ${[...Array(9).keys()].map(i => `
                    <button class="mws-button mws-group-button" data-group="${i+1}">${i+1}: ...</button>
                `).join('')}
            </div>
            <div class="mws-button-row mws-button-row-space-between">
                <div>
                    <button id="mws-import-button" class="mws-button mws-button-secondary">Import</button>
                    <button id="mws-export-button" class="mws-button mws-button-secondary">Export</button>
                    <input type="file" id="mws-import-file-input" accept=".json" style="display: none;">
                </div>
                <div>
                    <button id="mws-help-button" class="mws-button">Help</button>
                    <button id="mws-back-button-main" class="mws-button">Back</button>
                    <button id="mws-edit-group-names-button" class="mws-button mws-button-primary">Group Names</button>
                </div>
            </div>
        `;
        settingsView.appendChild(settingsMainView);

        // -- Settings View 2: List of Sites --
        const settingsListView = document.createElement('div');
        settingsListView.id = 'mws-settings-list-view';
        settingsListView.style.display = 'none';
        settingsListView.innerHTML = `
            <h3 id="mws-list-title" class="mws-title">Manage Group</h3>
            <ul id="mws-sites-list"></ul>
            <div class="mws-button-row">
                <button id="mws-back-button-list" class="mws-button">Back to Settings</button>
                <button id="mws-add-new-button" class="mws-button mws-button-primary">Add New Site</button>
            </div>
        `;
        settingsView.appendChild(settingsListView);

        // -- Settings View 3: Add/Edit Form --
        const settingsEditView = document.createElement('div');
        settingsEditView.id = 'mws-settings-edit-view';
        settingsEditView.style.display = 'none';
        settingsEditView.innerHTML = `
            <h3 id="mws-edit-title" class="mws-title">Add New Site</h3>
            <label for="mws-edit-name-input" class="mws-label">Name</label>
            <input type="text" id="mws-edit-name-input" class="mws-input" placeholder="e.g. Google">
            <label for="mws-edit-url-input" class="mws-label">URL</label>
            <input type="text" id="mws-edit-url-input" class="mws-input" placeholder="e.g. https://somesite.com/s?q=...">
            <p id="mws-edit-error" class="mws-error-text"></p>

            <p class="mws-help-text" style="margin-bottom: 5px;">Click to add/replace placeholder:</p>
            <div id="mws-placeholder-buttons">
                ${placeholderNames.map(p => `<span class="mws-placeholder-pill" data-placeholder="${p}">${p}</span>`).join('')}
            </div>

            <p class="mws-help-text" style="margin-top: 15px;">Use <strong>Ctrl + 0</strong> on a search page to add sites automatically.</p>

            <div class="mws-button-row">
                <button id="mws-cancel-edit-button" class="mws-button">Back to List</button>
                <button id="mws-save-button" class="mws-button mws-button-primary">Save</button>
            </div>
        `;
        settingsView.appendChild(settingsEditView);

        // -- Settings View 4: Edit Group Names --
        const settingsGroupNamesView = document.createElement('div');
        settingsGroupNamesView.id = 'mws-settings-group-names-view';
        settingsGroupNamesView.style.display = 'none';
        settingsGroupNamesView.innerHTML = `
            <h3 class="mws-title">Edit Group Names</h3>
            <div id="mws-group-names-form">
                ${[...Array(9).keys()].map(i => `
                    <div class="mws-form-group">
                        <label for="mws-name-input-${i+1}" class="mws-label">Group ${i+1}:</label>
                        <input type="text" id="mws-name-input-${i+1}" class="mws-input">
                    </div>
                `).join('')}
            </div>
            <div class="mws-button-row">
                <button id="mws-cancel-names-button" class="mws-button">Back to Settings</button>
                <button id="mws-save-names-button" class="mws-button mws-button-primary">Save Names</button>
            </div>
        `;
        settingsView.appendChild(settingsGroupNamesView);

        // -- Settings View 5: Help (UPDATED for Ctrl+0) --
        const settingsHelpView = document.createElement('div');
        settingsHelpView.id = 'mws-settings-help-view';
        settingsHelpView.style.display = 'none';
        settingsHelpView.innerHTML = `
            <h3 class="mws-title">Help & Shortcuts</h3>
            <div id="mws-help-content">
                <p><strong>Shortcuts:</strong></p>
                <ul>
                    <li><strong>Ctrl + [1-9] (with text selected):</strong> Search the selected text in that group.</li>
                    <li><strong>Ctrl + [1-9] (no text selected):</strong> Open/Close this search modal.</li>
                    <li><strong>Ctrl + 0:</strong> On any search results page, press this to open the Quick-Add prompt.</li>
                </ul>
                <p><strong>Placeholders:</strong></locl>
                <p>When adding a site, use these placeholders in the URL:</p>
                <ul>
                    <li><code>{searchterm}</code>: For <code>search%20term</code> (URL encoded)</li>
                    <li><code>{searchtermPlus}</code>: For <code>search+term</code></li>
                    <li><code>{searchtermMinus}</code>: For <code>search-term</code></li>
                    <li><code>{searchtermUnderscore}</code>: For <code>search_term</code></li>
                    <li><code>{searchtermRaw}</code>: For <code>search term</code> (raw, with spaces)</li>
                </ul>
            </div>
            <div class="mws-button-row">
                <button id="mws-back-button-help" class="mws-button">Back to Settings</button>
            </div>
        `;
        settingsView.appendChild(settingsHelpView);

        modalContent.appendChild(settingsView);
        modalOverlay.appendChild(modalContent);
        document.body.appendChild(modalOverlay);

        // --- OPTIMIZED Event Listeners ---

        // 1. Master handler for all simple button clicks
        modalContent.addEventListener('click', handleNavClick);

        // 2. Specific listener for 'Enter' on search input
        document.getElementById('mws-search-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') searchFromModal();
        });

        // 3. Specific listener for file input
        document.getElementById('mws-import-file-input').addEventListener('change', handleImportFileChange);

        // 4. Delegated listeners for dynamic/complex content
        document.getElementById('mws-settings-edit-view').addEventListener('click', handlePlaceholderClick);

        document.getElementById('mws-group-grid').addEventListener('click', (e) => {
            const btn = e.target.closest('.mws-group-button');
            if (btn) {
                currentEditingGroup = btn.dataset.group;
                document.getElementById('mws-list-title').textContent = `Manage: ${groupNames[currentEditingGroup]}`;
                renderSiteList(currentEditingGroup);
                showView('#mws-settings-list-view');
            }
        });

        document.getElementById('mws-sites-list').addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;
            const index = btn.dataset.index;
            if (btn.classList.contains('mws-move-up-button')) moveSiteUp(index);
            else if (btn.classList.contains('mws-move-down-button')) moveSiteDown(index);
            else if (btn.classList.contains('mws-edit-button')) showEditView(index);
            else if (btn.classList.contains('mws-delete-button')) deleteSite(index);
        });

        // 5. Listener for overlay click
        modalOverlay.addEventListener('click', (e) => {
            if (e.target.id === 'mws-modal-overlay') closeModal();
        });

        // 6. Draggable logic
        makeDraggable(document.getElementById('mws-modal-content'), document.getElementById('mws-modal-title'));
    }

    function makeDraggable(modal, title) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        title.onmousedown = dragMouseDown;

        function dragMouseDown(e) {
            e = e || window.event;
            e.preventDefault();
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
            modal.style.transform = 'none';
        }

        function elementDrag(e) {
            e = e || window.event;
            e.preventDefault();
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            modal.style.top = (modal.offsetTop - pos2) + "px";
            modal.style.left = (modal.offsetLeft - pos1) + "px";
        }

        function closeDragElement() {
            document.onmouseup = null;
            document.onmousemove = null;
        }
    }


    // --- 7. STYLES (THE "OPUS" THEME) ---
    function addStyles() {
        GM_addStyle(`
            :root {
                --mws-bg-dark: #141417;
                --mws-bg-modal: rgba(31, 31, 35, 0.85); /* Tinted glass */
                --mws-bg-input: #2A2A2E;
                --mws-bg-hover: #333337;
                --mws-border: #3A3A3E;
                --mws-text: #F1F1F1;
                --mws-text-muted: #77777D;
                --mws-primary: #D4AF37; /* Gold */
                --mws-primary-hover: #E6C25E;
                --mws-danger: #ff5572;
                --mws-danger-hover: #ff2f53;
                --mws-font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji";
            }

            /* --- SVG Icons (Recolored for Gold) --- */
            .mws-icon-btn {
                background-color: transparent;
                border: none;
                width: 30px;
                height: 30px;
                padding: 6px;
                border-radius: 4px; /* Added for hover */
                background-repeat: no-repeat;
                background-position: center center;
                background-size: 16px 16px;
                opacity: 0.8;
                transition: opacity 0.2s ease, background-image 0.2s ease, background-color 0.2s ease;
            }
            .mws-icon-btn:hover {
                background-color: var(--mws-bg-hover);
                opacity: 1;
            }
            .mws-icon-btn.mws-move-up-button {
                background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23F1F1F1' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M18 15l-6-6-6 6'/%3E%3C/svg%3E");
            }
            .mws-icon-btn.mws-move-up-button:hover {
                background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23D4AF37' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M18 15l-6-6-6 6'/%3E%3C/svg%3E");
            }
            .mws-icon-btn.mws-move-down-button {
                background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23F1F1F1' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
            }
            .mws-icon-btn.mws-move-down-button:hover {
                background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23D4AF37' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
            }
            .mws-icon-btn.mws-edit-button {
                background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23F1F1F1' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z'/%3E%3C/svg%3E");
            }
            .mws-icon-btn.mws-edit-button:hover {
                background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23D4AF37' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z'/%3E%3C/svg%3E");
            }
            .mws-icon-btn.mws-delete-button {
                background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23ff5572' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='3 6 5 6 21 6'%3E%3C/polyline%3E%3Cpath d='M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2'%3E%3C/path%3E%3Cline x1='10' y1='11' x2='10' y2='17'%3E%3C/line%3E%3Cline x1='14' y1='11' x2='14' y2='17'%3E%3C/line%3E%3C/svg%3E");
            }
            .mws-icon-btn.mws-delete-button:hover {
                background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23ff2f53' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='3 6 5 6 21 6'%3E%3C/polyline%3E%3Cpath d='M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2'%3E%3C/path%3E%3Cline x1='10' y1='11' x2='10' y2='17'%3E%3C/line%3E%3Cline x1='14' y1='11' x2='14' y2='17'%3E%3C/line%3E%3C/svg%3E");
            }

            /* --- Base & Overlay --- */
            #mws-modal-overlay {
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(10, 10, 10, 0.5);
                backdrop-filter: blur(10px);
                -webkit-backdrop-filter: blur(10px);
                z-index: 2147483646;
                display: none;
                align-items: center; justify-content: center;
                opacity: 0;
                transition: opacity 0.2s ease-out;
            }
            #mws-modal-content {
                background: var(--mws-bg-modal);
                color: var(--mws-text);
                padding: 0;
                border-radius: 12px;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
                width: 90%; max-width: 550px;
                box-sizing: border-box;
                border: 1px solid var(--mws-border);
                position: absolute;
                top: 50%; left: 50%;
                font-family: var(--mws-font);
                transform: translate(-50%, -50%) scale(0.95);
                opacity: 0;
                transition: transform 0.2s ease-out, opacity 0.2s ease-out;
            }
            #mws-search-view, #mws-settings-main-view, #mws-settings-list-view,
            #mws-settings-edit-view, #mws-settings-group-names-view, #mws-settings-help-view {
                padding: 30px;
            }
            #mws-modal-content * { box-sizing: border-box; }

            /* --- Typography & Title --- */
            .mws-title {
                margin-top: 0; margin-bottom: 25px; color: var(--mws-text);
                font-size: 1.8rem;
                font-weight: 300; /* Lighter, more elegant title */
                border-bottom: 1px solid var(--mws-border);
                padding-bottom: 15px;
            }
            #mws-modal-title {
                cursor: move;
                user-select: none;
                font-weight: 400;
            }
            .mws-label {
                display: block; margin-bottom: 8px; font-weight: 600;
                font-size: 14px; color: var(--mws-text-muted);
            }
            .mws-help-text {
                font-size: 13px; color: var(--mws-text-muted);
                margin-top: 0; margin-bottom: 15px;
                line-height: 1.5;
            }
            .mws-help-text strong, #mws-help-content code {
                color: var(--mws-primary);
                font-weight: 600;
            }
            #mws-help-content code {
                background: var(--mws-bg-input);
                padding: 2px 4px;
                border-radius: 4px;
                border: 1px solid var(--mws-border);
            }
            .mws-error-text {
                font-size: 13px; color: var(--mws-danger); font-weight: bold;
                margin-top: 8px; margin-bottom: 10px; display: none;
            }

            /* --- Buttons & Inputs --- */
            .mws-input-row { display: flex; gap: 10px; margin-bottom: 20px; }

            .mws-input, .mws-select {
                flex: 1 1 auto;
                padding: 12px;
                font-size: 16px;
                border: 1px solid var(--mws-border);
                border-radius: 6px;
                background-color: var(--mws-bg-input);
                color: var(--mws-text);
                transition: border-color 0.2s ease, box-shadow 0.2s ease;
            }
            .mws-select {
                flex: 0 0 160px;
            }
            .mws-input:focus, .mws-select:focus {
                outline: none;
                border-color: var(--mws-primary);
                box-shadow: 0 0 0 2px var(--mws-primary);
            }

            .mws-button {
                padding: 10px 18px;
                border: 1px solid var(--mws-bg-input);
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 600;
                background-color: var(--mws-bg-input);
                color: var(--mws-text);
                transition: all 0.2s ease;
            }
            .mws-button:hover {
                background-color: var(--mws-bg-hover);
                border-color: var(--mws-bg-hover);
            }
            .mws-button:active {
                transform: scale(0.98);
            }

            /* Solid Gold Primary Button */
            .mws-button-primary {
                background-color: var(--mws-primary);
                color: var(--mws-bg-dark);
                font-weight: 700;
                border-color: var(--mws-primary);
            }
            .mws-button-primary:hover {
                background-color: var(--mws-primary-hover);
                border-color: var(--mws-primary-hover);
            }

            /* Gold Ghost Button */
            .mws-button-secondary {
                background-color: transparent;
                color: var(--mws-primary);
                border-color: var(--mws-primary);
            }
            .mws-button-secondary:hover {
                background-color: var(--mws-primary);
                color: var(--mws-bg-dark);
                font-weight: 700;
                border-color: var(--mws-primary);
            }

            .mws-button-row { display: flex; justify-content: flex-end; gap: 10px; margin-top: 25px; }
            .mws-button-row-space-between { justify-content: space-between; }

            /* --- Placeholders --- */
            #mws-placeholder-buttons {
                display: flex; flex-wrap: wrap; gap: 6px;
                margin-top: -10px; margin-bottom: 15px;
            }
            .mws-placeholder-pill {
                background: transparent;
                color: var(--mws-text-muted);
                padding: 6px 10px;
                border-radius: 6px;
                font-size: 13px;
                font-family: monospace;
                cursor: pointer;
                border: 1px solid var(--mws-border);
                transition: all 0.2s ease;
            }
            .mws-placeholder-pill:hover {
                color: var(--mws-primary);
                border-color: var(--mws-primary);
                transform: translateY(-1px);
            }

            /* --- Settings Views --- */
            #mws-group-grid {
                display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;
            }
            .mws-group-button {
                width: 100%;
                padding: 20px 15px;
                font-size: 14px;
                text-align: left;
                overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
                border-color: var(--mws-border);
            }

            /* --- Site List (Gold Highlight) --- */
            #mws-sites-list {
                list-style: none; padding: 0; margin: 0;
                max-height: 350px; overflow-y: auto;
                border: 1px solid var(--mws-border);
                border-radius: 8px;
                background: var(--mws-bg-dark);
            }
            .mws-list-item, .mws-list-item-empty {
                display: flex; justify-content: space-between; align-items: center;
                padding: 12px;
                border-bottom: 1px solid var(--mws-border);
                transition: background-color 0.2s ease, border-left-color 0.2s ease;
                border-left: 2px solid transparent;
            }
            .mws-list-item:hover {
                background-color: var(--mws-bg-input);
                border-left-color: var(--mws-primary);
            }
            .mws-list-item:last-child { border-bottom: none; }
            .mws-list-item-empty { color: var(--mws-text-muted); justify-content: center; font-style: italic; }
            .mws-site-info { display: flex; flex-direction: column; gap: 4px; overflow: hidden; }
            .mws-site-name {
                font-size: 1rem; color: var(--mws-text);
                display: flex; align-items: center;
                font-weight: 600;
            }
            .mws-site-favicon {
                width: 16px; height: 16px; margin-right: 10px;
                vertical-align: middle;
            }
            .mws-site-url {
                font-size: 0.8rem; color: var(--mws-text-muted);
                white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
                margin-left: 26px; /* Align with name text */
            }
            .mws-list-buttons { display: flex; gap: 5px; flex-shrink: 0; margin-left: 10px; }

            /* --- Group Names Form --- */
            #mws-group-names-form {
                display: flex; flex-direction: column; gap: 10px;
                max-height: 350px; overflow-y: auto; padding-right: 5px;
            }
            .mws-form-group { display: flex; align-items: center; gap: 10px; }
            .mws-form-group .mws-label { flex: 0 0 80px; margin: 0; text-align: right; }
            .mws-form-group .mws-input { flex: 1 1 auto; margin: 0; }

            /* --- Help View --- */
            #mws-help-content ul { padding-left: 20px; }
            #mws-help-content li { margin-bottom: 10px; }

            /* --- Notification --- */
            #mws-notify {
                position: fixed;
                bottom: 20px;
                right: 20px;
                background-color: var(--mws-bg-input);
                border: 1px solid var(--mws-primary);
                color: var(--mws-text);
                padding: 12px 20px;
                border-radius: 8px;
                box-shadow: 0 5px 15px rgba(0,0,0,0.2);
                z-index: 2147483647;
                font-size: 14px;
                font-family: var(--mws-font);
                font-weight: 600;
                opacity: 0;
                visibility: hidden;
                transform: translateY(10px);
                transition: all 0.3s ease;
            }
            #mws-notify.mws-notify-show {
                opacity: 1;
                visibility: visible;
                transform: translateY(0);
            }
        `);
    }

    // --- 8. INITIALIZATION & LISTENERS ---

    function handleGlobalKeydown(e) {
        const groupKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

        if (e.ctrlKey && groupKeys.includes(e.key)) {
            // Don't run if the user is typing in an input
            const activeEl = document.activeElement;
            if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable)) {
                // Exception: allow if it's our modal's input
                if (activeEl.id !== 'mws-search-input') {
                     return;
                }
            }

            e.preventDefault();
            const groupKey = e.key;
            const selectedText = window.getSelection().toString().trim();

            if (selectedText.length > 0) {
                performSearch(selectedText, groupKey);
            } else {
                const modalOverlay = document.getElementById('mws-modal-overlay');
                const isModalVisible = modalOverlay && modalOverlay.style.display === 'flex';

                if (isModalVisible) {
                    const currentGroup = document.getElementById('mws-group-select').value;
                    if (currentGroup !== groupKey) {
                        document.getElementById('mws-group-select').value = groupKey;
                    } else {
                        closeModal();
                    }
                } else {
                    showModal(groupKey);
                }
            }
        }
        // NEW: Handle Ctrl+0 for Quick-Add
        else if (e.ctrlKey && e.key === '0') {
            // Don't run if the user is typing in an input
            const activeEl = document.activeElement;
            if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable)) {
                 return;
            }

            e.preventDefault();
            quickAddHandler();
        }
    }

    function init() {
        loadData();
        addStyles();
        createModalUI(); // Creates the UI, but it's hidden

        // Register global commands
        GM_registerMenuCommand('Open J-search (Ctrl+[1-9])', () => showModal("1"));
        // REMOVED the Quick-Add context menu item for a lighter, faster script.

        document.addEventListener('keydown', handleGlobalKeydown);
    }

    // --- Start the script ---
    init();

})();

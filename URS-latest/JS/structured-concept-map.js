// Global variables
let currentUser = null;
let currentUserName = '';
let currentMapId = null;
let availableMaps = [];
let autoRefreshInterval = null;
let lastNodeCount = 0;

// Configuration
const MAX_CHILDREN_PER_PARENT = 15;

let conceptMapData = {
    rootWord: "Philippine History",
    nodes: [],
    centerX: 500,
    centerY: 300,
    rootRadius: 80,
    nodeRadius: 60
};

let selectedColor = '#4A90E2';
let draggedNode = null;
let isDragging = false;
let dragOffset = { x: 0, y: 0 };

// ==================== AUTHENTICATION ====================

// Check authentication on page load
async function checkAuthentication() {
    try {
        const { data: { user }, error } = await window.supabaseClient.auth.getUser();
        
        if (error || !user) {
            // Not authenticated, redirect to login
            window.location.href = 'index.html';
            return false;
        }
        
        currentUser = user;
        currentUserName = user.user_metadata?.full_name || user.email || 'Student';
        
        // Display user info in header
        const userDisplay = document.getElementById('userDisplay');
        if (userDisplay) {
            userDisplay.textContent = `👤 ${currentUserName}`;
        }
        
        return true;
    } catch (error) {
        console.error('Authentication error:', error);
        window.location.href = 'index.html';
        return false;
    }
}

// Logout function
async function logout() {
    try {
        await window.supabaseClient.auth.signOut();
        localStorage.removeItem('userEmail');
        localStorage.removeItem('conceptMapData');
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Logout error:', error);
        window.location.href = 'index.html';
    }
}

// ==================== MAP MANAGEMENT ====================

// Load available concept maps from database
async function loadAvailableMaps() {
    try {
        const result = await ConceptMapDB.getConceptMaps();
        
        if (!result.success) {
            throw new Error(result.error || 'Failed to load maps');
        }
        
        availableMaps = result.data || [];
        
        const selector = document.getElementById('mapSelector');
        selector.innerHTML = '';
        
        if (availableMaps.length === 0) {
            selector.innerHTML = '<option value="">No topics available</option>';
            return;
        }
        
        // Populate dropdown
        availableMaps.forEach(map => {
            const option = document.createElement('option');
            option.value = map.id;
            option.textContent = map.root_word;
            option.dataset.description = map.description || '';
            selector.appendChild(option);
        });
        
        // Select first map by default or last selected
        const savedMapId = localStorage.getItem('currentMapId');
        if (savedMapId && availableMaps.some(m => m.id === savedMapId)) {
            currentMapId = savedMapId;
            selector.value = savedMapId;
        } else {
            currentMapId = availableMaps[0].id;
            selector.value = currentMapId;
        }
        
        // Update description
        updateMapDescription();
        
        // Load the selected map
        await loadMapData();
        
    } catch (error) {
        console.error('Error loading maps:', error);
        const selector = document.getElementById('mapSelector');
        selector.innerHTML = '<option value="">Error loading topics</option>';
    }
}

// Update map description display
function updateMapDescription() {
    const selector = document.getElementById('mapSelector');
    const selectedOption = selector.options[selector.selectedIndex];
    const description = selectedOption?.dataset.description || '';
    
    document.getElementById('mapDescription').textContent = description;
}

// Switch to a different map
async function switchMap() {
    const selector = document.getElementById('mapSelector');
    currentMapId = selector.value;
    
    if (!currentMapId) return;
    
    // Save selection
    localStorage.setItem('currentMapId', currentMapId);
    
    // Update description
    updateMapDescription();
    
    // Load the new map data
    await loadMapData();
}

// Load data for the current map
async function loadMapData(isRefresh = false) {
    if (!currentMapId) return;
    
    try {
        // Find the selected map
        const selectedMap = availableMaps.find(m => m.id === currentMapId);
        if (!selectedMap) return;
        
        // Update root word
        conceptMapData.rootWord = selectedMap.root_word;
        document.getElementById('modalRootWord').textContent = conceptMapData.rootWord;
        
        // Load nodes from database
        const result = await ConceptMapDB.getMapNodes(currentMapId);
        
        if (!result.success) {
            console.error('Error loading nodes:', result.error);
            conceptMapData.nodes = [];
        } else {
            const previousCount = conceptMapData.nodes.length;
            
            // Convert database format to app format
            conceptMapData.nodes = (result.data || []).map(dbNode => ({
                id: dbNode.id,
                word: dbNode.word,
                color: dbNode.color || '#4A90E2',
                parentId: dbNode.parent_id || 'root',
                relationship: dbNode.relationship_label || '',
                addedBy: dbNode.user_name || 'Unknown',
                userId: dbNode.user_id,
                createdAt: dbNode.created_at,
                customPosition: dbNode.position_x && dbNode.position_y ? {
                    x: parseFloat(dbNode.position_x),
                    y: parseFloat(dbNode.position_y)
                } : null
            }));
            
            // Show notification if new nodes added during refresh
            if (isRefresh && conceptMapData.nodes.length > previousCount) {
                const newCount = conceptMapData.nodes.length - previousCount;
                showRefreshNotification(`${newCount} new word${newCount > 1 ? 's' : ''} added!`);
            }
        }
        
        // Update last updated timestamp
        updateLastUpdatedTime();
        
        // Redraw the map
        initMap();
        
    } catch (error) {
        console.error('Error loading map data:', error);
        if (!isRefresh) {
            alert('Failed to load map data. Please try again.');
        }
    }
}

// ==================== REFRESH FUNCTIONALITY ====================

// Update the last updated timestamp display
function updateLastUpdatedTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
    });
    document.getElementById('lastUpdated').textContent = `Last updated: ${timeString}`;
}

// Show refresh notification
function showRefreshNotification(message) {
    // Create temporary notification element
    const notification = document.createElement('div');
    notification.className = 'refresh-notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Show with animation
    setTimeout(() => notification.classList.add('show'), 10);
    
    // Hide and remove after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Manual refresh function
async function refreshMapData() {
    const btn = event?.target;
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = 'Refreshing...';
    }
    
    await loadMapData(true);
    
    if (btn) {
        btn.disabled = false;
        btn.innerHTML = 'Refresh';
    }
}

// Start auto-refresh every 30 seconds
function startAutoRefresh() {
    // Clear any existing interval
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
    }
    
    // Set up new interval
    autoRefreshInterval = setInterval(async () => {
        await loadMapData(true);
    }, 30000); // 30 seconds
}

// Stop auto-refresh
function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
    }
}
// ==================== NODE LIMIT MANAGEMENT ====================

// Get count of children for a specific parent node
function getChildrenCount(parentId) {
    if (parentId === 'root') {
        // Count nodes directly connected to root
        return conceptMapData.nodes.filter(node => 
            !node.parentId || node.parentId === 'root'
        ).length;
    } else {
        // Count nodes connected to this specific parent
        return conceptMapData.nodes.filter(node => 
            node.parentId === parentId
        ).length;
    }
}
// Initialize the concept map
function initMap() {
    const svg = document.getElementById('conceptMap');
    const { centerX, centerY, rootRadius, nodes } = conceptMapData;

    // Dynamically adjust SVG viewBox based on number of nodes
    let viewBoxWidth = 1000;
    let viewBoxHeight = 600;
    
    if (nodes.length > 8) {
        viewBoxWidth = 1200;
        viewBoxHeight = 800;
    }
    if (nodes.length > 12) {
        viewBoxWidth = 1400;
        viewBoxHeight = 1000;
    }
    
    svg.setAttribute('viewBox', `0 0 ${viewBoxWidth} ${viewBoxHeight}`);
    
    // Adjust center position for larger viewBox
    conceptMapData.centerX = viewBoxWidth / 2;
    conceptMapData.centerY = viewBoxHeight / 2;

    // Clear existing content
    svg.innerHTML = '';

    // Draw connection lines first (so they appear behind nodes)
    drawConnections(svg);

    // Draw child nodes
    drawChildNodes(svg);

    // Create root node group
    const rootGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    rootGroup.classList.add('node');

    // Create root circle
    const rootCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    rootCircle.setAttribute('cx', centerX);
    rootCircle.setAttribute('cy', centerY);
    rootCircle.setAttribute('r', rootRadius);
    rootCircle.classList.add('root-node');
    
    // Add capacity indicator for root node
    const rootChildCount = getChildrenCount('root');
    if (rootChildCount >= MAX_CHILDREN_PER_PARENT) {
        // Full capacity - red border
        rootCircle.setAttribute('stroke', '#D32F2F');
        rootCircle.setAttribute('stroke-width', '4');
    } else if (rootChildCount >= 12) {
        // Approaching capacity - orange border
        rootCircle.setAttribute('stroke', '#F57C00');
        rootCircle.setAttribute('stroke-width', '4');
    }

    // Create root text
    const rootText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    rootText.setAttribute('x', centerX);
    rootText.setAttribute('y', centerY);
    rootText.classList.add('node-text');
    
    // Split text into multiple lines if too long
    const words = conceptMapData.rootWord.split(' ');
    if (words.length > 2) {
        const line1 = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
        line1.setAttribute('x', centerX);
        line1.setAttribute('dy', '-0.3em');
        line1.textContent = words.slice(0, Math.ceil(words.length / 2)).join(' ');
        
        const line2 = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
        line2.setAttribute('x', centerX);
        line2.setAttribute('dy', '1.2em');
        line2.textContent = words.slice(Math.ceil(words.length / 2)).join(' ');
        
        rootText.appendChild(line1);
        rootText.appendChild(line2);
    } else {
        rootText.textContent = conceptMapData.rootWord;
        rootText.setAttribute('dy', '0.35em');
    }

    // Append elements to group
    rootGroup.appendChild(rootCircle);
    rootGroup.appendChild(rootText);

    // Append group to SVG
    svg.appendChild(rootGroup);
    
    // Add capacity badge for root if it has children (reuse rootChildCount from above)
    if (rootChildCount > 0) {
        addCapacityBadge(svg, centerX + rootRadius - 15, centerY - rootRadius + 15, rootChildCount);
    }

    // Add decorative elements (corner accents)
    addDecorativeElements(svg);

    // Update node count
    updateNodeCount();
}

function drawConnections(svg) {
    const { centerX, centerY, nodes } = conceptMapData;

    nodes.forEach((node, index) => {
        const position = node.customPosition || calculateNodePosition(index, nodes.length);
        
        // Find parent position
        let parentPos = { x: centerX, y: centerY };
        if (node.parentId && node.parentId !== 'root') {
            const parentNode = nodes.find(n => n.id === node.parentId);
            if (parentNode) {
                const parentIndex = nodes.indexOf(parentNode);
                parentPos = parentNode.customPosition || calculateNodePosition(parentIndex, nodes.length);
            }
        }
        
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', parentPos.x);
        line.setAttribute('y1', parentPos.y);
        line.setAttribute('x2', position.x);
        line.setAttribute('y2', position.y);
        line.classList.add('connection-line');
        
        svg.appendChild(line);
        
        // Add relationship label if exists
        if (node.relationship) {
            const midX = (parentPos.x + position.x) / 2;
            const midY = (parentPos.y + position.y) / 2;
            
            // Background rect for better readability
            const textBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            const textWidth = node.relationship.length * 6;
            textBg.setAttribute('x', midX - textWidth / 2 - 3);
            textBg.setAttribute('y', midY - 10);
            textBg.setAttribute('width', textWidth + 6);
            textBg.setAttribute('height', 16);
            textBg.setAttribute('fill', 'white');
            textBg.setAttribute('opacity', '0.9');
            textBg.setAttribute('rx', '3');
            svg.appendChild(textBg);
            
            const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            label.setAttribute('x', midX);
            label.setAttribute('y', midY);
            label.classList.add('relationship-label');
            label.textContent = node.relationship;
            label.setAttribute('dy', '0.35em');
            svg.appendChild(label);
        }
    });
}

function drawChildNodes(svg) {
    const { nodes, nodeRadius } = conceptMapData;
    const now = new Date();

    nodes.forEach((node, index) => {
        const position = node.customPosition || calculateNodePosition(index, nodes.length);
        
        // Check if node is recently added (within last 5 minutes)
        const isRecent = node.createdAt && (now - new Date(node.createdAt)) < (5 * 60 * 1000);
        
        // Create node group
        const nodeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        nodeGroup.classList.add('node');
        nodeGroup.setAttribute('data-index', index);
        if (isRecent) {
            nodeGroup.classList.add('recent-node');
        }
        
        // Create circle
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', position.x);
        circle.setAttribute('cy', position.y);
        circle.setAttribute('r', nodeRadius);
        circle.classList.add('child-node', 'draggable');
        
        // Determine node level and apply styling
        const level = getNodeLevel(index);
        if (level === 2) {
            circle.classList.add('second-level-node');
        } else if (level >= 3) {
            circle.classList.add('third-level-node');
        }
        
        circle.style.fill = node.color || '#4A90E2';
        
        // Add capacity indicator for nodes with children
        const childCount = getChildrenCount(node.id);
        if (childCount >= MAX_CHILDREN_PER_PARENT) {
            // Full capacity - red border
            circle.setAttribute('stroke', '#D32F2F');
            circle.setAttribute('stroke-width', '3');
        } else if (childCount >= 12) {
            // Approaching capacity - orange border  
            circle.setAttribute('stroke', '#F57C00');
            circle.setAttribute('stroke-width', '3');
        }
        
        // Add drag events
        circle.addEventListener('mousedown', (e) => startDrag(e, index, position));
        circle.addEventListener('contextmenu', (e) => showNodeMenu(e, index));
        
        // Create text
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', position.x);
        text.setAttribute('y', position.y);
        text.classList.add('node-text');
        text.style.fontSize = '14px';
        
        // Split text into multiple lines if needed
        const words = node.word.split(' ');
        if (words.length > 2 || node.word.length > 12) {
            const midPoint = Math.ceil(words.length / 2);
            const line1 = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
            line1.setAttribute('x', position.x);
            line1.setAttribute('dy', '-0.3em');
            line1.textContent = words.slice(0, midPoint).join(' ');
            
            const line2 = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
            line2.setAttribute('x', position.x);
            line2.setAttribute('dy', '1.2em');
            line2.textContent = words.slice(midPoint).join(' ');
            
            text.appendChild(line1);
            text.appendChild(line2);
        } else {
            text.textContent = node.word;
            text.setAttribute('dy', '0.35em');
        }
        
        nodeGroup.appendChild(circle);
        nodeGroup.appendChild(text);
        
        // Add capacity badge if node has children
        if (childCount > 0) {
            addCapacityBadge(svg, position.x + nodeRadius - 12, position.y - nodeRadius + 12, childCount);
        }
        
        svg.appendChild(nodeGroup);
    });
}

// Add capacity badge to show child count
function addCapacityBadge(svg, x, y, count) {
    // Badge background circle
    const badge = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    badge.setAttribute('cx', x);
    badge.setAttribute('cy', y);
    badge.setAttribute('r', '12');
    
    // Color based on capacity
    if (count >= MAX_CHILDREN_PER_PARENT) {
        badge.setAttribute('fill', '#D32F2F'); // Red for full
    } else if (count >= 12) {
        badge.setAttribute('fill', '#F57C00'); // Orange for warning
    } else {
        badge.setAttribute('fill', '#1976D2'); // Blue for normal
    }
    
    badge.setAttribute('stroke', 'white');
    badge.setAttribute('stroke-width', '2');
    badge.classList.add('capacity-badge');
    
    // Badge text showing count
    const badgeText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    badgeText.setAttribute('x', x);
    badgeText.setAttribute('y', y);
    badgeText.setAttribute('dy', '0.35em');
    badgeText.setAttribute('fill', 'white');
    badgeText.setAttribute('font-size', '11');
    badgeText.setAttribute('font-weight', 'bold');
    badgeText.setAttribute('text-anchor', 'middle');
    badgeText.textContent = count;
    badgeText.classList.add('capacity-badge-text');
    
    // Add title for tooltip
    const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
    title.textContent = `${count}/${MAX_CHILDREN_PER_PARENT} connections`;
    badge.appendChild(title);
    
    svg.appendChild(badge);
    svg.appendChild(badgeText);
}

function getNodeLevel(index) {
    const node = conceptMapData.nodes[index];
    if (!node.parentId || node.parentId === 'root') {
        return 1;
    }
    const parentNode = conceptMapData.nodes.find(n => n.id === node.parentId);
    if (!parentNode) {
        return 1;
    }
    const parentIndex = conceptMapData.nodes.indexOf(parentNode);
    return 1 + getNodeLevel(parentIndex);
}

function calculateNodePosition(index, total) {
    const { centerX, centerY, rootRadius, nodeRadius } = conceptMapData;
    // Dynamic radius based on number of nodes - more nodes = larger circle
    let radius = 220;
    if (total > 8) {
        radius = 280; // Expand for more nodes
    }
    if (total > 12) {
        radius = 340; // Even larger for many nodes
    }
    const angle = (index * 2 * Math.PI / total) - (Math.PI / 2); // Start from top
    
    return {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle)
    };
}

function addDecorativeElements(svg) {
    const decorativeColor = '#D4C4B0';
    
    // Top-left corner
    const topLeft = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    topLeft.setAttribute('cx', '50');
    topLeft.setAttribute('cy', '50');
    topLeft.setAttribute('r', '20');
    topLeft.setAttribute('fill', decorativeColor);
    topLeft.setAttribute('opacity', '0.3');
    svg.appendChild(topLeft);

    // Top-right corner
    const topRight = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    topRight.setAttribute('cx', '950');
    topRight.setAttribute('cy', '50');
    topRight.setAttribute('r', '20');
    topRight.setAttribute('fill', decorativeColor);
    topRight.setAttribute('opacity', '0.3');
    svg.appendChild(topRight);

    // Bottom-left corner
    const bottomLeft = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    bottomLeft.setAttribute('cx', '50');
    bottomLeft.setAttribute('cy', '550');
    bottomLeft.setAttribute('r', '20');
    bottomLeft.setAttribute('fill', decorativeColor);
    bottomLeft.setAttribute('opacity', '0.3');
    svg.appendChild(bottomLeft);

    // Bottom-right corner
    const bottomRight = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    bottomRight.setAttribute('cx', '950');
    bottomRight.setAttribute('cy', '550');
    bottomRight.setAttribute('r', '20');
    bottomRight.setAttribute('fill', decorativeColor);
    bottomRight.setAttribute('opacity', '0.3');
    svg.appendChild(bottomRight);
}

// Modal functions
function openAddWordModal() {
    const modal = document.getElementById('addWordModal');
    const input = document.getElementById('relatedWord');
    const relationshipInput = document.getElementById('relationshipLabel');
    const parentSelect = document.getElementById('parentNode');
    
    modal.classList.add('show');
    input.value = '';
    relationshipInput.value = '';
    
    // Populate parent node options with child counts
    parentSelect.innerHTML = '';
    
    // Add root option with count
    const rootCount = getChildrenCount('root');
    const rootOption = document.createElement('option');
    rootOption.value = 'root';
    
    // Format root option text with count and warnings
    let rootText = `Root (Center) - ${rootCount}/${MAX_CHILDREN_PER_PARENT} words`;
    if (rootCount >= MAX_CHILDREN_PER_PARENT) {
        rootText += ' [FULL]';
        rootOption.disabled = true;
        rootOption.style.color = '#999';
    } else if (rootCount >= 12) {
        rootText = `⚠️ ${rootText}`;
        rootOption.style.color = '#F57C00';
    }
    rootOption.textContent = rootText;
    parentSelect.appendChild(rootOption);
    
    // Add each node as a parent option with count
    conceptMapData.nodes.forEach((node) => {
        const childCount = getChildrenCount(node.id);
        const option = document.createElement('option');
        option.value = node.id;
        
        // Format option text with count and warnings
        let optionText = `${node.word} (by ${node.addedBy}) - ${childCount}/${MAX_CHILDREN_PER_PARENT}`;
        if (childCount >= MAX_CHILDREN_PER_PARENT) {
            optionText += ' [FULL]';
            option.disabled = true;
            option.style.color = '#999';
        } else if (childCount >= 12) {
            optionText = `⚠️ ${optionText}`;
            option.style.color = '#F57C00';
        }
        option.textContent = optionText;
        parentSelect.appendChild(option);
    });
    
    // Reset color selection to first color
    document.querySelectorAll('.color-option').forEach(opt => opt.classList.remove('selected'));
    document.querySelector('.color-option').classList.add('selected');
    selectedColor = '#4A90E2';
    
    // Show initial capacity info for root
    updateParentCapacityInfo();
    
    setTimeout(() => input.focus(), 100);
}

function closeAddWordModal() {
    const modal = document.getElementById('addWordModal');
    modal.classList.remove('show');
}

// Update parent capacity information display
function updateParentCapacityInfo() {
    const parentSelect = document.getElementById('parentNode');
    const capacityInfo = document.getElementById('capacityInfo');
    const selectedValue = parentSelect.value;
    
    if (!capacityInfo) return;
    
    const childCount = getChildrenCount(selectedValue);
    const spotsLeft = MAX_CHILDREN_PER_PARENT - childCount;
    
    let infoHTML = '';
    let infoClass = '';
    
    if (childCount >= MAX_CHILDREN_PER_PARENT) {
        // Full
        infoHTML = `<span class="capacity-full">🚫 This node is FULL (${childCount}/${MAX_CHILDREN_PER_PARENT}). Please choose another parent.</span>`;
        infoClass = 'capacity-full';
    } else if (childCount >= 12) {
        // Warning
        infoHTML = `<span class="capacity-warning">⚠️ Only ${spotsLeft} spot${spotsLeft !== 1 ? 's' : ''} left on this node (${childCount}/${MAX_CHILDREN_PER_PARENT})</span>`;
        infoClass = 'capacity-warning';
    } else if (childCount >= 8) {
        // Getting busy
        infoHTML = `<span class="capacity-busy">📊 ${childCount} words already connected. ${spotsLeft} spots remaining.</span>`;
        infoClass = 'capacity-busy';
    } else {
        // Available
        infoHTML = `<span class="capacity-available">✅ Plenty of space - ${childCount} words connected, ${spotsLeft} spots available</span>`;
        infoClass = 'capacity-available';
    }
    
    capacityInfo.innerHTML = infoHTML;
    capacityInfo.className = `capacity-info ${infoClass}`;
}

async function addRelatedWord() {
    const input = document.getElementById('relatedWord');
    const relationshipInput = document.getElementById('relationshipLabel');
    const parentSelect = document.getElementById('parentNode');
    const word = input.value.trim();
    const relationship = relationshipInput.value.trim();
    const parentId = parentSelect.value;
    
    if (!word) {
        alert('Please enter a word');
        return;
    }
    
    if (!currentUser || !currentMapId) {
        alert('Session error. Please refresh the page.');
        return;
    }
    
    // Check for duplicates in current display
    if (conceptMapData.nodes.some(node => node.word.toLowerCase() === word.toLowerCase())) {
        alert('This word already exists in the concept map');
        return;
    }
    
    // Check if user already has a word for this map
    const userNodeCheck = await ConceptMapDB.getUserNodeForMap(currentMapId, currentUser.id);
    if (userNodeCheck.success && userNodeCheck.data) {
        alert('You have already added a word to this concept map. You can only add ONE word per map.');
        return;
    }
    
    // Check if parent node has reached maximum children
    const childrenCount = getChildrenCount(parentId);
    if (childrenCount >= MAX_CHILDREN_PER_PARENT) {
        const parentName = parentId === 'root' ? 'the root node' : 'this parent node';
        alert(`Cannot add word. ${parentName} has reached its maximum capacity of ${MAX_CHILDREN_PER_PARENT} connections. Please choose a different parent node to connect to.`);
        return;
    }
    
    // Add node to database
    const result = await ConceptMapDB.addNode(currentMapId, currentUser.id, {
        word: word,
        color: selectedColor,
        parentId: parentId,
        relationship: relationship
    });
    
    if (!result.success) {
        alert(result.error || 'Failed to add word. Please try again.');
        return;
    }
    
    // Reload map data to show the new node
    await loadMapData();
    
    // Close modal
    closeAddWordModal();
}

function updateNodeCount() {
    document.getElementById('nodeCount').textContent = conceptMapData.nodes.length;
}

// Color selection
function selectColor(element) {
    document.querySelectorAll('.color-option').forEach(opt => opt.classList.remove('selected'));
    element.classList.add('selected');
    selectedColor = element.getAttribute('data-color');
}

// Drag and drop functions
function startDrag(e, index, position) {
    if (e.button !== 0) return; // Only left mouse button
    e.preventDefault();
    e.stopPropagation();
    
    draggedNode = index;
    isDragging = true;
    
    const svg = document.getElementById('conceptMap');
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());
    
    dragOffset.x = svgP.x - position.x;
    dragOffset.y = svgP.y - position.y;
    
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', stopDrag);
}

function drag(e) {
    if (!isDragging || draggedNode === null) return;
    
    const svg = document.getElementById('conceptMap');
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());
    
    conceptMapData.nodes[draggedNode].customPosition = {
        x: svgP.x - dragOffset.x,
        y: svgP.y - dragOffset.y
    };
    
    initMap();
}

async function stopDrag() {
    if (isDragging && draggedNode !== null) {
        const node = conceptMapData.nodes[draggedNode];
        
        // Only save position if this is the current user's node
        if (node && node.userId === currentUser.id && node.customPosition) {
            await ConceptMapDB.updateNodePosition(
                node.id,
                currentUser.id,
                node.customPosition.x,
                node.customPosition.y
            );
        }
    }
    isDragging = false;
    draggedNode = null;
    document.removeEventListener('mousemove', drag);
    document.removeEventListener('mouseup', stopDrag);
}

// Right-click menu
function showNodeMenu(e, index) {
    e.preventDefault();
    
    const node = conceptMapData.nodes[index];
    let info = `"${node.word}"`;
    if (node.addedBy && node.addedBy !== 'Anonymous') {
        info += `\nAdded by: ${node.addedBy}`;
    }
    if (node.relationship) {
        info += `\nRelationship: ${node.relationship}`;
    }
    
    // Check if this is the current user's node
    if (node.userId !== currentUser.id) {
        alert(`${info}\n\nYou can only edit or delete your own words.`);
        return;
    }
    
    const action = confirm(`${info}\n\nClick OK to Edit, Cancel to Delete`);
    
    if (action) {
        editNode(index);
    } else {
        deleteNode(index);
    }
}

async function editNode(index) {
    const node = conceptMapData.nodes[index];
    
    // Check if this is the current user's node
    if (node.userId !== currentUser.id) {
        alert('You can only edit your own words!');
        return;
    }
    
    const newWord = prompt(`Edit word:`, node.word);
    
    if (newWord && newWord.trim() && newWord.trim() !== node.word) {
        const result = await ConceptMapDB.updateNode(node.id, currentUser.id, {
            word: newWord.trim(),
            color: node.color,
            parentId: node.parentId,
            relationship: node.relationship,
            position_x: node.customPosition?.x,
            position_y: node.customPosition?.y
        });
        
        if (!result.success) {
            alert('Failed to update word. Please try again.');
            return;
        }
        
        // Reload map data
        await loadMapData();
    }
}

async function deleteNode(index) {
    const node = conceptMapData.nodes[index];
    
    // Check if this is the current user's node
    if (node.userId !== currentUser.id) {
        alert('You can only delete your own words!');
        return;
    }
    
    if (confirm(`Delete "${node.word}"?`)) {
        const result = await ConceptMapDB.deleteNode(node.id, currentUser.id);
        
        if (!result.success) {
            alert('Failed to delete word. Please try again.');
            return;
        }
        
        // Reload map data
        await loadMapData();
    }
}

// Clear current user's node (they can only have one per map)
async function clearAllNodes() {
    // Find the current user's node
    const userNode = conceptMapData.nodes.find(n => n.userId === currentUser.id);
    
    if (!userNode) {
        alert('You have not added any word to this concept map yet.');
        return;
    }
    
    if (confirm(`Delete your word "${userNode.word}"? This will remove your contribution from this concept map.`)) {
        const result = await ConceptMapDB.deleteNode(userNode.id, currentUser.id);
        
        if (!result.success) {
            alert('Failed to delete word. Please try again.');
            return;
        }
        
        // Reload map data
        await loadMapData();
    }
}

// Export functionality
function toggleExportMenu() {
    const dropdown = document.getElementById('exportDropdown');
    dropdown.classList.toggle('show');
}

function exportAsJSON() {
    const data = {
        rootWord: conceptMapData.rootWord,
        studentName: currentUserName,
        nodes: conceptMapData.nodes.map(n => ({
            word: n.word,
            color: n.color,
            parentId: n.parentId,
            relationship: n.relationship,
            addedBy: n.addedBy,
            customPosition: n.customPosition
        })),
        exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `concept-map-${conceptMapData.rootWord.replace(/\s+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toggleExportMenu();
    alert('Concept map exported as JSON successfully!');
}

function exportAsImage() {
    const svg = document.getElementById('conceptMap');
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    // Get SVG dimensions
    const viewBox = svg.getAttribute('viewBox').split(' ');
    canvas.width = parseInt(viewBox[2]);
    canvas.height = parseInt(viewBox[3]);
    
    // Fill white background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add student name and title
    if (currentUserName) {
        ctx.fillStyle = '#8B4513';
        ctx.font = 'bold 24px Arial';
        ctx.fillText(`Student: ${currentUserName}`, 20, 30);
    }
    
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    
    img.onload = function() {
        ctx.drawImage(img, 0, currentUserName ? 50 : 0);
        canvas.toBlob(function(blob) {
            const link = document.createElement('a');
            link.download = `concept-map-${conceptMapData.rootWord.replace(/\s+/g, '-')}.png`;
            link.href = URL.createObjectURL(blob);
            link.click();
            toggleExportMenu();
            alert('Concept map exported as image successfully!');
        });
        URL.revokeObjectURL(url);
    };
    
    img.src = url;
}

// Close modal on outside click
window.onclick = function(event) {
    const modal = document.getElementById('addWordModal');
    if (event.target === modal) {
        closeAddWordModal();
    }
    
    // Close export dropdown if clicking outside
    const dropdown = document.getElementById('exportDropdown');
    if (!event.target.closest('.export-menu') && dropdown.classList.contains('show')) {
        dropdown.classList.remove('show');
    }
}

// Handle Enter key in modal
document.addEventListener('DOMContentLoaded', function() {
    const relatedWordInput = document.getElementById('relatedWord');
    if (relatedWordInput) {
        relatedWordInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                addRelatedWord();
            }
        });
    }
});

// Initialize on load
window.addEventListener('load', async () => {
    // Check authentication first
    const isAuthenticated = await checkAuthentication();
    if (!isAuthenticated) {
        return; // Will redirect to login
    }
    
    // Load available maps and initialize
    await loadAvailableMaps();
    
    // Start auto-refresh
    startAutoRefresh();
});

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    stopAutoRefresh();
});

// Handle window resize
window.addEventListener('resize', () => {
    initMap();
});

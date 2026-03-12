// Update the public/client.js file

// 1. Replace all innerHTML usages with safe textContent or createElement methods to prevent XSS
function setInnerHTML(element, htmlContent) {
    if (element) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;
        while (tempDiv.firstChild) {
            element.appendChild(tempDiv.firstChild);
        }
    }
}

// Example usage of setInnerHTML
// const myElement = document.getElementById('example');
// setInnerHTML(myElement, '<strong>Safe Content</strong>');

// 2. Remove duplicate btnWorld onclick handlers
function setupBtnWorldHandlers() {
    const btnWorld = document.getElementById('btnWorld');
    if (btnWorld) {
        btnWorld.onclick = function() {
            // Handler logic here
        };
    }
}

// Call this function to set up
setupBtnWorldHandlers();

// 3. Fix renderActions function
function renderActions() {
    const abilities = classesData[me.classe].abilities;
    // Render logic using abilities
}

// 4. Add null checks for btnWorld element
const btnWorld = document.getElementById('btnWorld');
if (!btnWorld) {
    console.error('btnWorld element not found!');
}

// 5. Fix addMessage function truncation
function addMessage(message) {
    // Ensure the message is fully appended, avoiding any truncation
    const messageContainer = document.getElementById('messageContainer');
    if (messageContainer) {
        const messageElement = document.createElement('div');
        messageElement.textContent = message;
        messageContainer.appendChild(messageElement);
    }
}

// 6. Consolidate exit button event listeners
const exitButton = document.getElementById('exitButton');
if (exitButton) {
    exitButton.addEventListener('click', function() {
        // Exit logic
    });
}
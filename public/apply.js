(function() {
    // --- Configuration ---
    const config = window.cvMatchConfig || {};
    const WIDGET_TOKEN = config.token;
    const API_URL = config.apiUrl;
    const BUTTON_TEXT = config.buttonText || "Søk med CVMatch";
    const CONTAINER_ID = "cvmatch-apply-widget-container"; // Must match the div id in embed code
  
    // --- Basic Validation ---
    if (!WIDGET_TOKEN || !API_URL) {
      console.error("CVMatch Widget Error: Missing token or apiUrl in window.cvMatchConfig.");
      // Optional: Display an error message in the container
      const container = document.getElementById(CONTAINER_ID);
      if (container) {
          container.innerHTML = '<p style="color: red; font-size: 12px;">Widget configuration error.</p>';
      }
      return;
    }
  
    // --- Inject CSS ---
    const css = `
      #cvmatch-modal-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.3s ease, visibility 0.3s ease;
      }
      #cvmatch-modal-backdrop.cvmatch-visible {
        opacity: 1;
        visibility: visible;
      }
      #cvmatch-modal-content {
        background-color: white;
        padding: 25px;
        border-radius: 8px;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        width: 90%;
        max-width: 400px;
        position: relative;
        font-family: sans-serif;
      }
      #cvmatch-modal-close {
        position: absolute;
        top: 10px;
        right: 10px;
        background: none;
        border: none;
        font-size: 20px;
        cursor: pointer;
        color: #666;
      }
      #cvmatch-modal-close:hover {
        color: #333;
      }
      #cvmatch-modal-content h2 {
        margin-top: 0;
        margin-bottom: 15px;
        font-size: 1.2em;
        color: #333;
      }
      .cvmatch-form-group {
        margin-bottom: 15px;
      }
      .cvmatch-form-group label {
        display: block;
        margin-bottom: 5px;
        font-size: 0.9em;
        color: #555;
      }
      .cvmatch-form-group input[type="email"],
      .cvmatch-form-group input[type="file"] {
        width: 100%;
        padding: 8px;
        border: 1px solid #ccc;
        border-radius: 4px;
        box-sizing: border-box; /* Include padding and border in element's total width and height */
        font-size: 0.9em;
      }
      .cvmatch-form-group input[type="file"] {
          padding: 3px; /* Smaller padding for file input */
      }
      .cvmatch-submit-button {
        background-color: #007bff;
        color: white;
        padding: 10px 15px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 1em;
        width: 100%;
        transition: background-color 0.2s ease;
      }
      .cvmatch-submit-button:hover:not(:disabled) {
        background-color: #0056b3;
      }
      .cvmatch-submit-button:disabled {
        background-color: #cccccc;
        cursor: not-allowed;
      }
      .cvmatch-message {
        margin-top: 15px;
        padding: 10px;
        border-radius: 4px;
        font-size: 0.9em;
        text-align: center;
      }
      .cvmatch-message.success {
        background-color: #d4edda;
        color: #155724;
        border: 1px solid #c3e6cb;
      }
      .cvmatch-message.error {
        background-color: #f8d7da;
        color: #721c24;
        border: 1px solid #f5c6cb;
      }
       .cvmatch-apply-button {
          display: inline-block;
          padding: 10px 20px;
          background-color: #007bff; /* Primary color */
          color: white;
          border: none;
          border-radius: 5px;
          font-size: 16px;
          font-weight: bold;
          text-align: center;
          cursor: pointer;
          text-decoration: none;
          transition: background-color 0.3s ease;
          margin-top: 10px; /* Add some space */
      }
      .cvmatch-apply-button:hover {
          background-color: #0056b3; /* Darker shade on hover */
      }
    `;
    const styleSheet = document.createElement("style");
    styleSheet.type = "text/css";
    styleSheet.innerText = css;
    document.head.appendChild(styleSheet);
  
    // --- Create Apply Button ---
    const container = document.getElementById(CONTAINER_ID);
    if (!container) {
      console.error(`CVMatch Widget Error: Container element with id "${CONTAINER_ID}" not found.`);
      // Clear placeholder text if container exists but button fails
       const placeholder = document.getElementById('widget-placeholder');
       if (placeholder) placeholder.style.display = 'none';
      return;
    } else {
        // Clear placeholder text once container is found
        const placeholder = document.getElementById('widget-placeholder');
        if (placeholder) placeholder.style.display = 'none';
    }
  
  
    const applyButton = document.createElement("button");
    applyButton.textContent = BUTTON_TEXT;
    applyButton.className = "cvmatch-apply-button"; // Apply button styling
    applyButton.id = "cvmatch-apply-btn";
    container.appendChild(applyButton);
  
    // --- Create Modal ---
    const modalBackdrop = document.createElement("div");
    modalBackdrop.id = "cvmatch-modal-backdrop";
  
    modalBackdrop.innerHTML = `
      <div id="cvmatch-modal-content">
        <button id="cvmatch-modal-close" aria-label="Close modal">&times;</button>
        <h2>Søk på stillingen</h2>
        <form id="cvmatch-apply-form">
          <div class="cvmatch-form-group">
            <label for="cvmatch-email">Din E-postadresse:</label>
            <input type="email" id="cvmatch-email" name="candidateEmail" required>
          </div>
          <div class="cvmatch-form-group">
            <label for="cvmatch-cv">Last opp CV (PDF, DOCX, TXT):</label>
            <input type="file" id="cvmatch-cv" name="cvFile" accept=".pdf,.docx,.txt" required>
          </div>
          <button type="submit" id="cvmatch-submit" class="cvmatch-submit-button">Send inn</button>
        </form>
        <div id="cvmatch-message-area" style="margin-top: 15px;" aria-live="polite"></div>
      </div>
    `;
    document.body.appendChild(modalBackdrop);
  
    // --- Modal Elements ---
    const modalContent = modalBackdrop.querySelector("#cvmatch-modal-content");
    const closeButton = modalBackdrop.querySelector("#cvmatch-modal-close");
    const form = modalBackdrop.querySelector("#cvmatch-apply-form");
    const submitButton = modalBackdrop.querySelector("#cvmatch-submit");
    const emailInput = modalBackdrop.querySelector("#cvmatch-email");
    const cvInput = modalBackdrop.querySelector("#cvmatch-cv");
    const messageArea = modalBackdrop.querySelector("#cvmatch-message-area");
  
    // --- Event Listeners ---
    applyButton.addEventListener("click", () => {
      modalBackdrop.classList.add("cvmatch-visible");
    });
  
    closeButton.addEventListener("click", closeModal);
    modalBackdrop.addEventListener("click", (event) => {
      // Close if clicked outside the content area
      if (event.target === modalBackdrop) {
        closeModal();
      }
    });
  
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      setLoading(true);
      clearMessage();
  
      const formData = new FormData();
      formData.append("widgetToken", WIDGET_TOKEN);
      formData.append("candidateEmail", emailInput.value);
      // Basic file check
      if (!cvInput.files || cvInput.files.length === 0) {
          showMessage("Vennligst velg en CV-fil.", "error");
          setLoading(false);
          return;
      }
      formData.append("cvFile", cvInput.files[0]);
  
      try {
        const response = await fetch(API_URL, {
          method: "POST",
          body: formData,
          // No 'Content-Type' header needed, browser sets it for FormData with boundary
        });
  
        const result = await response.json();
  
        if (!response.ok) {
          // Use error message from API response if available, otherwise a generic one
          throw new Error(result.error || `En feil oppstod (${response.status})`);
        }
  
        // Success - Hide form and show thank you message
        form.style.display = 'none'; // Hide the form
        // Optional: Hide title too if desired
        // const modalTitle = modalContent.querySelector('h2');
        // if (modalTitle) modalTitle.style.display = 'none';
        showMessage(result.message || "Takk for din søknad! Vi har mottatt den.", "success");
        // Don't reset the form here, as it's hidden
        // form.reset(); 
  
        // Keep the modal open with the success message
        // Optionally close modal after a delay
        // setTimeout(closeModal, 5000); // e.g., close after 5 seconds
  
      } catch (error) {
        console.error("CVMatch Widget Submit Error:", error);
        showMessage(error.message || "Kunne ikke sende søknad. Prøv igjen.", "error");
        // Keep form visible on error
      } finally {
        setLoading(false);
      }
    });
  
    // --- Helper Functions ---
    function closeModal() {
      modalBackdrop.classList.remove("cvmatch-visible");
      clearMessage(); // Clear messages when closing
      form.style.display = 'block'; // *** Ensure form is visible when reopening ***
      // Optional: reset form on close
      // form.reset(); 
    }
  
    function setLoading(isLoading) {
      submitButton.disabled = isLoading;
      submitButton.textContent = isLoading ? "Sender..." : "Send inn";
    }
  
    function showMessage(message, type = "info") {
        // Use textContent for security against XSS if message comes from external source (though unlikely here)
        messageArea.textContent = ''; // Clear previous content
        const messageDiv = document.createElement('div');
        messageDiv.className = `cvmatch-message ${type}`;
        messageDiv.textContent = message;
        messageArea.appendChild(messageDiv);
    }
  
    function clearMessage() {
        messageArea.innerHTML = "";
    }
  
     // Initial check in case the script loads after DOMContentLoaded but before container is ready
     if (!container) {
          console.warn("CVMatch Widget: Container not found immediately, will retry on DOMContentLoaded.");
          document.addEventListener('DOMContentLoaded', initializeWidget);
     } else {
         initializeWidget(); // Initialize if container is already available
     }
  
     function initializeWidget() {
          // Ensure container exists before proceeding
          const currentContainer = document.getElementById(CONTAINER_ID);
          if(!currentContainer) {
              console.error(`CVMatch Widget Error: Container element with id "${CONTAINER_ID}" still not found after DOMContentLoaded.`);
              return;
          }
          // Clear placeholder if it exists
          const placeholder = document.getElementById('widget-placeholder');
          if (placeholder) placeholder.style.display = 'none';
          
          // --- Strengthened Check: Only add button if container doesn't already have one --- 
          if (!currentContainer.querySelector('.cvmatch-apply-button')) {
              console.log("CVMatch Widget: Adding apply button.");
              currentContainer.appendChild(applyButton);
          } else {
              console.log("CVMatch Widget: Apply button already exists in container, not adding again.");
          }
     }
  
  
  })(); // Immediately Invoked Function Expression (IIFE) to avoid polluting global scope
  
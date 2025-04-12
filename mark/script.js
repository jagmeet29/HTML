// Wait for the HTML document to be fully loaded before running the code
document.addEventListener("DOMContentLoaded", () => {
    // Get references to the input textarea and output div elements
    const markdownInput = document.getElementById("markdown-content");
    const htmlOutput = document.getElementById("html-preview");

    // Define function to convert markdown to HTML and update the preview
    function updatePreview() {
        // Get the current text from the markdown input
        const markdownText = markdownInput.value;
        // Convert markdown text to HTML using the marked library
        const htmlContent = marked.parse(markdownText);
        // Sanitize the HTML to prevent XSS attacks using DOMPurify
        const sanitizedHtml = DOMPurify.sanitize(htmlContent);
        // Update the preview div with the sanitized HTML
        htmlOutput.innerHTML = sanitizedHtml;
    }

    // Add event listener to update preview whenever user types or changes input
    markdownInput.addEventListener("input", updatePreview);
    // Call updatePreview once at start to handle any initial content
    updatePreview();
});

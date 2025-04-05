document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("notesContainer");
  const newNoteButton = document.getElementById("newNote");
  const searchInput = document.getElementById("searchInput");

  // Function to create a new note
  function createNote() {
    const note = document.createElement("div");
    note.className = "note";
    note.contentEditable = true;
    note.style.left = "50px";
    note.style.top = "50px";
    canvas.appendChild(note);
  }

  // Add event listener to the new note button
  newNoteButton.addEventListener("click", createNote);

  // Function to search notes
  function searchNotes(query) {
    const notes = document.querySelectorAll(".note");
    notes.forEach((note) => {
      if (note.innerText.toLowerCase().includes(query.toLowerCase())) {
        note.style.display = "block";
      } else {
        note.style.display = "none";
      }
    });
  }

  // Add event listener to the search input
  searchInput.addEventListener("input", (event) => {
    searchNotes(event.target.value);
  });

  // Zooming functionality
  canvas.addEventListener("wheel", (event) => {
    event.preventDefault();
    const scale = Math.exp(event.deltaY * -0.01);
    canvas.style.transform = `scale(${scale})`;
  });

  // Example: Create an initial note
  createNote();
});

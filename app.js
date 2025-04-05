class Note {
  constructor(id, content = "", x = 0, y = 0, width = 300, height = 300) {
    this.id = id;
    this.content = content;
    this.isEditing = true;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }
}

class NotesApp {
  constructor() {
    this.notes = [];
    this.loadNotes();
    this.bindEvents();
    this.draggedNote = null;
    this.dragOffset = { x: 0, y: 0 };
  }

  bindEvents() {
    document
      .getElementById("newNote")
      .addEventListener("click", () => this.createNote());
    document.addEventListener("mouseup", () => (this.draggedNote = null));
    document.addEventListener("mousemove", (e) => this.handleDrag(e));
  }

  loadNotes() {
    const savedNotes = localStorage.getItem("markdown-notes");
    if (savedNotes) {
      this.notes = JSON.parse(savedNotes);
      this.renderNotes();
    }
  }

  saveNotes() {
    localStorage.setItem("markdown-notes", JSON.stringify(this.notes));
    this.renderNotesList();
  }

  createNote() {
    const x = Math.random() * 500;
    const y = Math.random() * 500;
    const note = new Note(Date.now(), "", x, y);
    this.notes.push(note);
    this.renderNote(note);
    this.saveNotes();
  }

  renderNotesList() {
    const notesList = document.getElementById("notesList");
    notesList.innerHTML = "";
    this.notes.forEach((note) => {
      const noteItem = document.createElement("div");
      noteItem.className = "note-item";
      noteItem.innerHTML = `Note ${note.id}`;
      noteItem.onclick = () => this.scrollToNote(note.id);
      notesList.appendChild(noteItem);
    });
  }

  scrollToNote(id) {
    const noteElement = document.getElementById(`note-${id}`);
    if (noteElement) {
      const container = document.querySelector(".main-content");
      const noteRect = noteElement.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      container.scrollTo({
        left:
          noteRect.left +
          container.scrollLeft -
          containerRect.left -
          containerRect.width / 2 +
          noteRect.width / 2,
        top:
          noteRect.top +
          container.scrollTop -
          containerRect.top -
          containerRect.height / 2 +
          noteRect.height / 2,
        behavior: "smooth",
      });

      noteElement.classList.add("note-highlight");
      setTimeout(() => noteElement.classList.remove("note-highlight"), 1000);
    }
  }

  renderNote(note) {
    const container = document.getElementById("notesContainer");
    const noteElement = document.createElement("div");
    noteElement.className = "note";
    noteElement.id = `note-${note.id}`;
    noteElement.style.left = `${note.x}px`;
    noteElement.style.top = `${note.y}px`;
    noteElement.style.width = `${note.width}px`;
    noteElement.style.height = `${note.height}px`;

    if (note.isEditing) {
      noteElement.innerHTML = `
                <textarea class="note-editor" id="editor-${note.id}">${note.content}</textarea>
                <div class="note-controls">
                    <button class="preview-btn" onclick="app.togglePreview(${note.id})">Preview</button>
                    <button class="save-btn" onclick="app.saveNote(${note.id})">Save</button>
                    <button class="delete-btn" onclick="app.deleteNote(${note.id})">Delete</button>
                </div>
            `;
    } else {
      noteElement.innerHTML = `
                <div class="note-preview">${marked.parse(note.content)}</div>
                <div class="note-controls">
                    <button class="preview-btn" onclick="app.togglePreview(${
                      note.id
                    })">Edit</button>
                    <button class="delete-btn" onclick="app.deleteNote(${
                      note.id
                    })">Delete</button>
                </div>
            `;
    }

    if (!document.getElementById(`note-${note.id}`)) {
      container.appendChild(noteElement);
      this.initializeDrag(noteElement, note);

      // Save size when resized
      const resizeObserver = new ResizeObserver((entries) => {
        for (let entry of entries) {
          const note = this.notes.find(
            (n) => n.id === parseInt(entry.target.id.replace("note-", ""))
          );
          if (note) {
            note.width = entry.contentRect.width;
            note.height = entry.contentRect.height;
            this.saveNotes();
          }
        }
      });
      resizeObserver.observe(noteElement);
    } else {
      const oldElement = document.getElementById(`note-${note.id}`);
      oldElement.replaceWith(noteElement);
      this.initializeDrag(noteElement, note);
    }
  }

  togglePreview(id) {
    const note = this.notes.find((n) => n.id === id);
    if (note) {
      note.isEditing = !note.isEditing;
      if (!note.isEditing) {
        note.content = document.getElementById(`editor-${id}`).value;
      }
      this.renderNote(note);
    }
  }

  saveNote(id) {
    const note = this.notes.find((n) => n.id === id);
    if (note) {
      note.content = document.getElementById(`editor-${id}`).value;
      this.saveNotes();
    }
  }

  deleteNote(id) {
    const noteElement = document.getElementById(`note-${id}`);
    noteElement.classList.add("note-remove");
    noteElement.addEventListener("animationend", () => {
      this.notes = this.notes.filter((n) => n.id !== id);
      noteElement.remove();
      this.saveNotes();
    });
  }

  renderNotes() {
    this.notes.forEach((note) => this.renderNote(note));
    this.renderNotesList();
  }

  handleDrag(e) {
    if (this.draggedNote) {
      this.draggedNote.classList.add("dragging");
      const note = this.notes.find(
        (n) => n.id === parseInt(this.draggedNote.id.replace("note-", ""))
      );
      if (note) {
        const newX = e.clientX - this.dragOffset.x;
        const newY = e.clientY - this.dragOffset.y;
        note.x = newX;
        note.y = newY;
        this.draggedNote.style.left = `${newX}px`;
        this.draggedNote.style.top = `${newY}px`;
        this.saveNotes();
      }
    }
  }

  initializeDrag(noteElement, note) {
    const header = document.createElement("div");
    header.className = "note-header";
    header.style.cursor = "move";
    header.style.padding = "5px";
    header.style.marginBottom = "10px";
    header.style.background = "#f5f5f5";
    header.innerHTML = `Note ${note.id}`;

    header.addEventListener("mousedown", (e) => {
      this.draggedNote = noteElement;
      noteElement.classList.add("dragging");
      const rect = noteElement.getBoundingClientRect();
      this.dragOffset = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
      e.preventDefault();
    });

    noteElement.insertBefore(header, noteElement.firstChild);

    document.addEventListener("mouseup", () => {
      if (this.draggedNote) {
        this.draggedNote.classList.remove("dragging");
        this.draggedNote = null;
      }
    });
  }
}

const app = new NotesApp();

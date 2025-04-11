// Initial data structure
const initialData = {
  name: "root",
  children: [
    {
      name: "Multiple Access",
      children: [
        {
          name: "Ranmdom Access",
          children: [
            { name: "Pure ALOHA", value: 5 },
            { name: "Sloted ALOHA", value: 5 },
            { name: "Carrier Sence Multiple Access", value: 5 },
          ],
        },
        { name: "Control Access", value: 10 },
      ],
    },
  ],
};

// Function to get data from localStorage or fall back to initial data
function getData() {
  const savedData = localStorage.getItem("treeData");
  return savedData ? JSON.parse(savedData) : initialData;
}

// Function to save data to localStorage
function saveData(data) {
  localStorage.setItem("treeData", JSON.stringify(data));
}

// Helper function to create new node data with defaults
function createNewNode(name, id) {
  return {
    name: name.trim(),
    id: id,
    value: 5, // Default value that matches other leaf nodes
  };
}

// Export both the data and the helper functions
const data = getData();

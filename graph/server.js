const express = require("express");
const fs = require("fs");
const path = require("path");
const app = express();

app.use(express.json());
app.use(express.static("."));

// Endpoint to save data
app.post("/saveData", (req, res) => {
  const data = req.body;
  const dataString = `const data = ${JSON.stringify(data, null, 2)};`;

  fs.writeFile(path.join(__dirname, "data.js"), dataString, "utf8", (err) => {
    if (err) {
      res.status(500).send("Error saving data");
      return;
    }
    res.send("Data saved successfully");
  });
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});

//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const _ = require("lodash");
const date = require(__dirname + "/date.js");

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// Connect to MongoDB Atlas
// If process.env.MONGODB_URI is not defined, it will fallback to local (or you can set a default string)
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/todolistDB";

mongoose.connect(MONGODB_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch(err => console.error("Could not connect to MongoDB", err));

const itemsSchema = {
  name: String
};

const Item = mongoose.model("Item", itemsSchema);

const listSchema = {
  name: String,
  items: [itemsSchema]
};

const List = mongoose.model("List", listSchema);

const item1 = new Item({
  name: "Buy Food"
});

const item2 = new Item({
  name: "Cook Food"
});

const item3 = new Item({
  name: "Eat Food"
});

const defaultItems = [item1, item2, item3];

app.get("/", async function(req, res) {
  try {
    const foundItems = await Item.find({});
    
    if (foundItems.length === 0) {
      await Item.insertMany(defaultItems);
      console.log("Successfully saved default items to DB.");
      res.redirect("/");
    } else {
      const day = date.getDay();
      res.render("list", { listTitle: day, newListItems: foundItems });
    }
  } catch (err) {
    console.log(err);
  }
});

app.get("/about", function(req, res) {
  res.render("about");
});

app.get("/:customListName", async function(req, res) {
  const customListName = _.capitalize(req.params.customListName);

  try {
    const foundList = await List.findOne({name: customListName});
    
    if (!foundList) {
      // Create a new list
      const list = new List({
        name: customListName,
        items: defaultItems
      });
      await list.save();
      res.redirect("/" + customListName);
    } else {
      // Show an existing list
      res.render("list", {listTitle: foundList.name, newListItems: foundList.items});
    }
  } catch (err) {
    console.log(err);
  }
});

app.post("/", async function(req, res) {
  const itemName = req.body.newItem;
  const listName = req.body.listName;

  const item = new Item({
    name: itemName
  });

  const day = date.getDay();

  // If the listName matches the formatted day, it's the main list
  if (listName === day) {
    await item.save();
    res.redirect("/");
  } else {
    try {
      const foundList = await List.findOne({name: listName});
      if (foundList) {
        foundList.items.push(item);
        await foundList.save();
        res.redirect("/" + listName);
      }
    } catch (err) {
      console.log(err);
    }
  }
});

app.post("/delete", async function(req, res) {
  const checkedItemId = req.body.uid;
  const listName = req.body.listName;

  const day = date.getDay();

  if (listName === day) {
    try {
      await Item.findByIdAndDelete(checkedItemId);
      console.log("Successfully deleted checked item.");
      res.redirect("/");
    } catch (err) {
      console.log(err);
    }
  } else {
    try {
      await List.findOneAndUpdate({name: listName}, {$pull: {items: {_id: checkedItemId}}});
      res.redirect("/" + listName);
    } catch (err) {
      console.log(err);
    }
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, function() {
  console.log("Server started on port", PORT);
});

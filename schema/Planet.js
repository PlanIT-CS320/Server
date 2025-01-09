const mongoose = require('mongoose');
const { userSchema } = require('./User');
const hexRegex = /^#([A-Fa-f0-9]{3}){1,2}([A-Fa-f0-9]{2})?$/; //Regex pattern to valid hex codes
 
const planetSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    validate: {
        validator: v => v.length > 1 && v.length < 20,
        message: "Planet name must be between 1 and 20 characters."
    }
  },
  description: {
    type: String,
    required: true,
    validate: {
        validator: v => v.length > 1 && v.length < 50,
        message: "Description must be between 1 and 50 characters."
    }
  },
  color: {
    type: String,
    required: false,
    default: "#b5b3b3",
    validate: {
      validator: v => hexRegex.test(v) || v == null,
      message: "Planet color must be a valid hex code."
    }
  },
  theme: {
    type: [String],
    required: false,
    default: ["#FF0000", "#FF0000", "#FF0000", "#FF0000", "#FF0000"],
    validate: [
      {
        validator: v => {
          v.forEach(hex => {
            if (!hexRegex.test(hex) && hex != null) { return false; }
          });
          return true;
        },
        message: "All theme colors must be valid hex codes."
      },
      {
        validator: v => v.length == 5,
        message: "Theme must have five colors."
      }
    ],
  },
  createdAt: {
    type: Date,
    default: () => Date.now(),
    immutable: true
  },
  updatedAt: {
    type: Date,
    default: () => Date.now()
  }
  
}, { collection: "planets" }); 
 
module.exports = mongoose.model("Planet", planetSchema); //Entries are added to 'planets' collection
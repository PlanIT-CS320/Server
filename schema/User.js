const mongoose = require('mongoose');
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; //Regex pattern of typical email format
const pfpLinkRegex = /^(https?:\/\/)?(www\.)?dropbox\.com\/(?:s|sh|sc|l)\/[A-Za-z0-9_-]+\/?[A-Za-z0-9_-]*(?:\?dl=\d)?$/;

 
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    index: true,
    validate: {
      validator: v => v.length > 1 && v.length < 10,
      message: "Username must be between 1 and 10 characters"
    }
  },
  email: {
    type: String,
    lowercase: true,
    index: true,
    validate: {
      validator: v => emailPattern.test(v), //Email must be in proper format
      message: "Invalid email"
    }
  },
  fName: {
    type: String,
    required: true,
    validate: {
      validator: v => v.length > 1 && v.length < 20,
      message: "First name must be between 1 and 20 characters"
    }
  },
  lName: {
    type: String,
    required: true,
    validate: {
      validator: v => v.length > 1 && v.length < 20,
      message: "Last name must be between 1 and 20 characters"
    }
  },
  password: {
    type: String,
    required: true
  },
  pfpLink: {
    type: String,
    required: false,
    default: "default.jpg",
  },
  role: {
    type: String,
    default: "user",
    required: true,
    validate: {
      validator: v => {
        const validRoles = ["user", "admin"];
        return validRoles.includes(v);
      },
      message: props => `${props} is not a valid role. Allowed roles are: user, admin`
    }
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
}, { collection: "users" }); //Entries are added to 'users' collection

const User = mongoose.model("users", userSchema);
 
module.exports = mongoose.model("users", userSchema); //Entries are added to 'planets' collection
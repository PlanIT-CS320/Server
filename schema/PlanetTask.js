const mongoose = require('mongoose');
 
const planetTaskSchema = new mongoose.Schema({
    columnId: {
        type: mongoose.Schema.Types.ObjectId, //Object id of column that task belongs to
        required: true
    },
    assignedUserId: {
        type: mongoose.Schema.Types.ObjectId, //Object id of user assigned to task
        default: null,
        required: false,
    },
    content: {
        type: String,
        required: true,
        validate: {
            validator: v => v.length > 1 && v.length < 30,
            message: "Task content must be between 1 and 30 characters."
        }
    },
    description: {
        type: String,
        required: false,
        validate: {
            validator: v => v.length > 1 && v.length < 500,
            message: "Task description must be between 1 and 500 characters."
        }
    },
    priority: {
        type: String,
        required: false,
        validate: {
            validator: v => {
                validNums = ["1", "2", "3", "4"];
                return validNums.includes(v);
            },
            message: "Priority must be an integer 1 through 4."
        }
    },
    order: {
        type: Number,
        required: false,
        default: 1,
        validate: {
            validator: v => v > 0,
            message: "Order must be greater than 0."
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
}, { collection: "planet_tasks" }); 
 
module.exports = mongoose.model("planet_tasks", planetTaskSchema); //Entries are added to 'planet_collaborators' collection
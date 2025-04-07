const mongoose = require("mongoose");

const planetColumnSchema = new mongoose.Schema(
    {
        planetId: {
            type: mongoose.Schema.Types.ObjectId, //Object id of planet that column belongs to
            required: true,
        },
        name: {
            type: String,
            required: true,
            validate: {
                validator: v => v.length > 1 && v.length < 15,
                message: "Column name must be between 1 and 15 characters",
            },
        },
        createdAt: {
            type: Date,
            default: () => Date.now(),
            immutable: true,
        },
        updatedAt: {
            type: Date,
            default: () => Date.now(),
        },
    },
    { collection: "planet_columns" }
);

if ("planet_columns" in mongoose.connection.models) {
    module.exports = mongoose.model("planet_columns");
} else {
    module.exports = mongoose.model("planet_columns", planetColumnSchema); //Entries are added to 'planet_collaborators' collection
}

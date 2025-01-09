const mongoose = require('mongoose');

const planetInviteSchema = new mongoose.Schema({
    planetId: {
        type: mongoose.Schema.Types.ObjectId, //Object id of planet user is being invited to
        required: true
    },
    planetName: {
        type: String,
        required: true
    },
    invitedUserId: {
        type: mongoose.Schema.Types.ObjectId, //Object id of user being invited
        required: true,
    },
    invitingUserEmail: {
        type: String, //Email of user sending invite
        required: true
    },
    message: {
        type: String,
        required: false,
        default: null,
        validate: {
            validator: v => v == null || v.length > 1 && v.length < 25,
            message: "Invite message must be between 1 and 25 characters."
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
}, { collection: "planet_invites" });
 
module.exports = mongoose.model("planet_invites", planetInviteSchema); //Entries are added to 'planet_collaborators' collection
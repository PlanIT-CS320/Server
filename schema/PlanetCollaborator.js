const mongoose = require("mongoose");

//Schema matches a collaborator or owner userId to a planetId
const planetCollaboratorSchema = new mongoose.Schema(
	{
		planetId: {
			type: mongoose.Schema.Types.ObjectId, //Object id of planet
			required: true,
		},
		userId: {
			type: mongoose.Schema.Types.ObjectId, //Object id of planet collaborator
			required: true,
		},
		role: {
			type: String,
			required: true,
			validate: {
				validator: (v) => {
					const validRoles = ["owner", "collaborator"]; //Roles are restricted to owner and collaborator
					return validRoles.includes(v);
				},
				message: (props) =>
					`${props.value} is not a valid role. Allowed roles are: owner, collaborator.`,
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
	{ collection: "planet_collaborators" },
);

if ("planetCollaborators" in mongoose.connection.models) {
	module.exports = mongoose.model("planetCollaborators");
} else {
	module.exports = mongoose.model("planetCollaborators", planetCollaboratorSchema);
}
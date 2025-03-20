const User = require('../schema/User');
const Planet = require('../schema/Planet');
const PlanetCollaborator = require('../schema/PlanetCollaborator');
const PlanetInvite = require('../schema/PlanetInvite');
const secret = process.env.JWT_SECRET;

if (!secret) throw new Error("JWT_SECRET environment variable not set.");
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const saltRounds = 10; //Salt hashed password 10 times
const mongoose = require('mongoose');

/*GET request at /users/:userId
Returns information about user with given id*/
async function getUser(req, res) 
{
    try 
    {
        const { userId } = req.params; // /users/___ <-
        
        //Find user
        const user = await User.findById(userId);
        if (user) 
        {
            //If requested id matches id of token
            if (userId == req.user.userId || req.user.role == "admin")
            {
                const { password, ...userInfo } = user._doc; //Omit password from returned information
                return res.status(200).json({ 
                    message: `Successfully retrieved user data.`, 
                    user: userInfo
                });
            }
            return res.status(403).json({ 
                message: `You do not have permission to access this user's data.`
            });
        }
        //User does not exist
        return res.status(404).json({
             message: `Cannot retrieve information of non-existent user.` 
        });

    } catch (error) {
        console.error(error.message);
        res.status(500).json({ 
            message: 'Internal server error. Contact support or try again later.' 
        });
    }
}

//GET request on /user/:userId/planets
//Returns all planets where user with given id is a collaborator
async function getPlanets(req, res)
{
    try 
    {
        const { userId } = req.params; // /user/___<-/planets

        //Find user
        const user = await User.findById(userId);
        if (user)
        {
            //If requested id matches id of token
            if (userId == req.user.userId || req.user.role == "admin") 
            {
                //Find all planets user is the owner of
                const planetOwnerMatches = await PlanetCollaborator.find({ userId, role: "owner" });
                const ownedPlanets = [];
                if (planetOwnerMatches.length)
                {
                    for (i = 0; i < planetOwnerMatches.length; i++)
                    {
                        ownedPlanet = await Planet.findOne({ _id: planetOwnerMatches[i].planetId });
                        if (ownedPlanet)
                        {
                            ownedPlanets.push(ownedPlanet);
                        }
                    }
                }
                //Find all planets user is a collaborator of
                const planetCollaboratorMatches = await PlanetCollaborator.find({ userId, role: "collaborator" });
                const collaboratedPlanets = [];
                if (planetCollaboratorMatches.length)
                {
                    for (i = 0; i < planetCollaboratorMatches.length; i++)
                    {
                        collaboratedPlanet = await Planet.findOne({ _id: planetCollaboratorMatches[i].planetId });
                        if (collaboratedPlanet)
                        {
                            collaboratedPlanets.push(collaboratedPlanet);
                        }
                    }
                }

                //If user has at least 1 planet, either owned or collaborated
                if (ownedPlanets.length || collaboratedPlanets.length)
                {
                    return res.status(200).json({ 
                        message: `Successfully retrieved user's planets.`, 
                        ownedPlanets, 
                        collaboratedPlanets
                    });
                }
                //User has no planets
                return res.status(200).json({ 
                    message: `User has no planets.`,
                    ownedPlanets,
                    collaboratedPlanets
                });
            }
            //Request id does not match id of token
            return res.status(403).json({ 
                message: `You do not have permission to access this user's planets.`
            });
        }
        //User does not exist
        return res.status(404).json({
            message: "Cannot retrieve planets for non-existent user."
        });
    } catch (error) {
        res.status(500).json({ 
            message: "Server error. Contact support or try again later." 
        });
    }
}

//GET request for /users/:userId/invites
async function getInvites(req, res)
{
    try
    {
        const { userId } = req.params;

        //Check if user exists
        const user = await User.exists({ _id: userId });
        if (user)
        {
            //If requested id matches id of token
            if (userId == req.user.userId || req.user.role == "admin")
            {
                //Find invites
                const invites = await PlanetInvite.find({ invitedUserId: userId });
                if (invites)
                {
                    return res.status(200).json({
                        message: "Successfully retrieved invites.",
                        invites
                    });
                }
                return res.status(200).json({
                    message: "No invites found.",
                    invites
                });
            }
            //Requested id does not match id of token
            return res.status(403).json({
                message: "You do not have permission to access this user's invites."
            });
        }
        //User not found
        return res.status(404).json({
            message: "Cannot retreive invites for non-existent user."
        });
    } catch (error) {
        res.status(500).json({ 
            message: "Server error. Contact support or try again later." 
        });
    }
}

//POST request for /users/invites/:inviteId/accept
async function acceptInvite(req, res)
{
    try
    {
        const { inviteId } = req.params;

        //Find invite
        const invite = await PlanetInvite.findById(inviteId);
        if (invite)
        {
            //If id of token is the invited user
            if (invite.invitedUserId == req.user.userId || req.user.role == "admin")
            {
                //Find planet
                const planet = await Planet.findById(invite.planetId);
                if (planet)
                {
                    const user = await User.findById(invite.invitedUserId);
                    if (user)
                    {
                        const newPlanetCollaborator = new PlanetCollaborator({
                            planetId: invite.planetId,
                            userId: invite.invitedUserId,
                            role: "collaborator"
                        });
                        try {
                            await newPlanetCollaborator.save();
                        } catch (error) 
                        {
                            console.error(error.message);
                            await PlanetCollaborator.deleteOne({ _id: newPlanetCollaborator._id }); //Delete any unintentionally saved documents
    
                            return res.status(500).json({ 
                                message: "Internal server error. Contact support or try again later." 
                            });
                        }
    
                        //New collaborator saved without fail
                        await PlanetInvite.deleteOne({ _id: invite._id });
                        return res.status(200).json({
                            message: "Invited accepted successfully."
                        });
                    }
                    //User not found
                    const orphanedInvites = await PlanetInvite.find({ invitedUserId: invite.invitedUserId }).select('_id');
                    console.log("Orphaned data of type planet_invite found: " + orphanedInvites);
                    return res.status(404).json({
                        message: "User has been deleted."
                    });
                }
                //Planet not found
                const orphanedInvites = await PlanetInvite.find({ planetId: invite.planetId }).select('_id');
                console.log("Orphaned data of type planet_invite found: " + orphanedInvites);
                return res.status(404).json({
                    message: "Planet has been deleted."
                });
            }
            //Id of token is not invited user
            return res.status(403).json({
                message: "You do not have permission to accept this invite."
            });
        }
        //Invite not found
        return res.status(404).json({
            message: "Cannot accept non-existent invite."
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ 
            message: "Server error. Contact support or try again later." 
        }); 
    }
}

//POST request on /users/invites/:inviteId/decline
//Deletes an invite given its id
async function declineInvite(req, res)
{
    try
    {
        const { inviteId } = req.params;

        //Find invite
        const invite = await PlanetInvite.findById(inviteId);
        if (invite)
        {
            //If id of token is the invited user
            if (invite.invitedUserId == req.user.userId || req.user.role == "admin")
            {
                //Find planet
                const planet = await Planet.findById(invite.planetId);
                if (planet)
                {
                    const user = await User.findById(invite.invitedUserId);
                    if (user)
                    {
                        //Delete (decline) invite
                        await PlanetInvite.deleteOne({ _id: invite._id });
                        return res.status(200).json({
                            message: "Invited declined successfully."
                        });
                    }
                    //User not found
                    const orphanedInvites = await PlanetInvite.find({ invitedUserId: invite.invitedUserId }).select('_id');
                    console.log("Orphaned data of type planet_invite found: " + orphanedInvites);
                    return res.status(404).json({
                        message: "User has been deleted."
                    });
                }
                //Planet not found
                const orphanedInvites = await PlanetInvite.find({ planetId: invite.planetId }).select('_id');
                console.log("Orphaned data of type planet_invite found: " + orphanedInvites);
                return res.status(404).json({
                    message: "Planet has been deleted."
                });
            }
            //Id of token is not invited user
            return res.status(403).json({
                message: "You do not have permission to accept this invite."
            });
        }
        //Invite not found
        return res.status(404).json({
            message: "Cannot accept non-existent invite."
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ 
            message: "Server error. Contact support or try again later." 
        }); 
    }
}

//PUT request for /users/:userId
//Updates a user with given information
async function updateUser(req, res)
{
    try
    {
        const { userId } = req.params;

        //Find user
        const user = await User.findById(userId);
        if (user)
        {
            //If id of token matches requested user
            if (userId == req.user.userId)
            {
                const passedFields = Object.keys(req.body);
                const validFields = Object.keys(User.schema.paths);
                const filteredFields = passedFields.filter(field => validFields.includes(field));

                if (filteredFields.includes("password"))
                {
                    //Hash new password
                    const salt = await bcrypt.genSalt(saltRounds);
                    const hash = await bcrypt.hash(req.body.password, salt);
                    user.password = hash;
                    filteredFields.splice(filteredFields.indexOf("password"), 1); //Remove password field
                }

                filteredFields.forEach(field => {
                    if (req.body[field] != undefined) {
                        user[field] = req.body[field];
                    }
                });

                try {
                    await user.save();
                } catch (error) 
                {
                    console.error(error.message);

                    //Mongoose schema validation error
                    if (error instanceof mongoose.Error.ValidationError) 
                    {
                        return res.status(400).json({
                            message: error.message
                        });
                    }
                    //Other error
                    return res.status(500).json({ 
                        message: "Internal server error. Contact support or try again later." 
                    });
                }

                //User saved without error
                return res.status(200).json({
                    message: "User updated successfully."
                });
            }
            //Id of token does not match requested user
            return res.status(403).json({
                message: "You do not have permission to edit this user."
            });
        }
        //User not found
        return res.status(404).json({
            message: "Cannot edit non-existent user."
        });
    } 
    catch (error) {
        console.error(error);
        res.status(500).json({ 
            message: "Server error. Contact support or try again later." 
        }); 
    }
}

module.exports = {
    getUser,
    getPlanets,
    getInvites,
    acceptInvite,
    declineInvite,
    updateUser,
}
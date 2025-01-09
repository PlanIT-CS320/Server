const User = require('../schema/User');
const secret = 'your_jwt_secret'; 
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const saltRounds = 10; //Salt hashed password 10 times
const mongoose = require('mongoose');

/*POST request at /auth/login
Compares email to password and determines if login is valid*/
async function validateLogin(req, res) 
{
    const { email, password } = req.body;

    try 
    {
        //Find users with email or email as username
        const users = await User.find({
            $or: [
                { email },
                { username: email }
            ]
        });
        if (users) 
        {
            for (let i = 0; i < users.length; i++)
            {
                const user = users[i];
                const passwordMatch = await bcrypt.compare(password, user.password);

                //Check each account for password match
                if (passwordMatch) 
                {
                    //Successful login, generate JWT
                    const token = jwt.sign({ userId: user._id, userEmail: user.email, role: user.role }, secret, { expiresIn: '15m' });
                    console.log(`Successful login for account ${email}.`);
                    return res.status(200).json({
                        token, 
                        message: "Successful login." 
                    });
                } 
                //Password does not match
                console.log(`Unsuccessful login for account ${email}.`);
                return res.status(401).json({
                        message: "Incorrect password." 
                });
            }
        } 
        //Email does not exist
        console.log(`Unsuccessful login for non-existing account ${email}.`);
        return res.status(404).json({
            message: "Email/username not found."
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ 
            message: "Internal server error. Contact support or try again later."
        });
    }
}

/*POST request on /auth/register
Adds new user to database if provided information meets criteria*/
async function registerUser(req, res)
{
    const { firstName, lastName, username, email, password } = req.body;

    try {
        //Check for existing email and username
        existingEmail = await User.exists({ email });
        existingUsername = await User.exists({ username });
        if (existingEmail) {    //Email taken
            return res.status(409).json({
                 message: `Email ${email} is taken.` 
            });
        } 
        else if (existingUsername) {    //Username taken
            return res.status(409).json({ 
                message: `Username ${username} is taken.` 
            });
        }

        //Hash password and create new user
        const salt = await bcrypt.genSalt(saltRounds);
        const hash = await bcrypt.hash(password, salt);
        const newUser = new User({ fName: firstName, lName: lastName, 
                                username: username, email: email, password: hash});
        
        try {
            await newUser.save();
        }
        catch (error) 
        {
            console.error(error.message);
            await User.deleteOne({ _id: newUser._id }); //Delete any unintentionally saved documents

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

        //User created successfully, send token
        const token = jwt.sign(
            {
                userId: newUser._id, 
                userEmail: newUser.email, 
                role: newUser.role 
            }, secret, { expiresIn: '15m' });
        return res.status(201).json({ 
            token, 
            message: "User created successfully." 
        });
    } 
    catch(error) {
        console.error(error.message);
        res.status(500).json({ 
            message: "Internal servor error. Contact support or try again later." 
        });
    }
}

module.exports = {
    validateLogin,
    registerUser
}
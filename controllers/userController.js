const { uploadFileToFirebase , bucket} = require('../utils/fireBase');
const bcryptjs = require("bcryptjs")
const sendOTPEmail = require("../utils/mailSent");
const dotenv = require("dotenv");
dotenv.config();
const jwt = require("jsonwebtoken");
const { Lead } = require("../model/leadModel");
const { User } = require('../model/userModel');
 

// Generate OTP
function generateOtp() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}




///////////////////////////////////////////////////////// Admin & User Login ////////////////////////////////////////////////////////////////////


const login = async (req, res) => {
  try {
     const { email, password } = req.body;
  
    if (!email || !password) {
      return res.status(400).json({ message: "Please provide email and password!." });
    }

    // Find user by email (case-insensitive) and populate roles
    const user = await User.findOne({ email: email.toLowerCase() }).populate("roles");

    if (!user) {
      return res.status(400).json({ message: "Invalid login credentials!" });
    }

    // Check if the password matches
    const isPasswordMatch = await bcryptjs.compare(password, user.password);
    if (!isPasswordMatch) {
      return res.status(400).json({ message: "Invalid login credentials!" });
    }
    // Generate JWT token with essential user data
    const token = jwt.sign(
      { 
        _id: user._id, 
        name: user.name,
        email: user.email,
        roles: user.roles,
        image: user.image,
      },
      process.env.SECRET_KEY,
      { expiresIn: '10h' } // Token expires in 10 hours
    );

    return res.status(200).json({
      message: 'Login Successfully!',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        roles: user.roles,
        image: user.image,
      },
    });
  } catch (err) {
    console.error('Internal server error:', err.message);
    return res.status(500).json({ message: "Internal server error", error: err.message });
  }
};

 



//////////////////////////////////////////////////////////// reset password all process ////////////////////////////////////////////////////////////////////

// send otp in mail
const sendOtpEmail =  async (req, res) => {
  const { email } = req.body;
// console.log(req.body)
 if (!email) {
   return res.status(400).json("Email is required!");
 }
 try {
   const user = await User.findOne({ email: email.toLowerCase() });
   if (!user) return res.status(400).json("User not found!");
   
   const otp = generateOtp();
//  console.log(otp)
   user.currentOtp = otp;
   await user.save();

   // Send OTP email
   sendOTPEmail(user.email, otp);
console.log(otp)
   res.status(200).json({message:"OTP sent to email successfully!"});
 } catch (error) {
   console.error("Internal server error:", error.message);
   return res.status(500).json("Internal server error:", error.message);
  }
}

// ================================================================================================
// ================================================================================================
// verify otp
const verifyOtp = async (req, res) => {
const { email, currentOtp } = req.body;
console.log(req.body)
if (!email || !currentOtp) {
return res.status(400).json({ message: 'Email and OTP are required' });
}

try {
// Find user by email and OTP
const user = await User.findOne({ email: email.toLowerCase(), currentOtp });

if (!user) {
  return res.status(404).json({ message: 'user not found or invalid OTP' });
}


user.currentOtp   // Clear OTP after verification
await user.save();

res.status(200).json({
  message: 'OTP Verified Successfully!',
});
} catch (error) {
logger.error(`Error managing encryption keys: ${error.message}`);
res.status(500).json({ message: 'Internal server error' });
}
}

// ================================================================================================
// ================================================================================================
// change password inter new password
const resetPassword = async (req, res) => {
  const { email, currentOtp, newPassword } = req.body;
  console.log(req.body)
  if (!email || !currentOtp || !newPassword) {
    return res.status(400).json("Email, OTP, and new password are required.");
  }
  
  try {
    let user = await User.findOne({ email, currentOtp });
  
    if (!user) {
      return res.status(404).json("Invalid OTP or user not found.");
    }
  
  
  
    const hashNewPassword = await bcryptjs.hash(newPassword, 10);
    user.password = hashNewPassword;
    user.currentOtp = null; // Clear OTP after reset
   
    await user.save();
  
    res.status(200).json("Your password changed successfully.");
  } catch (error) {
    console.error(`Error managing encryption keys: ${error.message}`);
    return res.status(500).json("Internal server error:", error.message);
  }
  }

//////////////////////////////////////////////////////////// create new user ////////////////////////////////////////////////////////////////////


// ================================================================================================
// ================================================================================================
const userPost = async (req, res) => {
  try {
    const { email, password, roles, ...userData } = req.body;

    // Validate required fields
    if (!email || !password || !roles) {
      return res.status(400).json({ message: "Email, Password, and Role are required to create a user." });
    }

    // Check if the user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ message: "User already exists." });
    }

    let imageUrl = "";

    // Handle single file upload for image
    if (req.files && req.files.image) {
      const uploadedImage = await uploadFileToFirebase(req.files.image);
      if (uploadedImage && uploadedImage.length > 0) {
        imageUrl = uploadedImage[0];
      }
    }

    // Hash the password
    const hashedPassword = await bcryptjs.hash(password, 10);

    // Generate a unique userId based on role
    // const userId = await getNextSequenceValue(roles);

    // Create a new user object
    const newUser = new User({
      // userId,
      ...userData,
      email: email.toLowerCase(),
      password: hashedPassword,
      roles,
      image: imageUrl,
    });

    // Save user to database
    const savedUser = await newUser.save();

    res.status(200).json({
      message: `${roles} Created Successfully!`,
      user: savedUser,
    });
  } catch (error) {
    console.error("Error creating user:", error.message);
    res.status(500).json({ message: `Internal server error: ${error.message}` });
  }
};




const getAllUser = async (req, res) => {
  try {
    // Ensure `req.user` exists before destructuring
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized: Please log in again." });
    }

    const { roles, id } = req.user; // Use `id` instead of `_id`
    const { page, limit } = req.query;

    if (!id) {
      return res.status(400).json({ message: "User ID not found. Please log in again." });
    }

    let query = {};
    
    if (roles.includes("Admin")) {
      query = {}; // Admin can see all users
    } else if (roles.includes("Manager")) {
      query = { assignedBy: id }; // Manager can see assigned employees
    } else if (roles.includes("Employee")) {
      query = { _id: id }; // Employee can only see themselves
    } else {
      return res.status(403).json({ message: "Access denied: Insufficient permissions." });
    }

    const pageNum = parseInt(page) || 1;
    const perPage = parseInt(limit) || 10;
    const skip = (pageNum - 1) * perPage;

    const users = await User.find(query) 
    .populate({
      path: "assigned"
  })
      .sort({ _id: -1 })
      .skip(skip)
      .limit(perPage)
      .lean();

    const totalUsers = await User.countDocuments(query);
    const totalPages = Math.ceil(totalUsers / perPage);

    return res.status(200).json({
      message: "Users fetched successfully!",
      data: users,
      totalUsers,
      pagination: {
        totalUsers,
        totalPages,
        currentPage: pageNum,
        perPage: perPage,
      },
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return res.status(500).json({ message: `Internal server error: ${error.message}` });
  }
};

//////////////////////////////////////////////////////////// GET SINGLE USER WITH LEAD RESTRICTION //////////////////////////////////////////////////

const getUser = async (req, res) => {
  try {
      const { _id } = req.query;

      const user = await User.findOne({ _id })
          .populate({
              path: "assigned"
          })
          .lean();

      if (!user) {
          return res.status(404).json({ message: "User not found." });
      }

      return res.status(200).json({ user });

  } catch (error) {
      console.error("Error fetching user:", error);
      return res.status(500).json({ message: `Internal server error: ${error.message}` });
  }
};


 


//////////////////////////////////////////////////////////// update user ////////////////////////////////////////////////////////////////////


const updatedUser = async (req, res) => {
  try {
    const { _id, password, ...updateFields } = req.body;

    // Validate user ID
    if (!_id) {
      return res.status(400).json({ message: "User ID is required for updating." });
    }

 
    let newImgUrl = "";

    // Find existing user first
    const existingUser = await User.findById(_id);
    if (!existingUser) {
      return res.status(404).json({ message: "User not found." });
    }

    
    // Handle single image upload (replace only if a new image is uploaded)
    if (req.files?.image) {
      const uploadedImages = await uploadFileToFirebase(req.files.image);
      newImgUrl = uploadedImages[0];
      updateFields.image = newImgUrl; // Replace with new image
    }

    // Hash new password if provided
    if (password) {
      updateFields.password = await bcryptjs.hash(password, 10);
    }

    // Update user in the database with `$set` and `$push`
    const updatedUser = await User.findByIdAndUpdate(
      _id,
      {
        $set: updateFields, // Update only changed fields
        ...(updateFields.$push ? { $push: updateFields.$push } : {}), // Append new files without replacing old ones
      },
      { new: true } // Return the updated document
    ) 

    if (!updatedUser) {
      return res.status(500).json({ message: "Error updating user data." });
    }

    return res.status(200).json({
      message: `${updatedUser.name} Updated Successfully!`,
      updatedUser,
    });
  } catch (error) {
    console.error("Error updating user:", error);
    return res.status(500).json({ message: `Internal server error: ${error.message}` });
  }
};




 
module.exports = {
    login , resetPassword , verifyOtp, sendOtpEmail ,userPost 
    ,getAllUser, getUser , updatedUser   
}
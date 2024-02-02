import { asyncHandle } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloud } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

//to generate access and refresh token

const generateAccessAndRefereshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating referesh and access token",
      error
    );
  }
};

const registerUser = asyncHandle(async (req, res) => {
  //get users details from frontend
  const { userName, email, password, fullName } = req.body;

  //check for validation--- if some feilds are empty throw the error
  if (
    [userName, email, password, fullName].some((feild) => feild?.trim() === "")
  ) {
    throw new ApiError(400, "All feilds are required");
  }

  //check weather user already exist or not //database call
  const exitedUser = await User.findOne({
    $or: [{ userName }], // if there is username or email in the database
  });
  if (exitedUser) {
    throw new ApiError(408, " username already taken");
  }

  //to check the cover image and avatar Image
  const avatarLocalpath = req.files?.avatar[0]?.path;
  // const imageLocalpath = req.files?.coverImage?.path;

  let imageLocalpath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    imageLocalpath = req.files.coverImage[0].path;
  }

  if (!avatarLocalpath) {
    throw new ApiError(408, "Avatar not found");
  }

  //upload avatar and cover Image to cloudinary
  const avatar = await uploadOnCloud(avatarLocalpath);
  const coverImage = await uploadOnCloud(imageLocalpath);

  //check weather avatar is uploaded to database or not\
  if (!avatar) {
    throw new ApiError(408, "Failed to upload avatar image to database");
  }

  //Upload the user to database
  const user = await User.create({
    email,
    password,
    userName: userName.toLowerCase(),
    fullName,
    avatar: avatar.url, // upload the url of cloudinary where the image is stored
    coverImage: coverImage?.url || "", // cover image can be empty
  });

  //remove password and refresh token from database
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  //if there is error in registraring the user
  if (!createdUser) {
    throw new ApiError(500, "SomeThing went wrong while registraing the user");
  }

  //sending the resposnse
  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User Registered Successfully"));
});

// //login user
const loginUser = asyncHandle(async (req, res) => {
  //take username, email and password fron the frontend
  const { userName, password, email } = req.body;

  // if username or password are not fullfilled
  if (!userName) {
    throw new ApiError(400, "Username  required");
  }

  //find the user in database with same username or email
  const user = await User.findOne({
    $or: [{ userName }, { email }],
  });

  //if user is not registered in database
  if (!user) {
    throw new ApiError(400, "User Not found");
  }

  //compare password with method generated in model page
  const passswordValid = await user.isPasswordCorrect(password);
  if (!passswordValid) {
    throw new ApiError(400, "Password Incorrect");
  }

  //accessing refresh and access token for the user who is going to login
  const { refreshToken, accessToken } = await generateAccessAndRefereshTokens(
    user._id
  );

  //don't return password and refresh tokem to the user
  const loggedUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  //giving refresh token and access token to cookies
  const options = {
    httpOnly: true,
    secure: true,
  };

  //returning response with tokens // setting cookies while returning response
  //set cookies as refresh token and access token
  return res
    .status(200)
    .cookie("refreshToken", refreshToken, options)
    .cookie("accessToken", accessToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedUser,
          accessToken,
          refreshToken,
        },
        "user Logged Successfully"
      )
    );
});

//logout user
const logoutUser = asyncHandle(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id, // this came from auth middleware
    {
      $set: {
        refreshToken: undefined, //logout the user
      },
    },
    {
      new: true, //return modified document after update
    }
  );
  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User Logout successfully"));
});

const refreshAccessToken = asyncHandle(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "unauthorized request");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, newRefreshToken } =
      await generateAccessAndRefereshTokens(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access token refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

//to change the password
const changeCurrentPassword = asyncHandle(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const user = await User.findById(req.user?._id);

  const passwordConform = await user.isPasswordCorrect(oldPassword); // check if old password correct or not
  if (!passwordConform) {
    throw new ApiError(400, "Password is incorrect");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed suceesfully"));
});

//to get current user
const getCurrentUser = asyncHandle(async (req, res) => {
  return res.status(200).json(200, req.user, "User Feteched Successfully");
});

// update details
const updateUserDetails = asyncHandle(async (req, res) => {
  const { fullName, email } = req.body;

  if (!(fullName || email)) {
    throw new ApiError(400, "All feilds are required");
  }

  const user = await User.findByIdAndDelete(
    req.user?._id,
    {
      $set: {
        fullName,
        email,
      },
    },
    {
      new: true,
    }
  );

  return res.status(200).json(new ApiResponse(200, user, "Feilds updated"));
});

//update Avatar
const updateAvatar = asyncHandle(async (req, res) => {
  const avatarLocalPath = req.files?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, " Avatar file is missing");
  }

  const avatar = uploadOnCloud(avatarLocalPath);

  if (!avatar.url) {
    throw new ApiError("Error while uploading avatar");
  }

  const user = await User.findByIdAndDelete(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    {
      new: true,
    }
  ).select("-password");
  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar Updated Successfully"));
});

//update Cover Image
const updateCoverImage = asyncHandle(async (req, res) => {
  const coverImageLocalPath = req.files?.path;

  if (!coverImageLocalPath) {
    throw new ApiError(400, " cover Image file is missing");
  }

  const coverImage = uploadOnCloud(coverImageLocalPath);

  if (!coverImage.url) {
    throw new ApiError("Error while uploading Cover Image");
  }

  const user = await User.findByIdAndDelete(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    {
      new: true,
    }
  ).select("-password");
  return res
    .status(200)
    .json(new ApiResponse(200, user, "Cover Image Updated Successfully"));
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateUserDetails,
  updateAvatar,
  updateCoverImage,
};

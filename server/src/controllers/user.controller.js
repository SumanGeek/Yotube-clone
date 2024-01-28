import { asyncHandle } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloud } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

//to generate access and refresh token

const generateAccessAndrefreshToken = async (userId) => {
  try {
    // find the user on database on basis of userID
    const user = await User.findById(userId);

    //new access and refresh token generated on the basis of user
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    user.save({
      validateBeforeSave: false,
    });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, " Something went wrong ", error);
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

  //check weather user already exist or not
  const exitedUser = await User.findOne({
    $or: [{ userName }, { email }], // if there is username or email in the database
  });
  if (exitedUser) {
    throw new ApiError(408, "Email or username already taken");
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

//login user
const loginUser = asyncHandle(async (req, res) => {
  //take username, email and password fron the frontend
  const { userName, email, password } = req.body;

  // if username or password are not fullfilled
  if (!userName || !email) {
    throw ApiError(400, "Username or password required");
  }

  //find the user in database with same username or email
  const userLogin = await User.findOne({
    $or: [{ userName }, { email }],
  });

  //if user is not registered in database
  if (!userLogin) {
    throw ApiError(400, "User Not found");
  }

  //compare password with method generated in model page
  const passswordValid = await userLogin.isPasswordCorrect(password);
  if (!passswordValid) {
    throw ApiError(400, "Password Incorrect");
  }

  //accessing refresh and access token for the user who is going to login
  const { refreshToken, accessToken } = await generateAccessAndrefreshToken(
    userLogin._id
  );

  //don't return password and refresh tokem to the user
  const loggedUser = await User.findById(userLogin._id).select(
    "-password -refreshToken"
  );

  //giving refresh token and access token to cookies
  const options = {
    httpOnly: true,
    secure: true,
  };

  //returning response with tokens // setting cookies while returning response
  return res
    .status(200)
    .cookies("refreshToken", refreshToken, options)
    .cookies("accessToken", accessToken, options)
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
export { registerUser, loginUser };

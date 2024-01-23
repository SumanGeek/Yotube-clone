import { asyncHandle } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloud } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
const registerUser = asyncHandle(async (req, res) => {
  //get users details from frontend
  const { name, email, password, fullName } = req.body;

  //check for validation
  if (
    [userName, email, password, fullName].some((feild) => feild?.trim() === "")
  ) {
    throw new ApiError(400, "All feilds are required");
  }

  //check weather user already exist or not
  const exitedUser = User.findOne({
    $or: [{ userName }, { email }], // if there is username or email in the database
  });
  if (exitedUser) {
    throw new ApiError(408, "Email or username already taken");
  }

  //to check the cover image and avatar Image
  const avatarLocalpath = req.files?.avatar[0]?.path;
  const imageLocalpath = req.files?.coverImage[0]?.path;

  if (!avatarLocalpath) {
    throw new ApiError(408, "Avatar not found");
  }

  //upload avatar and cover Image to cloudinary
  const avatarUpload = await uploadOnCloud(avatarLocalpath);
  const imageUpload = await uploadOnCloud(imageLocalpath);

  //check weather avatar is uploaded to database or not\
  if (!avatarUpload) {
    throw new ApiError(408, "Failed to upload avatar image to database");
  }

  //Upload the user to database
  const user = await User.create({
    email,
    password,
    userName: userName.toLowerCase(),
    fullName,
    avatarUpload: avatarUpload.url, // upload the url of cloudinary where the image is stored
    imageLocalpath: imageUpload?.url || "",
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
export { registerUser };

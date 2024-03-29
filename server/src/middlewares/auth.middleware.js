import { ApiError } from "../utils/ApiError.js";
import { asyncHandle } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
export const verifyJWT = asyncHandle(async (req, _, next) => {
  try {  
    //trying to access cookies of the user that are already loggedIn
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    // console.log(token);
    if (!token) {
      throw new ApiError(401, "Unauthorized request");
    }

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    const user = await User.findById(decodedToken?._id).select(
      "-password -refreshToken"
    );

    if (!user) {
      throw new ApiError(401, "Invalid Access Token");
    }

    req.user = user;  // req.user has all the information abt user who is loggegdin
    next();
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid access token");
  }
});

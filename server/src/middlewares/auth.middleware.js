import { ApiError } from "../utils/ApiError";
import { asyncHandle } from "../utils/asyncHandler";
import jwt from "jsonwebtoken";

export const verifyJWT = asyncHandle(async (req, res, next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization").replace("Bearer", "");
  
    if (!token) {
      throw new ApiError(500, "token failed to generate");
    }
  
    //generated access token
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
  } catch (error) {
    
  }
});

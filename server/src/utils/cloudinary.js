import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: "drqxwkcn8",
  api_key: "562419282666795",
  api_secret: "MuVl5PBRmMkBSzti-anXsunsX7s",
});

//upload the file in cloudinary

const uploadOnCloud = async (fileName) => {
  try {
    if (!fileName) return null;
    //upload file
    const response = await cloudinary.uploader.upload(fileName, {
      resource_type: "auto",
    });
    //after upload has been done sucessfully
    // console.log("file has been uploaded sucessfully", response.url);
    fs.unlinkSync(fileName);
    return response;
  } catch (error) {
    fs.unlinkSync(fileName);
    //remove the locally saved file as file uploading process has some issue
    return null;
  }
};

export { uploadOnCloud };

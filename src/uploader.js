import multer from "multer";
import path from "path";

const storage = multer.diskStorage({
  destination: "public/uploads",
  filename: function (req, file, cb) {
    cb(null, req.session.userId + path.extname(file.originalname));
  }
});

export const uploader = multer({ storage: storage });

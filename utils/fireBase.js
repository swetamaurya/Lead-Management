const admin = require('firebase-admin');
const dotenv = require("dotenv");

dotenv.config();

// Use FIREBASE_SERVICE_ACCOUNT from the environment
let serviceAccount;
try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} catch (error) {
    console.error("Error parsing FIREBASE_SERVICE_ACCOUNT:", error.message);
    throw new Error("Invalid FIREBASE_SERVICE_ACCOUNT environment variable.");
}

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: 'fir-project-8d315.appspot.com', // Specify your bucket name
});

const bucket = admin.storage().bucket();

 
const uploadFileToFirebase = async (file) => {
    try {
      // Ensure file is always treated as an array
      file = Array.isArray(file) ? file : [file];
  
      const fileUrls = [];
  
      for (const singleFile of file) {
        const docId = Math.floor(Math.random() * 900000000) + 100000000;
        const fileType = singleFile.originalname.split('.').pop(); // Get file type
        const fileRef = bucket.file(`${docId}.${fileType}`); // Create reference in Firebase
        const options = {
          metadata: { contentType: singleFile.mimetype }, // Set content type
          resumable: false,
        };
  
        const uploadedUrl = await new Promise((resolve, reject) => {
          const writable = fileRef.createWriteStream(options);
  
          writable.on('finish', async () => {
            try {
              const [fileUrl] = await fileRef.getSignedUrl({
                action: 'read',
                expires: '03-09-2491', // Set expiration date for the file
              });
              resolve(fileUrl); // Return the signed URL
            } catch (error) {
              reject(error);
            }
          });
  
          writable.on('error', (error) => reject(error)); // Handle errors
          writable.end(singleFile.buffer); // Write the file to Firebase
        });
  
        fileUrls.push(uploadedUrl); // Collect the file URL
      }
  
      return fileUrls; // Return all file URLs
    } catch (error) {
      console.error("Error uploading file to Firebase:", error.message);
      throw new Error(`Error uploading file: ${error.message}`);
    }
  };
  
  
module.exports = { uploadFileToFirebase, bucket };

export const uploadToCloudinary = (fileUri, onProgress) => {
  return new Promise((resolve, reject) => {
    const data = new FormData();

    // Extract extension
    const ext = fileUri.split('.').pop().toLowerCase();

    let fileType;
    let resourceType;
    let fileName;

    // Detect type by extension
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
      fileType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
      resourceType = 'image';
      fileName = `upload.${ext}`;
    } else if (['mp3', 'wav', 'aac', 'ogg', 'm4a'].includes(ext)) {
      fileType = `audio/${ext}`;
      resourceType = 'video'; // Cloudinary treats audio as 'video'
      fileName = `upload.${ext}`;
    } else if (ext === 'pdf') {
      fileType = 'application/pdf';
      resourceType = 'raw'; // PDFs and other docs use 'raw'
      fileName = 'upload.pdf';
    } else {
      fileType = 'application/octet-stream';
      resourceType = 'raw';
      fileName = `upload.${ext || 'bin'}`;
    }

    // Ensure correct URI format for iOS
    const uri = fileUri.startsWith('file://') ? fileUri : `file://${fileUri}`;

    data.append('file', {
      uri,
      type: fileType,
      name: fileName,
    });

    // Add your unsigned upload preset
    data.append('upload_preset', 'shinto');

    const cloudUrl = `https://api.cloudinary.com/v1_1/dizilnbsh/${resourceType}/upload`;

    const xhr = new XMLHttpRequest();
    xhr.open('POST', cloudUrl);

    // Progress tracking
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const percentComplete = Math.round((event.loaded * 100) / event.total);
        onProgress(percentComplete);
      }
    };

    xhr.onload = () => {
      if (xhr.status === 200) {
        try {
          const response = JSON.parse(xhr.responseText);
          if (response.secure_url) {
            resolve(response.secure_url);
          } else {
            reject(new Error('No secure_url in Cloudinary response'));
          }
        } catch (err) {
          reject(new Error('Invalid JSON from Cloudinary'));
        }
      } else {
        reject(new Error(`Cloudinary upload failed with status ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error('Network error during Cloudinary upload'));

    xhr.send(data);
  });
};

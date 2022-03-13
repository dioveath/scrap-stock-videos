/**
 *
 * File: index.js
 * Author: Saroj Rai @ CharichaSoftwares
 * Created On: Saturday, 10 July 2021.
 *
 * Summary: Simple CLI application to download videos from pexels and upload it to Youtube.
 *
 * Currently, this can do its minimum functionality. 
 * Problem is there is limit on download and upload side of it. As we are using apis these apis 
 * has certain limits on them. 
 * Another thing is if we can make youtube video public?? 
 * Add For CLI things, need Commander
 *
 * Copyright(c) 2021 All Rights Reserved for CharichaSoftwares
 */

var { google } = require("googleapis");
const fs = require("fs");
const path = require("path");

// TODO: Learn about common JS modules | multiple import;;
const getAuth = require("./with_google.js").getAuthorizedClient;
const getVideosFromSearch = require("./pexels").getVideosFromSearch;
const downloadFile = require("./pexels").downloadFile;

const DOWNLOAD_DIR = "videos/";
const DOWNLOAD_REG = "downloaded.txt";
const UPLOAD_REG = "upload.txt";

try {
  fs.mkdirSync(DOWNLOAD_DIR);
} catch (error) {
  if (error.code != "EEXIST") {
    throw error;
  }
  // TODO: if error - terminate now
}

function getReadableNameFromURL(url) {
  var name = path.basename(url);
  name = name.replace(/-|\d+/g, " ");
  return name[0].toUpperCase() + name.slice(1).trim();
}

// TODO: use commander module in future
if (process.argv.length > 2) {
  const arg = process.argv[2];
  if (arg === "upload") {
    if (process.argv.length > 3) {
      console.log("Uploading with query " + process.argv[3]);
    } else {
      console.log("Without query");
      getAuth().then((client) => uploadAllVideos(client));
    }
  } else if (arg === "download") {
    if (process.argv.length > 3) {
      console.log("Downloading with user query " + process.argv[3]);
      downloadVideoFiles(process.argv[3], 20);
    } else {
      console.log("Downloading without user query");
      // TODO: make search query random words
      downloadVideoFiles("computer", 20);
    }
  } else if (arg === "channel") {
    getAuth().then((auth) => getChannel(auth));
  } else {
    console.log(`${arg} - Not recognized options`);
  }
} else {
  console.log("Options: upload | download | channel");
}

function getChannel(auth) {
  var service = google.youtube("v3");
  service.channels.list(
    {
      auth: auth,
      part: "snippet,contentDetails,statistics",
      mine: true,
    },
    function (err, response) {
      if (err) {
        console.log("The API returned an error: " + err);
        return;
      }
      var channels = response.data.items;
      if (channels.length == 0) {
        console.log("No channel found.");
      } else {
        console.log(
          "This channel's ID is %s. Its title is '%s', and " +
            "it has %s views.",
          channels[0].id,
          channels[0].snippet.title,
          channels[0].statistics.viewCount
        );
      }
    }
  );
}

// @search - search query
// @max - max possible files to download
async function downloadVideoFiles(search, max) {
  getVideosFromSearch(search, max).then((videos) => {
    videos.forEach((video) => {
      var link = video.video_files[0].link;
      console.log(link + " Ready!");
      var newFile = `${getReadableNameFromURL(video.url)} -${video.id}.mp4`;
      console.log(newFile);
      var path = DOWNLOAD_DIR + newFile;
      downloadFile(link, path, () => {
        createNewVideoJsonFile({
          title: newFile,
          description: "Description: " + newFile,
          tags: newFile.split(' ')
        });
        console.log(`Download complete: ${newFile}`);
      });
    });
  });
}


// uploads not uploaded videos
async function uploadAllVideos(client) {
  try {
    var files = getNotUploadedList();

    for(var i = 0; i < files.length; i++){
      var fileName = files[i];
      var filePath = DOWNLOAD_DIR + fileName;
      if (!fs.existsSync(filePath)) {
        console.log(`${filePath} doesn't exist and skipped!`);
        return;
      }
      var uploadedFile = await uploadMedia(
        client,
        DOWNLOAD_DIR + fileName,
        fileName + " | Free Stock Videos",
        `Free Stock Videos 
- Description
${fileName} is free to use video. Don't forget to credit to Pexels. You can get more videos at pexels.com
Free Videos
Free Stock Videos
Free Footage
Stock Footage
Free Stock Footage
Pexels Videos
`
      );
      if(uploadedFile){
        console.log(`Upload Complete of ${uploadedFile}`);
        addNewUploadToReg(uploadedFile);
      }
      else { 
        console.log("Uploading Error: " + error.message);
      }

      // NOTE: Youtube is not listing it public | we wait to check if any differences
      console.log("Waiting 30 seconds for another upload!");
      sleep(30000);
    }
  } catch(error){
    console.log("Upload error: " + error.message);
  }
}



function sleep(ms){
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}


async function uploadMedia(client, fileName, title, description) {
  var service = google.youtube("v3");

  const fileSize = fs.statSync(fileName).size;
  console.log(`FileSize fo ${fileName}: ${fileSize}`);

  const res = await service.videos.insert(
    {
      auth: client,
      part: "id,snippet,status",
      notifySubscribers: false,
      requestBody: {
        snippet: {
          title: title,
          description: description,
        },
        status: {
          privacyStatus: "public",
          selfDeclaredMadeForKids: false,
        },
      },
      media: {
        body: fs.createReadStream(fileName),
      },
    },
    {
      onUploadProgress: (evt) => {
        const progress = (evt.bytesRead / fileSize) * 100;
        console.log(`${Math.round(progress)}% uploaded...`);
      },
    }
  );
  console.log("Upload Complete.\n\n");
  return path.basename(fileName);
}

function getDownloadList() {
  try {
    var path = DOWNLOAD_DIR + DOWNLOAD_REG;
    fs.openSync(path, "a"); // create file if there's not
    var content = fs.readFileSync(path).toString();
    var files = content.split("\n");
    // TODO: ignore last: '\n' will be added to end of file??
    files.splice(files.length - 1, 1);
    return files;
  } catch (error) {
    console.log(`DownloadRegError: ${error.message}`);
  }
  return [];
}

function addNewDownloadToReg(fileName) {
  try {
    var regPath = DOWNLOAD_DIR + DOWNLOAD_REG;
    fs.openSync(regPath, "a"); // create file if there's not
    var files = getDownloadList();
    if (files.includes(fileName)) {
      console.log("already registered!");
      return;
    }
    fs.appendFileSync(regPath, fileName + "\n");
  } catch (error) {
    console.log(`FILE:${fileName}: Couldn't add to download reg ${error}`);
  }
}

function getUploadList() {
  try {
    var path = DOWNLOAD_DIR + UPLOAD_REG;
    fs.openSync(path, "a");
    var content = fs.readFileSync(path).toString();
    var files = content.split("\n");
    // TODO: ignore last: '\n' will be added to end of file??
    files.splice(files.length - 1, 1);
    return files;
  } catch (error) {
    console.log(`UploadRegErrr: ${error.message}`);
  }
  return [];
}

function addNewUploadToReg(fileName) {
  try {
    var regPath = DOWNLOAD_DIR + UPLOAD_REG;
    fs.openSync(regPath, "a"); // creates file if there isn't
    var files = getUploadList();
    if (files.includes(fileName)) {
      console.log("already uploaded!");
      return;
    }
    fs.appendFileSync(regPath, fileName + "\n");
  } catch (error) {
    console.log(
      `UPLOAD REG ERROR :FILE:${fileName}: Couldn't add to upload reg ${error}`
    );
  }
}

function getNotUploadedList() {
  var uFiles = getUploadList();
  var dFiles = getDownloadList();
  var nuFiles = [];

  dFiles.forEach((f) => {
    for (var i = 0; i < uFiles.length; i++) {
      if (f.trim() === uFiles[i].trim()) {
        return;
      }
    }
    nuFiles.push(f);
  });

  return nuFiles;
}

function createNewVideoJsonFile(file){
  try {
    let json = JSON.stringify(file);
    let jsonFile = DOWNLOAD_DIR + "json/" + file.title.split('.')[0] + ".json";
    fs.writeFile(jsonFile, json, 'utf-8', () => {
      console.log("Created json file: " + jsonFile);
    });
  } catch(err){
    console.log(err.message);
  }
}

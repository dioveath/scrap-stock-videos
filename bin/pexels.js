const createClient = require("pexels").createClient;
const fs = require('fs');
const https = require('follow-redirects').https;

const client = createClient(
  "563492ad6f91700001000001c427e734807449edaf0b3042b5ce1f67"
);

async function getVideosFromSearch(search, perPage) {
  try {
    var videos = await client.videos.search({ query: search, per_page: perPage});
    return videos.videos;
  } catch (error) {
    console.log(error);
    return false;
  }
}

function downloadFile(url, filePath, callback){
  const newFile = fs.createWriteStream(filePath);
  https.get(url, (res)=> {
    res.pipe(newFile);
    newFile.on('finish', ()=>{
      newFile.close(callback);
    });
  }).on('error', (error)=>{
    newFile.unlink(newFileName);
    if(callback) callback(error.message);
    console.log(error);
  });
}



exports.downloadFile = downloadFile;
exports.getVideosFromSearch = getVideosFromSearch;


////////////////////////////////////////////////////////////////////////////////
// TESTS
////////////////////////////////////////////////////////////////////////////////

// getSearchVideoUrls("beautiful").then((videos)=> {
//   console.log(videos);
//   videos.forEach((video)=> {
//     console.log(video.video_files[0].link);
//     downloadFile(video.video_files[0].link, `video_${video.id}.mp4`, ()=> console.log(`Download complet: ${video.id}`));
//   });
// });


// downloadFile("https://player.vimeo.com/external/557629727.hd.mp4?s=305b516e967bb3cc67a124357e9bc3aa0ca8a496&profile_id=174&oauth2_token_id=57447761",
//              "hello.mp4",
//              () => "File Download Complete"
//             );

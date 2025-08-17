import path from "path";
import fs, { existsSync } from "fs";
import crypto from "crypto";

//make an git dir
function init() {
  //check for if its alredy initialized
  const fileExist = existsSync(".jsGit");
  if (fileExist) {
    console.log("already initialized jsgit");
    return;
  }

  //initialize everything that i needed
  fs.mkdirSync(".jsGit");
  fs.mkdirSync(".jsGit/objects");
  fs.writeFileSync(
    ".jsGit/cache.json",
    `{"objectID":null,
    "commitID":null}`
  );
  fs.writeFileSync(".jsGit/commits.json", `{}`);
  fs.writeFileSync(
    ".jsGitIgnore",
    "this is jsGit write every folder you wanna ignore here line by line"
  );
  console.log("initialized jsGit");
}
function commit(message: string) {
  //lets get the cache to get previous commit id and object id
  const cacheString = fs.readFileSync(".jsGit/cache.json", {
    encoding: "utf-8",
  });

  //converting it to a json
  const cache = JSON.parse(cacheString);

  //reading the directory
  const allFiles: any[] = listFiles(".");
  console.log("commit for files =>", allFiles);

  //create commit id and object id
  const commitId = commitIdGen();
  const objectID = objectIdGen();

  //check if the commit is first commit
  if (!cache.objectID || !cache.commitID) {
    //simply means first commit

    //lets create an commit JSON object
    const commitJson = {
      prevCommitId: null,
      prevObjectId: null,
      commitId: commitId,
      objectID: objectID,
      message: message,
      date: new Date(Date.now()),
    };

    //lets create the objectId folder
    const objIDPath = ".jsGit/objects/" + objectID;
    fs.mkdirSync(objIDPath);

    //create changes Folder
    const changesPath = ".jsGit/objects/" + objectID + "/changes";
    fs.mkdirSync(changesPath);

    //important varaible that are needed
    const fileData = {};
    const files: any[] = [];

    //mapping through all the file and folder present in root to end
    allFiles.forEach((filePath) => {
      //read the file
      const fileContent = fs.readFileSync(filePath, {
        encoding: "utf-8",
      });

      //create hash and store every things in the changes
      const filehash = sha1Hash(fileContent);
      fileData[filePath] = {
        path: filePath,
        hash: filehash,
        status: "changed",
        refernceCommitId: commitId,
        refernceObjectID: objectID,
        refered: false,
      };
      files.push(filePath);
      writeFileSafe(
        `.jsGit/objects/${objectID}/changes/${filePath}`,
        fileContent
      );
    });

    //create an object json file
    const objectJson = {
      objectId: objectID,
      commitId: commitId,
      files: files,
      fileData: fileData,
      prevCommitId: null,
      prevObjectId: null,
    };
    
    //lets create object.json in current object folder
    fs.writeFileSync(
      objIDPath + "/object.json", //file path
      `${JSON.stringify(objectJson)}`
    );
    //update commits.json (hard way pull all previous commits.json parse it and then update an new and strore it again (like update it))

    //get all previous commits
    const allCommits = JSON.parse(
      fs.readFileSync(".jsGit/commits.json", {
        encoding: "utf-8",
      })
    );

    // update the commits object
    allCommits[commitId] = commitJson;
    //update commits.json
    fs.writeFileSync(".jsGit/commits.json", JSON.stringify(allCommits));
    //update the cache.json
    fs.writeFileSync(
      ".jsGit/cache.json",
      JSON.stringify({
        objectID: objectID,
        commitID: commitId,
      })
    );

    console.log("commit successfull");
    return;
  }

  //since its not the first commit we need to check with last commit whats actually changed such as creation of files and file content changes
  //lets load the last object.json with the help of cache objectId
  const prevObjectJsonStr = fs.readFileSync(
    `.jsGit/objects/${cache.objectID}/objects.json`,
    { encoding: "utf-8" }
  );
  const prevObjectJson: objectJson = JSON.parse(prevObjectJsonStr);
  const FileDataOfPrevObj = prevObjectJson.fileData;
  const commitJson = {
    prevCommitId: cache.commitID,
    prevObjectId: cache.objectID,
    commitId: commitId,
    objectID: objectID,
    message: message,
    date: new Date(Date.now()),
  };

  //lets create the objectId folder
  const objIDPath = ".jsGit/objects/" + objectID;
  fs.mkdirSync(objIDPath);
  //create changes Folder
  const changesPath = ".jsGit/objects/" + objectID + "/changes";
  fs.mkdirSync(changesPath);

  //
  const fileData = {};
  const files: any[] = [];

  //mapping through every file in root directory
  allFiles.forEach((filePath: string) => {
    //read the file

    //if its an .jsgit file ignore
    const start = filePath.startsWith(".jsGit");
    if (start) {
      return;
    }
    //store file path in array for fastlook while checkout
    files.push(filePath);
    //read the file content
    const fileContent = fs.readFileSync(filePath, {
      encoding: "utf-8",
    });
    //lets create an hash
    const filehash = sha1Hash(fileContent);
    //compare the hash with prev hash
    const prevFileData: fileData | undefined = FileDataOfPrevObj[filePath];
    if (prevFileData) {
      //if prevFileData file has existed before this commit let compare its current hash
      if (prevFileData.hash == filehash) {
        //hash is same we dont actually need to store it again we will refer it
        fileData[filePath] = {
          path: filePath,
          hash: filehash,
          status: "unchanged",
          refernceCommitId: prevFileData.refernceCommitId,
          refernceObjectID: prevFileData.refernceObjectID,
          refered: true,
        };
      } else {
        //file content is change we will store instead of refering it
        fileData[filePath] = {
          path: filePath,
          hash: filehash,
          status: "changed",
          refernceCommitId: commitId,
          refernceObjectID: objectID,
          refered: false,
        };
        writeFileSafe(
          `.jsGit/objects/${objectID}/changes/${filePath}`,
          fileContent
        );
      }
    } else {
      //it means file is newly created during this commit
      fileData[filePath] = {
        path: filePath,
        hash: filehash,
        status: "changed",
        refernceCommitId: commitId,
        refernceObjectID: objectID,
        refered: false,
      };
      writeFileSafe(
        `.jsGit/objects/${objectID}/changes/${filePath}`,
        fileContent
      );
    }
  });

  //create an object json file
  const objectJson = {
    objectId: objectID,
    commitId: commitId,
    files: files,
    fileData: fileData,
    prevCommitId: cache.commitID,
    prevObjectId: cache.objectID,
  };
  const stringifiedIObjectJson = JSON.stringify(objectJson);
  //lets create object.json in current object folder
  fs.writeFileSync(
    objIDPath + "/object.json", //file path
    `${stringifiedIObjectJson}`
  );
  //update commits.json (hard way pull all previous commits.json parse it and then update an new and strore it again (like update it))

  //get all previous commits
  const AllcommitsStr = fs.readFileSync(".jsGit/commits.json", {
    encoding: "utf-8",
  });
  //converting it to a json
  const allCommits = JSON.parse(AllcommitsStr);
  // update the commits object
  allCommits[commitId] = commitJson;
  //update commits.json
  fs.writeFileSync(".jsGit/commits.json", JSON.stringify(allCommits));
  //update the cache.json
  fs.writeFileSync(
    ".jsGit/cache.json",
    JSON.stringify({
      objectID: objectID,
      commitID: commitId,
    })
  );

  console.log("commit successfull");
}
//utils functions
function listFiles(dirPath): any[] {
  let results: any[] = [];

  const items = fs.readdirSync(dirPath, { withFileTypes: true });

  items.forEach((item) => {
    const fullPath = path.join(dirPath, item.name);

    if (item.isDirectory()) {
      // Recursively go deeper
      results = results.concat(listFiles(fullPath));
    } else {
      // Push file path
      results.push(fullPath);
    }
  });

  return results;
}
function commitIdGen(): string {
  let commitId;
  for (let i = 0; i < 20; i++) {
    let randomNumber = Math.floor(Math.random() * (90 - 48 + 1)) + 48;
    if (randomNumber >= 58 && randomNumber <= 64) {
      i--;
      continue;
    }
    const char = String.fromCharCode(randomNumber);
    commitId = i == 0 ? char : commitId + char;
  }
  return commitId;
}
function objectIdGen(): string {
  const objectId = commitIdGen();
  return objectId;
}
function sha1Hash(data: string): string {
  return crypto.createHash("sha1").update(data).digest("hex");
}
//this functionsafley write a file we just nee to provide it a path
function writeFileSafe(filePath: string, content: string): void {
  try {
    // Ensure parent directory exists
    fs.mkdirSync(path.dirname(filePath), { recursive: true });

    // Write the file
    fs.writeFileSync(filePath, content);

    // console.log(`commited ${filePath}`);
  } catch (err) {
    console.error("Error writing file:", err.message);
  }
}

//types
interface objectJson {
  objectId: string;
  commitId: string;
  files: any[];
  fileData: {};
  prevCommitId: string;
  prevObjectId: string;
}
interface cacheJSon {
  objectId: string;
  commitId: string;
}
interface commitsOBJ {
  objectId: string;
  commitId: string;
  prevCommitId: string;
  prevObjectId: string;
  message: string;
  date: Date;
}
interface fileData {
  path: string;
  hash: string;
  status: string;
  refernceCommitId: string;
  refernceObjectID: string;
  refered: boolean;
}
commit("initial");
